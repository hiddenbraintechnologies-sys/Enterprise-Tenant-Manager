/**
 * Employee Management Routes
 * 
 * Handles employee CRUD operations for the HRMS module.
 * 
 * Endpoints (mounted at /api/hr/employees):
 * - GET  / - List employees with pagination/filtering
 * - GET  /:id - Get single employee
 * - POST / - Create employee (manager+)
 * - PUT  /:id - Update employee (manager+)
 * - POST /:id/deactivate - Deactivate employee (staff:update permission)
 * - POST /:id/reactivate - Reactivate employee (staff:update permission)
 * - DELETE /:id - Delete employee (admin only, with 409 if has history)
 * 
 * Status Mapping:
 * - "active" = Active employee
 * - "exited" = Deactivated/Inactive employee (equivalent to "inactive" in API contract)
 * 
 * Security: 
 * - Requires manager role for read, admin for delete
 * - Deactivate/Reactivate require staff:update permission
 * - Cross-tenant access returns 404 (not 403) to prevent enumeration
 * - Delete blocked if employee has payroll/leaves/attendance/timesheets (returns 409)
 * 
 * @module server/routes/hrms/employees
 */

import { Router } from "express";
import { requireMinimumRole, auditService, checkEmployeeLimit } from "../../core";
import { permissionService, PERMISSIONS } from "../../core/permissions";
import EmployeeService from "../../services/hrms/employeeService";
import { ZodError, z } from "zod";
import { 
  assertTenantOwnedOr404, 
  assertMutationSucceededOr404,
  TenantResourceNotFoundError 
} from "../../utils/assert-tenant-owned";
import { db } from "../../db";
import { hrPayRunItems, hrLeaves, hrAttendance, hrTimesheets } from "@shared/models/hrms";
import { eq, and, count } from "drizzle-orm";

const deactivateSchema = z.object({
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const employees = await EmployeeService.listEmployees(tenantId, req.query);
    res.json(employees);
  } catch (error) {
    console.error("[employees] GET / error:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const employee = await EmployeeService.getEmployee(tenantId, req.params.id);
    assertTenantOwnedOr404(employee, { resourceName: "Employee", id: req.params.id });
    res.json(employee);
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    console.error("[employees] GET /:id error:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    // Check if read-only mode (payroll expired, no HRMS)
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to create employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    // Check employee limit before creating
    const limitCheck = await checkEmployeeLimit(tenantId);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message || "Employee limit reached",
        code: "EMPLOYEE_LIMIT_REACHED",
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        isTrialing: limitCheck.isTrialing,
        upgradeUrl: "/marketplace?addon=payroll&action=upgrade",
      });
    }
    
    const employee = await EmployeeService.addEmployee(tenantId, req.body);
    res.status(201).json(employee);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[employees] POST / error:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    // Check if read-only mode (payroll expired, no HRMS)
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to edit employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: req.params.id });
    res.json(employee);
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[employees] PUT /:id error:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// NOTE: DELETE endpoint is defined in index.ts to allow admin cleanup even when add-on expired

router.post("/:id/deactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to deactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employeeId = req.params.id;
    
    // Validate request body
    let reason: string | undefined;
    let effectiveDate: string | undefined;
    try {
      const body = deactivateSchema.parse(req.body || {});
      reason = body.reason;
      effectiveDate = body.effectiveDate;
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          code: "VALIDATION_ERROR",
          details: error.errors 
        });
      }
      throw error;
    }
    
    // Check if employee exists and is in this tenant
    const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
    assertTenantOwnedOr404(existingEmployee, { resourceName: "Employee", id: employeeId });
    
    // Check if already deactivated (status "exited" = "inactive" in API contract)
    if (existingEmployee.status === "exited") {
      return res.status(400).json({
        error: "Employee is already deactivated",
        code: "ALREADY_DEACTIVATED",
      });
    }
    
    const employee = await EmployeeService.deactivateEmployee(tenantId, employeeId, reason);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: employeeId });
    
    // Audit log
    auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "update",
      resource: "employee",
      resourceId: employeeId,
      metadata: { event: "HR_EMPLOYEE_DEACTIVATED", reason, effectiveDate },
    });
    
    res.json({
      ok: true,
      employee: {
        id: employee!.id,
        status: employee!.status,
        deactivatedAt: employee!.deactivatedAt,
        deactivationReason: employee!.deactivationReason,
      },
    });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: "RESOURCE_NOT_FOUND" });
    }
    console.error("[employees] POST /:id/deactivate error:", error);
    res.status(500).json({ error: "Failed to deactivate employee" });
  }
});

router.post("/:id/reactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to reactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employeeId = req.params.id;
    
    // Check if employee exists and is in this tenant
    const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
    assertTenantOwnedOr404(existingEmployee, { resourceName: "Employee", id: employeeId });
    
    // Check if already active
    if (existingEmployee.status === "active") {
      return res.status(400).json({
        error: "Employee is already active",
        code: "ALREADY_ACTIVE",
      });
    }
    
    const employee = await EmployeeService.reactivateEmployee(tenantId, employeeId);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: employeeId });
    
    // Audit log
    auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "update",
      resource: "employee",
      resourceId: employeeId,
      metadata: { event: "HR_EMPLOYEE_REACTIVATED" },
    });
    
    res.json({
      ok: true,
      employee: {
        id: employee!.id,
        status: employee!.status,
        reactivatedAt: employee!.reactivatedAt,
      },
    });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: "RESOURCE_NOT_FOUND" });
    }
    console.error("[employees] POST /:id/reactivate error:", error);
    res.status(500).json({ error: "Failed to reactivate employee" });
  }
});

// Bulk operations schemas
const bulkDeactivateSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee ID required").max(50, "Maximum 50 employees at a time"),
  reason: z.string().max(500).optional(),
});

const bulkDeleteSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee ID required").max(50, "Maximum 50 employees at a time"),
});

type BulkResult = {
  id: string;
  success: boolean;
  error?: string;
  code?: string;
};

router.post("/bulk/deactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to deactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    // Validate request body
    let employeeIds: string[];
    let reason: string | undefined;
    try {
      const body = bulkDeactivateSchema.parse(req.body || {});
      employeeIds = body.employeeIds;
      reason = body.reason;
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          code: "VALIDATION_ERROR",
          details: error.errors 
        });
      }
      throw error;
    }
    
    const results: BulkResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const employeeId of employeeIds) {
      try {
        // Check if employee exists and belongs to this tenant
        const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
        
        if (!existingEmployee) {
          results.push({ id: employeeId, success: false, error: "Employee not found", code: "NOT_FOUND" });
          errorCount++;
          continue;
        }
        
        if (existingEmployee.status === "exited") {
          results.push({ id: employeeId, success: false, error: "Already deactivated", code: "ALREADY_DEACTIVATED" });
          errorCount++;
          continue;
        }
        
        const employee = await EmployeeService.deactivateEmployee(tenantId, employeeId, reason);
        
        if (employee) {
          results.push({ id: employeeId, success: true });
          successCount++;
          
          // Audit log each deactivation
          auditService.logAsync({
            tenantId,
            userId,
            action: "update",
            resource: "employee",
            resourceId: employeeId,
            metadata: { event: "HR_EMPLOYEE_DEACTIVATED", reason, bulk: true },
          });
        } else {
          results.push({ id: employeeId, success: false, error: "Failed to deactivate", code: "DEACTIVATION_FAILED" });
          errorCount++;
        }
      } catch (error) {
        results.push({ id: employeeId, success: false, error: "Unexpected error", code: "INTERNAL_ERROR" });
        errorCount++;
      }
    }
    
    res.json({
      ok: errorCount === 0,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("[employees] POST /bulk/deactivate error:", error);
    res.status(500).json({ error: "Failed to bulk deactivate employees" });
  }
});

export default router;
