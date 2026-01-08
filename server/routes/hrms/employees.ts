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
 * Security: Requires manager role for read, admin for delete
 * 
 * @module server/routes/hrms/employees
 */

import { Router } from "express";
import { requireMinimumRole, auditService } from "../../core";
import EmployeeService from "../../services/hrms/employeeService";

const router = Router();

router.get("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_employees", req, "employees");
  const employees = await EmployeeService.listEmployees(tenantId, req.query);
  res.json(employees);
});

router.get("/:id", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const employee = await EmployeeService.getEmployee(tenantId, req.params.id);
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }
  res.json(employee);
});

router.post("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_employee", req, "employees");
  const employee = await EmployeeService.addEmployee(tenantId, req.body);
  res.status(201).json(employee);
});

router.put("/:id", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_employee", req, "employees");
  const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
  res.json(employee);
});

router.delete("/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("delete_employee", req, "employees");
  await EmployeeService.deleteEmployee(tenantId, req.params.id);
  res.json({ success: true });
});

export default router;
