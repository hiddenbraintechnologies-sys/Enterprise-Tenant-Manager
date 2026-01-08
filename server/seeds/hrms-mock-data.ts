/**
 * HRMS Mock Data Seeder
 * 
 * Creates sample HR data for testing and development:
 * - Departments with hierarchy
 * - Employees across departments
 * - Attendance records
 * - Leave types and applications
 * - Salary structures and payroll records
 * 
 * Usage: Import and call seedHrmsMockData(tenantId) during bootstrap
 * 
 * @module server/seeds/hrms-mock-data
 */

import { hrmsStorage } from "../storage/hrms";

const DEPARTMENTS = [
  { name: "Engineering", description: "Software development and technical operations" },
  { name: "Human Resources", description: "HR, recruitment, and employee relations" },
  { name: "Finance", description: "Accounting, budgeting, and financial operations" },
  { name: "Marketing", description: "Marketing, branding, and communications" },
  { name: "Operations", description: "Day-to-day business operations" },
];

const LEAVE_TYPES = [
  { name: "Annual Leave", defaultDays: 20, isPaid: true, carryForward: true, maxCarryDays: 5 },
  { name: "Sick Leave", defaultDays: 12, isPaid: true, carryForward: false },
  { name: "Casual Leave", defaultDays: 6, isPaid: true, carryForward: false },
  { name: "Maternity Leave", defaultDays: 180, isPaid: true, carryForward: false },
  { name: "Paternity Leave", defaultDays: 15, isPaid: true, carryForward: false },
  { name: "Unpaid Leave", defaultDays: 30, isPaid: false, carryForward: false },
];

const EMPLOYEES = [
  { firstName: "John", lastName: "Smith", email: "john.smith@company.com", position: "Senior Engineer", employmentType: "full_time", status: "active" },
  { firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@company.com", position: "HR Manager", employmentType: "full_time", status: "active" },
  { firstName: "Michael", lastName: "Brown", email: "michael.brown@company.com", position: "Financial Analyst", employmentType: "full_time", status: "active" },
  { firstName: "Emily", lastName: "Davis", email: "emily.davis@company.com", position: "Marketing Lead", employmentType: "full_time", status: "active" },
  { firstName: "David", lastName: "Wilson", email: "david.wilson@company.com", position: "Operations Manager", employmentType: "full_time", status: "active" },
  { firstName: "Jessica", lastName: "Taylor", email: "jessica.taylor@company.com", position: "Software Developer", employmentType: "full_time", status: "active" },
  { firstName: "Robert", lastName: "Anderson", email: "robert.anderson@company.com", position: "Accountant", employmentType: "full_time", status: "active" },
  { firstName: "Lisa", lastName: "Thomas", email: "lisa.thomas@company.com", position: "Content Writer", employmentType: "contract", status: "active" },
  { firstName: "James", lastName: "Jackson", email: "james.jackson@company.com", position: "DevOps Engineer", employmentType: "full_time", status: "active" },
  { firstName: "Amanda", lastName: "White", email: "amanda.white@company.com", position: "Recruiter", employmentType: "part_time", status: "active" },
];

const HOLIDAYS = [
  { name: "New Year's Day", date: "2026-01-01", type: "public" },
  { name: "Republic Day", date: "2026-01-26", type: "public" },
  { name: "Good Friday", date: "2026-04-03", type: "public" },
  { name: "Labour Day", date: "2026-05-01", type: "public" },
  { name: "Independence Day", date: "2026-08-15", type: "public" },
  { name: "Gandhi Jayanti", date: "2026-10-02", type: "public" },
  { name: "Diwali", date: "2026-11-14", type: "public" },
  { name: "Christmas", date: "2026-12-25", type: "public" },
];

export async function seedHrmsMockData(tenantId: string): Promise<void> {
  console.log(`[HRMS Seed] Starting mock data seeding for tenant: ${tenantId}`);

  try {
    // 1. Seed Departments
    const departmentIds: string[] = [];
    for (const dept of DEPARTMENTS) {
      try {
        const department = await hrmsStorage.createDepartment({ ...dept, tenantId });
        departmentIds.push(department.id);
        console.log(`[HRMS Seed] Created department: ${dept.name}`);
      } catch (e) {
        console.log(`[HRMS Seed] Department ${dept.name} may already exist`);
      }
    }

    // 2. Seed Leave Types
    for (const leaveType of LEAVE_TYPES) {
      try {
        await hrmsStorage.createLeaveType({ ...leaveType, tenantId });
        console.log(`[HRMS Seed] Created leave type: ${leaveType.name}`);
      } catch (e) {
        console.log(`[HRMS Seed] Leave type ${leaveType.name} may already exist`);
      }
    }

    // 3. Seed Employees
    const employeeIds: string[] = [];
    for (let i = 0; i < EMPLOYEES.length; i++) {
      const emp = EMPLOYEES[i];
      const departmentId = departmentIds[i % departmentIds.length];
      try {
        const employee = await hrmsStorage.createEmployee({
          ...emp,
          tenantId,
          departmentId,
          dateOfJoining: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        });
        employeeIds.push(employee.id);
        console.log(`[HRMS Seed] Created employee: ${emp.firstName} ${emp.lastName}`);
      } catch (e) {
        console.log(`[HRMS Seed] Employee ${emp.email} may already exist`);
      }
    }

    // 4. Seed Holidays
    const currentYear = new Date().getFullYear();
    for (const holiday of HOLIDAYS) {
      try {
        await hrmsStorage.createHoliday({
          ...holiday,
          tenantId,
          date: holiday.date.replace('2026', String(currentYear)),
        });
        console.log(`[HRMS Seed] Created holiday: ${holiday.name}`);
      } catch (e) {
        console.log(`[HRMS Seed] Holiday ${holiday.name} may already exist`);
      }
    }

    // 5. Seed Sample Attendance (last 7 days)
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
        for (const employeeId of employeeIds.slice(0, 5)) {
          try {
            await hrmsStorage.recordAttendance({
              tenantId,
              employeeId,
              date: dateStr,
              status: Math.random() > 0.1 ? 'present' : 'absent',
              checkIn: '09:00',
              checkOut: '18:00',
              hoursWorked: 9,
            });
          } catch (e) {
            // Attendance may already exist
          }
        }
      }
    }
    console.log(`[HRMS Seed] Created sample attendance records`);

    // 6. Seed Sample Leave Applications
    const leaveTypes = await hrmsStorage.getLeaveTypes(tenantId);
    if (leaveTypes.length > 0 && employeeIds.length > 0) {
      const statuses = ['pending', 'approved', 'rejected'];
      for (let i = 0; i < 5; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);
        
        try {
          await hrmsStorage.createLeave({
            tenantId,
            employeeId: employeeIds[i % employeeIds.length],
            leaveTypeId: leaveTypes[i % leaveTypes.length].id,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason: 'Sample leave request for testing',
            status: statuses[i % statuses.length],
          });
        } catch (e) {
          // Leave may already exist
        }
      }
      console.log(`[HRMS Seed] Created sample leave applications`);
    }

    // 7. Seed Salary Structures
    for (const employeeId of employeeIds.slice(0, 5)) {
      const basicSalary = 50000 + Math.floor(Math.random() * 50000);
      try {
        await hrmsStorage.createSalaryStructure({
          tenantId,
          employeeId,
          basicSalary,
          hra: basicSalary * 0.4,
          conveyance: 3000,
          medical: 1500,
          special: 5000,
          pf: basicSalary * 0.12,
          tax: basicSalary * 0.1,
          effectiveFrom: new Date().toISOString().split('T')[0],
        });
        console.log(`[HRMS Seed] Created salary structure for employee`);
      } catch (e) {
        // Salary structure may already exist
      }
    }

    console.log(`[HRMS Seed] Mock data seeding completed for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`[HRMS Seed] Error seeding mock data:`, error);
  }
}

export default seedHrmsMockData;
