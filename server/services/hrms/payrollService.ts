import { hrmsStorage } from "../../storage/hrms";
import { insertHrPayrollSchema, insertHrSalaryStructureSchema } from "@shared/schema";
import { baseNotificationService } from "../base-notification";

class PayrollService {
  static async getSalaryStructure(tenantId: string, employeeId: string) {
    return hrmsStorage.getSalaryStructure(tenantId, employeeId);
  }

  static async addSalaryStructure(tenantId: string, data: any) {
    const validated = insertHrSalaryStructureSchema.parse({ ...data, tenantId });
    return hrmsStorage.createSalaryStructure(validated);
  }

  static async listPayroll(tenantId: string, query: any) {
    const filters = {
      employeeId: query.employeeId,
      month: query.month ? parseInt(query.month) : undefined,
      year: query.year ? parseInt(query.year) : undefined,
      status: query.status,
    };
    const pagination = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    };
    return hrmsStorage.getPayroll(tenantId, filters, pagination);
  }

  static async runPayroll(tenantId: string, data: any) {
    const validated = insertHrPayrollSchema.parse({ ...data, tenantId });
    const payroll = await hrmsStorage.createPayroll(validated);
    
    setImmediate(async () => {
      try {
        const employee = await hrmsStorage.getEmployeeById(tenantId, payroll.employeeId);
        if (employee) {
          await baseNotificationService.dispatch({
            tenantId,
            eventType: "HR_PAYROLL_PROCESSED",
            channels: ["email"],
            recipient: { name: employee.firstName, email: employee.email || undefined },
            variables: { 
              employeeName: employee.firstName,
              month: String(payroll.payrollMonth),
              year: String(payroll.payrollYear),
              netPay: String(payroll.netSalary),
            },
            referenceId: payroll.id,
            referenceType: "payroll",
          });
        }
      } catch (error) {
        console.error("Failed to send payroll notification:", error);
      }
    });
    
    return payroll;
  }

  static async updatePayroll(tenantId: string, id: string, data: any) {
    return hrmsStorage.updatePayroll(tenantId, id, data);
  }
}

export default PayrollService;
