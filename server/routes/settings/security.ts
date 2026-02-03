import { Router, Request, Response } from "express";
import { db } from "../../db";
import { tenantIpRules, securityAlerts, tenantStaff } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { forceLogoutStaff, forceLogoutSelf, createSecurityAlert } from "../../services/session-security";
import { logModuleAudit } from "../../services/audit";
import { requireTenantPermission } from "../../middleware/tenant-permission";
import { Permissions } from "@shared/rbac/permissions";
import { storage } from "../../storage";

const router = Router();

router.post("/staff/:id/force-logout",
  requireTenantPermission(Permissions.STAFF_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const userId = req.context?.user?.id;
      const targetStaffId = req.params.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const targetStaff = await storage.getTenantStaffMember(targetStaffId, tenantId);
      if (!targetStaff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      await forceLogoutStaff(tenantId, targetStaffId, userId);

      await createSecurityAlert(
        tenantId,
        "force_logout",
        targetStaffId,
        userId,
        { targetStaffName: targetStaff.fullName },
        "medium"
      );

      res.json({ success: true, message: "User sessions invalidated" });
    } catch (error: any) {
      console.error("Error forcing logout:", error);
      res.status(500).json({ error: "Failed to force logout" });
    }
  }
);

router.post("/force-logout/self", async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [staff] = await db
      .select({ id: tenantStaff.id })
      .from(tenantStaff)
      .where(
        and(
          eq(tenantStaff.tenantId, tenantId),
          eq(tenantStaff.userId, userId)
        )
      )
      .limit(1);

    if (!staff) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    await forceLogoutSelf(tenantId, staff.id, userId);

    res.json({ success: true, message: "Other sessions signed out" });
  } catch (error: any) {
    console.error("Error signing out other sessions:", error);
    res.status(500).json({ error: "Failed to sign out other sessions" });
  }
});

const ipRuleSchema = z.object({
  mode: z.enum(["allow", "deny"]),
  cidr: z.string().min(1).max(50),
  label: z.string().max(100).optional(),
  isEnabled: z.boolean().optional(),
});

router.get("/ip-rules",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      const rules = await db
        .select()
        .from(tenantIpRules)
        .where(eq(tenantIpRules.tenantId, tenantId))
        .orderBy(desc(tenantIpRules.createdAt));

      res.json({ rules });
    } catch (error: any) {
      console.error("Error fetching IP rules:", error);
      res.status(500).json({ error: "Failed to fetch IP rules" });
    }
  }
);

router.post("/ip-rules",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const userId = req.context?.user?.id;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      const parsed = ipRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const [rule] = await db
        .insert(tenantIpRules)
        .values({
          tenantId,
          mode: parsed.data.mode,
          cidr: parsed.data.cidr,
          label: parsed.data.label || null,
          isEnabled: parsed.data.isEnabled ?? true,
          createdBy: userId,
        })
        .returning();

      await logModuleAudit(
        "security",
        tenantId,
        "create",
        "ip_rule",
        rule.id,
        null,
        { mode: rule.mode, cidr: rule.cidr },
        userId
      );

      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating IP rule:", error);
      res.status(500).json({ error: "Failed to create IP rule" });
    }
  }
);

router.put("/ip-rules/:id",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const userId = req.context?.user?.id;
      const ruleId = req.params.id;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      const parsed = ipRuleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const [existingRule] = await db
        .select()
        .from(tenantIpRules)
        .where(
          and(
            eq(tenantIpRules.id, ruleId),
            eq(tenantIpRules.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existingRule) {
        return res.status(404).json({ error: "IP rule not found" });
      }

      const [updated] = await db
        .update(tenantIpRules)
        .set({
          mode: parsed.data.mode ?? existingRule.mode,
          cidr: parsed.data.cidr ?? existingRule.cidr,
          label: parsed.data.label !== undefined ? parsed.data.label : existingRule.label,
          isEnabled: parsed.data.isEnabled ?? existingRule.isEnabled,
        })
        .where(eq(tenantIpRules.id, ruleId))
        .returning();

      await logModuleAudit(
        "security",
        tenantId,
        "update",
        "ip_rule",
        ruleId,
        { mode: existingRule.mode, cidr: existingRule.cidr },
        parsed.data,
        userId
      );

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating IP rule:", error);
      res.status(500).json({ error: "Failed to update IP rule" });
    }
  }
);

router.delete("/ip-rules/:id",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const userId = req.context?.user?.id;
      const ruleId = req.params.id;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      const [existingRule] = await db
        .select()
        .from(tenantIpRules)
        .where(
          and(
            eq(tenantIpRules.id, ruleId),
            eq(tenantIpRules.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existingRule) {
        return res.status(404).json({ error: "IP rule not found" });
      }

      await db
        .delete(tenantIpRules)
        .where(eq(tenantIpRules.id, ruleId));

      await logModuleAudit(
        "security",
        tenantId,
        "delete",
        "ip_rule",
        ruleId,
        { cidr: existingRule.cidr, label: existingRule.label },
        null,
        userId
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting IP rule:", error);
      res.status(500).json({ error: "Failed to delete IP rule" });
    }
  }
);

router.get("/alerts",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const { type, severity, unacknowledged } = req.query;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      let query = db
        .select({
          id: securityAlerts.id,
          type: securityAlerts.type,
          severity: securityAlerts.severity,
          staffId: securityAlerts.staffId,
          staffName: tenantStaff.fullName,
          metadata: securityAlerts.metadata,
          createdAt: securityAlerts.createdAt,
          acknowledgedAt: securityAlerts.acknowledgedAt,
        })
        .from(securityAlerts)
        .leftJoin(tenantStaff, eq(securityAlerts.staffId, tenantStaff.id))
        .where(eq(securityAlerts.tenantId, tenantId))
        .orderBy(desc(securityAlerts.createdAt))
        .limit(100);

      const results = await query;

      let filtered = results;
      if (type) {
        filtered = filtered.filter(r => r.type === type);
      }
      if (severity) {
        filtered = filtered.filter(r => r.severity === severity);
      }
      if (unacknowledged === "true") {
        filtered = filtered.filter(r => !r.acknowledgedAt);
      }

      res.json({ alerts: filtered });
    } catch (error: any) {
      console.error("Error fetching security alerts:", error);
      res.status(500).json({ error: "Failed to fetch security alerts" });
    }
  }
);

router.post("/alerts/:id/acknowledge",
  requireTenantPermission(Permissions.SETTINGS_EDIT),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.context?.tenant?.id;
      const userId = req.context?.user?.id;
      const alertId = req.params.id;

      if (!tenantId) {
        return res.status(401).json({ error: "Tenant context required" });
      }

      const [alert] = await db
        .select()
        .from(securityAlerts)
        .where(
          and(
            eq(securityAlerts.id, alertId),
            eq(securityAlerts.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      if (alert.acknowledgedAt) {
        return res.json({ success: true, message: "Already acknowledged" });
      }

      await db
        .update(securityAlerts)
        .set({
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        })
        .where(eq(securityAlerts.id, alertId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  }
);

export default router;
