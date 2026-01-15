/**
 * Payroll Management Routes
 * 
 * Handles payroll processing for the HRMS module.
 * Feature-gated by "payroll" feature flag.
 * 
 * Endpoints (mounted at /api/hr/payroll):
 * Settings:
 * - GET  /settings - Get payroll settings
 * - PATCH /settings - Update payroll settings
 * 
 * Salary Structures:
 * - GET  /salary-structures - List salary structures
 * - GET  /salary-structures/:employeeId - Get salary structure for employee
 * - POST /salary-structures - Create salary structure
 * - PATCH /salary-structures/:id - Update salary structure
 * 
 * Pay Runs:
 * - GET  /pay-runs - List pay runs
 * - POST /pay-runs/generate - Generate a new pay run
 * - GET  /pay-runs/:id/items - Get pay run items
 * - POST /pay-runs/:id/approve - Approve pay run
 * - POST /pay-runs/:id/mark-paid - Mark pay run as paid
 * 
 * Payslips:
 * - GET  /payslips/:itemId/pdf - Generate/download payslip PDF
 * 
 * Note: Tenant isolation and base RBAC applied at router level in index.ts
 * 
 * @module server/routes/hrms/payroll
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireMinimumRole, auditService } from "../../core";
import PayrollService from "../../services/hrms/payrollService";
import { hrmsStorage } from "../../storage/hrms";
import { db } from "../../db";
import { getPayrollComplianceConfig, getSalaryComponentsForCountry } from "../../services/hrms/payroll-compliance";
import { countryRolloutService } from "../../services/country-rollout";
import { 
  hrPayrollSettings, 
  hrPayRuns, 
  hrPayRunItems, 
  hrPayslips,
  hrEmployees,
  hrSalaryStructures,
  hrAttendance,
  hrLeaves,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const payrollSettingsSchema = z.object({
  currencyCode: z.string().length(3).optional(),
  payCycleDay: z.number().min(1).max(31).optional(),
  pfEnabled: z.boolean().optional(),
  esiEnabled: z.boolean().optional(),
  ptEnabled: z.boolean().optional(),
  pfEmployerRate: z.string().optional(),
  pfEmployeeRate: z.string().optional(),
  esiEmployerRate: z.string().optional(),
  esiEmployeeRate: z.string().optional(),
  ptRate: z.string().optional(),
});

const salaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  basicSalary: z.string(),
  hra: z.string().optional(),
  conveyanceAllowance: z.string().optional(),
  medicalAllowance: z.string().optional(),
  specialAllowance: z.string().optional(),
  otherAllowances: z.string().optional(),
  pfDeduction: z.string().optional(),
  esiDeduction: z.string().optional(),
  ptDeduction: z.string().optional(),
  incomeTax: z.string().optional(),
  otherDeductions: z.string().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional().nullable(),
});

const router = Router();

function requirePayrollWithCountryAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    const tenantCountry = req.context?.tenant?.country;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    // Check payroll feature flag first
    const hasFeature = await hrmsStorage.hasFeatureFlag(tenantId, "payroll");
    if (!hasFeature) {
      return res.status(403).json({ 
        error: "MODULE_NOT_AVAILABLE",
        message: "The payroll feature is not enabled for your subscription" 
      });
    }
    
    // Then check country-level payroll access
    const countryCode = normalizeCountryCodeFromTenant(tenantCountry);
    const accessResult = await countryRolloutService.checkPayrollAccess(countryCode, tenantId);
    
    if (!accessResult.allowed) {
      return res.status(403).json({
        error: accessResult.code || "COUNTRY_FEATURE_DISABLED",
        message: accessResult.message || "Payroll is not available for your country",
      });
    }
    
    (req as any).payrollAccess = {
      isBeta: accessResult.isBeta,
      disclaimerText: accessResult.disclaimerText,
    };
    
    next();
  };
}

// ==================== COMPLIANCE CONFIG ====================

function normalizeCountryCodeFromTenant(country: string | null | undefined): string {
  if (!country) return "IN";
  const map: Record<string, string> = {
    india: "IN", IN: "IN",
    malaysia: "MY", MY: "MY",
    uk: "GB", GB: "GB",
    uae: "AE", AE: "AE",
    singapore: "SG", SG: "SG",
  };
  return map[country] || "IN";
}

router.get("/compliance-config", async (req, res) => {
  try {
    const countryCode = normalizeCountryCodeFromTenant(req.context?.tenant?.country);
    const config = getPayrollComplianceConfig(countryCode);
    
    if (!config) {
      return res.status(404).json({ 
        error: "COUNTRY_NOT_SUPPORTED",
        message: `Payroll is not configured for country: ${countryCode}` 
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error("Error fetching payroll compliance config:", error);
    res.status(500).json({ error: "Failed to fetch compliance configuration" });
  }
});

router.get("/salary-components", async (req, res) => {
  try {
    const countryCode = normalizeCountryCodeFromTenant(req.context?.tenant?.country);
    const components = getSalaryComponentsForCountry(countryCode);
    
    res.json({
      countryCode,
      earnings: components.filter(c => c.type === "earning"),
      deductions: components.filter(c => c.type === "deduction"),
    });
  } catch (error) {
    console.error("Error fetching salary components:", error);
    res.status(500).json({ error: "Failed to fetch salary components" });
  }
});

router.get("/access-status", async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const tenantCountry = req.context?.tenant?.country;
    
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    const countryCode = normalizeCountryCodeFromTenant(tenantCountry);
    const accessResult = await countryRolloutService.checkPayrollAccess(countryCode, tenantId);
    
    res.json({
      countryCode,
      allowed: accessResult.allowed,
      isBeta: accessResult.isBeta || false,
      disclaimerText: accessResult.disclaimerText,
      message: accessResult.message,
      code: accessResult.code,
    });
  } catch (error) {
    console.error("Error checking payroll access:", error);
    res.status(500).json({ error: "Failed to check payroll access status" });
  }
});

// ==================== SETTINGS ====================

router.get("/settings", requirePayrollWithCountryAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const settings = await db.select()
      .from(hrPayrollSettings)
      .where(eq(hrPayrollSettings.tenantId, tenantId))
      .limit(1);
    
    if (settings.length === 0) {
      return res.json({
        tenantId,
        currencyCode: "INR",
        payCycleDay: 1,
        pfEnabled: false,
        esiEnabled: false,
        ptEnabled: false,
        pfEmployerRate: "12.00",
        pfEmployeeRate: "12.00",
        esiEmployerRate: "3.25",
        esiEmployeeRate: "0.75",
      });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error("Error fetching payroll settings:", error);
    res.status(500).json({ error: "Failed to fetch payroll settings" });
  }
});

router.patch("/settings", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const parseResult = payrollSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }
    
    const existing = await db.select()
      .from(hrPayrollSettings)
      .where(eq(hrPayrollSettings.tenantId, tenantId))
      .limit(1);
    
    const updateData = {
      ...parseResult.data,
      tenantId,
      updatedAt: new Date(),
    };
    
    let result;
    if (existing.length === 0) {
      [result] = await db.insert(hrPayrollSettings)
        .values(updateData)
        .returning();
    } else {
      [result] = await db.update(hrPayrollSettings)
        .set(updateData)
        .where(eq(hrPayrollSettings.tenantId, tenantId))
        .returning();
    }
    
    auditService.logFromRequest("update_payroll_settings", req, "payroll_settings");
    res.json(result);
  } catch (error) {
    console.error("Error updating payroll settings:", error);
    res.status(500).json({ error: "Failed to update payroll settings" });
  }
});

// ==================== SALARY STRUCTURES ====================

router.get("/salary-structures", requirePayrollWithCountryAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const structures = await db.select()
      .from(hrSalaryStructures)
      .where(eq(hrSalaryStructures.tenantId, tenantId))
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(hrSalaryStructures)
      .where(eq(hrSalaryStructures.tenantId, tenantId));
    
    res.json({
      data: structures,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching salary structures:", error);
    res.status(500).json({ error: "Failed to fetch salary structures" });
  }
});

router.get("/salary-structures/:employeeId", requirePayrollWithCountryAccess(), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const structure = await PayrollService.getSalaryStructure(tenantId, req.params.employeeId);
  res.json(structure);
});

router.post("/salary-structures", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const parseResult = salaryStructureSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }
    
    auditService.logFromRequest("add_salary_structure", req, "salary_structure");
    const structure = await PayrollService.addSalaryStructure(tenantId, parseResult.data);
    res.status(201).json(structure);
  } catch (error) {
    console.error("Error creating salary structure:", error);
    res.status(500).json({ error: "Failed to create salary structure" });
  }
});

router.patch("/salary-structures/:id", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const updateSchema = salaryStructureSchema.partial().omit({ employeeId: true });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parseResult.error.flatten() 
      });
    }
    
    const [updated] = await db.update(hrSalaryStructures)
      .set({ ...parseResult.data, updatedAt: new Date() })
      .where(and(
        eq(hrSalaryStructures.id, req.params.id),
        eq(hrSalaryStructures.tenantId, tenantId)
      ))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Salary structure not found" });
    }
    
    auditService.logFromRequest("update_salary_structure", req, "salary_structure");
    res.json(updated);
  } catch (error) {
    console.error("Error updating salary structure:", error);
    res.status(500).json({ error: "Failed to update salary structure" });
  }
});

// ==================== PAY RUNS ====================

router.get("/pay-runs", requirePayrollWithCountryAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const payRuns = await db.select()
      .from(hrPayRuns)
      .where(eq(hrPayRuns.tenantId, tenantId))
      .orderBy(sql`${hrPayRuns.year} DESC, ${hrPayRuns.month} DESC`)
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(hrPayRuns)
      .where(eq(hrPayRuns.tenantId, tenantId));
    
    auditService.logFromRequest("view_pay_runs", req, "pay_runs");
    
    res.json({
      data: payRuns,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching pay runs:", error);
    res.status(500).json({ error: "Failed to fetch pay runs" });
  }
});

router.post("/pay-runs/generate", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }
    
    const existing = await db.select()
      .from(hrPayRuns)
      .where(and(
        eq(hrPayRuns.tenantId, tenantId),
        eq(hrPayRuns.month, month),
        eq(hrPayRuns.year, year)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: "Pay run already exists",
        message: `A pay run for ${month}/${year} already exists` 
      });
    }
    
    const activeEmployees = await db.select()
      .from(hrEmployees)
      .where(and(
        eq(hrEmployees.tenantId, tenantId),
        eq(hrEmployees.status, "active")
      ));
    
    const salaryStructures = await db.select()
      .from(hrSalaryStructures)
      .where(and(
        eq(hrSalaryStructures.tenantId, tenantId),
        eq(hrSalaryStructures.isActive, true)
      ));
    
    const structureMap = new Map(salaryStructures.map(s => [s.employeeId, s]));
    
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    
    const [payRun] = await db.insert(hrPayRuns)
      .values({
        tenantId,
        month,
        year,
        status: "draft",
        totalEmployees: activeEmployees.length,
        generatedAt: new Date(),
        createdBy: userId,
      })
      .returning();
    
    const payRunItems = [];
    
    for (const employee of activeEmployees) {
      const salary = structureMap.get(employee.id);
      if (!salary) continue;
      
      const basic = parseFloat(salary.basicSalary?.toString() || "0");
      const hra = parseFloat(salary.hra?.toString() || "0");
      const allowances = parseFloat(salary.conveyanceAllowance?.toString() || "0") +
                        parseFloat(salary.medicalAllowance?.toString() || "0") +
                        parseFloat(salary.specialAllowance?.toString() || "0") +
                        parseFloat(salary.otherAllowances?.toString() || "0");
      
      const gross = basic + hra + allowances;
      
      const pfDeduction = parseFloat(salary.pfDeduction?.toString() || "0");
      const taxDeduction = parseFloat(salary.taxDeduction?.toString() || "0");
      const otherDeductions = parseFloat(salary.otherDeductions?.toString() || "0");
      const deductions = pfDeduction + taxDeduction + otherDeductions;
      
      const net = gross - deductions;
      
      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;
      
      const [item] = await db.insert(hrPayRunItems)
        .values({
          tenantId,
          payRunId: payRun.id,
          employeeId: employee.id,
          earningsJson: {
            basic,
            hra,
            conveyance: parseFloat(salary.conveyanceAllowance?.toString() || "0"),
            medical: parseFloat(salary.medicalAllowance?.toString() || "0"),
            special: parseFloat(salary.specialAllowance?.toString() || "0"),
            other: parseFloat(salary.otherAllowances?.toString() || "0"),
          },
          deductionsJson: {
            pf: pfDeduction,
            tax: taxDeduction,
            other: otherDeductions,
          },
          gross: gross.toFixed(2),
          totalDeductions: deductions.toFixed(2),
          net: net.toFixed(2),
          attendanceDays: 30,
          unpaidLeaveDays: 0,
        })
        .returning();
      
      payRunItems.push(item);
    }
    
    await db.update(hrPayRuns)
      .set({
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(hrPayRuns.id, payRun.id));
    
    auditService.logFromRequest("generate_pay_run", req, "pay_runs");
    
    res.status(201).json({
      ...payRun,
      totalGross: totalGross.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      totalNet: totalNet.toFixed(2),
      itemCount: payRunItems.length,
    });
  } catch (error) {
    console.error("Error generating pay run:", error);
    res.status(500).json({ error: "Failed to generate pay run" });
  }
});

router.get("/pay-runs/:id/items", requirePayrollWithCountryAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const payRun = await db.select()
      .from(hrPayRuns)
      .where(and(
        eq(hrPayRuns.id, req.params.id),
        eq(hrPayRuns.tenantId, tenantId)
      ))
      .limit(1);
    
    if (payRun.length === 0) {
      return res.status(404).json({ error: "Pay run not found" });
    }
    
    const items = await db.select({
      id: hrPayRunItems.id,
      employeeId: hrPayRunItems.employeeId,
      earningsJson: hrPayRunItems.earningsJson,
      deductionsJson: hrPayRunItems.deductionsJson,
      gross: hrPayRunItems.gross,
      totalDeductions: hrPayRunItems.totalDeductions,
      net: hrPayRunItems.net,
      attendanceDays: hrPayRunItems.attendanceDays,
      unpaidLeaveDays: hrPayRunItems.unpaidLeaveDays,
      overtimeHours: hrPayRunItems.overtimeHours,
      notes: hrPayRunItems.notes,
      employeeCode: hrEmployees.employeeId,
      firstName: hrEmployees.firstName,
      lastName: hrEmployees.lastName,
      email: hrEmployees.email,
    })
      .from(hrPayRunItems)
      .leftJoin(hrEmployees, eq(hrPayRunItems.employeeId, hrEmployees.id))
      .where(eq(hrPayRunItems.payRunId, req.params.id));
    
    res.json({
      payRun: payRun[0],
      items,
    });
  } catch (error) {
    console.error("Error fetching pay run items:", error);
    res.status(500).json({ error: "Failed to fetch pay run items" });
  }
});

router.post("/pay-runs/:id/approve", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const [payRun] = await db.update(hrPayRuns)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(hrPayRuns.id, req.params.id),
        eq(hrPayRuns.tenantId, tenantId),
        eq(hrPayRuns.status, "draft")
      ))
      .returning();
    
    if (!payRun) {
      return res.status(404).json({ error: "Pay run not found or already approved" });
    }
    
    auditService.logFromRequest("approve_pay_run", req, "pay_runs");
    res.json(payRun);
  } catch (error) {
    console.error("Error approving pay run:", error);
    res.status(500).json({ error: "Failed to approve pay run" });
  }
});

router.post("/pay-runs/:id/mark-paid", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const [payRun] = await db.update(hrPayRuns)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(hrPayRuns.id, req.params.id),
        eq(hrPayRuns.tenantId, tenantId),
        eq(hrPayRuns.status, "approved")
      ))
      .returning();
    
    if (!payRun) {
      return res.status(404).json({ error: "Pay run not found or not in approved state" });
    }
    
    auditService.logFromRequest("mark_pay_run_paid", req, "pay_runs");
    res.json(payRun);
  } catch (error) {
    console.error("Error marking pay run as paid:", error);
    res.status(500).json({ error: "Failed to mark pay run as paid" });
  }
});

// ==================== PAYSLIPS ====================

router.get("/payslips/:itemId/pdf", requirePayrollWithCountryAccess(), async (req, res) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const countryCode = normalizeCountryCodeFromTenant(req.context?.tenant?.country);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
    
    const hasPayslipFeature = await hrmsStorage.hasFeatureFlag(tenantId, "payroll_payslips");
    if (!hasPayslipFeature) {
      return res.status(403).json({ 
        error: "MODULE_NOT_AVAILABLE",
        message: "Payslip generation is not enabled for your subscription" 
      });
    }
    
    const item = await db.select({
      id: hrPayRunItems.id,
      payRunId: hrPayRunItems.payRunId,
      employeeId: hrPayRunItems.employeeId,
      earningsJson: hrPayRunItems.earningsJson,
      deductionsJson: hrPayRunItems.deductionsJson,
      gross: hrPayRunItems.gross,
      totalDeductions: hrPayRunItems.totalDeductions,
      net: hrPayRunItems.net,
      attendanceDays: hrPayRunItems.attendanceDays,
      employeeCode: hrEmployees.employeeId,
      firstName: hrEmployees.firstName,
      lastName: hrEmployees.lastName,
      email: hrEmployees.email,
      designation: hrEmployees.designation,
      departmentId: hrEmployees.departmentId,
    })
      .from(hrPayRunItems)
      .leftJoin(hrEmployees, eq(hrPayRunItems.employeeId, hrEmployees.id))
      .where(and(
        eq(hrPayRunItems.id, req.params.itemId),
        eq(hrPayRunItems.tenantId, tenantId)
      ))
      .limit(1);
    
    if (item.length === 0) {
      return res.status(404).json({ error: "Pay run item not found" });
    }
    
    const payRun = await db.select()
      .from(hrPayRuns)
      .where(eq(hrPayRuns.id, item[0].payRunId))
      .limit(1);
    
    if (payRun.length === 0) {
      return res.status(404).json({ error: "Pay run not found" });
    }
    
    const complianceConfig = getPayrollComplianceConfig(countryCode);
    const currencySymbol = countryCode === "MY" ? "MYR " : countryCode === "GB" ? "£" : "₹";
    const isMY = countryCode === "MY";
    
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=payslip-${item[0].employeeCode}-${payRun[0].month}-${payRun[0].year}.pdf`);
    
    doc.pipe(res);
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[payRun[0].month - 1] || payRun[0].month;
    
    doc.fontSize(20).text("PAYSLIP", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Payslip for: ${monthName} ${payRun[0].year}`, { align: "center" });
    doc.moveDown(2);
    
    doc.fontSize(14).text("Employee Details", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Name: ${item[0].firstName} ${item[0].lastName}`);
    doc.text(`Employee ID: ${item[0].employeeCode}`);
    doc.text(`Designation: ${item[0].designation || "N/A"}`);
    doc.text(`Pay Period: ${monthName} ${payRun[0].year}`);
    doc.moveDown(2);
    
    const earnings = item[0].earningsJson as Record<string, number>;
    doc.fontSize(14).text("EARNINGS", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    if (earnings) {
      Object.entries(earnings).forEach(([key, value]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        doc.text(`${label}: ${currencySymbol}${value.toFixed(2)}`);
      });
    }
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Gross Earnings: ${currencySymbol}${parseFloat(item[0].gross).toFixed(2)}`);
    doc.moveDown(2);
    
    const deductions = item[0].deductionsJson as Record<string, number>;
    const deductionsTitle = isMY ? "DEDUCTIONS (Tracking Only)" : "DEDUCTIONS";
    doc.fontSize(14).text(deductionsTitle, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    if (deductions) {
      Object.entries(deductions).forEach(([key, value]) => {
        let label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (isMY) {
          const myLabels: Record<string, string> = {
            epf: "EPF (Employee)",
            epf_employee: "EPF (Employee)",
            socso: "SOCSO",
            eis: "EIS",
            pcb: "PCB (Tax)",
          };
          label = myLabels[key.toLowerCase()] || label;
        }
        doc.text(`${label}: ${currencySymbol}${value.toFixed(2)}`);
      });
    }
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Total Deductions: ${currencySymbol}${parseFloat(item[0].totalDeductions || "0").toFixed(2)}`);
    doc.moveDown(2);
    
    doc.fontSize(14).text(`NET PAY: ${currencySymbol}${parseFloat(item[0].net || "0").toFixed(2)}`, { underline: true });
    doc.moveDown(3);
    
    if (complianceConfig?.disclaimerBanner) {
      doc.fontSize(8).fillColor("gray");
      doc.text("DISCLAIMER:", { underline: true });
      doc.moveDown(0.3);
      doc.text(complianceConfig.disclaimerBanner, { width: 500 });
      doc.fillColor("black");
    }
    
    doc.moveDown(2);
    doc.fontSize(8).fillColor("gray");
    doc.text(`Generated: ${new Date().toISOString().split("T")[0]}`, { align: "right" });
    
    doc.end();
    
    auditService.logFromRequest("download_payslip", req, "payslips");
  } catch (error) {
    console.error("Error generating payslip PDF:", error);
    res.status(500).json({ error: "Failed to generate payslip PDF" });
  }
});

// Legacy endpoints for backward compatibility
router.get("/", requirePayrollWithCountryAccess(), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_payroll", req, "payroll");
  const result = await PayrollService.listPayroll(tenantId, req.query);
  res.json(result);
});

router.post("/", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("run_payroll", req, "payroll");
  const payroll = await PayrollService.runPayroll(tenantId, req.body);
  res.status(201).json(payroll);
});

router.put("/:id", requirePayrollWithCountryAccess(), requireMinimumRole("admin"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_payroll", req, "payroll");
  const payroll = await PayrollService.updatePayroll(tenantId, req.params.id, req.body);
  res.json(payroll);
});

export default router;
