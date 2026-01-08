/**
 * HRMS Module Routes - Human Resource Management System
 * 
 * This module provides comprehensive HR functionality for multi-tenant SaaS:
 * - Employee Management (CRUD, directory, departments)
 * - Attendance Tracking (check-in/out, bulk marking, holidays)
 * - Leave Management (applications, approvals, balances)
 * - Payroll Processing (salary structures, payroll runs)
 * - Projects & Timesheets (IT extensions, gated by feature flag)
 * 
 * Security:
 * - All routes protected by tenantIsolationMiddleware
 * - RBAC via requireMinimumRole (manager for read, admin for sensitive ops)
 * - Full audit logging via auditService
 * 
 * API Base Path: /api/hr
 * 
 * Endpoints:
 * - GET  /api/hr/dashboard - HR Dashboard stats
 * - GET  /api/hr/employees - List employees
 * - POST /api/hr/employees - Create employee
 * - GET  /api/hr/employees/:id - Get employee
 * - PUT  /api/hr/employees/:id - Update employee
 * - DELETE /api/hr/employees/:id - Delete employee
 * - GET  /api/hr/departments - List departments
 * - POST /api/hr/departments - Create department
 * - GET  /api/hr/attendance - List attendance records
 * - POST /api/hr/attendance - Mark attendance
 * - POST /api/hr/attendance/:employeeId/checkin - Check in
 * - POST /api/hr/attendance/:employeeId/checkout - Check out
 * - GET  /api/hr/leaves - List leaves
 * - POST /api/hr/leaves - Apply leave
 * - PUT  /api/hr/leaves/:id - Update/approve leave
 * - GET  /api/hr/payroll - List payroll
 * - POST /api/hr/payroll - Run payroll
 * - GET  /api/hr/projects - List projects (IT extensions)
 * 
 * @module server/routes/hrms
 */

import { Router } from "express";
import { tenantIsolationMiddleware, requireMinimumRole, auditService } from "../../core";
import EmployeeService from "../../services/hrms/employeeService";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import leavesRouter from "./leaves";
import payrollRouter from "./payroll";
import projectsRouter from "./projects";

const router = Router();

// Apply tenant isolation and minimum role to all routes
router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("manager"));

// Dashboard endpoint - /api/hr/dashboard
router.get("/dashboard", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_dashboard", req, "hr_dashboard");
  const stats = await EmployeeService.getDashboardStats(tenantId);
  res.json(stats);
});

// Departments endpoints - /api/hr/departments
router.get("/departments", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const departments = await EmployeeService.listDepartments(tenantId);
  res.json(departments);
});

router.post("/departments", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_department", req, "departments");
  const department = await EmployeeService.addDepartment(tenantId, req.body);
  res.status(201).json(department);
});

// Employees: /api/hr/employees/*
router.use("/employees", employeesRouter);

// Attendance: /api/hr/attendance/*
router.use("/attendance", attendanceRouter);

// Leaves: /api/hr/leaves/*
router.use("/leaves", leavesRouter);

// Payroll: /api/hr/payroll/*
router.use("/payroll", payrollRouter);

// Projects (IT Extensions): /api/hr/projects/*
// Gated by hrms_it_extensions feature flag
router.use("/projects", projectsRouter);

export { FEATURE_FLAGS, requireFeature } from "./projects";
export default router;
