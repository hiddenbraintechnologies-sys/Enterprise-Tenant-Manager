import { Router, Request, Response } from "express";
import { attendanceService } from "../../services/hrms/attendanceService";
import { getTenantId, getUserId, parsePagination } from "./shared";

export function registerAttendanceRoutes(router: Router): void {
  router.get("/attendance", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        employeeId: req.query.employeeId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        status: req.query.status as string,
      };
      const result = await attendanceService.getAttendance(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/attendance", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const attendance = await attendanceService.recordAttendance(req.body, tenantId, userId);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/attendance/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const attendance = await attendanceService.updateAttendance(tenantId, req.params.id, req.body, userId);
      if (!attendance) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/holidays", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const holidays = await attendanceService.getHolidays(tenantId, year);
      res.json(holidays);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/holidays", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const holiday = await attendanceService.createHoliday(req.body, tenantId, userId);
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
