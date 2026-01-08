import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, time, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "../schema";

export const hrEmploymentTypeEnum = pgEnum("hr_employment_type", ["full_time", "part_time", "contract", "intern"]);
export const hrEmployeeStatusEnum = pgEnum("hr_employee_status", ["active", "exited", "on_hold", "probation"]);
export const hrWorkLocationEnum = pgEnum("hr_work_location", ["onsite", "remote", "hybrid"]);
export const hrLeaveStatusEnum = pgEnum("hr_leave_status", ["pending", "approved", "rejected", "cancelled"]);
export const hrAttendanceStatusEnum = pgEnum("hr_attendance_status", ["present", "absent", "half_day", "on_leave", "holiday", "weekend"]);
export const hrPayrollStatusEnum = pgEnum("hr_payroll_status", ["draft", "processing", "processed", "paid", "failed"]);
export const hrProjectStatusEnum = pgEnum("hr_project_status", ["active", "completed", "on_hold", "cancelled"]);
export const hrTimesheetStatusEnum = pgEnum("hr_timesheet_status", ["draft", "submitted", "approved", "rejected"]);
export const hrDocumentTypeEnum = pgEnum("hr_document_type", ["id_proof", "offer_letter", "contract", "experience_letter", "other"]);

export const hrEmployees = pgTable("hr_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: varchar("postal_code", { length: 20 }),
  departmentId: varchar("department_id"),
  designation: text("designation"),
  employmentType: hrEmploymentTypeEnum("employment_type").default("full_time"),
  joinDate: date("join_date").notNull(),
  probationEndDate: date("probation_end_date"),
  reportingManagerId: varchar("reporting_manager_id"),
  workLocation: hrWorkLocationEnum("work_location").default("onsite"),
  status: hrEmployeeStatusEnum("status").default("active"),
  profilePhotoUrl: text("profile_photo_url"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  panNumber: varchar("pan_number", { length: 20 }),
  aadharNumber: varchar("aadhar_number", { length: 20 }),
  resignationDate: date("resignation_date"),
  lastWorkingDay: date("last_working_day"),
  exitReason: text("exit_reason"),
  clearanceCompleted: boolean("clearance_completed").default(false),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_employees_tenant").on(table.tenantId),
  index("idx_hr_employees_status").on(table.status),
  index("idx_hr_employees_department").on(table.departmentId),
  uniqueIndex("idx_hr_employees_tenant_emp_id").on(table.tenantId, table.employeeId),
]);

export const hrDepartments = pgTable("hr_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }),
  description: text("description"),
  parentDepartmentId: varchar("parent_department_id"),
  headEmployeeId: varchar("head_employee_id"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_departments_tenant").on(table.tenantId),
]);

export const hrEmployeeDocuments = pgTable("hr_employee_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  documentType: hrDocumentTypeEnum("document_type").notNull(),
  documentName: text("document_name").notNull(),
  documentUrl: text("document_url"),
  expiryDate: date("expiry_date"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hr_documents_employee").on(table.employeeId),
]);

export const hrAttendance = pgTable("hr_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  attendanceDate: date("attendance_date").notNull(),
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  checkInLocation: text("check_in_location"),
  checkOutLocation: text("check_out_location"),
  status: hrAttendanceStatusEnum("status").default("present"),
  isLateArrival: boolean("is_late_arrival").default(false),
  isEarlyDeparture: boolean("is_early_departure").default(false),
  workHours: decimal("work_hours", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }),
  notes: text("notes"),
  isManualEntry: boolean("is_manual_entry").default(false),
  approvedBy: varchar("approved_by"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_attendance_employee").on(table.employeeId),
  index("idx_hr_attendance_date").on(table.attendanceDate),
  uniqueIndex("idx_hr_attendance_employee_date").on(table.employeeId, table.attendanceDate),
]);

export const hrLeaveTypes = pgTable("hr_leave_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  defaultDays: integer("default_days").default(0),
  isPaid: boolean("is_paid").default(true),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForward: integer("max_carry_forward").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hr_leave_types_tenant").on(table.tenantId),
  uniqueIndex("idx_hr_leave_types_tenant_code").on(table.tenantId, table.code),
]);

export const hrLeaveBalances = pgTable("hr_leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveTypeId: varchar("leave_type_id").notNull().references(() => hrLeaveTypes.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).default("0"),
  usedDays: decimal("used_days", { precision: 5, scale: 2 }).default("0"),
  pendingDays: decimal("pending_days", { precision: 5, scale: 2 }).default("0"),
  carryForwardDays: decimal("carry_forward_days", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_leave_balances_employee").on(table.employeeId),
  uniqueIndex("idx_hr_leave_balances_emp_type_year").on(table.employeeId, table.leaveTypeId, table.year),
]);

export const hrLeaves = pgTable("hr_leaves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  leaveTypeId: varchar("leave_type_id").notNull().references(() => hrLeaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: hrLeaveStatusEnum("status").default("pending"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_leaves_employee").on(table.employeeId),
  index("idx_hr_leaves_status").on(table.status),
  index("idx_hr_leaves_dates").on(table.startDate, table.endDate),
]);

export const hrHolidays = pgTable("hr_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  holidayDate: date("holiday_date").notNull(),
  isOptional: boolean("is_optional").default(false),
  description: text("description"),
  year: integer("year").notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hr_holidays_tenant_year").on(table.tenantId, table.year),
]);

export const hrSalaryStructures = pgTable("hr_salary_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 12, scale: 2 }).default("0"),
  conveyanceAllowance: decimal("conveyance_allowance", { precision: 12, scale: 2 }).default("0"),
  medicalAllowance: decimal("medical_allowance", { precision: 12, scale: 2 }).default("0"),
  specialAllowance: decimal("special_allowance", { precision: 12, scale: 2 }).default("0"),
  otherAllowances: decimal("other_allowances", { precision: 12, scale: 2 }).default("0"),
  pfDeduction: decimal("pf_deduction", { precision: 12, scale: 2 }).default("0"),
  taxDeduction: decimal("tax_deduction", { precision: 12, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 12, scale: 2 }).default("0"),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_salary_employee").on(table.employeeId),
]);

export const hrPayroll = pgTable("hr_payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  salaryStructureId: varchar("salary_structure_id").references(() => hrSalaryStructures.id),
  payrollMonth: integer("payroll_month").notNull(),
  payrollYear: integer("payroll_year").notNull(),
  workingDays: integer("working_days").default(0),
  presentDays: integer("present_days").default(0),
  leaveDays: decimal("leave_days", { precision: 5, scale: 2 }).default("0"),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 12, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 12, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR"),
  status: hrPayrollStatusEnum("status").default("draft"),
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  payslipUrl: text("payslip_url"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_payroll_employee").on(table.employeeId),
  index("idx_hr_payroll_period").on(table.payrollYear, table.payrollMonth),
  uniqueIndex("idx_hr_payroll_emp_period").on(table.employeeId, table.payrollYear, table.payrollMonth),
]);

export const hrProjects = pgTable("hr_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectCode: varchar("project_code", { length: 50 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  clientName: text("client_name"),
  clientContactEmail: text("client_contact_email"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: hrProjectStatusEnum("status").default("active"),
  budget: decimal("budget", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  projectManagerId: varchar("project_manager_id"),
  isBillable: boolean("is_billable").default(true),
  billingRate: decimal("billing_rate", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_projects_tenant").on(table.tenantId),
  index("idx_hr_projects_status").on(table.status),
  uniqueIndex("idx_hr_projects_tenant_code").on(table.tenantId, table.projectCode),
]);

export const hrAllocations = pgTable("hr_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => hrProjects.id, { onDelete: "cascade" }),
  allocationPercentage: integer("allocation_percentage").default(100),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isBillable: boolean("is_billable").default(true),
  role: text("role"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_allocations_employee").on(table.employeeId),
  index("idx_hr_allocations_project").on(table.projectId),
]);

export const hrTimesheets = pgTable("hr_timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => hrProjects.id),
  timesheetDate: date("timesheet_date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).notNull(),
  isBillable: boolean("is_billable").default(true),
  description: text("description"),
  taskDescription: text("task_description"),
  status: hrTimesheetStatusEnum("status").default("draft"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_timesheets_employee").on(table.employeeId),
  index("idx_hr_timesheets_project").on(table.projectId),
  index("idx_hr_timesheets_date").on(table.timesheetDate),
]);

export const hrShifts = pgTable("hr_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  graceMinutes: integer("grace_minutes").default(15),
  isFlexible: boolean("is_flexible").default(false),
  flexStartTime: time("flex_start_time"),
  flexEndTime: time("flex_end_time"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hr_shifts_tenant").on(table.tenantId),
]);

export const hrEmployeeShifts = pgTable("hr_employee_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => hrEmployees.id, { onDelete: "cascade" }),
  shiftId: varchar("shift_id").notNull().references(() => hrShifts.id),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_hr_employee_shifts_employee").on(table.employeeId),
]);

export const hrPolicies = pgTable("hr_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  policyType: varchar("policy_type", { length: 50 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  policyData: jsonb("policy_data").default({}),
  isActive: boolean("is_active").default(true),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_hr_policies_tenant").on(table.tenantId),
  index("idx_hr_policies_type").on(table.policyType),
]);

export type HrEmployee = typeof hrEmployees.$inferSelect;
export type InsertHrEmployee = typeof hrEmployees.$inferInsert;
export type HrDepartment = typeof hrDepartments.$inferSelect;
export type InsertHrDepartment = typeof hrDepartments.$inferInsert;
export type HrEmployeeDocument = typeof hrEmployeeDocuments.$inferSelect;
export type InsertHrEmployeeDocument = typeof hrEmployeeDocuments.$inferInsert;
export type HrAttendance = typeof hrAttendance.$inferSelect;
export type InsertHrAttendance = typeof hrAttendance.$inferInsert;
export type HrLeaveType = typeof hrLeaveTypes.$inferSelect;
export type InsertHrLeaveType = typeof hrLeaveTypes.$inferInsert;
export type HrLeaveBalance = typeof hrLeaveBalances.$inferSelect;
export type InsertHrLeaveBalance = typeof hrLeaveBalances.$inferInsert;
export type HrLeave = typeof hrLeaves.$inferSelect;
export type InsertHrLeave = typeof hrLeaves.$inferInsert;
export type HrHoliday = typeof hrHolidays.$inferSelect;
export type InsertHrHoliday = typeof hrHolidays.$inferInsert;
export type HrSalaryStructure = typeof hrSalaryStructures.$inferSelect;
export type InsertHrSalaryStructure = typeof hrSalaryStructures.$inferInsert;
export type HrPayroll = typeof hrPayroll.$inferSelect;
export type InsertHrPayroll = typeof hrPayroll.$inferInsert;
export type HrProject = typeof hrProjects.$inferSelect;
export type InsertHrProject = typeof hrProjects.$inferInsert;
export type HrAllocation = typeof hrAllocations.$inferSelect;
export type InsertHrAllocation = typeof hrAllocations.$inferInsert;
export type HrTimesheet = typeof hrTimesheets.$inferSelect;
export type InsertHrTimesheet = typeof hrTimesheets.$inferInsert;
export type HrShift = typeof hrShifts.$inferSelect;
export type InsertHrShift = typeof hrShifts.$inferInsert;
export type HrEmployeeShift = typeof hrEmployeeShifts.$inferSelect;
export type InsertHrEmployeeShift = typeof hrEmployeeShifts.$inferInsert;
export type HrPolicy = typeof hrPolicies.$inferSelect;
export type InsertHrPolicy = typeof hrPolicies.$inferInsert;

export const insertHrEmployeeSchema = createInsertSchema(hrEmployees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrDepartmentSchema = createInsertSchema(hrDepartments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrDocumentSchema = createInsertSchema(hrEmployeeDocuments).omit({ id: true, createdAt: true });
export const insertHrAttendanceSchema = createInsertSchema(hrAttendance).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrLeaveTypeSchema = createInsertSchema(hrLeaveTypes).omit({ id: true, createdAt: true });
export const insertHrLeaveBalanceSchema = createInsertSchema(hrLeaveBalances).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrLeaveSchema = createInsertSchema(hrLeaves).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrHolidaySchema = createInsertSchema(hrHolidays).omit({ id: true, createdAt: true });
export const insertHrSalaryStructureSchema = createInsertSchema(hrSalaryStructures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrPayrollSchema = createInsertSchema(hrPayroll).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrProjectSchema = createInsertSchema(hrProjects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrAllocationSchema = createInsertSchema(hrAllocations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrTimesheetSchema = createInsertSchema(hrTimesheets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHrShiftSchema = createInsertSchema(hrShifts).omit({ id: true, createdAt: true });
export const insertHrEmployeeShiftSchema = createInsertSchema(hrEmployeeShifts).omit({ id: true, createdAt: true });
export const insertHrPolicySchema = createInsertSchema(hrPolicies).omit({ id: true, createdAt: true, updatedAt: true });
