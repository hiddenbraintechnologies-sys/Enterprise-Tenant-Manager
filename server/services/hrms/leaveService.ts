import { hrmsStorage } from "../../storage/hrms";
import { insertHrLeaveSchema, insertHrLeaveTypeSchema } from "@shared/schema";

class LeaveService {
  static async listLeaveTypes(tenantId: string) {
    return hrmsStorage.getLeaveTypes(tenantId);
  }

  static async addLeaveType(tenantId: string, data: any) {
    const validated = insertHrLeaveTypeSchema.parse({ ...data, tenantId });
    return hrmsStorage.createLeaveType(validated);
  }

  static async getLeaveBalances(tenantId: string, employeeId: string, year: number) {
    return hrmsStorage.getLeaveBalances(tenantId, employeeId, year);
  }

  static async listLeaves(tenantId: string, query: any) {
    const filters = {
      employeeId: query.employeeId,
      status: query.status,
      leaveTypeId: query.leaveTypeId,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getLeaves(tenantId, filters, pagination);
  }

  static async applyLeave(tenantId: string, data: any) {
    const validated = insertHrLeaveSchema.parse({ ...data, tenantId });
    return hrmsStorage.createLeave(validated);
  }

  static async updateLeave(tenantId: string, id: string, data: any, approverId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? approverId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    return hrmsStorage.updateLeave(tenantId, id, updateData);
  }
}

export default LeaveService;
