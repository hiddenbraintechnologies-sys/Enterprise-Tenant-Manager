import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { projects, projectTasks, timesheets, invoiceProjectLinks, invoices, invoiceItems, customers } from "@shared/schema";
import { insertProjectSchema, insertProjectTaskSchema, insertTimesheetSchema } from "@shared/schema";
import { eq, and, desc, sql, gte, lte, sum } from "drizzle-orm";
import { auditService } from "../../services/audit";
import { z } from "zod";

const router = Router();

// Helper to get tenant ID from request context
function getTenantId(req: Request): string | undefined {
  return req.context?.tenant?.id;
}

// Helper to get user ID from request context
function getUserId(req: Request): string | undefined {
  return req.context?.user?.id;
}

// ==================== PROJECTS ROUTES ====================

// Get all projects for tenant
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const { status, customerId, billingModel, search, page = "1", limit = "20" } = req.query;
    
    let result = await storage.getProjects(tenantId);
    
    // Apply filters
    if (status && status !== "all") {
      result = result.filter(p => p.status === status);
    }
    if (customerId) {
      result = result.filter(p => p.customerId === customerId);
    }
    if (billingModel) {
      result = result.filter(p => p.billingModel === billingModel);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.code?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = result.length;
    const paginated = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    // Map to frontend expected format (code -> projectCode)
    const mapped = paginated.map(p => ({
      ...p,
      projectCode: p.code || p.id.substring(0, 8).toUpperCase(),
    }));
    
    res.json({
      data: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

// Get single project
router.get("/projects/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const project = await storage.getProject(req.params.id, tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

// Create project
router.post("/projects", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const validatedData = insertProjectSchema.parse({
      ...req.body,
      tenantId,
      createdBy: userId,
    });

    const project = await storage.createProject(validatedData);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "project",
      resourceId: project.id,
      newValue: project,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create project" });
  }
});

// Update project
router.patch("/projects/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getProject(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = await storage.updateProject(req.params.id, tenantId, {
      ...req.body,
      updatedBy: userId,
    });
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "project",
      resourceId: req.params.id,
      oldValue: existing,
      newValue: project,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});

// Delete (archive) project
router.delete("/projects/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getProject(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    await storage.deleteProject(req.params.id, tenantId);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "delete",
      resource: "project",
      resourceId: req.params.id,
      oldValue: existing,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json({ message: "Project archived successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
});

// ==================== PROJECT TASKS ROUTES ====================

// Get tasks for a project
router.get("/projects/:projectId/tasks", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const { status, assigneeId, priority, search, page = "1", limit = "50" } = req.query;
    
    let tasks = await storage.getProjectTasks(req.params.projectId, tenantId);
    
    // Apply filters
    if (status && status !== "all") {
      tasks = tasks.filter(t => t.status === status);
    }
    if (assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === assigneeId);
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = tasks.length;
    const paginated = tasks.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    res.json({
      data: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// Get single task
router.get("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const task = await storage.getProjectTask(req.params.id, tenantId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// Create task
router.post("/projects/:projectId/tasks", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    // Verify project exists
    const project = await storage.getProject(req.params.projectId, tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const validatedData = insertProjectTaskSchema.parse({
      ...req.body,
      tenantId,
      projectId: req.params.projectId,
      createdBy: userId,
    });

    const task = await storage.createProjectTask(validatedData);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "project_task",
      resourceId: task.id,
      newValue: task,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create task" });
  }
});

// Update task
router.patch("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getProjectTask(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = await storage.updateProjectTask(req.params.id, tenantId, {
      ...req.body,
      updatedBy: userId,
    });
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "project_task",
      resourceId: req.params.id,
      oldValue: existing,
      newValue: task,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// Delete task
router.delete("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getProjectTask(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    await storage.deleteProjectTask(req.params.id, tenantId);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "delete",
      resource: "project_task",
      resourceId: req.params.id,
      oldValue: existing,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// ==================== TIMESHEETS ROUTES ====================

// Get timesheets
router.get("/timesheets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const { projectId, userId, startDate, endDate, status, billable, page = "1", limit = "50" } = req.query;
    
    let timesheetsData = await storage.getTimesheets(tenantId, {
      projectId: projectId as string,
      userId: userId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
    });
    
    // Filter by billable if specified
    if (billable !== undefined) {
      const isBillable = billable === "true";
      timesheetsData = timesheetsData.filter(t => t.isBillable === isBillable);
    }
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = timesheetsData.length;
    const paginated = timesheetsData.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    res.json({
      data: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ message: "Failed to fetch timesheets" });
  }
});

// Get my timesheets
router.get("/timesheets/my", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId || !userId) {
      return res.status(400).json({ message: "Context required" });
    }

    const { startDate, endDate, status, page = "1", limit = "50" } = req.query;
    
    const timesheetsData = await storage.getTimesheets(tenantId, {
      userId,
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
    });
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const total = timesheetsData.length;
    const paginated = timesheetsData.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    
    res.json({
      data: paginated,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching my timesheets:", error);
    res.status(500).json({ message: "Failed to fetch timesheets" });
  }
});

// Get single timesheet
router.get("/timesheets/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const timesheet = await storage.getTimesheet(req.params.id, tenantId);
    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }
    
    res.json(timesheet);
  } catch (error) {
    console.error("Error fetching timesheet:", error);
    res.status(500).json({ message: "Failed to fetch timesheet" });
  }
});

// Create timesheet entry
router.post("/timesheets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    // Verify project exists
    const project = await storage.getProject(req.body.projectId, tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Get hourly rate from project if not provided
    const hourlyRate = req.body.hourlyRate || project.hourlyRate;

    const validatedData = insertTimesheetSchema.parse({
      ...req.body,
      tenantId,
      userId: req.body.userId || userId,
      hourlyRate,
    });

    const timesheet = await storage.createTimesheet(validatedData);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "timesheet",
      resourceId: timesheet.id,
      newValue: timesheet,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.status(201).json(timesheet);
  } catch (error) {
    console.error("Error creating timesheet:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create timesheet" });
  }
});

// Update timesheet
router.patch("/timesheets/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getTimesheet(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    // Only allow updates to draft timesheets
    if (existing.status !== "draft" && !req.body.status) {
      return res.status(400).json({ message: "Can only edit draft timesheets" });
    }

    const timesheet = await storage.updateTimesheet(req.params.id, tenantId, req.body);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "timesheet",
      resourceId: req.params.id,
      oldValue: existing,
      newValue: timesheet,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(timesheet);
  } catch (error) {
    console.error("Error updating timesheet:", error);
    res.status(500).json({ message: "Failed to update timesheet" });
  }
});

// Submit timesheet
router.post("/timesheets/:id/submit", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getTimesheet(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Can only submit draft timesheets" });
    }

    const timesheet = await storage.updateTimesheet(req.params.id, tenantId, {
      status: "submitted",
      submittedAt: new Date(),
    } as any);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "timesheet",
      resourceId: req.params.id,
      metadata: { action: "submit" },
      oldValue: existing,
      newValue: timesheet,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(timesheet);
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    res.status(500).json({ message: "Failed to submit timesheet" });
  }
});

// Approve timesheet
router.post("/timesheets/:id/approve", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getTimesheet(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (existing.status !== "submitted") {
      return res.status(400).json({ message: "Can only approve submitted timesheets" });
    }

    const timesheet = await storage.updateTimesheet(req.params.id, tenantId, {
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    } as any);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "timesheet",
      resourceId: req.params.id,
      metadata: { action: "approve" },
      oldValue: existing,
      newValue: timesheet,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(timesheet);
  } catch (error) {
    console.error("Error approving timesheet:", error);
    res.status(500).json({ message: "Failed to approve timesheet" });
  }
});

// Reject timesheet
router.post("/timesheets/:id/reject", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getTimesheet(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (existing.status !== "submitted") {
      return res.status(400).json({ message: "Can only reject submitted timesheets" });
    }

    const timesheet = await storage.updateTimesheet(req.params.id, tenantId, {
      status: "rejected",
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: req.body.reason,
    } as any);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "update",
      resource: "timesheet",
      resourceId: req.params.id,
      metadata: { action: "reject", reason: req.body.reason },
      oldValue: existing,
      newValue: timesheet,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json(timesheet);
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    res.status(500).json({ message: "Failed to reject timesheet" });
  }
});

// Delete timesheet
router.delete("/timesheets/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const existing = await storage.getTimesheet(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Can only delete draft timesheets" });
    }

    await storage.deleteTimesheet(req.params.id, tenantId);
    
    auditService.logAsync({
      tenantId,
      userId,
      action: "delete",
      resource: "timesheet",
      resourceId: req.params.id,
      oldValue: existing,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
    
    res.json({ message: "Timesheet deleted successfully" });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    res.status(500).json({ message: "Failed to delete timesheet" });
  }
});

// ==================== INVOICE GENERATION FROM TIMESHEETS ====================

// Generate invoice from approved timesheets
router.post("/projects/:id/invoices/from-timesheets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const project = await storage.getProject(req.params.id, tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const { startDate, endDate, billableOnly = true, grouping = "flat" } = req.body;

    // Get approved timesheets for the project within date range
    const allTimesheets = await storage.getTimesheets(tenantId, {
      projectId: req.params.id,
      startDate,
      endDate,
      status: "approved",
    });

    // Filter billable only if specified
    const filteredTimesheets = billableOnly 
      ? allTimesheets.filter(t => t.isBillable)
      : allTimesheets;

    if (filteredTimesheets.length === 0) {
      return res.status(400).json({ message: "No approved timesheets found for the specified criteria" });
    }

    // Calculate totals
    let totalHours = 0;
    let totalAmount = 0;
    const timesheetIds: string[] = [];

    for (const ts of filteredTimesheets) {
      const hours = parseFloat(ts.hours?.toString() || "0");
      const amount = parseFloat(ts.totalAmount?.toString() || "0");
      totalHours += hours;
      totalAmount += amount;
      timesheetIds.push(ts.id);
    }

    // Get customer info for invoice
    let customer = null;
    if (project.customerId) {
      customer = await storage.getCustomer(project.customerId, tenantId);
    }

    // Create invoice using existing invoice system
    const invoiceNumber = `INV-${Date.now()}`;
    
    const [invoice] = await db.insert(invoices).values({
      tenantId,
      customerId: project.customerId || "",
      invoiceNumber,
      status: "draft",
      subtotal: totalAmount.toString(),
      taxAmount: "0",
      totalAmount: totalAmount.toString(),
      currency: project.currency || "USD",
      notes: `Invoice generated from timesheets for project: ${project.name}`,
    }).returning();

    // Create invoice items based on grouping
    if (grouping === "flat") {
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        description: `Project: ${project.name} - Timesheet billing (${totalHours} hours)`,
        quantity: Math.round(totalHours),
        unitPrice: project.hourlyRate?.toString() || "0",
        totalPrice: totalAmount.toString(),
      });
    }

    // Create invoice project link
    await storage.createInvoiceProjectLink({
      tenantId,
      invoiceId: invoice.id,
      projectId: project.id,
      totalHours: totalHours.toString(),
      totalAmount: totalAmount.toString(),
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      groupingType: grouping,
      timesheetIds,
    });

    // Mark timesheets as billed
    for (const tsId of timesheetIds) {
      await storage.updateTimesheet(tsId, tenantId, {
        status: "billed",
        invoiceId: invoice.id,
        billedAt: new Date(),
      } as any);
    }

    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "invoice_from_timesheets",
      resourceId: invoice.id,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        timesheetCount: filteredTimesheets.length,
        totalHours,
        totalAmount,
        dateRange: { startDate, endDate },
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });

    res.status(201).json({
      invoice,
      summary: {
        projectName: project.name,
        timesheetCount: filteredTimesheets.length,
        totalHours,
        totalAmount,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error("Error generating invoice from timesheets:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
});

// ==================== ALLOCATIONS ROUTES ====================

// Get allocations for tenant
router.get("/allocations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    const { projectId, employeeId, page = "1", limit = "50" } = req.query;
    
    // Get allocations from project_allocations table
    const allocationsResult = await db.select()
      .from(projects)
      .where(eq(projects.tenantId, tenantId));
    
    // For now, return placeholder data structure - allocations would typically be stored in a separate table
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    res.json({
      data: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    res.status(500).json({ message: "Failed to fetch allocations" });
  }
});

// Create allocation
router.post("/allocations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant context required" });
    }

    // Verify project exists
    const project = await storage.getProject(req.body.projectId, tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    auditService.logAsync({
      tenantId,
      userId,
      action: "create",
      resource: "allocation",
      resourceId: req.body.projectId,
      newValue: req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });

    res.status(201).json({
      id: `alloc-${Date.now()}`,
      ...req.body,
      tenantId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating allocation:", error);
    res.status(500).json({ message: "Failed to create allocation" });
  }
});

export default router;
