class EmployeeService {
  static async getDashboardStats(tenantId: string) { return {}; }
  static async listEmployees(tenantId: string, query: any) { return []; }
  static async getEmployee(tenantId: string, id: string) { return null; }
  static async addEmployee(tenantId: string, data: any) { return { success: true }; }
  static async updateEmployee(tenantId: string, id: string, data: any) { return { success: true }; }
  static async deleteEmployee(tenantId: string, id: string) { return { success: true }; }
  static async listDepartments(tenantId: string) { return []; }
  static async addDepartment(tenantId: string, data: any) { return { success: true }; }
}
export default EmployeeService;
