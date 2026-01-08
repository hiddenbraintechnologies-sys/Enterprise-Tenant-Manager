import { Router } from "express";
import { tenantIsolationMiddleware } from "../../core/tenant-isolation";
import { requireMinimumRole } from "../../core/auth-middleware";
import { auditService } from "../../core/audit";
import LeaveService from "../../services/hrms/leaveService";

const router = Router();

router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("staff"));

router.get("/leave-types", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const leaveTypes = await LeaveService.listLeaveTypes(tenantId);
  res.json(leaveTypes);
});

router.post("/leave-types", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "leave_types",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const leaveType = await LeaveService.addLeaveType(tenantId, req.body);
  res.status(201).json(leaveType);
});

router.get("/leave-balances/:employeeId", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const balances = await LeaveService.getLeaveBalances(tenantId, req.params.employeeId, year);
  res.json(balances);
});

router.get("/leaves", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "leaves",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const result = await LeaveService.listLeaves(tenantId, req.query);
  res.json(result);
});

router.post("/leaves", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "leaves",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const leave = await LeaveService.applyLeave(tenantId, req.body);
  res.status(201).json(leave);
});

router.put("/leaves/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "leaves",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const leave = await LeaveService.updateLeave(tenantId, req.params.id, req.body, userId);
  res.json(leave);
});

export default router;
