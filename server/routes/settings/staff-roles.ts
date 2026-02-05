import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "../../storage";
import { requireTenantPermission } from "../../middleware/tenant-permission";
import { Permissions, PERMISSION_GROUPS, DEFAULT_TENANT_ROLES } from "@shared/rbac/permissions";
import { insertTenantRoleSchema, insertTenantStaffSchema } from "@shared/schema";
import { logRoleEvent, logStaffEvent } from "../../services/audit";
import { getLoginHistory } from "../../services/login-history";
import { seedTenantRolesIfMissing, getOwnerRoleId } from "../../services/rbac/seed-tenant-roles";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const router = Router();

// ==================== ROLES ENDPOINTS ====================

router.get("/roles", async (req: Request, res: Response) => {
  const context = (req as any).context;
  if (!context?.tenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const roles = await storage.getTenantRoles(context.tenantId);
    
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await storage.getTenantRolePermissions(role.id);
        return {
          ...role,
          permissions: permissions.map(p => p.permission),
        };
      })
    );

    return res.json(rolesWithPermissions);
  } catch (error) {
    console.error("[settings/roles] Error fetching roles:", error);
    return res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/roles/permission-groups", async (req: Request, res: Response) => {
  return res.json(PERMISSION_GROUPS);
});

router.get("/roles/templates", 
  requireTenantPermission(Permissions.ROLES_VIEW),
  async (req: Request, res: Response) => {
    const { DEFAULT_TENANT_ROLES, ROLE_TEMPLATES } = await import("@shared/rbac/permissions");
    
    const templates = Object.entries(ROLE_TEMPLATES || {}).map(([key, meta]) => {
      const roleDef = DEFAULT_TENANT_ROLES[key as keyof typeof DEFAULT_TENANT_ROLES];
      return {
        key,
        name: meta.name,
        description: meta.description,
        highlights: meta.highlights,
        color: meta.color,
        permissions: roleDef?.permissions || [],
      };
    });
    
    return res.json(templates);
  }
);

router.post("/roles", 
  requireTenantPermission(Permissions.ROLES_CREATE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const schema = insertTenantRoleSchema.extend({
        permissions: z.array(z.string()).optional(),
      });
      
      const parsed = schema.safeParse({ ...req.body, tenantId: context.tenantId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const { permissions, ...roleData } = parsed.data;
      
      const role = await storage.createTenantRole({
        ...roleData,
        isSystem: false,
      });

      if (permissions && permissions.length > 0) {
        await storage.setTenantRolePermissions(role.id, permissions);
      }

      await logRoleEvent("ROLE_CREATED", {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        roleId: role.id,
        roleName: role.name,
        newPermissions: permissions || [],
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(201).json({ 
        ...role, 
        permissions: permissions || [] 
      });
    } catch (error) {
      console.error("[settings/roles] Error creating role:", error);
      return res.status(500).json({ error: "Failed to create role" });
    }
  }
);

router.get("/roles/:id", async (req: Request, res: Response) => {
  const context = (req as any).context;
  if (!context?.tenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const role = await storage.getTenantRole(req.params.id, context.tenantId);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const permissions = await storage.getTenantRolePermissions(role.id);
    return res.json({ ...role, permissions: permissions.map(p => p.permission) });
  } catch (error) {
    console.error("[settings/roles] Error fetching role:", error);
    return res.status(500).json({ error: "Failed to fetch role" });
  }
});

router.put("/roles/:id", 
  requireTenantPermission(Permissions.ROLES_EDIT),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const existingRole = await storage.getTenantRole(req.params.id, context.tenantId);
      if (!existingRole) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (existingRole.isSystem) {
        return res.status(403).json({ error: "Cannot modify system roles" });
      }

      const schema = insertTenantRoleSchema.partial().extend({
        permissions: z.array(z.string()).optional(),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const { permissions, ...updateData } = parsed.data;

      const oldPermissions = await storage.getTenantRolePermissions(req.params.id);
      const role = await storage.updateTenantRole(req.params.id, context.tenantId, updateData);

      if (permissions !== undefined) {
        await storage.setTenantRolePermissions(req.params.id, permissions);
      }

      const updatedPermissions = await storage.getTenantRolePermissions(req.params.id);

      if (role) {
        await logRoleEvent("ROLE_UPDATED", {
          tenantId: context.tenantId,
          actorUserId: context.userId,
          roleId: role.id,
          roleName: role.name,
          oldPermissions: oldPermissions.map(p => p.permission),
          newPermissions: updatedPermissions.map(p => p.permission),
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });
      }

      return res.json({ ...role, permissions: updatedPermissions.map(p => p.permission) });
    } catch (error) {
      console.error("[settings/roles] Error updating role:", error);
      return res.status(500).json({ error: "Failed to update role" });
    }
  }
);

router.put("/roles/:id/permissions", 
  requireTenantPermission(Permissions.ROLES_EDIT),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const existingRole = await storage.getTenantRole(req.params.id, context.tenantId);
      if (!existingRole) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (existingRole.isSystem) {
        return res.status(403).json({ error: "Cannot modify system role permissions" });
      }

      const schema = z.object({
        permissions: z.array(z.string()),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const oldPermissions = await storage.getTenantRolePermissions(req.params.id);
      await storage.setTenantRolePermissions(req.params.id, parsed.data.permissions);
      
      const updatedPermissions = await storage.getTenantRolePermissions(req.params.id);

      await logRoleEvent("ROLE_PERMISSIONS_UPDATED", {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        roleId: existingRole.id,
        roleName: existingRole.name,
        oldPermissions: oldPermissions.map(p => p.permission),
        newPermissions: updatedPermissions.map(p => p.permission),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.json({ 
        ...existingRole, 
        permissions: updatedPermissions.map(p => p.permission) 
      });
    } catch (error) {
      console.error("[settings/roles] Error updating permissions:", error);
      return res.status(500).json({ error: "Failed to update permissions" });
    }
  }
);

router.delete("/roles/:id", 
  requireTenantPermission(Permissions.ROLES_DELETE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const existingRole = await storage.getTenantRole(req.params.id, context.tenantId);
      if (!existingRole) {
        return res.status(404).json({ error: "Role not found" });
      }

      if (existingRole.isSystem) {
        return res.status(403).json({ error: "Cannot delete system roles" });
      }

      await storage.deleteTenantRole(req.params.id, context.tenantId);

      await logRoleEvent("ROLE_DELETED", {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        roleId: existingRole.id,
        roleName: existingRole.name,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(204).send();
    } catch (error) {
      console.error("[settings/roles] Error deleting role:", error);
      return res.status(500).json({ error: "Failed to delete role" });
    }
  }
);

// ==================== STAFF ENDPOINTS ====================

router.get("/staff", async (req: Request, res: Response) => {
  const context = (req as any).context;
  if (!context?.tenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const staffList = await storage.getTenantStaff(context.tenantId);
    
    const staffWithRoles = await Promise.all(
      staffList.map(async (member) => {
        let role = null;
        if (member.tenantRoleId) {
          role = await storage.getTenantRole(member.tenantRoleId, context.tenantId);
        }
        return {
          ...member,
          role: role ? { id: role.id, name: role.name } : null,
        };
      })
    );

    return res.json(staffWithRoles);
  } catch (error) {
    console.error("[settings/staff] Error fetching staff:", error);
    return res.status(500).json({ error: "Failed to fetch staff" });
  }
});

router.post("/staff", 
  requireTenantPermission(Permissions.STAFF_CREATE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = insertTenantStaffSchema.safeParse({ 
        ...req.body, 
        tenantId: context.tenantId 
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      // Check if email already exists
      const existing = await storage.getTenantStaffByEmail(parsed.data.email, context.tenantId);
      if (existing) {
        return res.status(409).json({ error: "Staff member with this email already exists" });
      }

      const staff = await storage.createTenantStaff(parsed.data);

      await logStaffEvent("STAFF_INVITED", {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        staffId: staff.id,
        staffEmail: staff.email,
        staffName: staff.fullName,
        newValue: { email: staff.email, roleId: staff.tenantRoleId },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(201).json(staff);
    } catch (error) {
      console.error("[settings/staff] Error creating staff:", error);
      return res.status(500).json({ error: "Failed to create staff member" });
    }
  }
);

router.get("/staff/:id", async (req: Request, res: Response) => {
  const context = (req as any).context;
  if (!context?.tenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const member = await storage.getTenantStaffMember(req.params.id, context.tenantId);
    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    let role = null;
    if (member.tenantRoleId) {
      role = await storage.getTenantRole(member.tenantRoleId, context.tenantId);
    }

    return res.json({ ...member, role: role ? { id: role.id, name: role.name } : null });
  } catch (error) {
    console.error("[settings/staff] Error fetching staff member:", error);
    return res.status(500).json({ error: "Failed to fetch staff member" });
  }
});

router.put("/staff/:id", 
  requireTenantPermission(Permissions.STAFF_EDIT),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const existingMember = await storage.getTenantStaffMember(req.params.id, context.tenantId);
      if (!existingMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const parsed = insertTenantStaffSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      // If email is being changed, check for duplicates
      if (parsed.data.email && parsed.data.email !== existingMember.email) {
        const existing = await storage.getTenantStaffByEmail(parsed.data.email, context.tenantId);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "Staff member with this email already exists" });
        }
      }

      const oldRoleId = existingMember.tenantRoleId;
      const staff = await storage.updateTenantStaff(req.params.id, context.tenantId, parsed.data);

      const event = parsed.data.tenantRoleId && parsed.data.tenantRoleId !== oldRoleId
        ? "STAFF_ROLE_CHANGED"
        : parsed.data.status && parsed.data.status !== existingMember.status
          ? (parsed.data.status === "active" ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED")
          : "STAFF_UPDATED";

      await logStaffEvent(event, {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        staffId: staff?.id || req.params.id,
        staffEmail: staff?.email || existingMember.email,
        staffName: staff?.fullName || existingMember.fullName,
        oldValue: { roleId: oldRoleId, status: existingMember.status },
        newValue: { roleId: staff?.tenantRoleId, status: staff?.status },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.json(staff);
    } catch (error) {
      console.error("[settings/staff] Error updating staff member:", error);
      return res.status(500).json({ error: "Failed to update staff member" });
    }
  }
);

router.delete("/staff/:id", 
  requireTenantPermission(Permissions.STAFF_DELETE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const existingMember = await storage.getTenantStaffMember(req.params.id, context.tenantId);
      if (!existingMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      await storage.deleteTenantStaff(req.params.id, context.tenantId);

      await logStaffEvent("STAFF_REMOVED", {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        staffId: existingMember.id,
        staffEmail: existingMember.email,
        staffName: existingMember.fullName,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(204).send();
    } catch (error) {
      console.error("[settings/staff] Error deleting staff member:", error);
      return res.status(500).json({ error: "Failed to delete staff member" });
    }
  }
);

router.post("/staff/:id/invite", 
  requireTenantPermission(Permissions.STAFF_INVITE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const member = await storage.getTenantStaffMember(req.params.id, context.tenantId);
      if (!member) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Revoke any existing pending invites for this staff member
      await storage.revokeStaffInvite(member.id);

      // Generate secure invite token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invite record
      const invite = await storage.createStaffInvite({
        tenantId: context.tenantId,
        staffId: member.id,
        tokenHash,
        email: member.email,
        expiresAt,
        invitedBy: context.userId,
      });

      // Update staff status to pending_invite
      await storage.updateTenantStaff(member.id, context.tenantId, {
        status: "pending_invite",
      });

      // Build invite URL
      const baseUrl = process.env.APP_URL || `https://${req.get("host")}`;
      const inviteUrl = `${baseUrl}/invite/${rawToken}`;

      // TODO: Send invite email here
      return res.json({ 
        success: true, 
        message: "Invite sent",
        inviteId: invite.id,
        inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined,
      });
    } catch (error) {
      console.error("[settings/staff] Error sending invite:", error);
      return res.status(500).json({ error: "Failed to send invite" });
    }
  }
);

router.post("/staff/:id/revoke-invite", 
  requireTenantPermission(Permissions.STAFF_INVITE),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const member = await storage.getTenantStaffMember(req.params.id, context.tenantId);
      if (!member) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      await storage.revokeStaffInvite(member.id);
      
      await storage.updateTenantStaff(member.id, context.tenantId, {
        status: "inactive",
      });

      return res.json({ success: true, message: "Invite revoked" });
    } catch (error) {
      console.error("[settings/staff] Error revoking invite:", error);
      return res.status(500).json({ error: "Failed to revoke invite" });
    }
  }
);

// ==================== LOGIN HISTORY ENDPOINTS ====================

router.get("/staff/:staffId/login-history",
  requireTenantPermission(Permissions.STAFF_VIEW),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { staffId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      const staff = await storage.getTenantStaffMember(staffId, context.tenantId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const { entries, total } = await getLoginHistory({
        tenantId: context.tenantId,
        staffId,
        limit,
        offset,
      });

      return res.json({
        entries,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("[settings/staff/login-history] Error:", error);
      return res.status(500).json({ error: "Failed to fetch login history" });
    }
  }
);

// ==================== SEED DEFAULTS ENDPOINT ====================

// Admin-only endpoint to seed missing roles and owner staff for existing tenants
router.post("/roles/seed-defaults",
  requireTenantPermission(Permissions.ROLES_EDIT),
  async (req: Request, res: Response) => {
    const context = (req as any).context;
    if (!context?.tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { db } = await import("../../db");
      const { tenantStaff, tenants } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      // Always run idempotent seed (inserts only missing roles)
      const rolesBefore = await storage.getTenantRoles(context.tenantId);
      await seedTenantRolesIfMissing(db, context.tenantId);
      const rolesAfter = await storage.getTenantRoles(context.tenantId);
      const rolesSeeded = rolesAfter.length > rolesBefore.length;

      // Verify Owner role exists after seeding
      const ownerRoleId = await getOwnerRoleId(db, context.tenantId);
      if (!ownerRoleId) {
        return res.status(500).json({ 
          error: "Failed to seed defaults: Owner role not found after seeding" 
        });
      }

      let ownerStaffCreated = false;
      let createdStaffId: string | null = null;

      // Check if any staff has Owner role
      const [existingOwnerStaff] = await db.select()
        .from(tenantStaff)
        .where(and(
          eq(tenantStaff.tenantId, context.tenantId),
          eq(tenantStaff.tenantRoleId, ownerRoleId)
        ))
        .limit(1);

      if (!existingOwnerStaff) {
        // Get tenant info to create placeholder owner (userId: null for admin-seeded)
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, context.tenantId));
        
        if (tenant) {
          const [newStaff] = await db.insert(tenantStaff).values({
            tenantId: context.tenantId,
            userId: null, // Placeholder owner - can be claimed later
            email: tenant.email || `owner@${tenant.slug || 'tenant'}.local`,
            fullName: (tenant.name || "Tenant") + " Owner",
            tenantRoleId: ownerRoleId,
            status: "active",
          }).returning();
          
          ownerStaffCreated = true;
          createdStaffId = newStaff.id;

          // Log staff creation audit event with actual staff id
          logStaffEvent("STAFF_ACTIVATED", {
            tenantId: context.tenantId,
            actorUserId: context.userId,
            staffId: newStaff.id,
            staffEmail: newStaff.email,
            metadata: { action: "seed_owner_staff", roleName: "Owner" },
          });
        }
      }

      const updatedRoles = await storage.getTenantRoles(context.tenantId);

      return res.json({
        success: true,
        rolesSeeded,
        ownerStaffCreated,
        createdStaffId,
        rolesCount: updatedRoles.length,
      });
    } catch (error) {
      console.error("[settings/roles/seed-defaults] Error:", error);
      return res.status(500).json({ error: "Failed to seed defaults" });
    }
  }
);

export default router;
