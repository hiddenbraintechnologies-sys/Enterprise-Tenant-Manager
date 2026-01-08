/**
 * HRMS Services - Business Logic Layer
 * 
 * All services use static methods for cleaner imports and usage.
 * Each service integrates with:
 * - hrmsStorage for data persistence
 * - baseNotificationService for automated notifications
 * - Zod schemas for input validation
 * 
 * Service Responsibilities:
 * - EmployeeService: Employee CRUD, departments, dashboard stats
 * - AttendanceService: Check-in/out, attendance records, holidays
 * - LeaveService: Leave applications, approvals, leave types
 * - PayrollService: Salary structures, payroll processing
 * - ProjectService: Projects, allocations, timesheets (IT extensions)
 * 
 * @module server/services/hrms
 */

export { default as EmployeeService } from "./employeeService";
export { default as AttendanceService } from "./attendanceService";
export { default as LeaveService } from "./leaveService";
export { default as PayrollService } from "./payrollService";
export { default as ProjectService } from "./projectService";
