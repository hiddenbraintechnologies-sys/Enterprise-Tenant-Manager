import type { Request, Response, NextFunction } from "express";
import { tenantService } from "./tenants";

export type BusinessType = "clinic" | "clinic_healthcare" | "salon" | "salon_spa" | "pg" | "pg_hostel" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "education_institute" | "logistics" | "logistics_fleet" | "legal" | "furniture_manufacturing" | "software_services" | "consulting" | "digital_agency" | "retail_store";

const API_ROUTE_TO_BUSINESS_TYPE: Record<string, BusinessType> = {
  "/api/real-estate": "real_estate",
  "/api/tourism": "tourism",
  "/api/education": "education",
  "/api/logistics": "logistics",
  "/api/legal": "legal",
};

const DASHBOARD_ROUTES: Record<BusinessType, string> = {
  clinic: "/dashboard/clinic",
  clinic_healthcare: "/dashboard/clinic",
  salon: "/dashboard/salon",
  salon_spa: "/dashboard/salon",
  pg: "/dashboard/pg",
  pg_hostel: "/dashboard/pg",
  coworking: "/dashboard/coworking",
  service: "/dashboard/service",
  real_estate: "/dashboard/real-estate",
  tourism: "/dashboard/tourism",
  education: "/dashboard/education",
  education_institute: "/dashboard/education",
  logistics: "/dashboard/logistics",
  logistics_fleet: "/dashboard/logistics",
  legal: "/dashboard/legal",
  furniture_manufacturing: "/dashboard/furniture",
  software_services: "/dashboard/software-services",
  consulting: "/dashboard/consulting",
  digital_agency: "/dashboard/digital-agency",
  retail_store: "/dashboard/retail",
};

const ROUTE_TO_BUSINESS_TYPE: Record<string, BusinessType> = {
  "/dashboard/clinic": "clinic",
  "/dashboard/salon": "salon",
  "/dashboard/pg": "pg",
  "/dashboard/coworking": "coworking",
  "/dashboard/service": "service",
  "/dashboard/real-estate": "real_estate",
  "/dashboard/tourism": "tourism",
  "/dashboard/education": "education",
  "/dashboard/logistics": "logistics",
  "/dashboard/legal": "legal",
};

export function getCanonicalDashboardRoute(businessType: string): string {
  return DASHBOARD_ROUTES[businessType as BusinessType] || DASHBOARD_ROUTES.service;
}

export function getBusinessTypeFromRoute(route: string): BusinessType | null {
  for (const [prefix, type] of Object.entries(ROUTE_TO_BUSINESS_TYPE)) {
    if (route === prefix || route.startsWith(prefix + "/")) {
      return type;
    }
  }
  return null;
}

export function validateDashboardAccess(req: Request, res: Response, next: NextFunction) {
  const tenant = req.context?.tenant;
  
  if (!tenant) {
    return res.status(401).json({ message: "Tenant context required" });
  }

  const requestedPath = req.path;
  const routeBusinessType = getBusinessTypeFromRoute(requestedPath);
  
  if (!routeBusinessType) {
    return next();
  }

  const tenantBusinessType = tenant.businessType as BusinessType;
  
  if (routeBusinessType !== tenantBusinessType) {
    const canonicalRoute = getCanonicalDashboardRoute(tenantBusinessType);
    return res.status(403).json({
      message: "Access denied: Invalid dashboard for your business type",
      redirectTo: canonicalRoute,
      allowedBusinessType: tenantBusinessType,
      requestedBusinessType: routeBusinessType,
    });
  }

  next();
}

export async function validateDashboardAccessAsync(
  tenantId: string,
  requestedPath: string
): Promise<{ allowed: boolean; redirectTo?: string; reason?: string }> {
  const tenant = await tenantService.getTenant(tenantId);
  
  if (!tenant) {
    return { allowed: false, reason: "Tenant not found" };
  }

  const routeBusinessType = getBusinessTypeFromRoute(requestedPath);
  
  if (!routeBusinessType) {
    return { allowed: true };
  }

  const tenantBusinessType = tenant.businessType as BusinessType;
  
  if (routeBusinessType !== tenantBusinessType) {
    return {
      allowed: false,
      redirectTo: getCanonicalDashboardRoute(tenantBusinessType),
      reason: `Business type mismatch: tenant is ${tenantBusinessType}, route is for ${routeBusinessType}`,
    };
  }

  return { allowed: true };
}

export function enforceDashboardLock(req: Request, res: Response, next: NextFunction) {
  const tenant = req.context?.tenant;
  
  if (!tenant) {
    return next();
  }

  if (req.method !== "GET" && req.body?.businessType !== undefined) {
    if (tenant.businessTypeLocked) {
      return res.status(403).json({
        message: "Business type is locked and cannot be modified",
        businessTypeLocked: true,
      });
    }
  }

  next();
}

export function validateModuleAccess(allowedBusinessType: BusinessType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.context?.tenant;
    
    if (!tenant) {
      return res.status(401).json({ message: "Tenant context required" });
    }

    const tenantBusinessType = tenant.businessType as BusinessType;
    
    if (tenantBusinessType !== allowedBusinessType) {
      const canonicalRoute = getCanonicalDashboardRoute(tenantBusinessType);
      return res.status(403).json({
        message: `Access denied: This module is only available for ${allowedBusinessType} businesses`,
        redirectTo: canonicalRoute,
        allowedBusinessType: allowedBusinessType,
        tenantBusinessType: tenantBusinessType,
      });
    }

    next();
  };
}

export function validateApiModuleAccess(req: Request, res: Response, next: NextFunction) {
  const tenant = req.context?.tenant;
  
  if (!tenant) {
    return next();
  }

  const path = req.path;
  let requiredBusinessType: BusinessType | null = null;
  
  for (const [prefix, type] of Object.entries(API_ROUTE_TO_BUSINESS_TYPE)) {
    if (path.startsWith(prefix) || req.baseUrl?.startsWith(prefix)) {
      requiredBusinessType = type;
      break;
    }
  }

  if (!requiredBusinessType) {
    return next();
  }

  const tenantBusinessType = tenant.businessType as BusinessType;
  
  if (tenantBusinessType !== requiredBusinessType) {
    const canonicalRoute = getCanonicalDashboardRoute(tenantBusinessType);
    return res.status(403).json({
      message: `Access denied: This API is only available for ${requiredBusinessType} businesses`,
      redirectTo: canonicalRoute,
      allowedBusinessType: requiredBusinessType,
      tenantBusinessType: tenantBusinessType,
    });
  }

  next();
}
