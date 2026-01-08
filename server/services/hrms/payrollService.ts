import { hrmsStorage } from "../../storage/hrms";
import { insertHrPayrollSchema, insertHrSalaryStructureSchema } from "@shared/schema";
import { logHrmsAudit } from "../audit";

export class PayrollService {
  async getSalaryStructure(tenantId: string, employeeId: string) {
    return hrmsStorage.getSalaryStructure(tenantId, employeeId);
  }

  async createSalaryStructure(data: any, tenantId: string, userId?: string) {
    const validated = insertHrSalaryStructureSchema.parse({ ...data, tenantId, createdBy: userId });
    const structure = await hrmsStorage.createSalaryStructure(validated);
    await logHrmsAudit(tenantId, "create", "hr_salary_structure", structure.id, null, structure, userId);
    return structure;
  }

  async getPayroll(tenantId: string, filters: any, pagination: any) {
    return hrmsStorage.getPayroll(tenantId, filters, pagination);
  }

  async createPayroll(data: any, tenantId: string, userId?: string) {
    const validated = insertHrPayrollSchema.parse({ ...data, tenantId, createdBy: userId });
    const payroll = await hrmsStorage.createPayroll(validated);
    await logHrmsAudit(tenantId, "create", "hr_payroll", payroll.id, null, payroll, userId);
    return payroll;
  }

  async updatePayroll(tenantId: string, payrollId: string, data: any, userId?: string) {
    const payroll = await hrmsStorage.updatePayroll(tenantId, payrollId, data);
    if (payroll) {
      await logHrmsAudit(tenantId, "update", "hr_payroll", payrollId, null, payroll, userId);
    }
    return payroll;
  }
}

export const payrollService = new PayrollService();
