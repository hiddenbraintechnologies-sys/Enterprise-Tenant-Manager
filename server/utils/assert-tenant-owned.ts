/**
 * Tenant Ownership Assertion Helpers
 * 
 * Provides consistent 404 responses for cross-tenant resource access
 * to prevent tenant enumeration attacks.
 * 
 * Security principle:
 * - 404 = resource not found OR belongs to another tenant (no distinction)
 * - 403 = permission denied within the SAME tenant (RBAC failure)
 * 
 * @module server/utils/assert-tenant-owned
 */

import { Response } from "express";

export interface NotFoundOptions {
  resourceName?: string;
  id?: string;
}

export class TenantResourceNotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly code = "RESOURCE_NOT_FOUND";
  
  constructor(resourceName?: string, id?: string) {
    const message = resourceName 
      ? `${resourceName} not found`
      : "Resource not found";
    super(message);
    this.name = "TenantResourceNotFoundError";
  }
}

/**
 * Asserts that a record exists and belongs to the current tenant.
 * Throws TenantResourceNotFoundError if record is null/undefined.
 * 
 * Usage:
 * ```typescript
 * const employee = await storage.getById(tenantId, id);
 * assertTenantOwnedOr404(employee, { resourceName: "Employee" });
 * // If we get here, employee is guaranteed to be non-null
 * ```
 * 
 * @param record - The record fetched with tenant-scoped query
 * @param options - Optional resource name and ID for error message
 * @throws TenantResourceNotFoundError if record is null/undefined
 */
export function assertTenantOwnedOr404<T>(
  record: T | null | undefined,
  options: NotFoundOptions = {}
): asserts record is T {
  if (!record) {
    throw new TenantResourceNotFoundError(options.resourceName, options.id);
  }
}

/**
 * Asserts that a mutation (update/delete) affected at least one row.
 * For operations that return the updated record, pass the result.
 * For operations that return row count or boolean, pass appropriately.
 * 
 * Usage:
 * ```typescript
 * const updated = await storage.update(tenantId, id, data);
 * assertMutationSucceededOr404(updated, { resourceName: "Employee" });
 * ```
 */
export function assertMutationSucceededOr404<T>(
  result: T | null | undefined | boolean | number,
  options: NotFoundOptions = {}
): asserts result is T {
  const failed = result === null 
    || result === undefined 
    || result === false 
    || result === 0;
    
  if (failed) {
    throw new TenantResourceNotFoundError(options.resourceName, options.id);
  }
}

/**
 * Sends a standardized 404 response for tenant-owned resources.
 * Use this in route handlers when you need more control.
 * 
 * IMPORTANT: The message is intentionally generic to prevent
 * information leakage about whether a resource exists in another tenant.
 */
export function sendNotFound(res: Response, resourceName?: string): void {
  const message = resourceName 
    ? `${resourceName} not found`
    : "Resource not found";
  res.status(404).json({ 
    error: message,
    code: "RESOURCE_NOT_FOUND"
  });
}

/**
 * Express error handler middleware for TenantResourceNotFoundError.
 * Add this to your error handling chain to automatically convert
 * thrown errors to proper 404 responses.
 */
export function handleTenantNotFoundError(
  err: Error,
  _req: any,
  res: Response,
  next: any
): void {
  if (err instanceof TenantResourceNotFoundError) {
    res.status(404).json({
      error: err.message,
      code: err.code
    });
    return;
  }
  next(err);
}
