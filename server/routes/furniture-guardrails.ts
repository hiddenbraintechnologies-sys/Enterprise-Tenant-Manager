import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { auditService, type AuditAction } from "../core/audit";
import { permissionService, PERMISSIONS } from "../core/permissions";
import { TenantIsolation, TenantIsolationError } from "../core/tenant-isolation";

const PRODUCTION_STAGE_ORDER = ["cutting", "assembly", "finishing", "quality_check", "ready_for_dispatch"];

const COMPLETED_STATUSES = {
  production: ["completed", "cancelled"],
  salesOrder: ["delivered", "cancelled", "closed"],
  delivery: ["delivered", "cancelled"],
  installation: ["completed", "cancelled"],
};

export class FurnitureGuardrails {
  validateProductionStageTransition(
    targetStageType: string,
    desiredStatus: string,
    allStages: { stageType: string; status: string }[]
  ): { valid: boolean; error?: string } {
    const targetIndex = PRODUCTION_STAGE_ORDER.indexOf(targetStageType);

    if (targetIndex === -1) {
      return { valid: true };
    }

    if (desiredStatus === "in_progress" || desiredStatus === "completed") {
      for (let i = 0; i < targetIndex; i++) {
        const prevStageType = PRODUCTION_STAGE_ORDER[i];
        const prevStage = allStages.find(s => s.stageType === prevStageType);
        if (prevStage && prevStage.status !== "completed") {
          return {
            valid: false,
            error: `Cannot ${desiredStatus === "in_progress" ? "start" : "complete"} '${targetStageType}'. Previous stage '${prevStageType}' must be completed first (current status: ${prevStage.status}).`,
          };
        }
      }
    }

    return { valid: true };
  }

  isReadOnly(status: string, entityType: keyof typeof COMPLETED_STATUSES): boolean {
    return COMPLETED_STATUSES[entityType]?.includes(status) ?? false;
  }

  validateTotals(subtotal: string | number, taxAmount: string | number, totalAmount: string | number): { valid: boolean; error?: string } {
    const sub = parseFloat(String(subtotal)) || 0;
    const tax = parseFloat(String(taxAmount)) || 0;
    const total = parseFloat(String(totalAmount)) || 0;
    const expected = sub + tax;
    const tolerance = 0.01;

    if (Math.abs(expected - total) > tolerance) {
      return {
        valid: false,
        error: `Financial mismatch: subtotal (${sub}) + tax (${tax}) = ${expected}, but totalAmount is ${total}`,
      };
    }
    return { valid: true };
  }

  validateAdvancePayment(advanceAmount: string | number, totalAmount: string | number): { valid: boolean; error?: string } {
    const advance = parseFloat(String(advanceAmount)) || 0;
    const total = parseFloat(String(totalAmount)) || 0;

    if (advance < 0) {
      return { valid: false, error: "Advance amount cannot be negative" };
    }
    if (advance > total) {
      return { valid: false, error: `Advance amount (${advance}) cannot exceed total (${total})` };
    }
    return { valid: true };
  }

  calculateOutstandingAmount(totalAmount: string | number, advanceAmount: string | number): number {
    const total = parseFloat(String(totalAmount)) || 0;
    const advance = parseFloat(String(advanceAmount)) || 0;
    return Math.max(0, total - advance);
  }

  async canDeleteSalesOrder(orderId: string, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const deliveries = await storage.getDeliveryOrders(tenantId);
    const linkedDelivery = deliveries.find(d => d.salesOrderId === orderId);
    
    if (linkedDelivery) {
      return { allowed: false, reason: "Cannot delete sales order with linked delivery orders" };
    }

    const order = await storage.getFurnitureSalesOrder(orderId, tenantId);
    if (order) {
      const status = order.status || "";
      if (["delivered", "closed", "paid"].includes(status)) {
        return { allowed: false, reason: `Cannot delete sales order with status: ${status}` };
      }
    }

    return { allowed: true };
  }

  async canModifyProductionOrder(orderId: string, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const order = await storage.getProductionOrder(orderId, tenantId);
    if (!order) {
      return { allowed: false, reason: "Production order not found" };
    }

    if (this.isReadOnly(order.status || "", "production")) {
      return { allowed: false, reason: `Production order is ${order.status} and cannot be modified` };
    }

    return { allowed: true };
  }

  async canStartInstallation(deliveryOrderId: string, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const delivery = await storage.getDeliveryOrder(deliveryOrderId, tenantId);
    if (!delivery) {
      return { allowed: false, reason: "Linked delivery order not found" };
    }

    if (delivery.deliveryStatus !== "delivered") {
      return { allowed: false, reason: `Delivery must be completed before installation can start. Current status: ${delivery.deliveryStatus}` };
    }

    return { allowed: true };
  }

  async canCompleteDelivery(deliveryId: string, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const delivery = await storage.getDeliveryOrder(deliveryId, tenantId);
    if (!delivery) {
      return { allowed: false, reason: "Delivery order not found" };
    }

    if (!delivery.scheduledDate) {
      return { allowed: false, reason: "Delivery cannot be completed without a scheduled date" };
    }

    return { allowed: true };
  }
}

export const furnitureGuardrails = new FurnitureGuardrails();

export function requireFurniturePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.context?.user?.id;
      const tenantId = req.headers["x-tenant-id"] as string || req.context?.tenant?.id;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const hasPermission = await permissionService.hasPermission(userId, tenantId, permission);
      if (!hasPermission) {
        await auditService.logAsync({
          tenantId,
          userId,
          action: "access",
          resource: "furniture",
          metadata: { 
            denied: true,
            requiredPermission: permission,
            path: req.path,
            method: req.method,
          },
          ipAddress: req.ip || req.socket?.remoteAddress,
          userAgent: req.get("user-agent"),
        });

        return res.status(403).json({ 
          error: "Access denied",
          requiredPermission: permission,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check failed:", error);
      next(error);
    }
  };
}

export function requireAnyFurniturePermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.context?.user?.id;
      const tenantId = req.headers["x-tenant-id"] as string || req.context?.tenant?.id;

      if (!userId || !tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const hasAny = await permissionService.hasAnyPermission(userId, tenantId, permissions);
      if (!hasAny) {
        return res.status(403).json({ 
          error: "Access denied",
          requiredPermissions: permissions,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check failed:", error);
      next(error);
    }
  };
}

export async function logFurnitureAudit(
  tenantId: string,
  userId: string | undefined,
  action: AuditAction,
  resource: string,
  resourceId: string,
  oldValue?: Record<string, any> | null,
  newValue?: Record<string, any> | null,
  metadata?: Record<string, any>
): Promise<void> {
  await auditService.logAsync({
    tenantId,
    userId,
    action,
    resource: `furniture.${resource}`,
    resourceId,
    oldValue,
    newValue,
    metadata,
  });
}

export function enforceTenantScope() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers["x-tenant-id"] as string;
    
    if (!tenantId) {
      return res.status(400).json({ 
        error: "Tenant ID required",
        code: "TENANT_REQUIRED",
      });
    }

    (req as any).tenantIsolation = new TenantIsolation(tenantId);
    (req as any).tenantId = tenantId;
    
    next();
  };
}

export function enforceReadOnlyForCompleted(entityType: keyof typeof COMPLETED_STATUSES) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "PATCH" && req.method !== "PUT" && req.method !== "DELETE") {
      return next();
    }

    const tenantId = req.headers["x-tenant-id"] as string;
    const entityId = req.params.id || req.params.orderId;

    if (!tenantId || !entityId) {
      return next();
    }

    try {
      let status: string | null = null;

      switch (entityType) {
        case "production":
          const prod = await storage.getProductionOrder(entityId, tenantId);
          status = prod?.status || null;
          break;
        case "salesOrder":
          const sales = await storage.getFurnitureSalesOrder(entityId, tenantId);
          status = sales?.status || null;
          break;
        case "delivery":
          const del = await storage.getDeliveryOrder(entityId, tenantId);
          status = del?.deliveryStatus || null;
          break;
        case "installation":
          const inst = await storage.getInstallationOrder(entityId, tenantId);
          status = inst?.installationStatus || null;
          break;
      }

      if (status && furnitureGuardrails.isReadOnly(status, entityType)) {
        return res.status(400).json({
          error: `Cannot modify ${entityType} with status: ${status}`,
          code: "ENTITY_READ_ONLY",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateFinancialConsistency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "POST" && req.method !== "PATCH" && req.method !== "PUT") {
      return next();
    }

    const { subtotal, taxAmount, totalAmount, advanceAmount } = req.body;

    if (subtotal !== undefined && taxAmount !== undefined && totalAmount !== undefined) {
      const validation = furnitureGuardrails.validateTotals(subtotal, taxAmount, totalAmount);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          code: "FINANCIAL_MISMATCH",
        });
      }
    }

    if (advanceAmount !== undefined && totalAmount !== undefined) {
      const validation = furnitureGuardrails.validateAdvancePayment(advanceAmount, totalAmount);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          code: "INVALID_ADVANCE",
        });
      }
    }

    next();
  };
}

export const FURNITURE_RBAC = {
  products: {
    read: PERMISSIONS.FURNITURE_PRODUCTS_READ,
    create: PERMISSIONS.FURNITURE_PRODUCTS_CREATE,
    update: PERMISSIONS.FURNITURE_PRODUCTS_UPDATE,
    delete: PERMISSIONS.FURNITURE_PRODUCTS_DELETE,
  },
  rawMaterials: {
    read: PERMISSIONS.RAW_MATERIALS_READ,
    create: PERMISSIONS.RAW_MATERIALS_CREATE,
    update: PERMISSIONS.RAW_MATERIALS_UPDATE,
    delete: PERMISSIONS.RAW_MATERIALS_DELETE,
    stockManage: PERMISSIONS.RAW_MATERIALS_STOCK_MANAGE,
  },
  bom: {
    read: PERMISSIONS.BOM_READ,
    create: PERMISSIONS.BOM_CREATE,
    update: PERMISSIONS.BOM_UPDATE,
    delete: PERMISSIONS.BOM_DELETE,
  },
  productionOrders: {
    read: PERMISSIONS.PRODUCTION_ORDERS_READ,
    create: PERMISSIONS.PRODUCTION_ORDERS_CREATE,
    update: PERMISSIONS.PRODUCTION_ORDERS_UPDATE,
    delete: PERMISSIONS.PRODUCTION_ORDERS_DELETE,
    stagesUpdate: PERMISSIONS.PRODUCTION_STAGES_UPDATE,
  },
  deliveryOrders: {
    read: PERMISSIONS.DELIVERY_ORDERS_READ,
    create: PERMISSIONS.DELIVERY_ORDERS_CREATE,
    update: PERMISSIONS.DELIVERY_ORDERS_UPDATE,
    delete: PERMISSIONS.DELIVERY_ORDERS_DELETE,
  },
  installationOrders: {
    read: PERMISSIONS.INSTALLATION_ORDERS_READ,
    create: PERMISSIONS.INSTALLATION_ORDERS_CREATE,
    update: PERMISSIONS.INSTALLATION_ORDERS_UPDATE,
  },
  salesOrders: {
    read: PERMISSIONS.FURNITURE_SALES_READ,
    create: PERMISSIONS.FURNITURE_SALES_CREATE,
    update: PERMISSIONS.FURNITURE_SALES_UPDATE,
    delete: PERMISSIONS.FURNITURE_SALES_DELETE,
  },
  reports: {
    read: PERMISSIONS.MANUFACTURING_REPORTS_READ,
  },
};

export function restrictPriceEditing() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "PATCH" && req.method !== "PUT") {
      return next();
    }

    const userId = req.context?.user?.id;
    const tenantId = req.headers["x-tenant-id"] as string || req.context?.tenant?.id;

    if (!userId || !tenantId) {
      return next();
    }

    const sensitiveFields = ["sellingPrice", "costPrice", "wholesalePrice", "taxRate", "gstRate"];
    const hasSensitiveFields = sensitiveFields.some(field => req.body[field] !== undefined);

    if (hasSensitiveFields) {
      const canEditPrices = await permissionService.hasAnyPermission(userId, tenantId, [
        PERMISSIONS.FURNITURE_PRODUCTS_UPDATE,
        PERMISSIONS.BOM_UPDATE,
      ]);

      if (!canEditPrices) {
        return res.status(403).json({
          error: "You do not have permission to edit pricing fields",
          code: "PRICE_EDIT_DENIED",
        });
      }
    }

    next();
  };
}
