/**
 * Employee Self-Service Portal Routes
 * 
 * Provides invite-based employee authentication and self-service access
 * to payslips and attendance records.
 * 
 * Endpoints (mounted at /api/employee-portal):
 * Auth:
 * - POST /invite - Send portal invite to employee
 * - POST /accept-invite - Accept invite and set password
 * - POST /login - Employee portal login
 * - POST /logout - Employee portal logout
 * 
 * Self-Service:
 * - GET /payslips - List employee's payslips
 * - GET /payslips/:id/pdf - Download payslip PDF
 * - GET /attendance - View attendance records
 * - GET /profile - View employee profile
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  employeePortalInvites, 
  employeePortalSessions,
  auditLogs,
} from "@shared/schema";
import { hrEmployees, hrPayRunItems, hrPayRuns, hrAttendance } from "@shared/models/hrms";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { rateLimit } from "../core";

const router = Router();

const inviteSchema = z.object({
  employeeId: z.string().uuid(),
});

const acceptInviteSchema = z.object({
  inviteToken: z.string().min(32),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid(),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

async function getEmployeeByToken(sessionToken: string) {
  const [session] = await db
    .select()
    .from(employeePortalSessions)
    .where(eq(employeePortalSessions.sessionToken, sessionToken))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const [employee] = await db
    .select()
    .from(hrEmployees)
    .where(eq(hrEmployees.id, session.employeeId))
    .limit(1);

  return employee ? { session, employee } : null;
}

function requireEmployeeAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken = req.cookies?.employee_session || req.headers["x-employee-session"];
    
    if (!sessionToken) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
    }

    const result = await getEmployeeByToken(sessionToken);
    if (!result) {
      return res.status(401).json({ error: "SESSION_EXPIRED", message: "Session expired. Please log in again." });
    }

    // Update last activity
    await db
      .update(employeePortalSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(employeePortalSessions.id, result.session.id));

    (req as any).employeePortal = {
      session: result.session,
      employee: result.employee,
      tenantId: result.session.tenantId,
    };

    next();
  };
}

// ==================== AUTH ENDPOINTS ====================

router.post("/invite", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    const userRole = req.context?.role;
    
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Admin authentication required" });
    }
    
    if (!["admin", "manager", "hr_admin", "super_admin"].includes(userRole || "")) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Only admins and managers can send invites" });
    }

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const [employee] = await db
      .select()
      .from(hrEmployees)
      .where(and(
        eq(hrEmployees.id, parsed.data.employeeId),
        eq(hrEmployees.tenantId, tenantId)
      ))
      .limit(1);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const inviteToken = generateToken(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(employeePortalInvites)
      .values({
        tenantId,
        employeeId: employee.id,
        email: employee.email,
        inviteToken,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    await db.insert(auditLogs).values({
      action: "create",
      resource: "employee_portal_invite",
      resourceId: invite.id,
      tenantId,
      userId,
      metadata: { employeeId: employee.id, email: employee.email },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      inviteId: invite.id,
      email: employee.email,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("[employee-portal] Invite error:", error);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

router.post("/accept-invite", async (req, res) => {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const [invite] = await db
      .select()
      .from(employeePortalInvites)
      .where(eq(employeePortalInvites.inviteToken, parsed.data.inviteToken))
      .limit(1);

    if (!invite) {
      return res.status(404).json({ error: "INVALID_TOKEN", message: "Invalid or expired invite token" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ error: "ALREADY_USED", message: "This invite has already been used" });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: "EXPIRED", message: "This invite has expired" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await db
      .update(hrEmployees)
      .set({ metadata: { portalPasswordHash: passwordHash } })
      .where(eq(hrEmployees.id, invite.employeeId));

    await db
      .update(employeePortalInvites)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(employeePortalInvites.id, invite.id));

    await db.insert(auditLogs).values({
      action: "update",
      resource: "employee_portal_invite",
      resourceId: invite.id,
      tenantId: invite.tenantId,
      metadata: { action: "INVITE_ACCEPTED", employeeId: invite.employeeId },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Account activated successfully" });
  } catch (error) {
    console.error("[employee-portal] Accept invite error:", error);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const [employee] = await db
      .select()
      .from(hrEmployees)
      .where(and(
        eq(hrEmployees.email, parsed.data.email),
        eq(hrEmployees.tenantId, parsed.data.tenantId)
      ))
      .limit(1);

    if (!employee) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }

    const metadata = employee.metadata as Record<string, any> | null;
    const passwordHash = metadata?.portalPasswordHash;

    if (!passwordHash) {
      return res.status(401).json({ error: "ACCOUNT_NOT_ACTIVATED", message: "Please accept your portal invite first" });
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, passwordHash);
    if (!passwordValid) {
      await db.insert(auditLogs).values({
        action: "access",
        resource: "employee_portal_login",
        resourceId: employee.id,
        tenantId: employee.tenantId,
        metadata: { email: parsed.data.email, reason: "invalid_password", success: false },
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    }

    const sessionToken = generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(employeePortalSessions).values({
      tenantId: employee.tenantId,
      employeeId: employee.id,
      sessionToken,
      expiresAt,
      ipAddress: req.ip || null,
      userAgent: req.get("User-Agent") || null,
    });

    await db.insert(auditLogs).values({
      action: "login",
      resource: "employee_portal",
      resourceId: employee.id,
      tenantId: employee.tenantId,
      metadata: { email: parsed.data.email },
      ipAddress: req.ip,
    });

    res.cookie("employee_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        designation: employee.designation,
      },
    });
  } catch (error) {
    console.error("[employee-portal] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", requireEmployeeAuth(), async (req, res) => {
  try {
    const { session, employee } = (req as any).employeePortal;

    await db
      .delete(employeePortalSessions)
      .where(eq(employeePortalSessions.id, session.id));

    await db.insert(auditLogs).values({
      action: "logout",
      resource: "employee_portal",
      resourceId: employee.id,
      tenantId: session.tenantId,
      ipAddress: req.ip,
    });

    res.clearCookie("employee_session");
    res.json({ success: true });
  } catch (error) {
    console.error("[employee-portal] Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// ==================== SELF-SERVICE ENDPOINTS ====================

router.get("/profile", requireEmployeeAuth(), async (req, res) => {
  const { employee } = (req as any).employeePortal;

  res.json({
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    designation: employee.designation,
    departmentId: employee.departmentId,
    joinDate: employee.joinDate,
    status: employee.status,
    profilePhotoUrl: employee.profilePhotoUrl,
  });
});

router.get("/payslips", requireEmployeeAuth(), async (req, res) => {
  try {
    const { employee, tenantId } = (req as any).employeePortal;

    const payslips = await db
      .select({
        id: hrPayRunItems.id,
        payRunId: hrPayRunItems.payRunId,
        month: hrPayRuns.month,
        year: hrPayRuns.year,
        gross: hrPayRunItems.gross,
        net: hrPayRunItems.net,
        totalDeductions: hrPayRunItems.totalDeductions,
        status: hrPayRuns.status,
        createdAt: hrPayRunItems.createdAt,
      })
      .from(hrPayRunItems)
      .innerJoin(hrPayRuns, eq(hrPayRunItems.payRunId, hrPayRuns.id))
      .where(eq(hrPayRunItems.employeeId, employee.id))
      .orderBy(desc(hrPayRuns.year), desc(hrPayRuns.month))
      .limit(24);

    await db.insert(auditLogs).values({
      action: "access",
      resource: "employee_portal_payslips",
      resourceId: employee.id,
      tenantId,
      metadata: { employeeId: employee.id },
      ipAddress: req.ip,
    });

    res.json(payslips);
  } catch (error) {
    console.error("[employee-portal] Payslips error:", error);
    res.status(500).json({ error: "Failed to fetch payslips" });
  }
});

router.get("/payslips/:id/pdf", requireEmployeeAuth(), async (req, res) => {
  try {
    const { employee, tenantId } = (req as any).employeePortal;
    const { id } = req.params;

    const [item] = await db
      .select()
      .from(hrPayRunItems)
      .where(and(
        eq(hrPayRunItems.id, id),
        eq(hrPayRunItems.employeeId, employee.id)
      ))
      .limit(1);

    if (!item) {
      return res.status(404).json({ error: "Payslip not found" });
    }

    await db.insert(auditLogs).values({
      action: "access",
      resource: "employee_portal_payslip_pdf",
      resourceId: id,
      tenantId,
      metadata: { employeeId: employee.id, payslipId: id },
      ipAddress: req.ip,
    });

    res.redirect(`/api/hr/payroll/payslips/${id}/pdf`);
  } catch (error) {
    console.error("[employee-portal] Payslip PDF error:", error);
    res.status(500).json({ error: "Failed to generate payslip PDF" });
  }
});

router.get("/attendance", requireEmployeeAuth(), async (req, res) => {
  try {
    const { employee, tenantId } = (req as any).employeePortal;
    const { startDate, endDate } = req.query;

    let conditions = [eq(hrAttendance.employeeId, employee.id)];

    if (startDate) {
      conditions.push(gte(hrAttendance.attendanceDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(hrAttendance.attendanceDate, endDate as string));
    }

    const attendance = await db
      .select({
        id: hrAttendance.id,
        attendanceDate: hrAttendance.attendanceDate,
        checkInTime: hrAttendance.checkInTime,
        checkOutTime: hrAttendance.checkOutTime,
        status: hrAttendance.status,
        workHours: hrAttendance.workHours,
        overtimeHours: hrAttendance.overtimeHours,
        isLateArrival: hrAttendance.isLateArrival,
        notes: hrAttendance.notes,
      })
      .from(hrAttendance)
      .where(and(...conditions))
      .orderBy(desc(hrAttendance.attendanceDate))
      .limit(62);

    res.json(attendance);
  } catch (error) {
    console.error("[employee-portal] Attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

export default router;
