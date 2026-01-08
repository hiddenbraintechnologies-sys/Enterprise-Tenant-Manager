import { Router } from "express";
import { tenantIsolationMiddleware, requireMinimumRole, auditService } from "../../core";
import AttendanceService from "../../services/hrms/attendanceService";

const router = Router();
router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("hr"));

router.post("/:employeeId/checkin", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("checkin", req, "attendance");
  const result = await AttendanceService.checkIn(tenantId, req.params.employeeId);
  res.json(result);
});

router.post("/:employeeId/checkout", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("checkout", req, "attendance");
  const result = await AttendanceService.checkOut(tenantId, req.params.employeeId);
  res.json(result);
});

router.get("/", async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_attendance", req, "attendance");
  const data = await AttendanceService.getAttendance(tenantId, req.query);
  res.json(data);
});

router.post("/", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("mark_attendance", req, "attendance");
  const record = await AttendanceService.markAttendance(tenantId, req.body);
  res.status(201).json(record);
});

router.post("/bulk", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("bulk_mark_attendance", req, "attendance");
  const results = await AttendanceService.bulkMarkAttendance(tenantId, req.body.records);
  res.status(201).json(results);
});

router.put("/:id", requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_attendance", req, "attendance");
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
  
  auditService.logFromRequest("add_holiday", req, "holidays");
  const holiday = await AttendanceService.addHoliday(tenantId, req.body);
  res.status(201).json(holiday);
});

router.delete("/holidays/:id", requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("delete_holiday", req, "holidays");
  await AttendanceService.deleteHoliday(tenantId, req.params.id);
  res.json({ success: true });
});

export default router;
