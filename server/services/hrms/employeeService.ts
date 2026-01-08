import { hrmsStorage } from "../../storage/hrms";
import { insertHrEmployeeSchema, insertHrDepartmentSchema } from "@shared/schema";

class EmployeeService {
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

  static async addEmployee(tenantId: string, data: any) {
    const validated = insertHrEmployeeSchema.parse({ ...data, tenantId });
    return hrmsStorage.createEmployee(validated);
  }

  static async updateEmployee(tenantId: string, id: string, data: any) {
    return hrmsStorage.updateEmployee(tenantId, id, data);
  }

  static async getEmployee(tenantId: string, id: string) {
    return hrmsStorage.getEmployeeById(tenantId, id);
  }

  static async deleteEmployee(tenantId: string, id: string) {
    return hrmsStorage.deleteEmployee(tenantId, id);
  }

  static async getDashboardStats(tenantId: string) {
    return hrmsStorage.getDashboardStats(tenantId);
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
