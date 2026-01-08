import { hrmsStorage } from "../../storage/hrms";
import { insertHrAttendanceSchema, insertHrHolidaySchema } from "@shared/schema";
import { logHrmsAudit } from "../audit";

export class AttendanceService {
  async getAttendance(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getAttendance(tenantId, filters, pagination);
  }

  async recordAttendance(data: any, tenantId: string, userId?: string) {
    const validated = insertHrAttendanceSchema.parse({ ...data, tenantId, createdBy: userId });
    const attendance = await hrmsStorage.recordAttendance(validated);
    await logHrmsAudit(tenantId, "create", "hr_attendance", attendance.id, null, attendance, userId);
    return attendance;
  }

  async updateAttendance(tenantId: string, attendanceId: string, data: any, userId?: string) {
    const attendance = await hrmsStorage.updateAttendance(tenantId, attendanceId, data);
    if (attendance) {
      await logHrmsAudit(tenantId, "update", "hr_attendance", attendanceId, null, attendance, userId);
    }
    return attendance;
  }

  async getHolidays(tenantId: string, year: number) {
    return hrmsStorage.getHolidays(tenantId, year);
  }

  async createHoliday(data: any, tenantId: string, userId?: string) {
    const validated = insertHrHolidaySchema.parse({ ...data, tenantId, createdBy: userId });
    const holiday = await hrmsStorage.createHoliday(validated);
    await logHrmsAudit(tenantId, "create", "hr_holiday", holiday.id, null, holiday, userId);
    return holiday;
  }
}

export const attendanceService = new AttendanceService();
