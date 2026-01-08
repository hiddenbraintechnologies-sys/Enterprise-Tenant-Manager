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
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const structure = await PayrollService.createSalaryStructure(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "salary_structure",
    resourceId: structure.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(structure);
});

router.get("/payroll", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const filters = {
    employeeId: req.query.employeeId as string,
    month: req.query.month ? parseInt(req.query.month as string) : undefined,
    year: req.query.year ? parseInt(req.query.year as string) : undefined,
    status: req.query.status as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const result = await PayrollService.getPayroll(tenantId, filters, pagination);
  res.json(result);
});

router.post("/payroll", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const payroll = await PayrollService.createPayroll(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "payroll",
    resourceId: payroll.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(payroll);
});

router.patch("/payroll/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const payroll = await PayrollService.updatePayroll(tenantId, req.params.id, req.body, userId);
  if (!payroll) {
    return res.status(404).json({ error: "Payroll record not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "payroll",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(payroll);
});

export default router;
