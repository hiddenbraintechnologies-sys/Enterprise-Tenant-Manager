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
  
  const leaveTypes = await LeaveService.getLeaveTypes(tenantId);
  res.json(leaveTypes);
});

router.post("/leave-types", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const leaveType = await LeaveService.createLeaveType(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "leave_types",
    resourceId: leaveType.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
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
  
  const filters = {
    employeeId: req.query.employeeId as string,
    status: req.query.status as string,
    leaveTypeId: req.query.leaveTypeId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const result = await LeaveService.getLeaves(tenantId, filters, pagination);
  res.json(result);
});

router.post("/leaves", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const leave = await LeaveService.createLeave(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "leaves",
    resourceId: leave.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(leave);
});

router.patch("/leaves/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const leave = await LeaveService.updateLeave(tenantId, req.params.id, req.body, userId);
  if (!leave) {
    return res.status(404).json({ error: "Leave request not found" });
  }
  
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
  
  res.json(leave);
});

export default router;
