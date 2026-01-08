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
  
  const filters = {
    employeeId: req.query.employeeId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    status: req.query.status as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const attendance = await AttendanceService.getAttendance(tenantId, filters, pagination);
  res.json(attendance);
});

router.post("/attendance", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const record = await AttendanceService.markAttendance(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "attendance",
    resourceId: record.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(record);
});

router.post("/attendance/bulk", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const { records } = req.body;
  const results = await AttendanceService.bulkMarkAttendance(tenantId, records, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "attendance_bulk",
    newValue: { count: records.length },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(results);
});

router.get("/holidays", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const holidays = await AttendanceService.getHolidays(tenantId, year);
  res.json(holidays);
});

router.post("/holidays", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const holiday = await AttendanceService.createHoliday(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "holidays",
    resourceId: holiday.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(holiday);
});

export default router;
