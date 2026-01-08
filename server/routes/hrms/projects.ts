/**
 * Project Management Routes (IT Extensions)
 * 
 * Handles project tracking for IT-focused tenants. Gated by hrms_it_extensions feature flag.
 * 
 * Endpoints (mounted at /api/hr/projects):
 * - GET  / - List projects
 * - POST / - Create project
 * - PUT  /:id - Update project
 * - GET  /allocations - List allocations
 * - POST /allocations - Add allocation
 * - PUT  /allocations/:id - Update allocation
 * - GET  /timesheets - List timesheets
 * - POST /timesheets - Add timesheet
 * - PUT  /timesheets/:id - Update timesheet
 * 
 * Feature Flag: hrms_it_extensions
 * Enabled for: clinic, coworking, service, education, legal, furniture_manufacturing
 * 
 * Note: Tenant isolation and base RBAC applied at router level in index.ts
 * 
 * @module server/routes/hrms/projects
 */

import { Router, Request, Response, NextFunction } from "express";
import { auditService } from "../../core";
import ProjectService from "../../services/hrms/projectService";
import { hrmsStorage } from "../../storage/hrms";

const router = Router();

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

router.get("/", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_projects", req, "projects");
  const result = await ProjectService.listProjects(tenantId, req.query);
  res.json(result);
});

router.post("/", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_project", req, "projects");
  const project = await ProjectService.addProject(tenantId, req.body);
  res.status(201).json(project);
});

router.put("/:id", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_project", req, "projects");
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

router.post("/allocations", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_allocation", req, "allocations");
  const allocation = await ProjectService.addAllocation(tenantId, req.body);
  res.status(201).json(allocation);
});

router.put("/allocations/:id", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_allocation", req, "allocations");
  const allocation = await ProjectService.updateAllocation(tenantId, req.params.id, req.body);
  res.json(allocation);
});

router.get("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("view_timesheets", req, "timesheets");
  const result = await ProjectService.listTimesheets(tenantId, req.query);
  res.json(result);
});

router.post("/timesheets", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("add_timesheet", req, "timesheets");
  const timesheet = await ProjectService.addTimesheet(tenantId, req.body);
  res.status(201).json(timesheet);
});

router.put("/timesheets/:id", requireFeature("hrms_it_extensions"), async (req, res) => {
  const tenantId = req.context?.tenant?.id;
  const userId = req.context?.user?.id;
  if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });
  
  auditService.logFromRequest("update_timesheet", req, "timesheets");
  const timesheet = await ProjectService.updateTimesheet(tenantId, req.params.id, req.body, userId);
  res.json(timesheet);
});

export { FEATURE_FLAGS, requireFeature };
export default router;
