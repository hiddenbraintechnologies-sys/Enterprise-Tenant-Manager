import { hrmsStorage } from "../../storage/hrms";
import { insertHrLeaveSchema, insertHrLeaveTypeSchema } from "@shared/schema";
import { baseNotificationService } from "../base-notification";

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
    const leave = await hrmsStorage.createLeave(validated);
    
    setImmediate(async () => {
      try {
        const employee = await hrmsStorage.getEmployeeById(tenantId, leave.employeeId);
        if (employee) {
          await baseNotificationService.dispatch({
            tenantId,
            eventType: "HR_LEAVE_REQUEST",
            channels: ["email"],
            recipient: { name: employee.firstName, email: employee.email || undefined },
            variables: { 
              employeeName: employee.firstName,
              startDate: leave.startDate,
              endDate: leave.endDate,
            },
            referenceId: leave.id,
            referenceType: "leave",
          });
        }
      } catch (error) {
        console.error("Failed to send leave request notification:", error);
      }
    });
    
    return leave;
  }

  static async updateLeave(tenantId: string, id: string, data: any, approverId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? approverId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    const leave = await hrmsStorage.updateLeave(tenantId, id, updateData);
    
    if (leave && (data.status === "approved" || data.status === "rejected")) {
      setImmediate(async () => {
        try {
          const employee = await hrmsStorage.getEmployeeById(tenantId, leave.employeeId);
          if (employee) {
            await baseNotificationService.dispatch({
              tenantId,
              eventType: data.status === "approved" ? "HR_LEAVE_APPROVED" : "HR_LEAVE_REJECTED",
              channels: ["email"],
              recipient: { name: employee.firstName, email: employee.email || undefined },
              variables: { 
                employeeName: employee.firstName,
                status: data.status,
              },
              referenceId: leave.id,
              referenceType: "leave",
            });
          }
        } catch (error) {
          console.error("Failed to send leave status notification:", error);
        }
      });
    }
    
    return leave;
  }
}

export default LeaveService;
