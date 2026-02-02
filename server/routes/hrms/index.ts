/**
 * HRMS Module Routes - Human Resource Management System
 * 
 * Architecture:
 * - HR Foundation (Employee Directory): Accessible with Payroll OR HRMS add-on
 * - HRMS Suite (Attendance/Leave/Timesheets): Requires HRMS add-on only
 * 
 * This ensures:
 * - Plans remain primary revenue, add-ons are multipliers
 * - Payroll add-on requires employee directory (HR Foundation)
 * - Payroll add-on does NOT automatically enable full HRMS
 * 
 * Endpoints:
 * - /api/hr/dashboard - HR Dashboard stats (requires employee access)
 * - /api/hr/employees/* - Employee CRUD (requires Payroll OR HRMS)
 * - /api/hr/employees/:id (DELETE) - Admin cleanup even when add-on expired
 * - /api/hr/departments - Department management (requires Payroll OR HRMS)
 * - /api/hr/attendance/* - Attendance (requires HRMS add-on only)
 * - /api/hr/leaves/* - Leave management (requires HRMS add-on only)
 * - /api/hr/payroll/* - Payroll processing (requires Payroll add-on)
 * - /api/hr/projects/* - Projects/Timesheets (requires HRMS + IT extensions)
 * 
 * @module server/routes/hrms
 */

import { Router } from "express";
import { 
  tenantIsolationMiddleware, 
  requireMinimumRole, 
  auditService,
  requireEmployeeAccess,
  requireHrmsSuiteAccess,
  requirePayrollAccess,
} from "../../core";
import EmployeeService from "../../services/hrms/employeeService";
import { getAllTenantEntitlements } from "../../services/entitlement";
import { permissionService, PERMISSIONS } from "../../core/permissions";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import leavesRouter from "./leaves";
import payrollRouter from "./payroll";
import projectsRouter from "./projects";

const router = Router();

// Apply tenant isolation and minimum role to all routes
router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("manager"));

// ============================================================================
// HR FOUNDATION ROUTES (Payroll OR HRMS add-on)
// ============================================================================

// Dashboard endpoint - /api/hr/dashboard
// Accessible with Payroll OR HRMS add-on
router.get("/dashboard", requireEmployeeAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const stats = await EmployeeService.getDashboardStats(tenantId);
    res.json(stats);
  } catch (error) {
    console.error("[hr/dashboard] Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Employee Abilities endpoint - /api/hr/employees/abilities
// Returns computed abilities based on add-on entitlements + role permissions
router.get("/employees/abilities", async (req, res) => {
  try {
    const userId = req.context?.user?.id;
    const tenantId = req.context?.tenant?.id;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check add-on entitlements (HRMS or Payroll required for Employee Directory)
    let hasModuleAccess = false;
    try {
      const entitlements = await getAllTenantEntitlements(tenantId);
      const hrmsEntitled = entitlements.addons["hrms"]?.entitled || 
                          entitlements.addons["hrms-india"]?.entitled ||
                          entitlements.addons["hrms-malaysia"]?.entitled ||
                          entitlements.addons["hrms-uk"]?.entitled;
      const payrollEntitled = entitlements.addons["payroll"]?.entitled ||
                             entitlements.addons["payroll-india"]?.entitled ||
                             entitlements.addons["payroll-malaysia"]?.entitled ||
                             entitlements.addons["payroll-uk"]?.entitled;
      hasModuleAccess = hrmsEntitled || payrollEntitled;
    } catch (error) {
      console.error("[hr/employees/abilities] Error checking entitlements:", error);
      hasModuleAccess = false;
    }

    // Check role-based permissions
    const canReadStaff = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_READ);
    const canCreateStaff = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_CREATE);
    const canUpdateStaff = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    const canDeleteStaff = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_DELETE);

    // Combine add-on entitlements with permissions
    const abilities = {
      hasModuleAccess,
      canView: hasModuleAccess && canReadStaff,
      canCreate: hasModuleAccess && canCreateStaff,
      canEdit: hasModuleAccess && canUpdateStaff,
      canDeactivate: hasModuleAccess && canUpdateStaff, // Deactivate is a status update
      canDelete: hasModuleAccess && canDeleteStaff,
    };

    return res.json(abilities);
  } catch (error) {
    console.error("[hr/employees/abilities] Error checking abilities:", error);
    return res.status(500).json({ error: "Failed to check abilities" });
  }
});

// Departments endpoints - /api/hr/departments
// Accessible with Payroll OR HRMS add-on
router.get("/departments", requireEmployeeAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const departments = await EmployeeService.listDepartments(tenantId);
    res.json(departments);
  } catch (error) {
    console.error("[hr/departments] Error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.post("/departments", requireEmployeeAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const department = await EmployeeService.addDepartment(tenantId, req.body);
    res.status(201).json(department);
  } catch (error) {
    console.error("[hr/departments] POST error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
});

// Employees: /api/hr/employees/*
// Accessible with Payroll OR HRMS add-on
router.use("/employees", requireEmployeeAccess(), employeesRouter);

// ============================================================================
// EMPLOYEE DELETE - Allowed even when add-on expired (for admin cleanup)
// Requires: admin role + tenant isolation (but NOT add-on entitlement)
// ============================================================================
router.delete("/employees/:id", requireMinimumRole("admin"), async (req, res) => {
  const { db } = await import("../../db");
  const { hrPayRunItems, hrLeaves, hrAttendance, hrTimesheets } = await import("@shared/models/hrms");
  const { eq, and, count } = await import("drizzle-orm");
  const { assertMutationSucceededOr404, TenantResourceNotFoundError } = await import("../../utils/assert-tenant-owned");

  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
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
    
    // Audit log
    auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "delete",
      resource: "employee",
      resourceId: employeeId,
      metadata: { event: "HR_EMPLOYEE_DELETED" },
    });
    
    res.json({ ok: true, deleted: true, id: employeeId });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: "RESOURCE_NOT_FOUND" });
    }
    console.error("[employees] DELETE /:id error:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// ============================================================================
// HRMS SUITE ROUTES (HRMS add-on ONLY - Payroll does NOT grant access)
// ============================================================================

// Attendance: /api/hr/attendance/*
// HRMS add-on required
router.use("/attendance", requireHrmsSuiteAccess(), attendanceRouter);

// Leaves: /api/hr/leaves/*
// HRMS add-on required
router.use("/leaves", requireHrmsSuiteAccess(), leavesRouter);

// Projects (IT Extensions): /api/hr/projects/*
// HRMS add-on required + feature flag
router.use("/projects", requireHrmsSuiteAccess(), projectsRouter);

// ============================================================================
// PAYROLL ROUTES (Payroll add-on required - HRMS alone does NOT grant access)
// ============================================================================

// Payroll: /api/hr/payroll/*
// Requires Payroll add-on specifically (HRMS-only tenants cannot access)
router.use("/payroll", requirePayrollAccess(), payrollRouter);

export { FEATURE_FLAGS, requireFeature } from "./projects";
export default router;
