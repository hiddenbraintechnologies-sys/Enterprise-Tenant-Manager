import { Router } from "express";
import { tenantIsolationMiddleware } from "../../core/tenant-isolation";
import { requireMinimumRole } from "../../core/auth-middleware";
import { auditService } from "../../core/audit";
import PayrollService from "../../services/hrms/payrollService";

const router = Router();

router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("staff"));

router.get("/salary-structure/:employeeId", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const structure = await PayrollService.getSalaryStructure(tenantId, req.params.employeeId);
  res.json(structure);
});

router.post("/salary-structure", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "salary_structure",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const structure = await PayrollService.addSalaryStructure(tenantId, req.body);
  res.status(201).json(structure);
});

router.get("/payroll", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "payroll",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const result = await PayrollService.listPayroll(tenantId, req.query);
  res.json(result);
});

router.post("/payroll", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "payroll",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const payroll = await PayrollService.runPayroll(tenantId, req.body);
  res.status(201).json(payroll);
});

router.put("/payroll/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "update",
    resource: "payroll",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const payroll = await PayrollService.updatePayroll(tenantId, req.params.id, req.body);
  res.json(payroll);
});

export default router;
