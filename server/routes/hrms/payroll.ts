/**
 * Payroll Management Routes
 * 
 * Handles payroll processing for the HRMS module.
 * 
 * Endpoints (mounted at /api/hr/payroll):
 * - GET  /salary-structure/:employeeId - Get salary structure
 * - POST /salary-structure - Add salary structure (admin only)
 * - GET  / - List payroll records
 * - POST / - Run payroll (admin only)
 * - PUT  /:id - Update payroll (admin only)
 * 
 * Note: Tenant isolation and base RBAC applied at router level in index.ts
 * 
 * @module server/routes/hrms/payroll
 */

import { Router } from "express";
import { requireMinimumRole, auditService } from "../../core";
import PayrollService from "../../services/hrms/payrollService";

const router = Router();

router.get("/salary-structure/:employeeId", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const structure = await PayrollService.getSalaryStructure(tenantId, req.params.employeeId);
  res.json(structure);
});

router.post("/salary-structure", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_salary_structure", req, "salary_structure");
  const structure = await PayrollService.addSalaryStructure(tenantId, req.body);
  res.status(201).json(structure);
});

router.get("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_payroll", req, "payroll");
  const result = await PayrollService.listPayroll(tenantId, req.query);
  res.json(result);
});

router.post("/", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("run_payroll", req, "payroll");
  const payroll = await PayrollService.runPayroll(tenantId, req.body);
  res.status(201).json(payroll);
});

router.put("/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_payroll", req, "payroll");
  const payroll = await PayrollService.updatePayroll(tenantId, req.params.id, req.body);
  res.json(payroll);
});

export default router;
