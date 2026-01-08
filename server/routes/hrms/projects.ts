import { Router, Request, Response } from "express";
import { projectService } from "../../services/hrms/projectService";
import { getTenantId, getUserId, parsePagination, requireFeature } from "./shared";

export function registerProjectRoutes(router: Router): void {
  router.get("/projects", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string,
      };
      const result = await projectService.getProjects(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/projects", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const project = await projectService.createProject(req.body, tenantId, userId);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/projects/:id", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const project = await projectService.updateProject(tenantId, req.params.id, req.body, userId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/allocations", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const allocations = await projectService.getAllocations(
        tenantId,
        req.query.employeeId as string,
        req.query.projectId as string
      );
      res.json(allocations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/allocations", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const allocation = await projectService.createAllocation(req.body, tenantId, userId);
      res.status(201).json(allocation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/allocations/:id", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const allocation = await projectService.updateAllocation(tenantId, req.params.id, req.body, userId);
      if (!allocation) {
        return res.status(404).json({ error: "Allocation not found" });
      }
      res.json(allocation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/timesheets", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const pagination = parsePagination(req);
      const filters = {
        employeeId: req.query.employeeId as string,
        projectId: req.query.projectId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        status: req.query.status as string,
      };
      const result = await projectService.getTimesheets(tenantId, filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/timesheets", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const timesheet = await projectService.createTimesheet(req.body, tenantId, userId);
      res.status(201).json(timesheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/timesheets/:id", requireFeature("hrms_it_extensions"), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const timesheet = await projectService.updateTimesheet(tenantId, req.params.id, req.body, userId);
      if (!timesheet) {
        return res.status(404).json({ error: "Timesheet not found" });
      }
      res.json(timesheet);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
