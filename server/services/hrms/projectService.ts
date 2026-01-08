import { hrmsStorage } from "../../storage/hrms";
import { insertHrProjectSchema, insertHrAllocationSchema, insertHrTimesheetSchema } from "@shared/schema";
import { logHrmsAudit } from "../audit";

export class ProjectService {
  async getProjects(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getProjects(tenantId, filters, pagination);
  }

  async createProject(data: any, tenantId: string, userId?: string) {
    const validated = insertHrProjectSchema.parse({ ...data, tenantId, createdBy: userId });
    const project = await hrmsStorage.createProject(validated);
    await logHrmsAudit(tenantId, "create", "hr_project", project.id, null, project, userId);
    return project;
  }

  async updateProject(tenantId: string, projectId: string, data: any, userId?: string) {
    const project = await hrmsStorage.updateProject(tenantId, projectId, data);
    if (project) {
      await logHrmsAudit(tenantId, "update", "hr_project", projectId, null, project, userId);
    }
    return project;
  }

  async getAllocations(tenantId: string, employeeId?: string, projectId?: string) {
    return hrmsStorage.getAllocations(tenantId, employeeId, projectId);
  }

  async createAllocation(data: any, tenantId: string, userId?: string) {
    const validated = insertHrAllocationSchema.parse({ ...data, tenantId, createdBy: userId });
    const allocation = await hrmsStorage.createAllocation(validated);
    await logHrmsAudit(tenantId, "create", "hr_allocation", allocation.id, null, allocation, userId);
    return allocation;
  }

  async updateAllocation(tenantId: string, allocationId: string, data: any, userId?: string) {
    const allocation = await hrmsStorage.updateAllocation(tenantId, allocationId, data);
    if (allocation) {
      await logHrmsAudit(tenantId, "update", "hr_allocation", allocationId, null, allocation, userId);
    }
    return allocation;
  }

  async getTimesheets(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getTimesheets(tenantId, filters, pagination);
  }

  async createTimesheet(data: any, tenantId: string, userId?: string) {
    const validated = insertHrTimesheetSchema.parse({ ...data, tenantId, createdBy: userId });
    const timesheet = await hrmsStorage.createTimesheet(validated);
    await logHrmsAudit(tenantId, "create", "hr_timesheet", timesheet.id, null, timesheet, userId);
    return timesheet;
  }

  async updateTimesheet(tenantId: string, timesheetId: string, data: any, userId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? userId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    const timesheet = await hrmsStorage.updateTimesheet(tenantId, timesheetId, updateData);
    if (timesheet) {
      await logHrmsAudit(tenantId, "update", "hr_timesheet", timesheetId, null, timesheet, userId);
    }
    return timesheet;
  }
}

export const projectService = new ProjectService();
