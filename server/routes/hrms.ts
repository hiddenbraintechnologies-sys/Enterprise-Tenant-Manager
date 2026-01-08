import { Router, Request, Response } from "express";
import { hrmsStorage } from "../storage/hrms";
import {
  insertHrEmployeeSchema,
  insertHrDepartmentSchema,
  insertHrAttendanceSchema,
  insertHrLeaveSchema,
  insertHrLeaveTypeSchema,
  insertHrPayrollSchema,
  insertHrSalaryStructureSchema,
  insertHrProjectSchema,
  insertHrAllocationSchema,
  insertHrTimesheetSchema,
  insertHrHolidaySchema,
} from "@shared/schema";
import { z } from "zod";
import { logHrmsAudit } from "../services/audit";

const router = Router();

function getTenantId(req: Request): string {
  const tenantId = req.headers["x-tenant-id"] as string || (req as any).tenantId;
  if (!tenantId) {
    throw new Error("Tenant ID required");
  }
  return tenantId;
}

function getUserId(req: Request): string | undefined {
  return (req as any).userId || (req as any).user?.id;
}

function parsePagination(req: Request) {
  return {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    sortBy: req.query.sortBy as string,
    sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
  };
}

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const stats = await hrmsStorage.getDashboardStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/employees", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      status: req.query.status as string,
      departmentId: req.query.departmentId as string,
      employmentType: req.query.employmentType as string,
      search: req.query.search as string,
    };
    const result = await hrmsStorage.getEmployees(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/employees/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const employee = await hrmsStorage.getEmployeeById(tenantId, req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/employees", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrEmployeeSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const employee = await hrmsStorage.createEmployee(data);
    
    await logHrmsAudit(tenantId, "create", "hr_employee", employee.id, null, employee, userId);
    res.status(201).json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/employees/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const existing = await hrmsStorage.getEmployeeById(tenantId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    const employee = await hrmsStorage.updateEmployee(tenantId, req.params.id, req.body);
    await logHrmsAudit(tenantId, "update", "hr_employee", req.params.id, existing, employee, userId);
    res.json(employee);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/departments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const departments = await hrmsStorage.getDepartments(tenantId);
    res.json(departments);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/departments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrDepartmentSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const department = await hrmsStorage.createDepartment(data);
    
    await logHrmsAudit(tenantId, "create", "hr_department", department.id, null, department, userId);
    res.status(201).json(department);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/attendance", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      employeeId: req.query.employeeId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as string,
    };
    const result = await hrmsStorage.getAttendance(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/attendance", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrAttendanceSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const attendance = await hrmsStorage.recordAttendance(data);
    
    await logHrmsAudit(tenantId, "create", "hr_attendance", attendance.id, null, attendance, userId);
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/attendance/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const attendance = await hrmsStorage.updateAttendance(tenantId, req.params.id, req.body);
    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/leave-types", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const leaveTypes = await hrmsStorage.getLeaveTypes(tenantId);
    res.json(leaveTypes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/leave-types", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrLeaveTypeSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const leaveType = await hrmsStorage.createLeaveType(data);
    res.status(201).json(leaveType);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/leave-balances/:employeeId", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const balances = await hrmsStorage.getLeaveBalances(tenantId, req.params.employeeId, year);
    res.json(balances);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/leaves", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
      leaveTypeId: req.query.leaveTypeId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const result = await hrmsStorage.getLeaves(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/leaves", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrLeaveSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const leave = await hrmsStorage.createLeave(data);
    
    await logHrmsAudit(tenantId, "create", "hr_leave", leave.id, null, leave, userId);
    res.status(201).json(leave);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/leaves/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const leave = await hrmsStorage.updateLeave(tenantId, req.params.id, {
      ...req.body,
      approvedBy: req.body.status === "approved" ? userId : undefined,
      approvedAt: req.body.status === "approved" ? new Date() : undefined,
    });
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    
    await logHrmsAudit(tenantId, "update", "hr_leave", req.params.id, null, leave, userId);
    res.json(leave);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/holidays", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const holidays = await hrmsStorage.getHolidays(tenantId, year);
    res.json(holidays);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/holidays", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrHolidaySchema.parse({ ...req.body, tenantId, createdBy: userId });
    const holiday = await hrmsStorage.createHoliday(data);
    res.status(201).json(holiday);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/salary-structure/:employeeId", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const structure = await hrmsStorage.getSalaryStructure(tenantId, req.params.employeeId);
    res.json(structure);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/salary-structure", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrSalaryStructureSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const structure = await hrmsStorage.createSalaryStructure(data);
    
    await logHrmsAudit(tenantId, "create", "hr_salary_structure", structure.id, null, structure, userId);
    res.status(201).json(structure);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/payroll", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      employeeId: req.query.employeeId as string,
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      status: req.query.status as string,
    };
    const result = await hrmsStorage.getPayroll(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/payroll", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrPayrollSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const payroll = await hrmsStorage.createPayroll(data);
    
    await logHrmsAudit(tenantId, "create", "hr_payroll", payroll.id, null, payroll, userId);
    res.status(201).json(payroll);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/payroll/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const payroll = await hrmsStorage.updatePayroll(tenantId, req.params.id, req.body);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found" });
    }
    
    await logHrmsAudit(tenantId, "update", "hr_payroll", req.params.id, null, payroll, userId);
    res.json(payroll);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/projects", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
    };
    const result = await hrmsStorage.getProjects(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/projects", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrProjectSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const project = await hrmsStorage.createProject(data);
    
    await logHrmsAudit(tenantId, "create", "hr_project", project.id, null, project, userId);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/projects/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const project = await hrmsStorage.updateProject(tenantId, req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/allocations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const allocations = await hrmsStorage.getAllocations(
      tenantId,
      req.query.employeeId as string,
      req.query.projectId as string
    );
    res.json(allocations);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/allocations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrAllocationSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const allocation = await hrmsStorage.createAllocation(data);
    res.status(201).json(allocation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/allocations/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const allocation = await hrmsStorage.updateAllocation(tenantId, req.params.id, req.body);
    if (!allocation) {
      return res.status(404).json({ error: "Allocation not found" });
    }
    res.json(allocation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/timesheets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const pagination = parsePagination(req);
    const filters = {
      employeeId: req.query.employeeId as string,
      projectId: req.query.projectId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as string,
    };
    const result = await hrmsStorage.getTimesheets(tenantId, filters, pagination);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/timesheets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertHrTimesheetSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const timesheet = await hrmsStorage.createTimesheet(data);
    res.status(201).json(timesheet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/timesheets/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const timesheet = await hrmsStorage.updateTimesheet(tenantId, req.params.id, {
      ...req.body,
      approvedBy: req.body.status === "approved" ? userId : undefined,
      approvedAt: req.body.status === "approved" ? new Date() : undefined,
    });
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }
    res.json(timesheet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
