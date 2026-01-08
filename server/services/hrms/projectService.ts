class ProjectService {
  static async listProjects(tenantId: string, query: any) { return []; }
  static async addProject(tenantId: string, data: any) { return { success: true }; }
  static async updateProject(tenantId: string, id: string, data: any) { return { success: true }; }
  static async listAllocations(tenantId: string, employeeId?: string, projectId?: string) { return []; }
  static async addAllocation(tenantId: string, data: any) { return { success: true }; }
  static async updateAllocation(tenantId: string, id: string, data: any) { return { success: true }; }
  static async listTimesheets(tenantId: string, query: any) { return []; }
  static async addTimesheet(tenantId: string, data: any) { return { success: true }; }
  static async updateTimesheet(tenantId: string, id: string, data: any, approverId?: string) { return { success: true }; }
}
export default ProjectService;
