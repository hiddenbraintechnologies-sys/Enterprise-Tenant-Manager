import { db } from "../db";
import { 
  tenants, tenantSettings, tenantDomains, userTenants, roles,
  type Tenant, type InsertTenant, type TenantSettings, type InsertTenantSettings,
  type TenantDomain, type InsertTenantDomain, type UserTenant
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { featureService, FEATURES, BUSINESS_TYPE_MODULES, type BusinessType } from "./features";

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
    const [tenant] = await db.insert(tenants).values(data).returning();

    await db.insert(tenantSettings).values({
      tenantId: tenant.id,
    });

    const businessType = (data.businessType || "service") as BusinessType;
    const modulesToEnable = BUSINESS_TYPE_MODULES[businessType] || BUSINESS_TYPE_MODULES.service;

    for (const featureCode of modulesToEnable) {
      await featureService.enableFeature(tenant.id, featureCode);
    }

    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    if ("businessType" in data) {
      delete data.businessType;
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

  async ensureUserHasTenant(userId: string): Promise<{ tenant: Tenant; roleId: string }> {
    const existingUserTenants = await this.getUserTenants(userId);
    
    if (existingUserTenants.length > 0) {
      const defaultTenant = existingUserTenants.find(ut => ut.isDefault) || existingUserTenants[0];
      return { tenant: defaultTenant.tenant, roleId: defaultTenant.roleId };
    }

    const tenant = await this.getOrCreateDefaultTenant();
    
    let [adminRole] = await db.select().from(roles).where(eq(roles.id, "role_admin"));
    
    if (!adminRole) {
      [adminRole] = await db.insert(roles).values({
        id: "role_admin",
        name: "Admin",
        description: "Full administrative access",
        isSystem: true,
      }).onConflictDoNothing().returning();
      
      if (!adminRole) {
        [adminRole] = await db.select().from(roles).where(eq(roles.id, "role_admin"));
      }
    }
    
    const roleId = adminRole?.id || "role_admin";

    await this.addUserToTenant(userId, tenant.id, roleId);

    return { tenant, roleId };
  }
}

export const tenantService = new TenantService();
