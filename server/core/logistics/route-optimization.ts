import { db } from "../../db";
import {
  routeOptimizationJobs,
  routeOptimizationCache,
  type RouteOptimizationJob,
  type RouteOptimizationCache,
} from "@shared/schema";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { aiService } from "../ai-service";
import OpenAI from "openai";
import crypto from "crypto";

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface DeliveryStop extends Location {
  order?: number;
  weight?: number;
  priority?: "low" | "normal" | "high";
}

interface TrafficData {
  provider?: string;
  snapshotTimestamp?: Date;
  averageSpeedKmh?: number;
  delayMultiplier?: number;
  incidentSummaries?: string[];
}

interface RouteOptimizationInput {
  pickupLocation: Location;
  dropOffLocations: DeliveryStop[];
  vehicleCapacity?: number;
  capacityUnit?: string;
  deliveryWindowStart?: Date;
  deliveryWindowEnd?: Date;
  trafficData?: TrafficData;
  shipmentId?: string;
  vehicleId?: string;
  tripId?: string;
}

interface RouteWaypoint {
  location: Location;
  arrivalMinutes: number;
  distanceFromPrevKm: number;
  stopDurationMinutes: number;
  isPickup: boolean;
}

interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  routePolyline?: string;
}

interface CostBreakdown {
  distanceCost: number;
  timeCost: number;
  trafficSurcharge: number;
}

interface RouteOptimizationResult {
  jobId: string;
  optimizedRoute: OptimizedRoute;
  etaMinutes: number;
  distanceKm: number;
  costEstimate: number;
  costBreakdown: CostBreakdown;
  currency: string;
  aiGenerated: boolean;
  aiModel?: string;
  cacheHit: boolean;
  consentVersion?: string;
}

const CACHE_TTL_WITH_TRAFFIC_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_WITHOUT_TRAFFIC_MS = 2 * 60 * 60 * 1000; // 2 hours

const DEFAULT_COST_CONFIG = {
  baseRatePerKm: 8, // INR per km
  driverHourlyCost: 150, // INR per hour
  trafficSurchargeMultiplier: 0.15, // 15% extra when traffic delays
};

class RouteOptimizationService {
  private generateCacheKey(tenantId: string, input: RouteOptimizationInput): string {
    const payload = {
      pickup: { lat: input.pickupLocation.lat, lng: input.pickupLocation.lng },
      drops: input.dropOffLocations.map(d => ({ lat: d.lat, lng: d.lng })).sort((a, b) => a.lat - b.lat || a.lng - b.lng),
      capacity: input.vehicleCapacity,
      windowStart: input.deliveryWindowStart instanceof Date ? input.deliveryWindowStart.toISOString() : input.deliveryWindowStart,
      windowEnd: input.deliveryWindowEnd instanceof Date ? input.deliveryWindowEnd.toISOString() : input.deliveryWindowEnd,
      hasTraffic: !!input.trafficData,
    };
    const hash = crypto.createHash("sha256").update(tenantId + JSON.stringify(payload)).digest("hex").substring(0, 64);
    return hash;
  }
  
  private serializeForStorage(input: RouteOptimizationInput): {
    pickupLocation: any;
    dropOffLocations: any;
    trafficData: any;
    deliveryWindowStart: Date | undefined;
    deliveryWindowEnd: Date | undefined;
  } {
    return {
      pickupLocation: input.pickupLocation,
      dropOffLocations: input.dropOffLocations,
      trafficData: input.trafficData || null,
      deliveryWindowStart: input.deliveryWindowStart instanceof Date ? input.deliveryWindowStart : (input.deliveryWindowStart ? new Date(input.deliveryWindowStart) : undefined),
      deliveryWindowEnd: input.deliveryWindowEnd instanceof Date ? input.deliveryWindowEnd : (input.deliveryWindowEnd ? new Date(input.deliveryWindowEnd) : undefined),
    };
  }

  private generatePayloadHash(input: RouteOptimizationInput): string {
    return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").substring(0, 64);
  }

  private generateTrafficHash(trafficData: TrafficData | undefined): string | null {
    if (!trafficData) return null;
    return crypto.createHash("sha256").update(JSON.stringify(trafficData)).digest("hex").substring(0, 64);
  }

  async checkCache(tenantId: string, cacheKey: string): Promise<RouteOptimizationCache | null> {
    const now = new Date();
    const [cached] = await db
      .select()
      .from(routeOptimizationCache)
      .where(and(
        eq(routeOptimizationCache.tenantId, tenantId),
        eq(routeOptimizationCache.cacheKey, cacheKey),
        gt(routeOptimizationCache.expiresAt, now)
      ))
      .limit(1);

    if (cached) {
      await db
        .update(routeOptimizationCache)
        .set({
          lastUsedAt: now,
          hitCount: sql`${routeOptimizationCache.hitCount} + 1`,
        })
        .where(eq(routeOptimizationCache.id, cached.id));
    }

    return cached || null;
  }

  async saveToCache(
    tenantId: string,
    cacheKey: string,
    input: RouteOptimizationInput,
    result: Omit<RouteOptimizationResult, "jobId" | "cacheHit">
  ): Promise<void> {
    const now = new Date();
    const hasTraffic = !!input.trafficData;
    const ttl = hasTraffic ? CACHE_TTL_WITH_TRAFFIC_MS : CACHE_TTL_WITHOUT_TRAFFIC_MS;
    const expiresAt = new Date(now.getTime() + ttl);

    await db.insert(routeOptimizationCache).values({
      tenantId,
      cacheKey,
      requestPayloadHash: this.generatePayloadHash(input),
      responsePayload: result as any,
      etaMinutes: result.etaMinutes,
      costEstimate: result.costEstimate.toString(),
      distanceKm: result.distanceKm.toString(),
      hasTrafficData: hasTraffic,
      trafficContextHash: this.generateTrafficHash(input.trafficData),
      expiresAt,
    });
  }

  private haversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private nearestNeighborTSP(pickup: Location, drops: DeliveryStop[]): DeliveryStop[] {
    if (drops.length <= 1) return drops;

    const visited = new Set<number>();
    const result: DeliveryStop[] = [];
    let current = pickup;

    while (visited.size < drops.length) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < drops.length; i++) {
        if (visited.has(i)) continue;
        const dist = this.haversineDistance(current, drops[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      if (nearestIdx >= 0) {
        visited.add(nearestIdx);
        result.push(drops[nearestIdx]);
        current = drops[nearestIdx];
      }
    }

    return result;
  }

  private calculateDeterministicRoute(input: RouteOptimizationInput): OptimizedRoute {
    const orderedDrops = this.nearestNeighborTSP(input.pickupLocation, input.dropOffLocations);
    const waypoints: RouteWaypoint[] = [];
    let current = input.pickupLocation;
    let totalDistance = 0;
    let totalMinutes = 0;
    const avgSpeedKmh = input.trafficData?.averageSpeedKmh || 40;
    const delayMultiplier = input.trafficData?.delayMultiplier || 1.0;

    waypoints.push({
      location: current,
      arrivalMinutes: 0,
      distanceFromPrevKm: 0,
      stopDurationMinutes: 10, // pickup duration
      isPickup: true,
    });
    totalMinutes += 10;

    for (const drop of orderedDrops) {
      const dist = this.haversineDistance(current, drop);
      const travelMinutes = (dist / avgSpeedKmh) * 60 * delayMultiplier;
      totalDistance += dist;
      totalMinutes += travelMinutes;

      waypoints.push({
        location: drop,
        arrivalMinutes: Math.round(totalMinutes),
        distanceFromPrevKm: Math.round(dist * 100) / 100,
        stopDurationMinutes: 5, // delivery duration
        isPickup: false,
      });

      totalMinutes += 5;
      current = drop;
    }

    return {
      waypoints,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      totalDurationMinutes: Math.round(totalMinutes),
    };
  }

  private calculateCost(distanceKm: number, durationMinutes: number, hasTrafficDelay: boolean): CostBreakdown {
    const distanceCost = distanceKm * DEFAULT_COST_CONFIG.baseRatePerKm;
    const timeCost = (durationMinutes / 60) * DEFAULT_COST_CONFIG.driverHourlyCost;
    const trafficSurcharge = hasTrafficDelay
      ? (distanceCost + timeCost) * DEFAULT_COST_CONFIG.trafficSurchargeMultiplier
      : 0;

    return {
      distanceCost: Math.round(distanceCost * 100) / 100,
      timeCost: Math.round(timeCost * 100) / 100,
      trafficSurcharge: Math.round(trafficSurcharge * 100) / 100,
    };
  }

  async optimizeRoute(
    tenantId: string,
    input: RouteOptimizationInput,
    requestedBy: string
  ): Promise<RouteOptimizationResult> {
    const cacheKey = this.generateCacheKey(tenantId, input);

    const consent = await aiService.checkAiConsent(tenantId);
    const featureAllowed = await aiService.checkFeatureAllowed(tenantId, "route_optimization");

    const cached = await this.checkCache(tenantId, cacheKey);
    const serialized = this.serializeForStorage(input);
    
    if (cached) {
      const cachedResult = cached.responsePayload as unknown as Omit<RouteOptimizationResult, "jobId" | "cacheHit">;
      const [job] = await db.insert(routeOptimizationJobs).values({
        tenantId,
        shipmentId: input.shipmentId,
        vehicleId: input.vehicleId,
        tripId: input.tripId,
        pickupLocation: serialized.pickupLocation,
        dropOffLocations: serialized.dropOffLocations,
        vehicleCapacity: input.vehicleCapacity?.toString(),
        capacityUnit: input.capacityUnit,
        deliveryWindowStart: serialized.deliveryWindowStart,
        deliveryWindowEnd: serialized.deliveryWindowEnd,
        trafficData: serialized.trafficData,
        optimizedRoute: cachedResult.optimizedRoute as any,
        etaMinutes: cachedResult.etaMinutes,
        distanceKm: cachedResult.distanceKm.toString(),
        costEstimate: cachedResult.costEstimate.toString(),
        costBreakdown: cachedResult.costBreakdown as any,
        currency: cachedResult.currency,
        aiGenerated: cachedResult.aiGenerated,
        aiModel: cachedResult.aiModel,
        consentVersion: cachedResult.consentVersion,
        cacheKey,
        cacheHit: true,
        status: "completed",
        requestedBy,
      }).returning();

      return { ...cachedResult, jobId: job.id, cacheHit: true };
    }

    const [pendingJob] = await db.insert(routeOptimizationJobs).values({
      tenantId,
      shipmentId: input.shipmentId,
      vehicleId: input.vehicleId,
      tripId: input.tripId,
      pickupLocation: serialized.pickupLocation,
      dropOffLocations: serialized.dropOffLocations,
      vehicleCapacity: input.vehicleCapacity?.toString(),
      capacityUnit: input.capacityUnit,
      deliveryWindowStart: serialized.deliveryWindowStart,
      deliveryWindowEnd: serialized.deliveryWindowEnd,
      trafficData: serialized.trafficData,
      cacheKey,
      status: "processing",
      requestedBy,
    }).returning();

    let optimizedRoute: OptimizedRoute;
    let aiGenerated = false;
    let aiModel: string | undefined;
    let usageLogId: string | undefined;
    let consentVersion: string | undefined;

    if (consent.allowed && featureAllowed) {
      const rateCheck = await aiService.checkRateLimit(tenantId);
      const estimatedTokens = 1000;
      const tokenCheck = await aiService.checkTokenQuota(tenantId, estimatedTokens);

      if (rateCheck.allowed && tokenCheck) {
        const startTime = Date.now();
        try {
          const aiResult = await this.callAiForRouteOptimization(input);
          const latencyMs = Date.now() - startTime;

          if (aiResult) {
            optimizedRoute = aiResult.route;
            aiGenerated = true;
            aiModel = "gpt-4o-mini";
            consentVersion = consent.consentVersion;

            const log = await aiService.logUsage({
              tenantId,
              feature: "route_optimization",
              model: aiModel,
              provider: "openai",
              totalTokens: aiResult.tokensUsed,
              success: true,
              latencyMs,
            });
            usageLogId = log.id;
          } else {
            optimizedRoute = this.calculateDeterministicRoute(input);
          }
        } catch (error: any) {
          const latencyMs = Date.now() - startTime;
          await aiService.logUsage({
            tenantId,
            feature: "route_optimization",
            model: "gpt-4o-mini",
            provider: "openai",
            totalTokens: 0,
            success: false,
            latencyMs,
            errorMessage: error.message,
          });
          optimizedRoute = this.calculateDeterministicRoute(input);
        }
      } else {
        optimizedRoute = this.calculateDeterministicRoute(input);
      }
    } else {
      optimizedRoute = this.calculateDeterministicRoute(input);
    }

    const hasTrafficDelay = (input.trafficData?.delayMultiplier || 1) > 1;
    const costBreakdown = this.calculateCost(
      optimizedRoute.totalDistanceKm,
      optimizedRoute.totalDurationMinutes,
      hasTrafficDelay
    );
    const costEstimate = costBreakdown.distanceCost + costBreakdown.timeCost + costBreakdown.trafficSurcharge;

    const [completedJob] = await db
      .update(routeOptimizationJobs)
      .set({
        optimizedRoute: optimizedRoute as any,
        etaMinutes: optimizedRoute.totalDurationMinutes,
        distanceKm: optimizedRoute.totalDistanceKm.toString(),
        costEstimate: costEstimate.toString(),
        costBreakdown: costBreakdown as any,
        currency: "INR",
        aiGenerated,
        aiModel,
        consentVersion,
        usageLogId,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(routeOptimizationJobs.id, pendingJob.id))
      .returning();

    const result: RouteOptimizationResult = {
      jobId: completedJob.id,
      optimizedRoute,
      etaMinutes: optimizedRoute.totalDurationMinutes,
      distanceKm: optimizedRoute.totalDistanceKm,
      costEstimate,
      costBreakdown,
      currency: "INR",
      aiGenerated,
      aiModel,
      cacheHit: false,
      consentVersion,
    };

    await this.saveToCache(tenantId, cacheKey, input, result);

    return result;
  }

  private async callAiForRouteOptimization(
    input: RouteOptimizationInput
  ): Promise<{ route: OptimizedRoute; tokensUsed: number } | null> {
    try {
      const openai = new OpenAI();
      const prompt = this.buildRoutePrompt(input);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a route optimization expert. Given pickup and delivery locations, optimize the route for minimum travel time considering traffic. Return a JSON object with the optimized order of stops and estimated times. Always respond with valid JSON only, no markdown.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      const tokensUsed = response.usage?.total_tokens || 0;

      if (!content) return null;

      const parsed = JSON.parse(content);
      if (!parsed.waypoints || !Array.isArray(parsed.waypoints)) {
        return null;
      }

      return {
        route: {
          waypoints: parsed.waypoints,
          totalDistanceKm: parsed.totalDistanceKm || 0,
          totalDurationMinutes: parsed.totalDurationMinutes || 0,
          routePolyline: parsed.routePolyline,
        },
        tokensUsed,
      };
    } catch {
      return null;
    }
  }

  private buildRoutePrompt(input: RouteOptimizationInput): string {
    const pickup = input.pickupLocation;
    const drops = input.dropOffLocations;
    const traffic = input.trafficData;

    let prompt = `Optimize delivery route:\n\nPickup: ${pickup.lat}, ${pickup.lng}`;
    if (pickup.address) prompt += ` (${pickup.address})`;
    prompt += `\n\nDelivery stops:\n`;

    drops.forEach((d, i) => {
      prompt += `${i + 1}. ${d.lat}, ${d.lng}`;
      if (d.address) prompt += ` (${d.address})`;
      if (d.priority) prompt += ` [${d.priority} priority]`;
      prompt += `\n`;
    });

    if (input.vehicleCapacity) {
      prompt += `\nVehicle capacity: ${input.vehicleCapacity} ${input.capacityUnit || "kg"}`;
    }

    if (input.deliveryWindowStart && input.deliveryWindowEnd) {
      prompt += `\nDelivery window: ${input.deliveryWindowStart.toISOString()} to ${input.deliveryWindowEnd.toISOString()}`;
    }

    if (traffic) {
      prompt += `\n\nTraffic conditions:`;
      if (traffic.averageSpeedKmh) prompt += `\n- Average speed: ${traffic.averageSpeedKmh} km/h`;
      if (traffic.delayMultiplier) prompt += `\n- Delay multiplier: ${traffic.delayMultiplier}x`;
      if (traffic.incidentSummaries?.length) {
        prompt += `\n- Incidents: ${traffic.incidentSummaries.join(", ")}`;
      }
    }

    prompt += `\n\nReturn JSON with: { waypoints: [{ location: {lat, lng, address}, arrivalMinutes, distanceFromPrevKm, stopDurationMinutes, isPickup }], totalDistanceKm, totalDurationMinutes }`;

    return prompt;
  }

  async getJob(tenantId: string, jobId: string): Promise<RouteOptimizationJob | null> {
    const [job] = await db
      .select()
      .from(routeOptimizationJobs)
      .where(and(
        eq(routeOptimizationJobs.tenantId, tenantId),
        eq(routeOptimizationJobs.id, jobId)
      ))
      .limit(1);
    return job || null;
  }

  async getJobHistory(tenantId: string, limit = 50): Promise<RouteOptimizationJob[]> {
    return db
      .select()
      .from(routeOptimizationJobs)
      .where(eq(routeOptimizationJobs.tenantId, tenantId))
      .orderBy(desc(routeOptimizationJobs.createdAt))
      .limit(limit);
  }

  async applyManualOverride(
    tenantId: string,
    jobId: string,
    override: {
      route?: OptimizedRoute;
      etaMinutes?: number;
      costEstimate?: number;
      reason: string;
    },
    overriddenBy: string
  ): Promise<RouteOptimizationJob | null> {
    const job = await this.getJob(tenantId, jobId);
    if (!job) return null;

    const [updated] = await db
      .update(routeOptimizationJobs)
      .set({
        isOverridden: true,
        overrideRoute: override.route as any,
        overrideEtaMinutes: override.etaMinutes,
        overrideCostEstimate: override.costEstimate?.toString(),
        overrideReason: override.reason,
        overriddenBy,
        overriddenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(routeOptimizationJobs.tenantId, tenantId),
        eq(routeOptimizationJobs.id, jobId)
      ))
      .returning();

    return updated || null;
  }

  shouldMaskAiContent(job: RouteOptimizationJob, currentConsentVersion: string | null): boolean {
    if (!job.aiGenerated) return false;
    if (!currentConsentVersion) return true;
    if (!job.consentVersion) return true;

    const currentMajor = parseInt(currentConsentVersion.split(".")[0] || "1");
    const jobMajor = parseInt(job.consentVersion.split(".")[0] || "1");

    return currentMajor > jobMajor;
  }

  maskJobContent(job: RouteOptimizationJob): RouteOptimizationJob {
    return {
      ...job,
      optimizedRoute: { masked: true, reason: "Consent revoked" } as any,
      costBreakdown: null,
    };
  }

  async cleanupExpiredCache(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(routeOptimizationCache)
      .where(sql`${routeOptimizationCache.expiresAt} < ${now}`);
    return 0;
  }
}

export const routeOptimizationService = new RouteOptimizationService();
