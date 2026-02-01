import { eq, and, SQL } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import type { Request } from "express";

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
    throw new Error("Tenant ID not available in request context");
  }
  
  return tenantId;
}

export function validateRecordBelongsToTenant(
  record: { tenantId?: string | null } | null | undefined,
  tenantId: string
): void {
  if (!record) {
    const error = new Error("Record not found") as any;
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  }
  
  if (record.tenantId !== tenantId) {
    const error = new Error("Access denied") as any;
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
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
