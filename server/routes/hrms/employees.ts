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
 * - DELETE /:id - Delete employee (admin only)
 * 
 * Security: 
 * - Requires manager role for read, admin for delete
 * - Cross-tenant access returns 404 (not 403) to prevent enumeration
 * 
 * @module server/routes/hrms/employees
 */

import { Router } from "express";
import { requireMinimumRole, auditService, checkEmployeeLimit } from "../../core";
import EmployeeService from "../../services/hrms/employeeService";
import { ZodError } from "zod";
import { 
  assertTenantOwnedOr404, 
  assertMutationSucceededOr404,
  TenantResourceNotFoundError 
} from "../../utils/assert-tenant-owned";
import { db } from "../../db";
import { hrPayRunItems, hrLeaves, hrAttendance, hrTimesheets } from "@shared/models/hrms";
import { eq, and, count } from "drizzle-orm";

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

router.delete("/:id", requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    // Check if read-only mode (payroll expired, no HRMS)
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to delete employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employeeId = req.params.id;
    
    // Check for dependent records before allowing delete (tenant-scoped for security)
    const [payrollCount] = await db
      .select({ count: count() })
      .from(hrPayRunItems)
      .where(and(
        eq(hrPayRunItems.tenantId, tenantId),
        eq(hrPayRunItems.employeeId, employeeId)
      ));
    
    const [leaveCount] = await db
      .select({ count: count() })
      .from(hrLeaves)
      .where(and(
        eq(hrLeaves.tenantId, tenantId),
        eq(hrLeaves.employeeId, employeeId)
      ));
    
    const [attendanceCount] = await db
      .select({ count: count() })
      .from(hrAttendance)
      .where(and(
        eq(hrAttendance.tenantId, tenantId),
        eq(hrAttendance.employeeId, employeeId)
      ));
    
    const [timesheetCount] = await db
      .select({ count: count() })
      .from(hrTimesheets)
      .where(and(
        eq(hrTimesheets.tenantId, tenantId),
        eq(hrTimesheets.employeeId, employeeId)
      ));
    
    const hasPayroll = (payrollCount?.count || 0) > 0;
    const hasLeaves = (leaveCount?.count || 0) > 0;
    const hasAttendance = (attendanceCount?.count || 0) > 0;
    const hasTimesheets = (timesheetCount?.count || 0) > 0;
    
    if (hasPayroll || hasLeaves || hasAttendance || hasTimesheets) {
      const dependencies = [];
      if (hasPayroll) dependencies.push("payroll slips");
      if (hasLeaves) dependencies.push("leave requests");
      if (hasAttendance) dependencies.push("attendance logs");
      if (hasTimesheets) dependencies.push("timesheets");
      
      return res.status(409).json({
        error: "Employee has history. Deactivate instead.",
        code: "EMPLOYEE_HAS_DEPENDENCIES",
        message: `This employee has ${dependencies.join(", ")}. For compliance, you should deactivate instead of deleting.`,
        dependencies,
      });
    }
    
    const deleted = await EmployeeService.deleteEmployee(tenantId, employeeId);
    assertMutationSucceededOr404(deleted, { resourceName: "Employee", id: employeeId });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    console.error("[employees] DELETE /:id error:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
