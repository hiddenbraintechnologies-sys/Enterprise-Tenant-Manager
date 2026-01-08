import { hrmsStorage } from "../../storage/hrms";
import { insertHrLeaveSchema, insertHrLeaveTypeSchema } from "@shared/schema";

class LeaveService {
  static async getLeaveTypes(tenantId: string) {
    return hrmsStorage.getLeaveTypes(tenantId);
  }

  static async createLeaveType(tenantId: string, data: any, userId?: string) {
    const validated = insertHrLeaveTypeSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createLeaveType(validated);
  }

  static async getLeaveBalances(tenantId: string, employeeId: string, year: number) {
    return hrmsStorage.getLeaveBalances(tenantId, employeeId, year);
  }

  static async getLeaves(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getLeaves(tenantId, filters, pagination);
  }

  static async createLeave(tenantId: string, data: any, userId?: string) {
    const validated = insertHrLeaveSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createLeave(validated);
  }

  static async updateLeave(tenantId: string, leaveId: string, data: any, userId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? userId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    return hrmsStorage.updateLeave(tenantId, leaveId, updateData);
  }
}

export default LeaveService;
