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
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "projects",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const result = await ProjectService.listProjects(tenantId, req.query);
  res.json(result);
});

router.post("/projects", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "projects",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const project = await ProjectService.addProject(tenantId, req.body);
  res.status(201).json(project);
});

router.put("/projects/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "update",
    resource: "projects",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const project = await ProjectService.updateProject(tenantId, req.params.id, req.body);
  res.json(project);
});

router.get("/allocations", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  const allocations = await ProjectService.listAllocations(
    tenantId,
    req.query.employeeId as string,
    req.query.projectId as string
  );
  res.json(allocations);
});

router.post("/allocations", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "allocations",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const allocation = await ProjectService.addAllocation(tenantId, req.body);
  res.status(201).json(allocation);
});

router.put("/allocations/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "update",
    resource: "allocations",
    resourceId: req.params.id,
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const allocation = await ProjectService.updateAllocation(tenantId, req.params.id, req.body);
  res.json(allocation);
});

router.get("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "access",
    resource: "timesheets",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const result = await ProjectService.listTimesheets(tenantId, req.query);
  res.json(result);
});

router.post("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  await auditService.logAsync({
    tenantId,
    userId: req.context?.user?.id,
    action: "create",
    resource: "timesheets",
    newValue: req.body,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  const timesheet = await ProjectService.addTimesheet(tenantId, req.body);
  res.status(201).json(timesheet);
});

router.put("/timesheets/:id", requireFeature("hrms_it_extensions"), requireMinimumRole("manager"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
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
  
  const timesheet = await ProjectService.updateTimesheet(tenantId, req.params.id, req.body, userId);
  res.json(timesheet);
});

export { FEATURE_FLAGS, requireFeature };
export default router;
