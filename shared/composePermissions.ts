import { ROLE_PERMISSIONS, type Permission, type Role } from "./rbac";
import { PLAN_PERMISSIONS, ADDON_PERMISSIONS, type Plan, type Addon } from "./plans";

/**
 * Composes final permissions from role, plan, and addons.
 * 
 * Permissions = Role + Plan + Addons
 * 
 * Use this once during login/session refresh and store permissions on the user object.
 */
export function composePermissions({
  role,
  plan,
  addons,
}: {
  role: Role;
  plan: Plan;
  addons: Addon[];
}): Permission[] {
  const perms = new Set<Permission>();

  const rolePerms = ROLE_PERMISSIONS[role];
  if (rolePerms) {
    rolePerms.forEach(p => perms.add(p));
  }

  const planPerms = PLAN_PERMISSIONS[plan];
  if (planPerms) {
    planPerms.forEach(p => perms.add(p));
  }

  addons.forEach(addon => {
    const addonPerms = ADDON_PERMISSIONS[addon];
    if (addonPerms) {
      addonPerms.forEach(p => perms.add(p));
    }
  });

  return [...perms];
}

/**
 * Checks if a user has a specific permission based on their composed permissions.
 */
export function hasComposedPermission(
  permissions: Permission[],
  required: Permission
): boolean {
  return permissions.includes(required);
}

/**
 * Checks if a user has all of the specified permissions.
 */
export function hasAllComposedPermissions(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.every(p => permissions.includes(p));
}

/**
 * Checks if a user has any of the specified permissions.
 */
export function hasAnyComposedPermission(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.some(p => permissions.includes(p));
}
