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

export default router;
