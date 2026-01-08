import { Request, Response } from "express";

export type FeatureFlag = "hrms_it_extensions" | "advanced_analytics" | "multi_currency";

export const FEATURE_FLAGS: Record<string, FeatureFlag[]> = {
  clinic: ["hrms_it_extensions"],
  salon: [],
  pg: [],
  coworking: ["hrms_it_extensions"],
  service: ["hrms_it_extensions"],
  real_estate: [],
  tourism: [],
  education: ["hrms_it_extensions"],
  logistics: [],
  legal: ["hrms_it_extensions"],
  furniture_manufacturing: ["hrms_it_extensions", "multi_currency"],
};

export function getTenantId(req: Request): string {
  const tenantId = req.headers["x-tenant-id"] as string || (req as any).tenantId;
  if (!tenantId) {
    throw new Error("Tenant ID required");
  }
  return tenantId;
}

export function getAuthenticatedBusinessType(req: Request): string | null {
  const businessType = (req as any).businessType;
  if (businessType && typeof businessType === "string" && FEATURE_FLAGS.hasOwnProperty(businessType)) {
    return businessType;
  }
  return null;
}

export function hasFeatureFlag(req: Request, flag: FeatureFlag): boolean {
  const businessType = getAuthenticatedBusinessType(req);
  if (!businessType) {
    return false;
  }
  const features = FEATURE_FLAGS[businessType] || [];
  return features.includes(flag);
}

export function requireFeature(flag: FeatureFlag) {
  return (req: Request, res: Response, next: Function) => {
    const businessType = getAuthenticatedBusinessType(req);
    if (!businessType) {
      return res.status(403).json({ error: "Business type not authenticated" });
    }
    if (!hasFeatureFlag(req, flag)) {
      return res.status(403).json({ error: "Feature not available for your subscription" });
    }
    next();
  };
}

export function getUserId(req: Request): string | undefined {
  return (req as any).userId || (req as any).user?.id;
}

export function parsePagination(req: Request) {
  return {
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    sortBy: req.query.sortBy as string,
    sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
  };
}
