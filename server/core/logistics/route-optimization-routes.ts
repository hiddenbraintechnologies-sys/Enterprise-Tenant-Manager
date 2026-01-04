import { Router, type Request, type Response } from "express";
import { routeOptimizationService } from "./route-optimization";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";
import { aiService } from "../ai-service";
import { z } from "zod";

export const routeOptimizationRouter = Router();

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
});

const deliveryStopSchema = locationSchema.extend({
  order: z.number().optional(),
  weight: z.number().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

const trafficDataSchema = z.object({
  provider: z.string().optional(),
  snapshotTimestamp: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  averageSpeedKmh: z.number().min(1).optional(),
  delayMultiplier: z.number().min(0.5).max(5).optional(),
  incidentSummaries: z.array(z.string()).optional(),
}).optional();

const optimizeRouteSchema = z.object({
  pickupLocation: locationSchema,
  dropOffLocations: z.array(deliveryStopSchema).min(1).max(50),
  vehicleCapacity: z.number().positive().optional(),
  capacityUnit: z.string().optional(),
  deliveryWindowStart: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  deliveryWindowEnd: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  trafficData: trafficDataSchema,
  shipmentId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
});

const waypointSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  arrivalMinutes: z.number().min(0),
  distanceFromPrevKm: z.number().min(0),
  stopDurationMinutes: z.number().min(0),
  isPickup: z.boolean(),
});

const overrideRouteSchema = z.object({
  route: z.object({
    waypoints: z.array(waypointSchema).min(1),
    totalDistanceKm: z.number().min(0),
    totalDurationMinutes: z.number().min(0),
    routePolyline: z.string().optional(),
  }).optional(),
  etaMinutes: z.number().positive().optional(),
  costEstimate: z.number().positive().optional(),
  reason: z.string().min(1).max(500),
});

routeOptimizationRouter.post("/optimize", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ message: "Tenant and user context required" });
    }

    const input = optimizeRouteSchema.parse(req.body);

    const result = await routeOptimizationService.optimizeRoute(
      tenantId,
      {
        pickupLocation: input.pickupLocation,
        dropOffLocations: input.dropOffLocations,
        vehicleCapacity: input.vehicleCapacity,
        capacityUnit: input.capacityUnit,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
        trafficData: input.trafficData,
        shipmentId: input.shipmentId,
        vehicleId: input.vehicleId,
        tripId: input.tripId,
      },
      userId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
});

routeOptimizationRouter.get("/jobs", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const jobs = await routeOptimizationService.getJobHistory(tenantId, limit);

    const consent = await aiService.checkAiConsent(tenantId);
    const currentConsentVersion = consent.allowed ? consent.consentVersion : null;

    const maskedJobs = jobs.map(job => {
      if (routeOptimizationService.shouldMaskAiContent(job, currentConsentVersion || null)) {
        return routeOptimizationService.maskJobContent(job);
      }
      return job;
    });

    res.json({
      success: true,
      data: maskedJobs,
      count: maskedJobs.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

routeOptimizationRouter.get("/jobs/:jobId", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const job = await routeOptimizationService.getJob(tenantId, req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const consent = await aiService.checkAiConsent(tenantId);
    const currentConsentVersion = consent.allowed ? consent.consentVersion : null;

    const responseJob = routeOptimizationService.shouldMaskAiContent(job, currentConsentVersion || null)
      ? routeOptimizationService.maskJobContent(job)
      : job;

    res.json({
      success: true,
      data: responseJob,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

routeOptimizationRouter.patch("/jobs/:jobId/override", ...middleware, requireMinimumRole("manager"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ message: "Tenant and user context required" });
    }

    const input = overrideRouteSchema.parse(req.body);

    const updated = await routeOptimizationService.applyManualOverride(
      tenantId,
      req.params.jobId,
      {
        route: input.route,
        etaMinutes: input.etaMinutes,
        costEstimate: input.costEstimate,
        reason: input.reason,
      },
      userId
    );

    if (!updated) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      success: true,
      data: updated,
      message: "Manual override applied successfully",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
});

routeOptimizationRouter.get("/effective/:jobId", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const job = await routeOptimizationService.getJob(tenantId, req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const consent = await aiService.checkAiConsent(tenantId);
    const currentConsentVersion = consent.allowed ? consent.consentVersion : null;
    const shouldMask = routeOptimizationService.shouldMaskAiContent(job, currentConsentVersion || null);

    let effectiveRoute, effectiveEta, effectiveCost;

    if (job.isOverridden) {
      effectiveRoute = job.overrideRoute;
      effectiveEta = job.overrideEtaMinutes;
      effectiveCost = job.overrideCostEstimate;
    } else if (shouldMask) {
      return res.status(403).json({
        message: "AI-generated route is no longer accessible due to consent changes",
        requiresOverride: true,
      });
    } else {
      effectiveRoute = job.optimizedRoute;
      effectiveEta = job.etaMinutes;
      effectiveCost = job.costEstimate;
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        effectiveRoute,
        effectiveEtaMinutes: effectiveEta,
        effectiveCostEstimate: effectiveCost,
        currency: job.currency,
        isOverridden: job.isOverridden,
        overrideReason: job.overrideReason,
        aiGenerated: job.aiGenerated && !shouldMask,
        status: job.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
