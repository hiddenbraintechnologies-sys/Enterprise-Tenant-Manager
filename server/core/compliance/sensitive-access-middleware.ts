import { Request, Response, NextFunction } from "express";
import { complianceService, type DataCategory, type AccessReason } from "./compliance-service";

// Define which routes/resources contain sensitive data
const SENSITIVE_ROUTES: Record<string, {
  dataCategory: DataCategory;
  resourceType: string;
  requireReason: boolean;
}> = {
  // Healthcare/PHI routes
  "/api/patients": { dataCategory: "phi", resourceType: "patient", requireReason: true },
  "/api/emr": { dataCategory: "phi", resourceType: "emr", requireReason: true },
  "/api/medical-records": { dataCategory: "phi", resourceType: "medical_record", requireReason: true },
  "/api/prescriptions": { dataCategory: "phi", resourceType: "prescription", requireReason: true },
  "/api/diagnoses": { dataCategory: "phi", resourceType: "diagnosis", requireReason: true },
  
  // PII routes
  "/api/customers": { dataCategory: "pii", resourceType: "customer", requireReason: false },
  "/api/users": { dataCategory: "pii", resourceType: "user", requireReason: false },
  "/api/contacts": { dataCategory: "pii", resourceType: "contact", requireReason: false },
  
  // Financial routes
  "/api/payments": { dataCategory: "financial", resourceType: "payment", requireReason: false },
  "/api/invoices": { dataCategory: "financial", resourceType: "invoice", requireReason: false },
  "/api/subscriptions": { dataCategory: "financial", resourceType: "subscription", requireReason: false },
  "/api/billing": { dataCategory: "financial", resourceType: "billing", requireReason: false },
  
  // Platform admin routes that access sensitive data
  "/api/platform-admin/tenants": { dataCategory: "pii", resourceType: "tenant", requireReason: false },
  "/api/platform-admin/users": { dataCategory: "pii", resourceType: "user", requireReason: true },
};

// Routes that should always require an access reason
const REQUIRE_REASON_PATTERNS = [
  /\/api\/patients\/[^/]+$/,
  /\/api\/emr\/[^/]+$/,
  /\/api\/medical-records\/[^/]+$/,
  /\/api\/platform-admin\/users\/[^/]+$/,
];

interface SensitiveAccessOptions {
  dataCategory?: DataCategory;
  resourceType?: string;
  requireReason?: boolean;
  extractResourceId?: (req: Request) => string | undefined;
}

export function sensitiveDataAccessLogger(options?: SensitiveAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for non-mutating requests if not explicitly configured
    const shouldLog = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!shouldLog) {
      return next();
    }

    // Find matching route configuration
    const routeConfig = findRouteConfig(req.path);
    if (!routeConfig && !options) {
      return next();
    }

    const config = options || routeConfig;
    if (!config) {
      return next();
    }

    // Check if reason is required for sensitive data access
    const requiresReason = config.requireReason || 
      REQUIRE_REASON_PATTERNS.some(pattern => pattern.test(req.path));

    if (requiresReason && !req.headers["x-access-reason"]) {
      // For PHI, require explicit access reason
      if (config.dataCategory === "phi") {
        return res.status(400).json({
          message: "Access reason required for PHI access",
          code: "ACCESS_REASON_REQUIRED",
          hint: "Include X-Access-Reason header with one of: customer_request, support_ticket, compliance_audit, legal_requirement, system_maintenance, debugging, authorized_investigation",
        });
      }
    }

    // Extract accessor information from request
    const accessor = extractAccessor(req);
    if (!accessor) {
      return next();
    }

    // Extract resource ID from path or options
    const resourceId = options?.extractResourceId?.(req) || extractResourceIdFromPath(req.path);

    // Determine access type from HTTP method
    const accessType = getAccessType(req.method);

    // Get access reason from header or default
    const accessReason = parseAccessReason(req.headers["x-access-reason"] as string);

    // Log the access asynchronously (don't block the request)
    setImmediate(async () => {
      try {
        await complianceService.logSensitiveAccess({
          tenantId: accessor.tenantId,
          accessorType: accessor.type,
          accessorId: accessor.id,
          accessorEmail: accessor.email,
          accessorRole: accessor.role,
          dataCategory: config.dataCategory || "pii",
          resourceType: config.resourceType || "unknown",
          resourceId: resourceId || "unknown",
          fieldsAccessed: getFieldsAccessed(req),
          accessType,
          accessReason,
          reasonDetails: req.headers["x-access-reason-details"] as string,
          ticketId: req.headers["x-support-ticket-id"] as string,
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
          sessionId: extractSessionId(req),
        });

        // Check for unusual access patterns
        const unusualCheck = await complianceService.detectUnusualAccess(
          accessor.id,
          accessor.tenantId
        );

        if (unusualCheck.isUnusual && unusualCheck.riskScore >= 50) {
          console.warn(`[COMPLIANCE] Unusual access pattern detected for ${accessor.id}:`, unusualCheck.reasons);
          // In production, you might want to trigger alerts here
        }
      } catch (error) {
        console.error("[COMPLIANCE] Failed to log sensitive data access:", error);
      }
    });

    next();
  };
}

function findRouteConfig(path: string): SensitiveAccessOptions | null {
  // Check exact matches first
  for (const [route, config] of Object.entries(SENSITIVE_ROUTES)) {
    if (path === route || path.startsWith(route + "/")) {
      return config;
    }
  }
  return null;
}

function extractAccessor(req: Request): {
  type: "user" | "admin" | "platform_admin" | "system";
  id: string;
  email?: string;
  role?: string;
  tenantId?: string;
} | null {
  // Check for platform admin
  if ((req as unknown as { platformAdmin?: { id: string; email: string; role: string } }).platformAdmin) {
    const admin = (req as unknown as { platformAdmin: { id: string; email: string; role: string } }).platformAdmin;
    return {
      type: "platform_admin",
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }

  // Check for regular user
  if ((req as unknown as { user?: { id: string; email?: string } }).user) {
    const user = (req as unknown as { user: { id: string; email?: string } }).user;
    const tenant = (req as unknown as { tenant?: { id: string } }).tenant;
    const role = (req as unknown as { userRole?: { name: string } }).userRole;
    
    return {
      type: "user",
      id: user.id,
      email: user.email,
      role: role?.name,
      tenantId: tenant?.id,
    };
  }

  // Check for system/API token access
  if (req.headers.authorization?.startsWith("Bearer api_")) {
    return {
      type: "system",
      id: "api_token",
    };
  }

  return null;
}

function extractResourceIdFromPath(path: string): string | undefined {
  const segments = path.split("/").filter(Boolean);
  // Look for UUID or numeric ID patterns
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      return segment;
    }
    // Numeric ID
    if (/^\d+$/.test(segment)) {
      return segment;
    }
  }
  return undefined;
}

function getAccessType(method: string): "view" | "export" | "modify" | "delete" {
  switch (method.toUpperCase()) {
    case "GET":
      return "view";
    case "POST":
    case "PUT":
    case "PATCH":
      return "modify";
    case "DELETE":
      return "delete";
    default:
      return "view";
  }
}

function parseAccessReason(reason: string | undefined): AccessReason {
  const validReasons: AccessReason[] = [
    "customer_request",
    "support_ticket",
    "compliance_audit",
    "legal_requirement",
    "system_maintenance",
    "debugging",
    "authorized_investigation",
  ];

  if (reason && validReasons.includes(reason as AccessReason)) {
    return reason as AccessReason;
  }

  return "system_maintenance"; // Default reason
}

function getFieldsAccessed(req: Request): string[] {
  // For GET requests, check query params for field filtering
  if (req.method === "GET" && req.query.fields) {
    const fields = req.query.fields as string;
    return fields.split(",").map(f => f.trim());
  }
  
  // For mutations, return the fields being modified
  if (req.body && typeof req.body === "object") {
    return Object.keys(req.body);
  }

  return [];
}

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",");
    return ips[0]?.trim();
  }
  return req.socket.remoteAddress;
}

function extractSessionId(req: Request): string | undefined {
  // Try to extract session ID from various sources
  if ((req as unknown as { sessionID?: string }).sessionID) {
    return (req as unknown as { sessionID: string }).sessionID;
  }
  if (req.headers["x-session-id"]) {
    return req.headers["x-session-id"] as string;
  }
  return undefined;
}

// Data masking middleware for responses
export function dataMaskingMiddleware(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function(data: unknown) {
      // Get accessor role for masking rules
      const role = (req as unknown as { userRole?: { name: string } }).userRole?.name || 
                   (req as unknown as { platformAdmin?: { role: string } }).platformAdmin?.role ||
                   "anonymous";

      const tenantId = (req as unknown as { tenant?: { id: string } }).tenant?.id;

      // Apply masking asynchronously and respond
      (async () => {
        try {
          if (Array.isArray(data)) {
            const maskedData = await Promise.all(
              data.map(item => 
                typeof item === "object" && item !== null
                  ? complianceService.applyMasking(item as Record<string, unknown>, resourceType, role, tenantId)
                  : item
              )
            );
            return originalJson(maskedData);
          } else if (typeof data === "object" && data !== null) {
            const maskedData = await complianceService.applyMasking(
              data as Record<string, unknown>,
              resourceType,
              role,
              tenantId
            );
            return originalJson(maskedData);
          }
          return originalJson(data);
        } catch {
          return originalJson(data);
        }
      })();

      return res;
    };

    next();
  };
}
