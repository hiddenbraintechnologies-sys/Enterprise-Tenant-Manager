import { Router } from "express";
import { tenantIsolationMiddleware } from "../../core/tenant-isolation";
import { requireMinimumRole } from "../../core/auth-middleware";
import { auditService } from "../../core/audit";
import AttendanceService from "../../services/hrms/attendanceService";

const router = Router();

router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("staff"));

router.get("/attendance", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "attendance",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const attendance = await AttendanceService.listAttendance(tenantId, req.query);
  res.json(attendance);
});

router.post("/attendance", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "attendance",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const record = await AttendanceService.markAttendance(tenantId, req.body);
  res.status(201).json(record);
});

router.post("/attendance/bulk", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "attendance_bulk",
    newValue: { count: req.body.records?.length },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const results = await AttendanceService.bulkMarkAttendance(tenantId, req.body.records);
  res.status(201).json(results);
});

router.put("/attendance/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "update",
    resource: "attendance",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const record = await AttendanceService.updateAttendance(tenantId, req.params.id, req.body);
  res.json(record);
});

router.get("/holidays", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const holidays = await AttendanceService.listHolidays(tenantId, year);
  res.json(holidays);
});

router.post("/holidays", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "holidays",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const holiday = await AttendanceService.addHoliday(tenantId, req.body);
  res.status(201).json(holiday);
});

router.delete("/holidays/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "delete",
    resource: "holidays",
    resourceId: req.params.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  await AttendanceService.deleteHoliday(tenantId, req.params.id);
  res.json({ success: true });
});

export default router;
