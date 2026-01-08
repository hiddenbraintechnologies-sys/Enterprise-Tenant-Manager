import { hrmsStorage } from "../../storage/hrms";
import { insertHrAttendanceSchema, insertHrHolidaySchema } from "@shared/schema";

class AttendanceService {
  static async getAttendance(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getAttendance(tenantId, filters, pagination);
  }

  static async markAttendance(tenantId: string, data: any, userId?: string) {
    const validated = insertHrAttendanceSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.recordAttendance(validated);
  }

  static async bulkMarkAttendance(tenantId: string, records: any[], userId?: string) {
    const results = [];
    for (const record of records) {
      const validated = insertHrAttendanceSchema.parse({ ...record, tenantId, createdBy: userId });
      const attendance = await hrmsStorage.recordAttendance(validated);
      results.push(attendance);
    }
    return results;
  }

  static async updateAttendance(tenantId: string, attendanceId: string, data: any, userId?: string) {
    return hrmsStorage.updateAttendance(tenantId, attendanceId, data);
  }

  static async getHolidays(tenantId: string, year: number) {
    return hrmsStorage.getHolidays(tenantId, year);
  }

  static async createHoliday(tenantId: string, data: any, userId?: string) {
    const validated = insertHrHolidaySchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createHoliday(validated);
  }

  static async deleteHoliday(tenantId: string, holidayId: string) {
    return hrmsStorage.deleteHoliday(tenantId, holidayId);
  }
}

export default AttendanceService;
