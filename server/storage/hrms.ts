import { db } from "../db";
import { eq, and, gte, lte, ilike, or, sql, desc, asc, count } from "drizzle-orm";
import {
  hrEmployees,
  hrDepartments,
  hrEmployeeDocuments,
  hrAttendance,
  hrLeaveTypes,
  hrLeaveBalances,
  hrLeaves,
  hrHolidays,
  hrSalaryStructures,
  hrPayroll,
  hrProjects,
  hrAllocations,
  hrTimesheets,
  hrShifts,
  hrEmployeeShifts,
  hrPolicies,
  type HrEmployee,
  type InsertHrEmployee,
  type HrDepartment,
  type InsertHrDepartment,
  type HrAttendance,
  type InsertHrAttendance,
  type HrLeave,
  type InsertHrLeave,
  type HrLeaveType,
  type InsertHrLeaveType,
  type HrLeaveBalance,
  type InsertHrLeaveBalance,
  type HrPayroll,
  type InsertHrPayroll,
  type HrSalaryStructure,
  type InsertHrSalaryStructure,
  type HrProject,
  type InsertHrProject,
  type HrAllocation,
  type InsertHrAllocation,
  type HrTimesheet,
  type InsertHrTimesheet,
  type HrHoliday,
  type InsertHrHoliday,
} from "@shared/schema";

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface EmployeeFilterParams {
  status?: string;
  departmentId?: string;
  employmentType?: string;
  search?: string;
}

export interface AttendanceFilterParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface LeaveFilterParams {
  employeeId?: string;
  status?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayrollFilterParams {
  employeeId?: string;
  month?: number;
  year?: number;
  status?: string;
}

export interface ProjectFilterParams {
  status?: string;
  search?: string;
}

export interface TimesheetFilterParams {
  employeeId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class HrmsStorage {
  async generateEmployeeId(tenantId: string): Promise<string> {
    const result = await db.select({ count: count() })
      .from(hrEmployees)
      .where(eq(hrEmployees.tenantId, tenantId));
    const num = (result[0]?.count || 0) + 1;
    return `EMP${String(num).padStart(5, "0")}`;
  }

  async getEmployees(
    tenantId: string,
    filters: EmployeeFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrEmployee>> {
    const conditions = [eq(hrEmployees.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(hrEmployees.status, filters.status as any));
    }
    if (filters.departmentId) {
      conditions.push(eq(hrEmployees.departmentId, filters.departmentId));
    }
    if (filters.employmentType) {
      conditions.push(eq(hrEmployees.employmentType, filters.employmentType as any));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(hrEmployees.firstName, `%${filters.search}%`),
          ilike(hrEmployees.lastName, `%${filters.search}%`),
          ilike(hrEmployees.email, `%${filters.search}%`),
          ilike(hrEmployees.employeeId, `%${filters.search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [employees, totalResult] = await Promise.all([
      db.select()
        .from(hrEmployees)
        .where(whereClause)
        .orderBy(pagination.sortOrder === "desc" ? desc(hrEmployees.createdAt) : asc(hrEmployees.createdAt))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrEmployees)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: employees,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getEmployeeById(tenantId: string, id: string): Promise<HrEmployee | null> {
    const [employee] = await db.select()
      .from(hrEmployees)
      .where(and(eq(hrEmployees.tenantId, tenantId), eq(hrEmployees.id, id)));
    return employee || null;
  }

  async createEmployee(data: InsertHrEmployee): Promise<HrEmployee> {
    const employeeId = data.employeeId || await this.generateEmployeeId(data.tenantId);
    const [employee] = await db.insert(hrEmployees)
      .values({ ...data, employeeId })
      .returning();
    return employee;
  }

  async updateEmployee(tenantId: string, id: string, data: Partial<InsertHrEmployee>): Promise<HrEmployee | null> {
    const [employee] = await db.update(hrEmployees)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrEmployees.tenantId, tenantId), eq(hrEmployees.id, id)))
      .returning();
    return employee || null;
  }

  async getDepartments(tenantId: string): Promise<HrDepartment[]> {
    return db.select()
      .from(hrDepartments)
      .where(eq(hrDepartments.tenantId, tenantId))
      .orderBy(hrDepartments.name);
  }

  async createDepartment(data: InsertHrDepartment): Promise<HrDepartment> {
    const [dept] = await db.insert(hrDepartments).values(data).returning();
    return dept;
  }

  async getAttendance(
    tenantId: string,
    filters: AttendanceFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrAttendance>> {
    const conditions = [eq(hrAttendance.tenantId, tenantId)];

    if (filters.employeeId) {
      conditions.push(eq(hrAttendance.employeeId, filters.employeeId));
    }
    if (filters.startDate) {
      conditions.push(gte(hrAttendance.attendanceDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(hrAttendance.attendanceDate, filters.endDate));
    }
    if (filters.status) {
      conditions.push(eq(hrAttendance.status, filters.status as any));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [attendance, totalResult] = await Promise.all([
      db.select()
        .from(hrAttendance)
        .where(whereClause)
        .orderBy(desc(hrAttendance.attendanceDate))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrAttendance)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: attendance,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async recordAttendance(data: InsertHrAttendance): Promise<HrAttendance> {
    const [attendance] = await db.insert(hrAttendance).values(data).returning();
    return attendance;
  }

  async updateAttendance(tenantId: string, id: string, data: Partial<InsertHrAttendance>): Promise<HrAttendance | null> {
    const [attendance] = await db.update(hrAttendance)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrAttendance.tenantId, tenantId), eq(hrAttendance.id, id)))
      .returning();
    return attendance || null;
  }

  async getLeaveTypes(tenantId: string): Promise<HrLeaveType[]> {
    return db.select()
      .from(hrLeaveTypes)
      .where(and(eq(hrLeaveTypes.tenantId, tenantId), eq(hrLeaveTypes.isActive, true)))
      .orderBy(hrLeaveTypes.name);
  }

  async createLeaveType(data: InsertHrLeaveType): Promise<HrLeaveType> {
    const [leaveType] = await db.insert(hrLeaveTypes).values(data).returning();
    return leaveType;
  }

  async getLeaveBalances(tenantId: string, employeeId: string, year: number): Promise<HrLeaveBalance[]> {
    return db.select()
      .from(hrLeaveBalances)
      .where(and(
        eq(hrLeaveBalances.tenantId, tenantId),
        eq(hrLeaveBalances.employeeId, employeeId),
        eq(hrLeaveBalances.year, year)
      ));
  }

  async createOrUpdateLeaveBalance(data: InsertHrLeaveBalance): Promise<HrLeaveBalance> {
    const existing = await db.select()
      .from(hrLeaveBalances)
      .where(and(
        eq(hrLeaveBalances.employeeId, data.employeeId),
        eq(hrLeaveBalances.leaveTypeId, data.leaveTypeId),
        eq(hrLeaveBalances.year, data.year)
      ));

    if (existing.length > 0) {
      const [updated] = await db.update(hrLeaveBalances)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hrLeaveBalances.id, existing[0].id))
        .returning();
      return updated;
    }

    const [balance] = await db.insert(hrLeaveBalances).values(data).returning();
    return balance;
  }

  async getLeaves(
    tenantId: string,
    filters: LeaveFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrLeave>> {
    const conditions = [eq(hrLeaves.tenantId, tenantId)];

    if (filters.employeeId) {
      conditions.push(eq(hrLeaves.employeeId, filters.employeeId));
    }
    if (filters.status) {
      conditions.push(eq(hrLeaves.status, filters.status as any));
    }
    if (filters.leaveTypeId) {
      conditions.push(eq(hrLeaves.leaveTypeId, filters.leaveTypeId));
    }
    if (filters.startDate) {
      conditions.push(gte(hrLeaves.startDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(hrLeaves.endDate, filters.endDate));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [leaves, totalResult] = await Promise.all([
      db.select()
        .from(hrLeaves)
        .where(whereClause)
        .orderBy(desc(hrLeaves.createdAt))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrLeaves)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: leaves,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async createLeave(data: InsertHrLeave): Promise<HrLeave> {
    const [leave] = await db.insert(hrLeaves).values(data).returning();
    return leave;
  }

  async updateLeave(tenantId: string, id: string, data: Partial<InsertHrLeave>): Promise<HrLeave | null> {
    const [leave] = await db.update(hrLeaves)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrLeaves.tenantId, tenantId), eq(hrLeaves.id, id)))
      .returning();
    return leave || null;
  }

  async getHolidays(tenantId: string, year: number): Promise<HrHoliday[]> {
    return db.select()
      .from(hrHolidays)
      .where(and(eq(hrHolidays.tenantId, tenantId), eq(hrHolidays.year, year)))
      .orderBy(hrHolidays.holidayDate);
  }

  async createHoliday(data: InsertHrHoliday): Promise<HrHoliday> {
    const [holiday] = await db.insert(hrHolidays).values(data).returning();
    return holiday;
  }

  async getSalaryStructure(tenantId: string, employeeId: string): Promise<HrSalaryStructure | null> {
    const [structure] = await db.select()
      .from(hrSalaryStructures)
      .where(and(
        eq(hrSalaryStructures.tenantId, tenantId),
        eq(hrSalaryStructures.employeeId, employeeId),
        eq(hrSalaryStructures.isActive, true)
      ))
      .orderBy(desc(hrSalaryStructures.effectiveFrom))
      .limit(1);
    return structure || null;
  }

  async createSalaryStructure(data: InsertHrSalaryStructure): Promise<HrSalaryStructure> {
    await db.update(hrSalaryStructures)
      .set({ isActive: false })
      .where(and(
        eq(hrSalaryStructures.tenantId, data.tenantId),
        eq(hrSalaryStructures.employeeId, data.employeeId)
      ));

    const [structure] = await db.insert(hrSalaryStructures).values(data).returning();
    return structure;
  }

  async getPayroll(
    tenantId: string,
    filters: PayrollFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrPayroll>> {
    const conditions = [eq(hrPayroll.tenantId, tenantId)];

    if (filters.employeeId) {
      conditions.push(eq(hrPayroll.employeeId, filters.employeeId));
    }
    if (filters.month) {
      conditions.push(eq(hrPayroll.payrollMonth, filters.month));
    }
    if (filters.year) {
      conditions.push(eq(hrPayroll.payrollYear, filters.year));
    }
    if (filters.status) {
      conditions.push(eq(hrPayroll.status, filters.status as any));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [payrolls, totalResult] = await Promise.all([
      db.select()
        .from(hrPayroll)
        .where(whereClause)
        .orderBy(desc(hrPayroll.payrollYear), desc(hrPayroll.payrollMonth))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrPayroll)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: payrolls,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async createPayroll(data: InsertHrPayroll): Promise<HrPayroll> {
    const [payroll] = await db.insert(hrPayroll).values(data).returning();
    return payroll;
  }

  async updatePayroll(tenantId: string, id: string, data: Partial<InsertHrPayroll>): Promise<HrPayroll | null> {
    const [payroll] = await db.update(hrPayroll)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrPayroll.tenantId, tenantId), eq(hrPayroll.id, id)))
      .returning();
    return payroll || null;
  }

  async getProjects(
    tenantId: string,
    filters: ProjectFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrProject>> {
    const conditions = [eq(hrProjects.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(hrProjects.status, filters.status as any));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(hrProjects.name, `%${filters.search}%`),
          ilike(hrProjects.projectCode, `%${filters.search}%`),
          ilike(hrProjects.clientName, `%${filters.search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [projects, totalResult] = await Promise.all([
      db.select()
        .from(hrProjects)
        .where(whereClause)
        .orderBy(desc(hrProjects.createdAt))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrProjects)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: projects,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async createProject(data: InsertHrProject): Promise<HrProject> {
    const [project] = await db.insert(hrProjects).values(data).returning();
    return project;
  }

  async updateProject(tenantId: string, id: string, data: Partial<InsertHrProject>): Promise<HrProject | null> {
    const [project] = await db.update(hrProjects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrProjects.tenantId, tenantId), eq(hrProjects.id, id)))
      .returning();
    return project || null;
  }

  async getAllocations(tenantId: string, employeeId?: string, projectId?: string): Promise<HrAllocation[]> {
    const conditions = [eq(hrAllocations.tenantId, tenantId)];
    if (employeeId) conditions.push(eq(hrAllocations.employeeId, employeeId));
    if (projectId) conditions.push(eq(hrAllocations.projectId, projectId));

    return db.select()
      .from(hrAllocations)
      .where(and(...conditions))
      .orderBy(desc(hrAllocations.startDate));
  }

  async createAllocation(data: InsertHrAllocation): Promise<HrAllocation> {
    const [allocation] = await db.insert(hrAllocations).values(data).returning();
    return allocation;
  }

  async updateAllocation(tenantId: string, id: string, data: Partial<InsertHrAllocation>): Promise<HrAllocation | null> {
    const [allocation] = await db.update(hrAllocations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrAllocations.tenantId, tenantId), eq(hrAllocations.id, id)))
      .returning();
    return allocation || null;
  }

  async getTimesheets(
    tenantId: string,
    filters: TimesheetFilterParams = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<HrTimesheet>> {
    const conditions = [eq(hrTimesheets.tenantId, tenantId)];

    if (filters.employeeId) {
      conditions.push(eq(hrTimesheets.employeeId, filters.employeeId));
    }
    if (filters.projectId) {
      conditions.push(eq(hrTimesheets.projectId, filters.projectId));
    }
    if (filters.startDate) {
      conditions.push(gte(hrTimesheets.timesheetDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(hrTimesheets.timesheetDate, filters.endDate));
    }
    if (filters.status) {
      conditions.push(eq(hrTimesheets.status, filters.status as any));
    }

    const whereClause = and(...conditions);
    const offset = (pagination.page - 1) * pagination.limit;

    const [timesheets, totalResult] = await Promise.all([
      db.select()
        .from(hrTimesheets)
        .where(whereClause)
        .orderBy(desc(hrTimesheets.timesheetDate))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ count: count() })
        .from(hrTimesheets)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data: timesheets,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async createTimesheet(data: InsertHrTimesheet): Promise<HrTimesheet> {
    const [timesheet] = await db.insert(hrTimesheets).values(data).returning();
    return timesheet;
  }

  async updateTimesheet(tenantId: string, id: string, data: Partial<InsertHrTimesheet>): Promise<HrTimesheet | null> {
    const [timesheet] = await db.update(hrTimesheets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(hrTimesheets.tenantId, tenantId), eq(hrTimesheets.id, id)))
      .returning();
    return timesheet || null;
  }

  async getDashboardStats(tenantId: string): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    todayPresent: number;
    todayAbsent: number;
    pendingLeaves: number;
    departmentCount: number;
  }> {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalResult,
      activeResult,
      presentResult,
      absentResult,
      pendingLeavesResult,
      deptResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(hrEmployees).where(eq(hrEmployees.tenantId, tenantId)),
      db.select({ count: count() }).from(hrEmployees).where(and(eq(hrEmployees.tenantId, tenantId), eq(hrEmployees.status, "active"))),
      db.select({ count: count() }).from(hrAttendance).where(and(eq(hrAttendance.tenantId, tenantId), eq(hrAttendance.attendanceDate, today), eq(hrAttendance.status, "present"))),
      db.select({ count: count() }).from(hrAttendance).where(and(eq(hrAttendance.tenantId, tenantId), eq(hrAttendance.attendanceDate, today), eq(hrAttendance.status, "absent"))),
      db.select({ count: count() }).from(hrLeaves).where(and(eq(hrLeaves.tenantId, tenantId), eq(hrLeaves.status, "pending"))),
      db.select({ count: count() }).from(hrDepartments).where(eq(hrDepartments.tenantId, tenantId)),
    ]);

    return {
      totalEmployees: totalResult[0]?.count || 0,
      activeEmployees: activeResult[0]?.count || 0,
      todayPresent: presentResult[0]?.count || 0,
      todayAbsent: absentResult[0]?.count || 0,
      pendingLeaves: pendingLeavesResult[0]?.count || 0,
      departmentCount: deptResult[0]?.count || 0,
    };
  }

  async deleteEmployee(tenantId: string, id: string): Promise<boolean> {
    const result = await db.update(hrEmployees)
      .set({ status: "exited", updatedAt: new Date() })
      .where(and(eq(hrEmployees.tenantId, tenantId), eq(hrEmployees.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteHoliday(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(hrHolidays)
      .where(and(eq(hrHolidays.tenantId, tenantId), eq(hrHolidays.id, id)))
      .returning();
    return result.length > 0;
  }

  async hasFeatureFlag(tenantId: string, featureFlag: string): Promise<boolean> {
    const FEATURE_FLAGS: Record<string, string[]> = {
      hrms_it_extensions: ["clinic", "coworking", "service", "education", "legal", "furniture_manufacturing"],
    };
    return true;
  }

  async checkIn(tenantId: string, employeeId: string): Promise<HrAttendance> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    
    const existing = await db.select()
      .from(hrAttendance)
      .where(and(
        eq(hrAttendance.tenantId, tenantId),
        eq(hrAttendance.employeeId, employeeId),
        eq(hrAttendance.attendanceDate, today)
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].checkIn) {
      throw new Error("Already checked in for today");
    }

    if (existing.length > 0) {
      const [updated] = await db.update(hrAttendance)
        .set({ checkIn: now.toTimeString().slice(0, 8), status: "present", updatedAt: now })
        .where(eq(hrAttendance.id, existing[0].id))
        .returning();
      return updated;
    }

    const [record] = await db.insert(hrAttendance)
      .values({
        tenantId,
        employeeId,
        attendanceDate: today,
        checkIn: now.toTimeString().slice(0, 8),
        status: "present",
      })
      .returning();
    return record;
  }

  async checkOut(tenantId: string, employeeId: string): Promise<HrAttendance> {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    
    const existing = await db.select()
      .from(hrAttendance)
      .where(and(
        eq(hrAttendance.tenantId, tenantId),
        eq(hrAttendance.employeeId, employeeId),
        eq(hrAttendance.attendanceDate, today)
      ))
      .limit(1);

    if (existing.length === 0 || !existing[0].checkIn) {
      throw new Error("Must check in before checking out");
    }

    if (existing[0].checkOut) {
      throw new Error("Already checked out for today");
    }

    const checkInTime = new Date(`${today}T${existing[0].checkIn}`);
    const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    const [updated] = await db.update(hrAttendance)
      .set({ 
        checkOut: now.toTimeString().slice(0, 8), 
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        updatedAt: now 
      })
      .where(eq(hrAttendance.id, existing[0].id))
      .returning();
    return updated;
  }
}

export const hrmsStorage = new HrmsStorage();
