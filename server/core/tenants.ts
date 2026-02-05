import { db } from "../db";
import { 
  tenants, tenantSettings, tenantDomains, userTenants, roles, tenantRoles, tenantStaff,
  type Tenant, type InsertTenant, type TenantSettings, type InsertTenantSettings,
  type TenantDomain, type InsertTenantDomain, type UserTenant
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { featureService, FEATURES, BUSINESS_TYPE_MODULES, type BusinessType } from "./features";
import { seedTenantRolesIfMissing, getOwnerRoleId } from "../services/rbac/seed-tenant-roles";

export class TenantService {
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    const [result] = await db.select({
      tenant: tenants,
    })
    .from(tenantDomains)
    .leftJoin(tenants, eq(tenantDomains.tenantId, tenants.id))
    .where(and(
      eq(tenantDomains.domain, domain),
      eq(tenantDomains.isVerified, true)
    ));
    
    return result?.tenant ?? undefined;
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    return await db.transaction(async (tx) => {
      const [tenant] = await tx.insert(tenants).values(data).returning();

      await tx.insert(tenantSettings).values({
        tenantId: tenant.id,
      });

      // Seed default tenant roles (Owner, Admin, Manager, Staff, Viewer)
      await seedTenantRolesIfMissing(tx, tenant.id);

      // Verify Owner role was created
      const ownerRoleId = await getOwnerRoleId(tx, tenant.id);
      if (!ownerRoleId) {
        throw new Error("Failed to create Owner role for tenant");
      }

      // Enable business-type specific modules (outside transaction for feature service)
      const businessType = (data.businessType || "service") as BusinessType;
      const modulesToEnable = BUSINESS_TYPE_MODULES[businessType] || BUSINESS_TYPE_MODULES.service;

      for (const featureCode of modulesToEnable) {
        await featureService.enableFeature(tenant.id, featureCode);
      }

      return tenant;
    });
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    // Always prevent businessType changes
    if ("businessType" in data) {
      delete data.businessType;
    }

    // For clinic tenants, enforce immutability on timezone and currency
    const [currentTenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (currentTenant?.businessType === "clinic") {
      if ("timezone" in data) {
        delete data.timezone;
      }
      if ("currency" in data) {
        delete data.currency;
      }
    }

    const [updated] = await db.update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async deleteTenant(id: string): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getTenantSettings(tenantId: string): Promise<TenantSettings | undefined> {
    const [settings] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));
    return settings;
  }

  async updateTenantSettings(tenantId: string, data: Partial<InsertTenantSettings>): Promise<TenantSettings | undefined> {
    const [existing] = await db.select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));

    if (existing) {
      const [updated] = await db.update(tenantSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tenantSettings.tenantId, tenantId))
        .returning();
      return updated;
    }

    const [created] = await db.insert(tenantSettings)
      .values({ tenantId, ...data })
      .returning();
    return created;
  }

  async addDomain(tenantId: string, domain: string, isPrimary = false): Promise<TenantDomain> {
    if (isPrimary) {
      await db.update(tenantDomains)
        .set({ isPrimary: false })
        .where(eq(tenantDomains.tenantId, tenantId));
    }

    const [created] = await db.insert(tenantDomains)
      .values({ tenantId, domain, isPrimary })
      .returning();
    return created;
  }

  async removeDomain(tenantId: string, domain: string): Promise<void> {
    await db.delete(tenantDomains)
      .where(and(
        eq(tenantDomains.tenantId, tenantId),
        eq(tenantDomains.domain, domain)
      ));
  }

  async verifyDomain(tenantId: string, domain: string): Promise<void> {
    await db.update(tenantDomains)
      .set({ isVerified: true })
      .where(and(
        eq(tenantDomains.tenantId, tenantId),
        eq(tenantDomains.domain, domain)
      ));
  }

  async getDomains(tenantId: string): Promise<TenantDomain[]> {
    return db.select()
      .from(tenantDomains)
      .where(eq(tenantDomains.tenantId, tenantId));
  }

  async addUserToTenant(userId: string, tenantId: string, roleId: string, invitedBy?: string): Promise<UserTenant> {
    const existingUserTenants = await db.select()
      .from(userTenants)
      .where(eq(userTenants.userId, userId));

    const isDefault = existingUserTenants.length === 0;

    const [created] = await db.insert(userTenants)
      .values({
        userId,
        tenantId,
        roleId,
        isDefault,
        invitedBy,
      })
      .returning();
    return created;
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    await db.delete(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async updateUserRole(userId: string, tenantId: string, roleId: string): Promise<void> {
    await db.update(userTenants)
      .set({ roleId })
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async setDefaultTenant(userId: string, tenantId: string): Promise<void> {
    await db.update(userTenants)
      .set({ isDefault: false })
      .where(eq(userTenants.userId, userId));

    await db.update(userTenants)
      .set({ isDefault: true })
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async getUserTenants(userId: string): Promise<(UserTenant & { tenant: Tenant })[]> {
    const results = await db.select({
      userTenant: userTenants,
      tenant: tenants,
    })
    .from(userTenants)
    .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(eq(userTenants.userId, userId));

    return results.map(r => ({
      ...r.userTenant,
      tenant: r.tenant!,
    }));
  }

  async getOrCreateDefaultTenant(): Promise<Tenant> {
    const [existing] = await db.select().from(tenants).limit(1);
    if (existing) {
      return existing;
    }

    return this.createTenant({
      name: "My Business",
      businessType: "service",
      email: "admin@example.com",
      currency: "INR",
      timezone: "Asia/Kolkata",
    });
  }

  async ensureUserHasTenant(userId: string): Promise<{ tenant: Tenant; roleId: string; tenantRoleId?: string }> {
    const existingUserTenants = await this.getUserTenants(userId);
    
    if (existingUserTenants.length > 0) {
      const defaultTenant = existingUserTenants.find(ut => ut.isDefault) || existingUserTenants[0];
      return { tenant: defaultTenant.tenant, roleId: defaultTenant.roleId };
    }

    const tenant = await this.getOrCreateDefaultTenant();
    
    // Use transaction for atomic role seeding and assignment
    const result = await db.transaction(async (tx) => {
      // Seed default roles (Owner, Admin, Manager, Staff, Viewer)
      await seedTenantRolesIfMissing(tx, tenant.id);
      
      // Get the Owner role (guaranteed to exist after seeding)
      let ownerRoleId = await getOwnerRoleId(tx, tenant.id);
      
      // Guard: Owner role must exist after seeding
      if (!ownerRoleId) {
        throw new Error("Failed to create Owner role for tenant - role seeding failed");
      }
      
      // Get/create the global admin role for backward compatibility (userTenants table)
      let [globalAdminRole] = await tx.select().from(roles).where(eq(roles.id, "role_admin"));
      
      if (!globalAdminRole) {
        [globalAdminRole] = await tx.insert(roles).values({
          id: "role_admin",
          name: "Admin",
          description: "Full administrative access",
          isSystem: true,
        }).onConflictDoNothing().returning();
        
        if (!globalAdminRole) {
          [globalAdminRole] = await tx.select().from(roles).where(eq(roles.id, "role_admin"));
        }
      }
      
      const globalRoleId = globalAdminRole?.id || "role_admin";

      // Add user to tenant (userTenants table)
      await tx.insert(userTenants).values({
        userId,
        tenantId: tenant.id,
        roleId: globalRoleId,
        isDefault: true,
      }).onConflictDoNothing();
      
      // Create tenantStaff record with Owner role
      if (ownerRoleId) {
        const [existingStaff] = await tx.select().from(tenantStaff)
          .where(and(eq(tenantStaff.tenantId, tenant.id), eq(tenantStaff.userId, userId)));
        
        if (!existingStaff) {
          await tx.insert(tenantStaff).values({
            tenantId: tenant.id,
            userId,
            email: "",
            fullName: "Owner",
            tenantRoleId: ownerRoleId,
            status: "active",
          });
        }
      }
      
      return { globalRoleId, ownerRoleId };
    });

    return { tenant, roleId: result.globalRoleId, tenantRoleId: result.ownerRoleId };
  }
}

export const tenantService = new TenantService();
