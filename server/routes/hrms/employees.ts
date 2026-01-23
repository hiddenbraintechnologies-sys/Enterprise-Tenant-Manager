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
import { ZodError } from "zod";

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
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    console.error("[employees] GET /:id error:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
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
    
    const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
    res.json(employee);
  } catch (error) {
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
    
    await EmployeeService.deleteEmployee(tenantId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("[employees] DELETE /:id error:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
