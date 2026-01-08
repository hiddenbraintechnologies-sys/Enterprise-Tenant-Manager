class LeaveService {
  static async listLeaveTypes(tenantId: string) { return []; }
  static async addLeaveType(tenantId: string, data: any) { return { success: true }; }
  static async getLeaveBalances(tenantId: string, employeeId: string, year: number) { return []; }
  static async listLeaves(tenantId: string, query: any) { return []; }
  static async applyLeave(tenantId: string, data: any) { return { success: true }; }
  static async updateLeave(tenantId: string, id: string, data: any, approverId?: string) { return { success: true }; }
}
export default LeaveService;
