import { Router, Request, Response } from "express";
import { authenticateHybrid } from "../core/auth-middleware";
import { resolveTenantId, logTenantResolution } from "../lib/resolveTenantId";
import { AuditService } from "../core/audit";
import { ObjectStorageService } from "../replit_integrations/object_storage";
import { db } from "../db";
import { tenantBranding } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();
const requiredAuth = authenticateHybrid();
const auditService = new AuditService();
const objectStorageService = new ObjectStorageService();

const ALLOWED_LOGO_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
const ALLOWED_FAVICON_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/ico"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MIN_LOGO_WIDTH = 200;
const MIN_LOGO_HEIGHT = 50;
const FAVICON_SIZE = 32;

interface UploadRequest {
  type: "logo" | "favicon";
  filename: string;
  contentType: string;
  size: number;
}

function validateUploadRequest(body: unknown): { valid: boolean; error?: string; data?: UploadRequest } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { type, filename, contentType, size } = body as Record<string, unknown>;

  if (!type || (type !== "logo" && type !== "favicon")) {
    return { valid: false, error: "Invalid type. Must be 'logo' or 'favicon'" };
  }

  if (!filename || typeof filename !== "string") {
    return { valid: false, error: "Missing filename" };
  }

  if (!contentType || typeof contentType !== "string") {
    return { valid: false, error: "Missing contentType" };
  }

  if (!size || typeof size !== "number" || size <= 0) {
    return { valid: false, error: "Invalid file size" };
  }

  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  const allowedTypes = type === "logo" ? ALLOWED_LOGO_TYPES : ALLOWED_FAVICON_TYPES;
  if (!allowedTypes.includes(contentType)) {
    return { 
      valid: false, 
      error: `Invalid file type for ${type}. Allowed types: ${allowedTypes.join(", ")}` 
    };
  }

  return {
    valid: true,
    data: { type, filename, contentType, size } as UploadRequest,
  };
}

function getFileExtension(contentType: string): string {
  const typeMap: Record<string, string> = {
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "image/ico": "ico",
  };
  return typeMap[contentType] || "png";
}

router.post("/api/branding/upload", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /api/branding/upload");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    const user = (req as any).user;
    const userId = user?.id || null;

    const validation = validateUploadRequest(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({ error: validation.error, code: "VALIDATION_ERROR" });
    }

    const { type, filename, contentType, size } = validation.data;
    const ext = getFileExtension(contentType);
    const objectId = randomUUID();
    
    const privateDir = objectStorageService.getPrivateObjectDir();
    const objectPath = `${privateDir}/tenants/${tenantId}/branding/${type}_${objectId}.${ext}`;
    
    const { bucketName, objectName } = parseObjectPath(objectPath);
    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    const publicUrl = `/objects/tenants/${tenantId}/branding/${type}_${objectId}.${ext}`;

    await auditService.log({
      tenantId,
      userId,
      action: "create",
      resource: "branding_upload",
      resourceId: objectId,
      oldValue: null,
      newValue: { type, filename, contentType, size },
      metadata: { 
        uploadType: type,
        originalFilename: filename,
        source: "branding_upload"
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    res.json({
      uploadURL,
      objectPath: publicUrl,
      type,
      filename,
    });
  } catch (error) {
    console.error("[branding-upload] Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.post("/api/branding/confirm-upload", requiredAuth, async (req: Request, res: Response) => {
  try {
    const resolution = await resolveTenantId(req);
    logTenantResolution(req, resolution, "POST /api/branding/confirm-upload");

    if (resolution.error || !resolution.tenantId) {
      return res.status(resolution.error?.status || 401).json({
        code: resolution.error?.code || "TENANT_REQUIRED",
        message: resolution.error?.message || "Tenant context required",
      });
    }

    const tenantId = resolution.tenantId;
    const user = (req as any).user;
    const userId = user?.id || null;

    const { type, objectPath } = req.body;

    if (!type || (type !== "logo" && type !== "favicon")) {
      return res.status(400).json({ error: "Invalid type", code: "VALIDATION_ERROR" });
    }

    if (!objectPath || typeof objectPath !== "string") {
      return res.status(400).json({ error: "Missing objectPath", code: "VALIDATION_ERROR" });
    }

    if (!objectPath.includes(`/tenants/${tenantId}/`)) {
      return res.status(403).json({ error: "Access denied", code: "FORBIDDEN" });
    }

    const urlField = type === "logo" ? "logoUrl" : "faviconUrl";
    
    const existing = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    const oldValue = existing.length > 0 ? existing[0] : null;

    if (existing.length === 0) {
      await db
        .insert(tenantBranding)
        .values({
          tenantId,
          [urlField]: objectPath,
        });
    } else {
      await db
        .update(tenantBranding)
        .set({
          [urlField]: objectPath,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, tenantId));
    }

    await auditService.log({
      tenantId,
      userId,
      action: "update",
      resource: "tenant_branding",
      resourceId: tenantId,
      oldValue: oldValue ? { [urlField]: (oldValue as any)[urlField] } : null,
      newValue: { [urlField]: objectPath },
      metadata: { 
        uploadType: type,
        source: "branding_upload_confirm"
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    res.json({ success: true, [urlField]: objectPath });
  } catch (error) {
    console.error("[branding-upload] Error confirming upload:", error);
    res.status(500).json({ error: "Failed to confirm upload" });
  }
});

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to sign object URL: ${response.status}`);
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

export default router;
