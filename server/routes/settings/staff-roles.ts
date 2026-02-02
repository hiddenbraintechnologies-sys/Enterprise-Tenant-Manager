import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { requireTenantPermission } from "../../middleware/tenant-permission";
import { Permissions, PERMISSION_GROUPS, DEFAULT_TENANT_ROLES } from "@shared/rbac/permissions";
import { insertTenantRoleSchema, insertTenantStaffSchema } from "@shared/schema";

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

      const role = await storage.updateTenantRole(req.params.id, context.tenantId, updateData);

      if (permissions !== undefined) {
        await storage.setTenantRolePermissions(req.params.id, permissions);
      }

      const updatedPermissions = await storage.getTenantRolePermissions(req.params.id);
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

      await storage.setTenantRolePermissions(req.params.id, parsed.data.permissions);
      
      const updatedPermissions = await storage.getTenantRolePermissions(req.params.id);
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

      const staff = await storage.updateTenantStaff(req.params.id, context.tenantId, parsed.data);
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

      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await storage.updateTenantStaff(req.params.id, context.tenantId, {
        inviteToken,
        inviteExpiresAt,
        status: "pending_invite",
      });

      // TODO: Send invite email here
      // For now, just return the token for testing
      return res.json({ 
        success: true, 
        message: "Invite sent",
        inviteToken: process.env.NODE_ENV === "development" ? inviteToken : undefined,
      });
    } catch (error) {
      console.error("[settings/staff] Error sending invite:", error);
      return res.status(500).json({ error: "Failed to send invite" });
    }
  }
);

export default router;
