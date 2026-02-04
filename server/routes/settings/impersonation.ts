import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/tenant-auth";
import { requireTenantContext } from "../../middleware/tenant-context";
import { requireStepUp } from "../../middleware/requireStepUp";
import { PermissionService } from "../../services/permission";
import { logImpersonationEvent } from "../../services/audit";
import { recordLogin } from "../../services/login-history";
import { storage } from "../../storage";
import { Permissions } from "@shared/rbac/permissions";

const router = Router();

router.post("/start", requireAuth, requireTenantContext(), requireStepUp("impersonate"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenant = (req as any).tenant;
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ error: "staffId is required" });
    }

    const hasPermission = await PermissionService.hasPermission(
      user.id,
      tenant.id,
      Permissions.IMPERSONATION_USE
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: "FORBIDDEN",
        message: "You do not have permission to impersonate users"
      });
    }

    const actorStaff = await storage.getTenantStaffByUserId(user.id, tenant.id);
    if (!actorStaff) {
      return res.status(403).json({ error: "No staff record found" });
    }

    const targetStaff = await storage.getTenantStaffMember(staffId, tenant.id);
    if (!targetStaff) {
      return res.status(404).json({ error: "Target staff not found" });
    }

    if (targetStaff.status !== "active") {
      return res.status(400).json({ error: "Cannot impersonate inactive staff" });
    }

    if (targetStaff.id === actorStaff.id) {
      return res.status(400).json({ error: "Cannot impersonate yourself" });
    }

    await logImpersonationEvent("IMPERSONATION_STARTED", {
      tenantId: tenant.id,
      actorUserId: user.id,
      actorStaffId: actorStaff.id,
      targetStaffId: targetStaff.id,
      targetStaffName: targetStaff.fullName || targetStaff.email,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    await recordLogin({
      tenantId: tenant.id,
      staffId: targetStaff.id,
      userId: user.id,
      ipAddress: req.ip || undefined,
      userAgent: req.get("User-Agent") || undefined,
      authProvider: "impersonation",
      isImpersonated: true,
      impersonatedByStaffId: actorStaff.id,
    });

    const role = targetStaff.tenantRoleId 
      ? await storage.getTenantRole(targetStaff.tenantRoleId, tenant.id)
      : null;

    return res.json({
      success: true,
      impersonating: {
        staffId: targetStaff.id,
        fullName: targetStaff.fullName,
        aliasName: targetStaff.aliasName,
        email: targetStaff.email,
        roleName: role?.name || "Unknown",
      },
    });
  } catch (error) {
    console.error("[impersonation/start] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/end", requireAuth, requireTenantContext(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenant = (req as any).tenant;
    const { staffId } = req.body;

    const actorStaff = await storage.getTenantStaffByUserId(user.id, tenant.id);
    if (!actorStaff) {
      return res.status(403).json({ error: "No staff record found" });
    }

    const targetStaff = staffId ? await storage.getTenantStaffMember(staffId, tenant.id) : null;

    await logImpersonationEvent("IMPERSONATION_ENDED", {
      tenantId: tenant.id,
      actorUserId: user.id,
      actorStaffId: actorStaff.id,
      targetStaffId: staffId || "unknown",
      targetStaffName: targetStaff?.fullName || targetStaff?.email || "Unknown",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("[impersonation/end] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
