class AttendanceService {
  static async checkIn(tenantId: string, employeeId: string) { return { success: true }; }
  static async checkOut(tenantId: string, employeeId: string) { return { success: true }; }
  static async getAttendance(tenantId: string, query: any) { return []; }
  static async markAttendance(tenantId: string, data: any) { return { success: true }; }
  static async bulkMarkAttendance(tenantId: string, records: any[]) { return []; }
  static async updateAttendance(tenantId: string, id: string, data: any) { return { success: true }; }
  static async listHolidays(tenantId: string, year: number) { return []; }
  static async addHoliday(tenantId: string, data: any) { return { success: true }; }
  static async deleteHoliday(tenantId: string, id: string) { return { success: true }; }
}
export default AttendanceService;
