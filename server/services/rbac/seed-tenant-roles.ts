import { eq, and } from "drizzle-orm";
import { tenantRoles, tenantRolePermissions } from "@shared/schema";
import { DEFAULT_TENANT_ROLES, TenantRoleKey } from "@shared/rbac/permissions";

type DbClient = {
  select: typeof import("../../db").db.select;
  insert: typeof import("../../db").db.insert;
};

export async function seedTenantRolesIfMissing(
  tx: DbClient,
  tenantId: string
): Promise<void> {
  const existing = await tx
    .select({ id: tenantRoles.id })
    .from(tenantRoles)
    .where(eq(tenantRoles.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) return;

  for (const key of Object.keys(DEFAULT_TENANT_ROLES) as TenantRoleKey[]) {
    const roleSeed = DEFAULT_TENANT_ROLES[key];

    const [role] = await tx
      .insert(tenantRoles)
      .values({
        tenantId,
        name: roleSeed.name,
        description: roleSeed.description,
        isDefault: roleSeed.isDefault,
        isSystem: roleSeed.isSystem,
      })
      .returning({ id: tenantRoles.id });

    if (roleSeed.permissions?.length) {
      await tx.insert(tenantRolePermissions).values(
        roleSeed.permissions.map((p) => ({
          tenantRoleId: role.id,
          permission: p,
        }))
      );
    }
  }
}

export async function getOwnerRoleId(
  tx: DbClient,
  tenantId: string
): Promise<string | undefined> {
  const [owner] = await tx
    .select({ id: tenantRoles.id })
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.name, "Owner")))
    .limit(1);

  return owner?.id;
}

export async function getRoleIdByName(
  tx: DbClient,
  tenantId: string,
  roleName: string
): Promise<string | undefined> {
  const [role] = await tx
    .select({ id: tenantRoles.id })
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.name, roleName)))
    .limit(1);

  return role?.id;
}
