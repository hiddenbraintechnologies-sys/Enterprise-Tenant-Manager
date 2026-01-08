import {
  INotificationAdapter,
  NotificationEventType,
  NotificationChannel,
  NotificationVariables,
  baseNotificationService,
  createNotificationPayload,
  NotificationRecipient,
} from "./base-notification";

const HRMS_EVENT_TEMPLATE_MAPPING: Record<string, string> = {
  HR_EMPLOYEE_ONBOARDED: "hr_employee_onboarded",
  HR_LEAVE_REQUEST: "hr_leave_request",
  HR_LEAVE_APPROVED: "hr_leave_approved",
  HR_LEAVE_REJECTED: "hr_leave_rejected",
  HR_PAYROLL_PROCESSED: "hr_payroll_processed",
  HR_ATTENDANCE_ALERT: "hr_attendance_alert",
  HR_PROJECT_ASSIGNED: "hr_project_assigned",
  HR_TIMESHEET_REMINDER: "hr_timesheet_reminder",
};

const HRMS_EVENT_CHANNELS: Record<string, NotificationChannel[]> = {
  HR_EMPLOYEE_ONBOARDED: ["email"],
  HR_LEAVE_REQUEST: ["email"],
  HR_LEAVE_APPROVED: ["email", "whatsapp"],
  HR_LEAVE_REJECTED: ["email", "whatsapp"],
  HR_PAYROLL_PROCESSED: ["email"],
  HR_ATTENDANCE_ALERT: ["email"],
  HR_PROJECT_ASSIGNED: ["email"],
  HR_TIMESHEET_REMINDER: ["email"],
};

class HrmsNotificationAdapter implements INotificationAdapter {
  getModuleName(): string {
    return "hrms";
  }

  mapEventToLegacyType(eventType: NotificationEventType): string {
    return HRMS_EVENT_TEMPLATE_MAPPING[eventType] || "custom";
  }

  buildVariables(data: Record<string, unknown>): NotificationVariables {
    const vars: NotificationVariables = {};

    if (data.employeeName) vars.customerName = String(data.employeeName);
    if (data.employeeId) vars["employeeId"] = String(data.employeeId);
    if (data.departmentName) vars["departmentName"] = String(data.departmentName);
    if (data.designation) vars["designation"] = String(data.designation);
    if (data.joiningDate) vars["joiningDate"] = String(data.joiningDate);
    if (data.leaveType) vars["leaveType"] = String(data.leaveType);
    if (data.startDate) vars["startDate"] = String(data.startDate);
    if (data.endDate) vars["endDate"] = String(data.endDate);
    if (data.reason) vars["reason"] = String(data.reason);
    if (data.approverName) vars["approverName"] = String(data.approverName);
    if (data.payrollMonth) vars["payrollMonth"] = String(data.payrollMonth);
    if (data.netSalary) vars["netSalary"] = String(data.netSalary);
    if (data.projectName) vars["projectName"] = String(data.projectName);
    if (data.allocationPercentage) vars["allocationPercentage"] = String(data.allocationPercentage);
    if (data.tenantName) vars.tenantName = String(data.tenantName);
    if (data.currency) vars.currency = String(data.currency);

    return vars;
  }

  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[] {
    return HRMS_EVENT_CHANNELS[eventType] || ["email"];
  }
}

export const hrmsNotificationAdapter = new HrmsNotificationAdapter();

baseNotificationService.registerAdapter(hrmsNotificationAdapter);

export async function sendHrmsNotification(
  tenantId: string,
  eventType: NotificationEventType,
  recipient: NotificationRecipient,
  data: Record<string, unknown>,
  options?: {
    channels?: NotificationChannel[];
    referenceId?: string;
    referenceType?: string;
    userId?: string;
    priority?: "low" | "normal" | "high";
  }
) {
  const variables = hrmsNotificationAdapter.buildVariables(data);
  const channels = options?.channels || hrmsNotificationAdapter.getDefaultChannels(eventType);

  const payload = createNotificationPayload(
    tenantId,
    eventType,
    recipient,
    variables,
    {
      channels,
      referenceId: options?.referenceId,
      referenceType: options?.referenceType || "hr_record",
      userId: options?.userId,
      priority: options?.priority,
      moduleContext: "hrms",
    }
  );

  return baseNotificationService.dispatch(payload);
}

export async function notifyEmployeeOnboarded(
  tenantId: string,
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    departmentName?: string;
    designation?: string;
    joiningDate: string;
  },
  tenantName: string
) {
  return sendHrmsNotification(
    tenantId,
    "HR_EMPLOYEE_ONBOARDED",
    { email: employee.email, phone: employee.phone || undefined, name: `${employee.firstName} ${employee.lastName}` },
    {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.id,
      departmentName: employee.departmentName || "N/A",
      designation: employee.designation || "N/A",
      joiningDate: employee.joiningDate,
      tenantName,
    },
    { referenceId: employee.id, referenceType: "employee" }
  );
}

export async function notifyLeaveApproved(
  tenantId: string,
  employee: { id: string; name: string; email: string; phone?: string | null },
  leave: { id: string; leaveType: string; startDate: string; endDate: string },
  approverName: string
) {
  return sendHrmsNotification(
    tenantId,
    "HR_LEAVE_APPROVED",
    { email: employee.email, phone: employee.phone || undefined, name: employee.name },
    {
      employeeName: employee.name,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      approverName,
    },
    { referenceId: leave.id, referenceType: "leave" }
  );
}

export async function notifyLeaveRejected(
  tenantId: string,
  employee: { id: string; name: string; email: string; phone?: string | null },
  leave: { id: string; leaveType: string; startDate: string; endDate: string; reason?: string },
  approverName: string
) {
  return sendHrmsNotification(
    tenantId,
    "HR_LEAVE_REJECTED",
    { email: employee.email, phone: employee.phone || undefined, name: employee.name },
    {
      employeeName: employee.name,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason || "No reason provided",
      approverName,
    },
    { referenceId: leave.id, referenceType: "leave" }
  );
}

export async function notifyPayrollProcessed(
  tenantId: string,
  employee: { id: string; name: string; email: string; phone?: string | null },
  payroll: { id: string; month: string; year: number; netSalary: number; currency: string }
) {
  return sendHrmsNotification(
    tenantId,
    "HR_PAYROLL_PROCESSED",
    { email: employee.email, phone: employee.phone || undefined, name: employee.name },
    {
      employeeName: employee.name,
      payrollMonth: `${payroll.month} ${payroll.year}`,
      netSalary: payroll.netSalary.toFixed(2),
      currency: payroll.currency,
    },
    { referenceId: payroll.id, referenceType: "payroll" }
  );
}

export async function notifyProjectAssigned(
  tenantId: string,
  employee: { id: string; name: string; email: string; phone?: string | null },
  project: { id: string; name: string; allocationPercentage: number }
) {
  return sendHrmsNotification(
    tenantId,
    "HR_PROJECT_ASSIGNED",
    { email: employee.email, phone: employee.phone || undefined, name: employee.name },
    {
      employeeName: employee.name,
      projectName: project.name,
      allocationPercentage: String(project.allocationPercentage),
    },
    { referenceId: project.id, referenceType: "allocation" }
  );
}
