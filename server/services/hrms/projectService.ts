import { hrmsStorage } from "../../storage/hrms";
import { insertHrProjectSchema, insertHrAllocationSchema, insertHrTimesheetSchema } from "@shared/schema";
import { baseNotificationService } from "../base-notification";

class ProjectService {
  static async listProjects(tenantId: string, query: any) {
    const filters = {
      status: query.status,
      search: query.search,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getProjects(tenantId, filters, pagination);
  }

  static async addProject(tenantId: string, data: any) {
    const validated = insertHrProjectSchema.parse({ ...data, tenantId });
    return hrmsStorage.createProject(validated);
  }

  static async updateProject(tenantId: string, id: string, data: any) {
    return hrmsStorage.updateProject(tenantId, id, data);
  }

  static async listAllocations(tenantId: string, employeeId?: string, projectId?: string) {
    return hrmsStorage.getAllocations(tenantId, employeeId, projectId);
  }

  static async addAllocation(tenantId: string, data: any) {
    const validated = insertHrAllocationSchema.parse({ ...data, tenantId });
    const allocation = await hrmsStorage.createAllocation(validated);
    
    setImmediate(async () => {
      try {
        const employee = await hrmsStorage.getEmployeeById(tenantId, allocation.employeeId);
        if (employee) {
          await baseNotificationService.dispatch({
            tenantId,
            eventType: "HR_PROJECT_ASSIGNED",
            channels: ["email"],
            recipient: { name: employee.firstName, email: employee.email || undefined },
            variables: { employeeName: employee.firstName },
            referenceId: allocation.id,
            referenceType: "allocation",
          });
        }
      } catch (error) {
        console.error("Failed to send project assignment notification:", error);
      }
    });
    
    return allocation;
  }

  static async updateAllocation(tenantId: string, id: string, data: any) {
    return hrmsStorage.updateAllocation(tenantId, id, data);
  }

  static async listTimesheets(tenantId: string, query: any) {
    const filters = {
      employeeId: query.employeeId,
      projectId: query.projectId,
      startDate: query.startDate,
      endDate: query.endDate,
      status: query.status,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getTimesheets(tenantId, filters, pagination);
  }

  static async addTimesheet(tenantId: string, data: any) {
    const validated = insertHrTimesheetSchema.parse({ ...data, tenantId });
    return hrmsStorage.createTimesheet(validated);
  }

  static async updateTimesheet(tenantId: string, id: string, data: any, approverId?: string) {
    const updateData = {
      ...data,
      approvedBy: data.status === "approved" ? approverId : undefined,
      approvedAt: data.status === "approved" ? new Date() : undefined,
    };
    return hrmsStorage.updateTimesheet(tenantId, id, updateData);
  }
}

export default ProjectService;
