import { db } from "../db";
import { tenantStaff, securityAlerts, tenantStaffKnownDevices } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { logModuleAudit } from "./audit";

const DEVICE_HASH_SECRET = process.env.DEVICE_HASH_SECRET || "mybizstream-device-secret";

export async function getStaffSessionVersion(staffId: string): Promise<number | null> {
  const [staff] = await db
    .select({ sessionVersion: tenantStaff.sessionVersion })
    .from(tenantStaff)
    .where(eq(tenantStaff.id, staffId))
    .limit(1);
  return staff?.sessionVersion ?? null;
}

export async function forceLogoutStaff(
  tenantId: string,
  staffId: string,
  performedByUserId: string
): Promise<void> {
  await db
    .update(tenantStaff)
    .set({
      sessionVersion: sql`${tenantStaff.sessionVersion} + 1`,
      forceLogoutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantStaff.id, staffId),
        eq(tenantStaff.tenantId, tenantId)
      )
    );

  await logModuleAudit(
    "security",
    tenantId,
    "update",
    "tenant_staff",
    staffId,
    null,
    { action: "force_logout", targetStaffId: staffId },
    performedByUserId
  );
}

export async function forceLogoutSelf(
  tenantId: string,
  staffId: string,
  userId: string
): Promise<void> {
  await db
    .update(tenantStaff)
    .set({
      sessionVersion: sql`${tenantStaff.sessionVersion} + 1`,
      forceLogoutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantStaff.id, staffId),
        eq(tenantStaff.tenantId, tenantId)
      )
    );

  await logModuleAudit(
    "security",
    tenantId,
    "update",
    "tenant_staff",
    staffId,
    null,
    { action: "force_logout_self", reason: "User signed out other sessions" },
    userId
  );
}

export function computeDeviceHash(userAgent: string): string {
  return createHash("sha256")
    .update(userAgent + DEVICE_HASH_SECRET)
    .digest("hex");
}

export function parseUserAgentSummary(userAgent: string): string {
  let browser = "Unknown";
  let os = "Unknown";

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux") && !userAgent.includes("Android")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }

  return `${browser} on ${os}`;
}

export interface DeviceCheckResult {
  isNewDevice: boolean;
  isNewIp: boolean;
  deviceId?: string;
}

export async function checkAndRecordDevice(
  tenantId: string,
  staffId: string,
  userAgent: string,
  ipAddress: string
): Promise<DeviceCheckResult> {
  const deviceHash = computeDeviceHash(userAgent);
  const userAgentSummary = parseUserAgentSummary(userAgent);

  const [existingDevice] = await db
    .select()
    .from(tenantStaffKnownDevices)
    .where(
      and(
        eq(tenantStaffKnownDevices.staffId, staffId),
        eq(tenantStaffKnownDevices.deviceHash, deviceHash)
      )
    )
    .limit(1);

  const result: DeviceCheckResult = {
    isNewDevice: !existingDevice,
    isNewIp: existingDevice ? existingDevice.lastIp !== ipAddress : false,
    deviceId: existingDevice?.id,
  };

  if (existingDevice) {
    result.isNewIp = existingDevice.lastIp !== ipAddress;
    await db
      .update(tenantStaffKnownDevices)
      .set({
        lastSeenAt: new Date(),
        lastIp: ipAddress,
      })
      .where(eq(tenantStaffKnownDevices.id, existingDevice.id));
    result.deviceId = existingDevice.id;
  } else {
    const [newDevice] = await db
      .insert(tenantStaffKnownDevices)
      .values({
        tenantId,
        staffId,
        deviceHash,
        userAgentSummary,
        lastIp: ipAddress,
      })
      .returning({ id: tenantStaffKnownDevices.id });
    result.deviceId = newDevice.id;
  }

  return result;
}

export async function createSecurityAlert(
  tenantId: string,
  type: "new_device" | "new_ip" | "new_country" | "force_logout" | "suspicious_activity",
  staffId: string | null,
  actorUserId: string | null,
  metadata: Record<string, unknown> = {},
  severity: "low" | "medium" | "high" | "critical" = "medium"
): Promise<string> {
  const [alert] = await db
    .insert(securityAlerts)
    .values({
      tenantId,
      type,
      severity,
      staffId,
      actorUserId,
      metadata,
    })
    .returning({ id: securityAlerts.id });

  await logModuleAudit(
    "security",
    tenantId,
    "create",
    "security_alert",
    alert.id,
    null,
    { type, severity, staffId },
    actorUserId || undefined
  );

  return alert.id;
}
