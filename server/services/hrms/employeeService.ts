import { hrmsStorage } from "../../storage/hrms";
import { insertHrEmployeeSchema, insertHrDepartmentSchema } from "@shared/schema";
import { logHrmsAudit } from "../audit";

export class EmployeeService {
  async getDashboardStats(tenantId: string) {
    return hrmsStorage.getDashboardStats(tenantId);
  }

  async getEmployees(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getEmployees(tenantId, filters, pagination);
  }

  async getEmployeeById(tenantId: string, employeeId: string) {
    return hrmsStorage.getEmployeeById(tenantId, employeeId);
  }

  async createEmployee(data: any, tenantId: string, userId?: string) {
    const validated = insertHrEmployeeSchema.parse({ ...data, tenantId, createdBy: userId });
    const employee = await hrmsStorage.createEmployee(validated);
    await logHrmsAudit(tenantId, "create", "hr_employee", employee.id, null, employee, userId);
    return employee;
  }

  async updateEmployee(tenantId: string, employeeId: string, data: any, userId?: string) {
    const existing = await hrmsStorage.getEmployeeById(tenantId, employeeId);
    if (!existing) {
      return null;
    }
    const employee = await hrmsStorage.updateEmployee(tenantId, employeeId, data);
    await logHrmsAudit(tenantId, "update", "hr_employee", employeeId, existing, employee, userId);
    return employee;
  }

  async getDepartments(tenantId: string) {
    return hrmsStorage.getDepartments(tenantId);
  }

  async createDepartment(data: any, tenantId: string, userId?: string) {
    const validated = insertHrDepartmentSchema.parse({ ...data, tenantId, createdBy: userId });
    const department = await hrmsStorage.createDepartment(validated);
    await logHrmsAudit(tenantId, "create", "hr_department", department.id, null, department, userId);
    return department;
  }
}

export const employeeService = new EmployeeService();
