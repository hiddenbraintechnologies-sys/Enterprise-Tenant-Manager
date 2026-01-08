import { hrmsStorage } from "../../storage/hrms";
import { insertHrAttendanceSchema, insertHrHolidaySchema } from "@shared/schema";

class AttendanceService {
  static async listAttendance(tenantId: string, query: any) {
    const filters = {
      employeeId: query.employeeId,
      startDate: query.startDate,
      endDate: query.endDate,
      status: query.status,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getAttendance(tenantId, filters, pagination);
  }

  static async markAttendance(tenantId: string, data: any) {
    const validated = insertHrAttendanceSchema.parse({ ...data, tenantId });
    return hrmsStorage.recordAttendance(validated);
  }

  static async bulkMarkAttendance(tenantId: string, records: any[]) {
    const results = [];
    for (const record of records) {
      const validated = insertHrAttendanceSchema.parse({ ...record, tenantId });
      const attendance = await hrmsStorage.recordAttendance(validated);
      results.push(attendance);
    }
    return results;
  }

  static async updateAttendance(tenantId: string, id: string, data: any) {
    return hrmsStorage.updateAttendance(tenantId, id, data);
  }

  static async listHolidays(tenantId: string, year: number) {
    return hrmsStorage.getHolidays(tenantId, year);
  }

  static async addHoliday(tenantId: string, data: any) {
    const validated = insertHrHolidaySchema.parse({ ...data, tenantId });
    return hrmsStorage.createHoliday(validated);
  }

  static async deleteHoliday(tenantId: string, id: string) {
    return hrmsStorage.deleteHoliday(tenantId, id);
  }
}

export default AttendanceService;
