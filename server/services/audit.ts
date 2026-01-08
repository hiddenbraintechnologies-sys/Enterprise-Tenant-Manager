import { auditService } from "../core/audit";
import type { AuditAction } from "../core/audit";

export async function logHrmsAudit(
  tenantId: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
  userId?: string
): Promise<void> {
  await auditService.logAsync({
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    oldValue,
    newValue,
    metadata: { module: "hrms" },
  });
}

export async function logModuleAudit(
  moduleName: string,
  tenantId: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
  userId?: string
): Promise<void> {
  await auditService.logAsync({
    tenantId,
    userId,
    action,
    resource,
    resourceId,
    oldValue,
    newValue,
    metadata: { module: moduleName },
  });
}

export { auditService };
