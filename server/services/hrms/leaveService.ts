import { hrmsStorage } from "../../storage/hrms";
import { insertHrLeaveSchema, insertHrLeaveTypeSchema } from "@shared/schema";
import { logHrmsAudit } from "../audit";

export class LeaveService {
  async getLeaveTypes(tenantId: string) {
    return hrmsStorage.getLeaveTypes(tenantId);
  }

  async createLeaveType(data: any, tenantId: string, userId?: string) {
    const validated = insertHrLeaveTypeSchema.parse({ ...data, tenantId, createdBy: userId });
    const leaveType = await hrmsStorage.createLeaveType(validated);
    await logHrmsAudit(tenantId, "create", "hr_leave_type", leaveType.id, null, leaveType, userId);
    return leaveType;
  }

  async getLeaveBalances(tenantId: string, employeeId: string, year: number) {
    return hrmsStorage.getLeaveBalances(tenantId, employeeId, year);
  }

  async getLeaves(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getLeaves(tenantId, filters, pagination);
  }

  async createLeave(data: any, tenantId: string, userId?: string) {
    const validated = insertHrLeaveSchema.parse({ ...data, tenantId, createdBy: userId });
    const leave = await hrmsStorage.createLeave(validated);
    await logHrmsAudit(tenantId, "create", "hr_leave", leave.id, null, leave, userId);
    return leave;
  }

  async updateLeave(tenantId: string, leaveId: string, data: any, userId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? userId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    const leave = await hrmsStorage.updateLeave(tenantId, leaveId, updateData);
    if (leave) {
      await logHrmsAudit(tenantId, "update", "hr_leave", leaveId, null, leave, userId);
    }
    return leave;
  }
}

export const leaveService = new LeaveService();
