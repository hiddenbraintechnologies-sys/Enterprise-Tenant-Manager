import { hrmsStorage } from "../../storage/hrms";
import { insertHrPayrollSchema, insertHrSalaryStructureSchema } from "@shared/schema";

class PayrollService {
  static async getSalaryStructure(tenantId: string, employeeId: string) {
    return hrmsStorage.getSalaryStructure(tenantId, employeeId);
  }

  static async createSalaryStructure(tenantId: string, data: any, userId?: string) {
    const validated = insertHrSalaryStructureSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createSalaryStructure(validated);
  }

  static async getPayroll(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getPayroll(tenantId, filters, pagination);
  }

  static async createPayroll(tenantId: string, data: any, userId?: string) {
    const validated = insertHrPayrollSchema.parse({ ...data, tenantId, createdBy: userId });
    return hrmsStorage.createPayroll(validated);
  }

  static async updatePayroll(tenantId: string, payrollId: string, data: any, userId?: string) {
    return hrmsStorage.updatePayroll(tenantId, payrollId, data);
  }
}

export default PayrollService;
