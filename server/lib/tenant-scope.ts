import { eq, and, SQL } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import type { Request } from "express";
import { TenantIsolationError } from "../core/tenant-isolation";

export function scopedWhere<T extends PgTable>(
  table: T,
  tenantId: string,
  additionalConditions?: SQL | SQL[]
): SQL {
  const tenantColumn = (table as any).tenantId;
  
  if (!tenantColumn) {
    throw new Error(`Table does not have a tenantId column - cannot apply tenant scoping`);
  }
  
  const tenantCondition = eq(tenantColumn, tenantId);
  
  if (!additionalConditions) {
    return tenantCondition;
  }
  
  const conditions = Array.isArray(additionalConditions) 
    ? additionalConditions 
    : [additionalConditions];
  
  return and(tenantCondition, ...conditions)!;
}

export function scopedWhereById<T extends PgTable>(
  table: T,
  tenantId: string,
  idColumn: PgColumn,
  id: string
): SQL {
  const tenantColumn = (table as any).tenantId;
  
  if (!tenantColumn) {
    throw new Error(`Table does not have a tenantId column - cannot apply tenant scoping`);
  }
  
  return and(eq(tenantColumn, tenantId), eq(idColumn, id))!;
}

export function scopedInsert<T extends { tenantId?: string }>(
  data: Omit<T, "tenantId">,
  tenantId: string
): T {
  return {
    ...data,
    tenantId,
  } as T;
}

export function getTenantIdFromRequest(req: Request): string {
  const tenantId = req.context?.tenant?.id || (req as any).tenantId;
  
  if (!tenantId) {
    throw new TenantIsolationError("Tenant context required", 403);
  }
  
  return tenantId;
}

export function validateRecordBelongsToTenant(
  record: { tenantId?: string | null } | null | undefined,
  tenantId: string
): void {
  if (!record) {
    throw new TenantIsolationError("Record not found", 404);
  }
  
  if (record.tenantId !== tenantId) {
    throw new TenantIsolationError("Record not found", 404);
  }
}

export const TENANT_OWNED_TABLES = [
  "employees",
  "departments",
  "leave_requests",
  "attendance_records",
  "salary_slips",
  "invoices",
  "bookings",
  "customers",
  "services",
  "products",
  "appointments",
  "projects",
  "timesheets",
  "payroll_runs",
  "documents",
  "notifications",
  "tenant_features",
  "tenant_settings",
  "tenant_branding",
  "tenant_addons",
  "api_tokens",
  "user_tenants",
  "audit_logs",
] as const;

export type TenantOwnedTable = typeof TENANT_OWNED_TABLES[number];
