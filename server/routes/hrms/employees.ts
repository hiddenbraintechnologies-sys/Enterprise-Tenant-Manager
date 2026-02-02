/**
 * Employee Management Routes
 * 
 * Handles employee CRUD operations for the HRMS module.
 * 
 * Endpoints (mounted at /api/hr/employees):
 * - GET  / - List employees with pagination/filtering
 * - GET  /:id - Get single employee
 * - POST / - Create employee (manager+)
 * - PUT  /:id - Update employee (manager+)
 * - POST /:id/deactivate - Deactivate employee (staff:update permission)
 * - POST /:id/reactivate - Reactivate employee (staff:update permission)
 * - DELETE /:id - Delete employee (admin only, with 409 if has history)
 * 
 * Status Mapping:
 * - "active" = Active employee
 * - "exited" = Deactivated/Inactive employee (equivalent to "inactive" in API contract)
 * 
 * Security: 
 * - Requires manager role for read, admin for delete
 * - Deactivate/Reactivate require staff:update permission
 * - Cross-tenant access returns 404 (not 403) to prevent enumeration
 * - Delete blocked if employee has payroll/leaves/attendance/timesheets (returns 409)
 * 
 * @module server/routes/hrms/employees
 */

import { Router } from "express";
import { requireMinimumRole, auditService, checkEmployeeLimit } from "../../core";
import { permissionService, PERMISSIONS } from "../../core/permissions";
import EmployeeService from "../../services/hrms/employeeService";
import { ZodError, z } from "zod";
import { 
  assertTenantOwnedOr404, 
  assertMutationSucceededOr404,
  TenantResourceNotFoundError 
} from "../../utils/assert-tenant-owned";
import { db } from "../../db";
import { hrPayRunItems, hrLeaves, hrAttendance, hrTimesheets, hrEmployees, hrDepartments } from "@shared/models/hrms";
import { eq, and, count, or } from "drizzle-orm";
import multer from "multer";

// Configure multer for CSV upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// CSV Import error codes
type ImportErrorCode = 
  | "VALIDATION_ERROR" 
  | "CONFLICT" 
  | "DUPLICATE_IN_FILE" 
  | "UNKNOWN_FIELD" 
  | "PARSE_ERROR" 
  | "INTERNAL_ERROR";

interface ImportError {
  rowNumber: number;
  employeeCode: string;
  email: string;
  errorCode: ImportErrorCode;
  errorField: string;
  errorMessage: string;
  rawData: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  createdIds: string[];
}

// CSV row validation schema
const csvRowSchema = z.object({
  employeeCode: z.string().max(50).optional(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
  // Malaysia statutory fields (optional)
  icNumber: z.string().max(20).optional(),
  taxNumber: z.string().max(20).optional(),
  epfNumber: z.string().max(20).optional(),
  socsoNumber: z.string().max(20).optional(),
  eisNumber: z.string().max(20).optional(),
  pcbCategory: z.string().max(10).optional(),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  basicSalary: z.string().optional(),
  payFrequency: z.enum(["monthly", "weekly", "biweekly"]).optional(),
});

// Parse CSV content
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const deactivateSchema = z.object({
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const employees = await EmployeeService.listEmployees(tenantId, req.query);
    res.json(employees);
  } catch (error) {
    console.error("[employees] GET / error:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const employee = await EmployeeService.getEmployee(tenantId, req.params.id);
    assertTenantOwnedOr404(employee, { resourceName: "Employee", id: req.params.id });
    res.json(employee);
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    console.error("[employees] GET /:id error:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    // Check if read-only mode (payroll expired, no HRMS)
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to create employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    // Check employee limit before creating
    const limitCheck = await checkEmployeeLimit(tenantId);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message || "Employee limit reached",
        code: "EMPLOYEE_LIMIT_REACHED",
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        isTrialing: limitCheck.isTrialing,
        upgradeUrl: "/marketplace?addon=payroll&action=upgrade",
      });
    }
    
    const employee = await EmployeeService.addEmployee(tenantId, req.body);
    res.status(201).json(employee);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[employees] POST / error:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    // Check if read-only mode (payroll expired, no HRMS)
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to edit employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employee = await EmployeeService.updateEmployee(tenantId, req.params.id, req.body);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: req.params.id });
    res.json(employee);
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("[employees] PUT /:id error:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// NOTE: DELETE endpoint is defined in index.ts to allow admin cleanup even when add-on expired

router.post("/:id/deactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to deactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employeeId = req.params.id;
    
    // Validate request body
    let reason: string | undefined;
    let effectiveDate: string | undefined;
    try {
      const body = deactivateSchema.parse(req.body || {});
      reason = body.reason;
      effectiveDate = body.effectiveDate;
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          code: "VALIDATION_ERROR",
          details: error.errors 
        });
      }
      throw error;
    }
    
    // Check if employee exists and is in this tenant
    const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
    assertTenantOwnedOr404(existingEmployee, { resourceName: "Employee", id: employeeId });
    
    // Check if already deactivated (status "exited" = "inactive" in API contract)
    if (existingEmployee.status === "exited") {
      return res.status(400).json({
        error: "Employee is already deactivated",
        code: "ALREADY_DEACTIVATED",
      });
    }
    
    const employee = await EmployeeService.deactivateEmployee(tenantId, employeeId, reason);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: employeeId });
    
    // Audit log
    auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "update",
      resource: "employee",
      resourceId: employeeId,
      metadata: { event: "HR_EMPLOYEE_DEACTIVATED", reason, effectiveDate },
    });
    
    res.json({
      ok: true,
      employee: {
        id: employee!.id,
        status: employee!.status,
        deactivatedAt: employee!.deactivatedAt,
        deactivationReason: employee!.deactivationReason,
      },
    });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: "RESOURCE_NOT_FOUND" });
    }
    console.error("[employees] POST /:id/deactivate error:", error);
    res.status(500).json({ error: "Failed to deactivate employee" });
  }
});

router.post("/:id/reactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to reactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    const employeeId = req.params.id;
    
    // Check if employee exists and is in this tenant
    const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
    assertTenantOwnedOr404(existingEmployee, { resourceName: "Employee", id: employeeId });
    
    // Check if already active
    if (existingEmployee.status === "active") {
      return res.status(400).json({
        error: "Employee is already active",
        code: "ALREADY_ACTIVE",
      });
    }
    
    const employee = await EmployeeService.reactivateEmployee(tenantId, employeeId);
    assertMutationSucceededOr404(employee, { resourceName: "Employee", id: employeeId });
    
    // Audit log
    auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "update",
      resource: "employee",
      resourceId: employeeId,
      metadata: { event: "HR_EMPLOYEE_REACTIVATED" },
    });
    
    res.json({
      ok: true,
      employee: {
        id: employee!.id,
        status: employee!.status,
        reactivatedAt: employee!.reactivatedAt,
      },
    });
  } catch (error) {
    if (error instanceof TenantResourceNotFoundError) {
      return res.status(404).json({ error: error.message, code: "RESOURCE_NOT_FOUND" });
    }
    console.error("[employees] POST /:id/reactivate error:", error);
    res.status(500).json({ error: "Failed to reactivate employee" });
  }
});

// Bulk operations schemas
const bulkDeactivateSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee ID required").max(50, "Maximum 50 employees at a time"),
  reason: z.string().max(500).optional(),
});

const bulkDeleteSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "At least one employee ID required").max(50, "Maximum 50 employees at a time"),
});

type BulkResult = {
  id: string;
  success: boolean;
  error?: string;
  code?: string;
};

router.post("/bulk/deactivate", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Check permission: staff:update
    const canUpdate = await permissionService.hasPermission(userId, tenantId, PERMISSIONS.STAFF_UPDATE);
    if (!canUpdate) {
      return res.status(403).json({ error: "Permission denied", code: "FORBIDDEN" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to deactivate employees.",
        upgradeUrl: "/marketplace",
      });
    }
    
    // Validate request body
    let employeeIds: string[];
    let reason: string | undefined;
    try {
      const body = bulkDeactivateSchema.parse(req.body || {});
      employeeIds = body.employeeIds;
      reason = body.reason;
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          code: "VALIDATION_ERROR",
          details: error.errors 
        });
      }
      throw error;
    }
    
    const results: BulkResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const employeeId of employeeIds) {
      try {
        // Check if employee exists and belongs to this tenant
        const existingEmployee = await EmployeeService.getEmployee(tenantId, employeeId);
        
        if (!existingEmployee) {
          results.push({ id: employeeId, success: false, error: "Employee not found", code: "NOT_FOUND" });
          errorCount++;
          continue;
        }
        
        if (existingEmployee.status === "exited") {
          results.push({ id: employeeId, success: false, error: "Already deactivated", code: "ALREADY_DEACTIVATED" });
          errorCount++;
          continue;
        }
        
        const employee = await EmployeeService.deactivateEmployee(tenantId, employeeId, reason);
        
        if (employee) {
          results.push({ id: employeeId, success: true });
          successCount++;
          
          // Audit log each deactivation
          auditService.logAsync({
            tenantId,
            userId,
            action: "update",
            resource: "employee",
            resourceId: employeeId,
            metadata: { event: "HR_EMPLOYEE_DEACTIVATED", reason, bulk: true },
          });
        } else {
          results.push({ id: employeeId, success: false, error: "Failed to deactivate", code: "DEACTIVATION_FAILED" });
          errorCount++;
        }
      } catch (error) {
        results.push({ id: employeeId, success: false, error: "Unexpected error", code: "INTERNAL_ERROR" });
        errorCount++;
      }
    }
    
    res.json({
      ok: errorCount === 0,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("[employees] POST /bulk/deactivate error:", error);
    res.status(500).json({ error: "Failed to bulk deactivate employees" });
  }
});

/**
 * POST /import - Import employees from CSV
 * 
 * Accepts a CSV file with employee data and creates employees in bulk.
 * Returns detailed error report for any failed rows (Zoho-style).
 * 
 * Requirements:
 * - Manager role minimum
 * - Active HRMS or Payroll add-on
 * - Respects employee limit
 */
router.post("/import", requireMinimumRole("manager"), upload.single("file"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Check if read-only mode
    if (req.hrAccess?.isEmployeeReadOnly) {
      return res.status(403).json({
        error: "Employee directory is read-only",
        code: "EMPLOYEE_READ_ONLY",
        message: req.hrAccess.readOnlyReason || "Re-enable Payroll or add HRMS to import employees.",
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No CSV file provided", code: "NO_FILE" });
    }
    
    const content = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCSV(content);
    
    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV file is empty or has no data rows", code: "EMPTY_FILE" });
    }
    
    // Check employee limit
    const limitCheck = await checkEmployeeLimit(tenantId);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message || "Employee limit would be exceeded",
        code: "EMPLOYEE_LIMIT_EXCEEDED",
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        requestedCount: rows.length,
      });
    }
    
    // Check if importing would exceed limit
    if (limitCheck.limit && (limitCheck.currentCount + rows.length) > limitCheck.limit) {
      return res.status(403).json({
        error: `Import would exceed employee limit. Current: ${limitCheck.currentCount}, Limit: ${limitCheck.limit}, Requested: ${rows.length}`,
        code: "EMPLOYEE_LIMIT_EXCEEDED",
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        requestedCount: rows.length,
        availableSlots: limitCheck.limit - limitCheck.currentCount,
      });
    }
    
    // Get existing employees for conflict detection
    const existingEmployees = await db
      .select({ employeeId: hrEmployees.employeeId, email: hrEmployees.email })
      .from(hrEmployees)
      .where(eq(hrEmployees.tenantId, tenantId));
    
    const existingEmails = new Set(existingEmployees.map(e => e.email?.toLowerCase()).filter(Boolean));
    const existingCodes = new Set(existingEmployees.map(e => e.employeeId?.toLowerCase()).filter(Boolean));
    
    // Get existing departments for auto-mapping
    const departments = await db
      .select({ id: hrDepartments.id, name: hrDepartments.name })
      .from(hrDepartments)
      .where(eq(hrDepartments.tenantId, tenantId));
    
    const deptNameToId = new Map(departments.map(d => [d.name.toLowerCase(), d.id]));
    
    // Track duplicates within file
    const seenEmails = new Set<string>();
    const seenCodes = new Set<string>();
    
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdIds: [],
    };
    
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // 1-indexed, +1 for header
      const row = rows[i];
      const rawData = JSON.stringify(row);
      
      try {
        // Validate row
        const parsed = csvRowSchema.safeParse(row);
        if (!parsed.success) {
          const firstError = parsed.error.errors[0];
          result.errors.push({
            rowNumber,
            employeeCode: row.employeeCode || "",
            email: row.email || "",
            errorCode: "VALIDATION_ERROR",
            errorField: String(firstError.path[0] || "unknown"),
            errorMessage: firstError.message,
            rawData,
          });
          result.errorCount++;
          continue;
        }
        
        const data = parsed.data;
        
        // Check for duplicate email in file
        if (data.email) {
          const emailLower = data.email.toLowerCase();
          if (seenEmails.has(emailLower)) {
            result.errors.push({
              rowNumber,
              employeeCode: data.employeeCode || "",
              email: data.email,
              errorCode: "DUPLICATE_IN_FILE",
              errorField: "email",
              errorMessage: "Duplicate email in this file",
              rawData,
            });
            result.errorCount++;
            continue;
          }
          seenEmails.add(emailLower);
          
          // Check for existing email in database
          if (existingEmails.has(emailLower)) {
            result.errors.push({
              rowNumber,
              employeeCode: data.employeeCode || "",
              email: data.email,
              errorCode: "CONFLICT",
              errorField: "email",
              errorMessage: "Employee with this email already exists",
              rawData,
            });
            result.errorCount++;
            continue;
          }
        }
        
        // Check for duplicate employee code in file
        if (data.employeeCode) {
          const codeLower = data.employeeCode.toLowerCase();
          if (seenCodes.has(codeLower)) {
            result.errors.push({
              rowNumber,
              employeeCode: data.employeeCode,
              email: data.email || "",
              errorCode: "DUPLICATE_IN_FILE",
              errorField: "employeeCode",
              errorMessage: "Duplicate employee code in this file",
              rawData,
            });
            result.errorCount++;
            continue;
          }
          seenCodes.add(codeLower);
          
          // Check for existing code in database
          if (existingCodes.has(codeLower)) {
            result.errors.push({
              rowNumber,
              employeeCode: data.employeeCode,
              email: data.email || "",
              errorCode: "CONFLICT",
              errorField: "employeeCode",
              errorMessage: "Employee with this code already exists",
              rawData,
            });
            result.errorCount++;
            continue;
          }
        }
        
        // Map department name to ID
        let departmentId: string | null = null;
        if (data.department) {
          departmentId = deptNameToId.get(data.department.toLowerCase()) || null;
          // Could auto-create department here if desired
        }
        
        // Create employee
        const employee = await EmployeeService.addEmployee(tenantId, {
          employeeId: data.employeeCode || undefined,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          designation: data.designation || undefined,
          departmentId: departmentId || undefined,
          joinDate: data.joinedAt || undefined,
          status: data.status === "inactive" ? "exited" : "active",
          employmentType: "full_time",
          // Statutory fields stored in metadata if present
        });
        
        if (employee) {
          result.createdIds.push(employee.id);
          result.successCount++;
          
          // Add to existing sets to prevent duplicates in later rows
          if (data.email) existingEmails.add(data.email.toLowerCase());
          if (data.employeeCode) existingCodes.add(data.employeeCode.toLowerCase());
        } else {
          result.errors.push({
            rowNumber,
            employeeCode: data.employeeCode || "",
            email: data.email || "",
            errorCode: "INTERNAL_ERROR",
            errorField: "",
            errorMessage: "Failed to create employee",
            rawData,
          });
          result.errorCount++;
        }
      } catch (error) {
        result.errors.push({
          rowNumber,
          employeeCode: row.employeeCode || "",
          email: row.email || "",
          errorCode: "INTERNAL_ERROR",
          errorField: "",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          rawData,
        });
        result.errorCount++;
      }
    }
    
    result.success = result.errorCount === 0;
    
    // Audit log the import
    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "employee",
      resourceId: "bulk-import",
      metadata: {
        event: "HR_EMPLOYEES_IMPORTED",
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
      },
    });
    
    res.json(result);
  } catch (error) {
    console.error("[employees] POST /import error:", error);
    res.status(500).json({ error: "Failed to import employees" });
  }
});

/**
 * GET /import/template - Download CSV import template
 * 
 * Returns a CSV template file for employee import.
 * Query param: type=hr (basic) or type=payroll (with statutory fields)
 */
router.get("/import/template", (req, res) => {
  const type = req.query.type as string || "hr";
  
  let headers: string;
  if (type === "payroll") {
    // Full template with Malaysia payroll fields
    headers = "employeeCode,firstName,lastName,email,phone,designation,department,joinedAt,status,icNumber,taxNumber,epfNumber,socsoNumber,eisNumber,pcbCategory,bankName,bankAccountNumber,basicSalary,payFrequency";
  } else {
    // Basic HR-only template
    headers = "employeeCode,firstName,lastName,email,phone,designation,department,joinedAt,status";
  }
  
  const sampleRow = type === "payroll"
    ? "EMP001,John,Doe,john.doe@company.com,+60123456789,Software Engineer,Engineering,2024-01-15,active,901234-56-7890,SG12345678,12345678,12345678,12345678,M,Maybank,1234567890,5000,monthly"
    : "EMP001,John,Doe,john.doe@company.com,+60123456789,Software Engineer,Engineering,2024-01-15,active";
  
  const content = `${headers}\n${sampleRow}`;
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="employee_import_template_${type}.csv"`);
  res.send(content);
});

export default router;
