import { hrmsStorage } from "../../storage/hrms";
import { insertHrProjectSchema, insertHrAllocationSchema, insertHrTimesheetSchema } from "@shared/schema";

class ProjectService {
  static async getProjects(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getProjects(tenantId, filters, pagination);
  }

  static async createProject(tenantId: string, data: any, userId?: string) {
    const validated = insertHrProjectSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createProject(validated);
  }

  static async updateProject(tenantId: string, projectId: string, data: any, userId?: string) {
    return hrmsStorage.updateProject(tenantId, projectId, data);
  }

  static async getAllocations(tenantId: string, employeeId?: string, projectId?: string) {
    return hrmsStorage.getAllocations(tenantId, employeeId, projectId);
  }

  static async createAllocation(tenantId: string, data: any, userId?: string) {
    const validated = insertHrAllocationSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createAllocation(validated);
  }

  static async updateAllocation(tenantId: string, allocationId: string, data: any, userId?: string) {
    return hrmsStorage.updateAllocation(tenantId, allocationId, data);
  }

  static async getTimesheets(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getTimesheets(tenantId, filters, pagination);
  }

  static async createTimesheet(tenantId: string, data: any, userId?: string) {
    const validated = insertHrTimesheetSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createTimesheet(validated);
  }

  static async updateTimesheet(tenantId: string, timesheetId: string, data: any, userId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? userId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    return hrmsStorage.updateTimesheet(tenantId, timesheetId, updateData);
  }
}

export default ProjectService;
