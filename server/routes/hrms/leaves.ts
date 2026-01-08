import { Router } from "express";
import { tenantIsolationMiddleware, requireMinimumRole, auditService } from "../../core";
import LeaveService from "../../services/hrms/leaveService";

const router = Router();
router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("hr"));

router.get("/types", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const leaveTypes = await LeaveService.listLeaveTypes(tenantId);
  res.json(leaveTypes);
});

router.post("/types", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_leave_type", req, "leave_types");
  const leaveType = await LeaveService.addLeaveType(tenantId, req.body);
  res.status(201).json(leaveType);
});

router.get("/balances/:employeeId", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const balances = await LeaveService.getLeaveBalances(tenantId, req.params.employeeId, year);
  res.json(balances);
});

router.get("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_leaves", req, "leaves");
  const result = await LeaveService.listLeaves(tenantId, req.query);
  res.json(result);
});

router.post("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("apply_leave", req, "leaves");
  const leave = await LeaveService.applyLeave(tenantId, req.body);
  res.status(201).json(leave);
});

router.put("/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_leave", req, "leaves");
  const leave = await LeaveService.updateLeave(tenantId, req.params.id, req.body, userId);
  res.json(leave);
});

export default router;
