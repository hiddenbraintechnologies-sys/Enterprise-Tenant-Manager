import { hrmsStorage } from "../../storage/hrms";
import { insertHrEmployeeSchema, insertHrDepartmentSchema } from "@shared/schema";
import { baseNotificationService } from "../base-notification";

class EmployeeService {
  static async getDashboardStats(tenantId: string) {
    return hrmsStorage.getDashboardStats(tenantId);
  }

  static async listEmployees(tenantId: string, query: any) {
    const filters = {
      status: query.status,
      departmentId: query.departmentId,
      employmentType: query.employmentType,
      search: query.search,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getEmployees(tenantId, filters, pagination);
  }

  static async getEmployee(tenantId: string, id: string) {
    return hrmsStorage.getEmployeeById(tenantId, id);
  }

  static async addEmployee(tenantId: string, data: any) {
    const validated = insertHrEmployeeSchema.parse({ ...data, tenantId });
    const employee = await hrmsStorage.createEmployee(validated);
    
    setImmediate(async () => {
      try {
        await baseNotificationService.dispatch({
          tenantId,
          eventType: "HR_EMPLOYEE_ONBOARDED",
          channels: ["email"],
          recipient: { name: employee.firstName, email: employee.email || undefined },
          variables: { employeeName: employee.firstName },
          referenceId: employee.id,
          referenceType: "employee",
        });
      } catch (error) {
        console.error("Failed to send onboarding notification:", error);
      }
    });
    
    return employee;
  }

  static async updateEmployee(tenantId: string, id: string, data: any) {
    return hrmsStorage.updateEmployee(tenantId, id, data);
  }

  static async deleteEmployee(tenantId: string, id: string) {
    return hrmsStorage.deleteEmployee(tenantId, id);
  }

  static async deactivateEmployee(tenantId: string, id: string, reason?: string) {
    return hrmsStorage.deactivateEmployee(tenantId, id, reason);
  }

  static async reactivateEmployee(tenantId: string, id: string) {
    return hrmsStorage.reactivateEmployee(tenantId, id);
  }

  static async listDepartments(tenantId: string) {
    return hrmsStorage.getDepartments(tenantId);
  }

  static async addDepartment(tenantId: string, data: any) {
    const validated = insertHrDepartmentSchema.parse({ ...data, tenantId });
    return hrmsStorage.createDepartment(validated);
  }
}

export default EmployeeService;
