import { Router } from "express";
import { db } from "../db";
import { 
  tenants, users, platformAdmins, platformAuditLogs, platformSettings,
  userTenants, customers, bookings, invoices
} from "@shared/schema";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";
import { 
  authenticatePlatformAdmin, 
  requirePlatformRole,
  requirePlatformPermission 
} from "../core/auth-middleware";
import { JWTAuthService } from "../core/jwt";
import bcrypt from "bcrypt";
import { z } from "zod";

const router = Router();
const jwtAuthService = new JWTAuthService();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid credentials format" });
    }

    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const [platformAdmin] = await db.select()
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, user.id));

    if (!platformAdmin) {
      return res.status(403).json({ message: "Not a platform administrator" });
    }

    if (platformAdmin.status !== "active") {
      return res.status(403).json({ message: "Admin account is not active" });
    }

    const permissions = platformAdmin.role === "super_admin" 
      ? ["*"] 
      : (platformAdmin.permissions as string[]) || [];

    const tokens = await jwtAuthService.generateTokenPair(
      user.id,
      null,
      null,
      permissions,
      { userAgent: req.headers["user-agent"], ipAddress: req.ip }
    );

    await db.update(platformAdmins).set({
      lastLoginAt: new Date(),
    }).where(eq(platformAdmins.id, platformAdmin.id));

    await db.insert(platformAuditLogs).values({
      adminId: platformAdmin.id,
      action: "login",
      resource: "platform",
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      platformAdmin: {
        id: platformAdmin.id,
        role: platformAdmin.role,
        mustChangePassword: platformAdmin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Platform login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

router.use(authenticatePlatformAdmin());

async function logPlatformAction(
  adminId: string,
  action: string,
  resource: string,
  resourceId?: string,
  targetTenantId?: string,
  metadata?: Record<string, unknown>,
  req?: { ip?: string; headers?: { "user-agent"?: string } }
) {
  await db.insert(platformAuditLogs).values({
    adminId,
    action,
    resource,
    resourceId,
    targetTenantId,
    metadata: metadata || {},
    ipAddress: req?.ip,
    userAgent: req?.headers?.["user-agent"],
  });
}

router.get("/tenants", async (req, res) => {
  try {
    const { page = "1", limit = "20", status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereCondition = undefined;
    if (status === "active") {
      whereCondition = and(eq(tenants.isActive, true), eq(tenants.isSuspended, false));
    } else if (status === "suspended") {
      whereCondition = eq(tenants.isSuspended, true);
    } else if (status === "inactive") {
      whereCondition = eq(tenants.isActive, false);
    }

    const query = whereCondition 
      ? db.select().from(tenants).where(whereCondition).orderBy(desc(tenants.createdAt))
      : db.select().from(tenants).orderBy(desc(tenants.createdAt));

    const [allTenants, totalCount] = await Promise.all([
      query.limit(parseInt(limit as string)).offset(offset),
      db.select({ count: count() }).from(tenants),
    ]);

    res.json({
      tenants: allTenants,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ message: "Failed to fetch tenants" });
  }
});

router.get("/tenants/:id", async (req, res) => {
  try {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.id));
    
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const [userCount] = await db.select({ count: count() })
      .from(userTenants)
      .where(eq(userTenants.tenantId, tenant.id));

    const [customerCount] = await db.select({ count: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenant.id));

    res.json({
      ...tenant,
      stats: {
        userCount: userCount?.count || 0,
        customerCount: customerCount?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ message: "Failed to fetch tenant" });
  }
});

router.post("/tenants/:id/suspend", 
  requirePlatformRole("super_admin", "platform_admin"),
  requirePlatformPermission("tenants:suspend"),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const tenantId = req.params.id;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      await db.update(tenants).set({
        isSuspended: true,
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.platformContext!.user.id,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "suspend",
        "tenant",
        tenantId,
        tenantId,
        { reason },
        req
      );

      res.json({ message: "Tenant suspended successfully" });
    } catch (error) {
      console.error("Error suspending tenant:", error);
      res.status(500).json({ message: "Failed to suspend tenant" });
    }
  }
);

router.post("/tenants/:id/unsuspend", 
  requirePlatformRole("super_admin", "platform_admin"),
  requirePlatformPermission("tenants:suspend"),
  async (req, res) => {
    try {
      const tenantId = req.params.id;

      await db.update(tenants).set({
        isSuspended: false,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "unsuspend",
        "tenant",
        tenantId,
        tenantId,
        {},
        req
      );

      res.json({ message: "Tenant unsuspended successfully" });
    } catch (error) {
      console.error("Error unsuspending tenant:", error);
      res.status(500).json({ message: "Failed to unsuspend tenant" });
    }
  }
);

const updateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  businessType: z.enum(["clinic", "salon", "pg", "coworking", "service"]).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.patch("/tenants/:id",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = updateTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const tenantId = req.params.id;
      const { name, businessType, email, phone, address, isActive } = parsed.data;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (businessType !== undefined) updates.businessType = businessType;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (address !== undefined) updates.address = address;
      if (isActive !== undefined) updates.isActive = isActive;

      await db.update(tenants).set(updates).where(eq(tenants.id, tenantId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_tenant",
        "tenant",
        tenantId,
        tenantId,
        { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt"), businessType },
        req
      );

      res.json({ message: "Tenant updated successfully" });
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  }
);

router.get("/tenants/:id/users",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const tenantId = req.params.id;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const tenantUsers = await db.select({
        id: userTenants.id,
        userId: userTenants.userId,
        roleId: userTenants.roleId,
        isDefault: userTenants.isDefault,
        joinedAt: userTenants.joinedAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
      })
        .from(userTenants)
        .innerJoin(users, eq(userTenants.userId, users.id))
        .leftJoin(roles, eq(userTenants.roleId, roles.id))
        .where(eq(userTenants.tenantId, tenantId))
        .orderBy(desc(userTenants.joinedAt));

      res.json(tenantUsers);
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      res.status(500).json({ message: "Failed to fetch tenant users" });
    }
  }
);

const addTenantUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8),
  roleId: z.string().optional(),
});

router.post("/tenants/:id/users",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = addTenantUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const tenantId = req.params.id;
      const { email, firstName, lastName, password, roleId } = parsed.data;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      let [user] = await db.select().from(users).where(eq(users.email, email));

      if (!user) {
        const passwordHash = await bcrypt.hash(password, 12);
        [user] = await db.insert(users).values({
          email,
          firstName,
          lastName,
          passwordHash,
        }).returning();
      }

      const [existingMembership] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, user.id), eq(userTenants.tenantId, tenantId)));

      if (existingMembership) {
        return res.status(409).json({ message: "User is already a member of this tenant" });
      }

      await db.insert(userTenants).values({
        userId: user.id,
        tenantId,
        roleId: roleId || null,
        isDefault: false,
        invitedBy: req.platformContext!.user.id,
      });

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "add_tenant_user",
        "user_tenant",
        user.id,
        tenantId,
        { email, roleId },
        req
      );

      res.status(201).json({ message: "User added to tenant successfully", userId: user.id });
    } catch (error) {
      console.error("Error adding tenant user:", error);
      res.status(500).json({ message: "Failed to add user to tenant" });
    }
  }
);

const updateTenantUserSchema = z.object({
  roleId: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

router.patch("/tenants/:id/users/:userId",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = updateTenantUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const { id: tenantId, userId } = req.params;
      const { roleId, isDefault } = parsed.data;

      const [membership] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

      if (!membership) {
        return res.status(404).json({ message: "User is not a member of this tenant" });
      }

      const updates: Record<string, unknown> = {};
      if (roleId !== undefined) updates.roleId = roleId;
      if (isDefault !== undefined) updates.isDefault = isDefault;

      if (Object.keys(updates).length > 0) {
        await db.update(userTenants).set(updates)
          .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      }

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_tenant_user",
        "user_tenant",
        userId,
        tenantId,
        { roleId },
        req
      );

      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating tenant user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);

router.delete("/tenants/:id/users/:userId",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const { id: tenantId, userId } = req.params;

      const [membership] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

      if (!membership) {
        return res.status(404).json({ message: "User is not a member of this tenant" });
      }

      await db.delete(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "remove_tenant_user",
        "user_tenant",
        userId,
        tenantId,
        {},
        req
      );

      res.json({ message: "User removed from tenant successfully" });
    } catch (error) {
      console.error("Error removing tenant user:", error);
      res.status(500).json({ message: "Failed to remove user from tenant" });
    }
  }
);

router.get("/tenants/:id/roles",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const tenantId = req.params.id;

      const tenantRoles = await db.select({
        id: roles.id,
        name: roles.name,
        displayName: roles.displayName,
        permissions: roles.permissions,
      })
        .from(roles)
        .where(eq(roles.tenantId, tenantId))
        .orderBy(roles.displayName);

      res.json(tenantRoles);
    } catch (error) {
      console.error("Error fetching tenant roles:", error);
      res.status(500).json({ message: "Failed to fetch tenant roles" });
    }
  }
);

router.patch("/tenants/:id/subscription",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const { subscriptionTier, subscriptionExpiresAt, maxUsers, maxCustomers } = req.body;
      const tenantId = req.params.id;

      await db.update(tenants).set({
        subscriptionTier,
        subscriptionExpiresAt: subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null,
        maxUsers,
        maxCustomers,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_subscription",
        "tenant",
        tenantId,
        tenantId,
        { subscriptionTier, maxUsers, maxCustomers },
        req
      );

      res.json({ message: "Subscription updated successfully" });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  }
);

router.get("/analytics", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      recentTenants,
    ] = await Promise.all([
      db.select({ count: count() }).from(tenants),
      db.select({ count: count() }).from(tenants)
        .where(and(eq(tenants.isActive, true), eq(tenants.isSuspended, false))),
      db.select({ count: count() }).from(tenants).where(eq(tenants.isSuspended, true)),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(tenants)
        .where(gte(tenants.createdAt, thirtyDaysAgo)),
    ]);

    const subscriptionBreakdown = await db
      .select({
        tier: tenants.subscriptionTier,
        count: count(),
      })
      .from(tenants)
      .groupBy(tenants.subscriptionTier);

    res.json({
      overview: {
        totalTenants: totalTenants[0]?.count || 0,
        activeTenants: activeTenants[0]?.count || 0,
        suspendedTenants: suspendedTenants[0]?.count || 0,
        totalUsers: totalUsers[0]?.count || 0,
        newTenantsLast30Days: recentTenants[0]?.count || 0,
      },
      subscriptionBreakdown,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

router.get("/admins",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const admins = await db
        .select({
          id: platformAdmins.id,
          userId: platformAdmins.userId,
          role: platformAdmins.role,
          status: platformAdmins.status,
          lastLoginAt: platformAdmins.lastLoginAt,
          createdAt: platformAdmins.createdAt,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(platformAdmins)
        .innerJoin(users, eq(platformAdmins.userId, users.id))
        .orderBy(desc(platformAdmins.createdAt));

      res.json(admins);
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  }
);

router.get("/audit-logs", async (req, res) => {
  try {
    const { page = "1", limit = "50", action, resource } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let conditions = [];
    if (action) conditions.push(eq(platformAuditLogs.action, action as string));
    if (resource) conditions.push(eq(platformAuditLogs.resource, resource as string));

    const logs = await db
      .select({
        id: platformAuditLogs.id,
        action: platformAuditLogs.action,
        resource: platformAuditLogs.resource,
        resourceId: platformAuditLogs.resourceId,
        targetTenantId: platformAuditLogs.targetTenantId,
        metadata: platformAuditLogs.metadata,
        createdAt: platformAuditLogs.createdAt,
        adminEmail: users.email,
        adminFirstName: users.firstName,
        adminLastName: users.lastName,
      })
      .from(platformAuditLogs)
      .innerJoin(platformAdmins, eq(platformAuditLogs.adminId, platformAdmins.id))
      .innerJoin(users, eq(platformAdmins.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(platformAuditLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

router.get("/settings",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const settings = await db.select().from(platformSettings);
      const safeSettings = settings.map(s => ({
        ...s,
        value: s.isSecret ? "[REDACTED]" : s.value,
      }));
      res.json(safeSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  }
);

router.put("/settings/:key",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const { value, description, isSecret } = req.body;
      const key = req.params.key;

      await db.insert(platformSettings).values({
        key,
        value,
        description,
        isSecret,
        updatedBy: req.platformContext!.user.id,
      }).onConflictDoUpdate({
        target: platformSettings.key,
        set: {
          value,
          description,
          isSecret,
          updatedAt: new Date(),
          updatedBy: req.platformContext!.user.id,
        },
      });

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_setting",
        "platform_setting",
        key,
        undefined,
        { key },
        req
      );

      res.json({ message: "Setting updated successfully" });
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  }
);

router.get("/me", async (req, res) => {
  try {
    const { platformAdmin, user, isSuperAdmin } = req.platformContext!;
    
    res.json({
      id: platformAdmin.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: platformAdmin.role,
      status: platformAdmin.status,
      permissions: platformAdmin.permissions,
      mustChangePassword: platformAdmin.mustChangePassword,
      isSuperAdmin,
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8),
  makePlatformAdmin: z.boolean().optional(),
  platformRole: z.enum(["super_admin", "platform_admin"]).optional(),
  platformPermissions: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).optional(),
});

router.get("/users",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const { page = "1", limit = "50", search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);

      const allUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(parseInt(limit as string))
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(users);

      const usersWithAdminStatus = await Promise.all(
        allUsers.map(async (user) => {
          const [admin] = await db.select({
            id: platformAdmins.id,
            role: platformAdmins.role,
            status: platformAdmins.status,
          }).from(platformAdmins).where(eq(platformAdmins.userId, user.id));
          
          return {
            ...user,
            isPlatformAdmin: !!admin,
            platformAdmin: admin || null,
          };
        })
      );

      res.json({
        users: usersWithAdminStatus,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount?.count || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

router.post("/users",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const { email, firstName, lastName, password, makePlatformAdmin, platformRole, platformPermissions } = parsed.data;

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [newUser] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        passwordHash,
      }).returning();

      if (makePlatformAdmin && platformRole) {
        await db.insert(platformAdmins).values({
          userId: newUser.id,
          role: platformRole,
          status: "active",
          permissions: platformPermissions || [],
          mustChangePassword: true,
          createdBy: req.platformContext!.user.id,
        });
      }

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "create_user",
        "user",
        newUser.id,
        undefined,
        { email, makePlatformAdmin, platformRole },
        req
      );

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

router.patch("/users/:id",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const userId = req.params.id;
      const { firstName, lastName, password } = parsed.data;

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (password) updates.passwordHash = await bcrypt.hash(password, 12);

      await db.update(users).set(updates).where(eq(users.id, userId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_user",
        "user",
        userId,
        undefined,
        { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt") },
        req
      );

      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  }
);

router.delete("/users/:id",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const userId = req.params.id;

      if (userId === req.platformContext!.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await db.delete(platformAdmins).where(eq(platformAdmins.userId, userId));
      await db.delete(userTenants).where(eq(userTenants.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "delete_user",
        "user",
        userId,
        undefined,
        { email: existingUser.email },
        req
      );

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  }
);

const createAdminSchema = z.object({
  userId: z.string(),
  role: z.enum(["super_admin", "platform_admin"]),
  permissions: z.array(z.string()).optional(),
});

const updateAdminSchema = z.object({
  role: z.enum(["super_admin", "platform_admin"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  permissions: z.array(z.string()).optional(),
});

router.post("/admins",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = createAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const { userId, role, permissions } = parsed.data;

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const [existingAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.userId, userId));
      if (existingAdmin) {
        return res.status(409).json({ message: "User is already a platform admin" });
      }

      const [newAdmin] = await db.insert(platformAdmins).values({
        userId,
        role,
        status: "active",
        permissions: permissions || [],
        mustChangePassword: false,
        createdBy: req.platformContext!.user.id,
      }).returning();

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "create_admin",
        "platform_admin",
        newAdmin.id,
        undefined,
        { userId, role },
        req
      );

      res.status(201).json(newAdmin);
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  }
);

router.patch("/admins/:id",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const parsed = updateAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const adminId = req.params.id;
      const { role, status, permissions } = parsed.data;

      const [existingAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, adminId));
      if (!existingAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (existingAdmin.id === req.platformContext!.platformAdmin.id) {
        return res.status(400).json({ message: "Cannot modify your own admin account" });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (permissions) updates.permissions = permissions;

      await db.update(platformAdmins).set(updates).where(eq(platformAdmins.id, adminId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "update_admin",
        "platform_admin",
        adminId,
        undefined,
        { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt") },
        req
      );

      res.json({ message: "Admin updated successfully" });
    } catch (error) {
      console.error("Error updating admin:", error);
      res.status(500).json({ message: "Failed to update admin" });
    }
  }
);

router.delete("/admins/:id",
  requirePlatformRole("super_admin"),
  async (req, res) => {
    try {
      const adminId = req.params.id;

      const [existingAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, adminId));
      if (!existingAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (existingAdmin.id === req.platformContext!.platformAdmin.id) {
        return res.status(400).json({ message: "Cannot remove your own admin status" });
      }

      await db.delete(platformAdmins).where(eq(platformAdmins.id, adminId));

      await logPlatformAction(
        req.platformContext!.platformAdmin.id,
        "delete_admin",
        "platform_admin",
        adminId,
        undefined,
        { userId: existingAdmin.userId },
        req
      );

      res.json({ message: "Admin removed successfully" });
    } catch (error) {
      console.error("Error removing admin:", error);
      res.status(500).json({ message: "Failed to remove admin" });
    }
  }
);

export default router;
