import { hrmsStorage } from "../../storage/hrms";
import { insertHrEmployeeSchema, insertHrDepartmentSchema } from "@shared/schema";

class EmployeeService {
  static async getDashboardStats(tenantId: string) {
    return hrmsStorage.getDashboardStats(tenantId);
  }

  static async getEmployees(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getEmployees(tenantId, filters, pagination);
  }

  static async getEmployeeById(tenantId: string, employeeId: string) {
    return hrmsStorage.getEmployeeById(tenantId, employeeId);
  }

  static async createEmployee(data: any, tenantId: string, userId?: string) {
    const validated = insertHrEmployeeSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createEmployee(validated);
  }

  static async updateEmployee(tenantId: string, employeeId: string, data: any, userId?: string) {
    return hrmsStorage.updateEmployee(tenantId, employeeId, data);
  }

  static async deleteEmployee(tenantId: string, employeeId: string) {
    return hrmsStorage.deleteEmployee(tenantId, employeeId);
  }

  static async getDepartments(tenantId: string) {
    return hrmsStorage.getDepartments(tenantId);
  }

  static async createDepartment(data: any, tenantId: string, userId?: string) {
    const validated = insertHrDepartmentSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createDepartment(validated);
  }
}

export default EmployeeService;
