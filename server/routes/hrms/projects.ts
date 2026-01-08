import { Router, Request, Response, NextFunction } from "express";
import { tenantIsolationMiddleware } from "../../core/tenant-isolation";
import { requireMinimumRole } from "../../core/auth-middleware";
import { auditService } from "../../core/audit";
import ProjectService from "../../services/hrms/projectService";
import { hrmsStorage } from "../../storage/hrms";

const router = Router();

router.use(tenantIsolationMiddleware());
router.use(requireMinimumRole("staff"));

const FEATURE_FLAGS: Record<string, string[]> = {
  hrms_it_extensions: ["clinic", "coworking", "service", "education", "legal", "furniture_manufacturing"],
};

function requireFeature(featureFlag: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    const hasFeature = await hrmsStorage.hasFeatureFlag(tenantId, featureFlag);
    if (!hasFeature) {
      return res.status(403).json({ 
        error: "Feature not available",
        message: `The ${featureFlag} feature is not enabled for your subscription` 
      });
    }
    next();
  };
}

router.get("/projects", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const filters = {
    status: req.query.status as string,
    search: req.query.search as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const result = await ProjectService.getProjects(tenantId, filters, pagination);
  res.json(result);
});

router.post("/projects", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const project = await ProjectService.createProject(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "projects",
    resourceId: project.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(project);
});

router.patch("/projects/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const project = await ProjectService.updateProject(tenantId, req.params.id, req.body, userId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "projects",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(project);
});

router.get("/allocations", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const allocations = await ProjectService.getAllocations(
    tenantId,
    req.query.employeeId as string,
    req.query.projectId as string
  );
  res.json(allocations);
});

router.post("/allocations", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const allocation = await ProjectService.createAllocation(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "allocations",
    resourceId: allocation.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(allocation);
});

router.patch("/allocations/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const allocation = await ProjectService.updateAllocation(tenantId, req.params.id, req.body, userId);
  if (!allocation) {
    return res.status(404).json({ error: "Allocation not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "allocations",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(allocation);
});

router.get("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const filters = {
    employeeId: req.query.employeeId as string,
    projectId: req.query.projectId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    status: req.query.status as string,
  };
  const pagination = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  
  const result = await ProjectService.getTimesheets(tenantId, filters, pagination);
  res.json(result);
});

router.post("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const timesheet = await ProjectService.createTimesheet(tenantId, req.body, userId);
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "create",
    resource: "timesheets",
    resourceId: timesheet.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.status(201).json(timesheet);
});

router.patch("/timesheets/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const timesheet = await ProjectService.updateTimesheet(tenantId, req.params.id, req.body, userId);
  if (!timesheet) {
    return res.status(404).json({ error: "Timesheet not found" });
  }
  
  await auditService.logAsync({
    tenantId,
    userId,
    action: "update",
    resource: "timesheets",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  res.json(timesheet);
});

export { FEATURE_FLAGS, requireFeature };
export default router;
