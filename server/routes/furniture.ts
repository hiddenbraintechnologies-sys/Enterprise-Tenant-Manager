import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  payments,
  invoices,
  furnitureSalesOrders,
  insertFurnitureProductSchema,
  insertRawMaterialCategorySchema,
  insertRawMaterialSchema,
  insertRawMaterialStockMovementSchema,
  insertBillOfMaterialsSchema,
  insertBomComponentSchema,
  insertProductionOrderSchema,
  insertProductionStageSchema,
  insertDeliveryOrderSchema,
  insertDeliveryOrderItemSchema,
  insertInstallationOrderSchema,
  insertFurnitureSalesOrderSchema,
  insertFurnitureSalesOrderItemSchema,
} from "@shared/schema";
import {
  furnitureGuardrails,
  logFurnitureAudit,
  enforceTenantScope,
  enforceReadOnlyForCompleted,
  validateFinancialConsistency,
} from "./furniture-guardrails";
import { seedFurnitureDemoData } from "../seed/furniture-demo-data";

const router = Router();

const getTenantId = (req: Request): string | null => {
  return req.headers["x-tenant-id"] as string || null;
};

const getUserId = (req: Request): string | undefined => {
  return req.context?.user?.id;
};

// ============================================
// DASHBOARD STATS
// ============================================

router.get("/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const stats = await storage.getFurnitureDashboardStats(tenantId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching furniture dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ============================================
// FURNITURE PRODUCTS
// ============================================

router.get("/products", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const products = await storage.getFurnitureProducts(tenantId);
    res.json(products);
  } catch (error) {
    console.error("Error fetching furniture products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const product = await storage.getFurnitureProduct(req.params.id, tenantId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching furniture product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertFurnitureProductSchema.parse({ ...req.body, tenantId });
    const product = await storage.createFurnitureProduct(data);
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating furniture product:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/products/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const product = await storage.updateFurnitureProduct(req.params.id, tenantId, req.body);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error updating furniture product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteFurnitureProduct(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting furniture product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ============================================
// RAW MATERIAL CATEGORIES
// ============================================

router.get("/raw-material-categories", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const categories = await storage.getRawMaterialCategories(tenantId);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching raw material categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/raw-material-categories", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertRawMaterialCategorySchema.parse({ ...req.body, tenantId });
    const category = await storage.createRawMaterialCategory(data);
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating raw material category:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/raw-material-categories/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const category = await storage.updateRawMaterialCategory(req.params.id, tenantId, req.body);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    console.error("Error updating raw material category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/raw-material-categories/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteRawMaterialCategory(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting raw material category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============================================
// RAW MATERIALS
// ============================================

router.get("/raw-materials", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const materials = await storage.getRawMaterials(tenantId);
    res.json(materials);
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    res.status(500).json({ error: "Failed to fetch raw materials" });
  }
});

router.get("/raw-materials/low-stock", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const materials = await storage.getLowStockRawMaterials(tenantId);
    res.json(materials);
  } catch (error) {
    console.error("Error fetching low stock materials:", error);
    res.status(500).json({ error: "Failed to fetch low stock materials" });
  }
});

router.get("/raw-materials/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const material = await storage.getRawMaterial(req.params.id, tenantId);
    if (!material) {
      return res.status(404).json({ error: "Raw material not found" });
    }
    res.json(material);
  } catch (error) {
    console.error("Error fetching raw material:", error);
    res.status(500).json({ error: "Failed to fetch raw material" });
  }
});

router.post("/raw-materials", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertRawMaterialSchema.parse({ ...req.body, tenantId });
    const material = await storage.createRawMaterial(data);
    res.status(201).json(material);
  } catch (error) {
    console.error("Error creating raw material:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create raw material" });
  }
});

router.patch("/raw-materials/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const material = await storage.updateRawMaterial(req.params.id, tenantId, req.body);
    if (!material) {
      return res.status(404).json({ error: "Raw material not found" });
    }
    res.json(material);
  } catch (error) {
    console.error("Error updating raw material:", error);
    res.status(500).json({ error: "Failed to update raw material" });
  }
});

router.delete("/raw-materials/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteRawMaterial(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting raw material:", error);
    res.status(500).json({ error: "Failed to delete raw material" });
  }
});

// ============================================
// RAW MATERIAL STOCK MOVEMENTS
// ============================================

router.get("/raw-materials/:id/movements", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const movements = await storage.getRawMaterialStockMovements(tenantId, req.params.id);
    res.json(movements);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    res.status(500).json({ error: "Failed to fetch stock movements" });
  }
});

router.post("/raw-materials/:id/movements", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertRawMaterialStockMovementSchema.parse({
      ...req.body,
      tenantId,
      rawMaterialId: req.params.id,
    });
    const movement = await storage.createRawMaterialStockMovement(data);
    
    // Update raw material stock
    const material = await storage.getRawMaterial(req.params.id, tenantId);
    if (material) {
      const currentStock = parseFloat(material.currentStock as string) || 0;
      const quantity = parseFloat(data.quantity as string) || 0;
      const newStock = data.movementType === "in" 
        ? currentStock + quantity 
        : data.movementType === "out" 
          ? currentStock - quantity 
          : quantity; // adjustment sets absolute value
      await storage.updateRawMaterial(req.params.id, tenantId, {
        currentStock: newStock.toFixed(4),
      });
    }
    
    res.status(201).json(movement);
  } catch (error) {
    console.error("Error creating stock movement:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create stock movement" });
  }
});

// ============================================
// BILL OF MATERIALS
// ============================================

router.get("/bom", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const productId = req.query.productId as string | undefined;
    const boms = await storage.getBillOfMaterials(tenantId, productId);
    res.json(boms);
  } catch (error) {
    console.error("Error fetching BOMs:", error);
    res.status(500).json({ error: "Failed to fetch BOMs" });
  }
});

router.get("/bom/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const bom = await storage.getBillOfMaterial(req.params.id, tenantId);
    if (!bom) {
      return res.status(404).json({ error: "BOM not found" });
    }
    const components = await storage.getBomComponents(bom.id, tenantId);
    res.json({ ...bom, components });
  } catch (error) {
    console.error("Error fetching BOM:", error);
    res.status(500).json({ error: "Failed to fetch BOM" });
  }
});

router.post("/bom", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertBillOfMaterialsSchema.parse({ ...req.body, tenantId });
    const bom = await storage.createBillOfMaterials(data);
    res.status(201).json(bom);
  } catch (error) {
    console.error("Error creating BOM:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create BOM" });
  }
});

router.patch("/bom/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const bom = await storage.updateBillOfMaterials(req.params.id, tenantId, req.body);
    if (!bom) {
      return res.status(404).json({ error: "BOM not found" });
    }
    res.json(bom);
  } catch (error) {
    console.error("Error updating BOM:", error);
    res.status(500).json({ error: "Failed to update BOM" });
  }
});

router.delete("/bom/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteBillOfMaterials(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting BOM:", error);
    res.status(500).json({ error: "Failed to delete BOM" });
  }
});

// BOM Components
router.post("/bom/:bomId/components", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertBomComponentSchema.parse({ ...req.body, bomId: req.params.bomId });
    const component = await storage.createBomComponent(data, tenantId);
    res.status(201).json(component);
  } catch (error) {
    console.error("Error creating BOM component:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create BOM component" });
  }
});

router.patch("/bom/:bomId/components/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const component = await storage.updateBomComponent(req.params.id, req.params.bomId, tenantId, req.body);
    if (!component) {
      return res.status(404).json({ error: "BOM component not found" });
    }
    res.json(component);
  } catch (error) {
    console.error("Error updating BOM component:", error);
    res.status(500).json({ error: "Failed to update BOM component" });
  }
});

router.delete("/bom/:bomId/components/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteBomComponent(req.params.id, req.params.bomId, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting BOM component:", error);
    res.status(500).json({ error: "Failed to delete BOM component" });
  }
});

// ============================================
// PRODUCTION ORDERS
// ============================================

router.get("/production-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const orders = await storage.getProductionOrders(tenantId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching production orders:", error);
    res.status(500).json({ error: "Failed to fetch production orders" });
  }
});

router.get("/production-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.getProductionOrder(req.params.id, tenantId);
    if (!order) {
      return res.status(404).json({ error: "Production order not found" });
    }
    const stages = await storage.getProductionStages(order.id, tenantId);
    res.json({ ...order, stages });
  } catch (error) {
    console.error("Error fetching production order:", error);
    res.status(500).json({ error: "Failed to fetch production order" });
  }
});

router.post("/production-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    // Generate order number
    const orderNumber = `PO-${Date.now()}`;
    
    const data = insertProductionOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      orderNumber,
    });
    const order = await storage.createProductionOrder(data);
    
    // Create default production stages
    const defaultStages = ["cutting", "assembly", "finishing", "quality_check", "ready_for_dispatch"];
    for (let i = 0; i < defaultStages.length; i++) {
      await storage.createProductionStage({
        productionOrderId: order.id,
        stageType: defaultStages[i] as any,
        stageOrder: i + 1,
        status: "pending",
      }, tenantId);
    }
    
    const stages = await storage.getProductionStages(order.id, tenantId);
    res.status(201).json({ ...order, stages });
  } catch (error) {
    console.error("Error creating production order:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create production order" });
  }
});

router.patch("/production-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const canModify = await furnitureGuardrails.canModifyProductionOrder(req.params.id, tenantId);
    if (!canModify.allowed) {
      await logFurnitureAudit(tenantId, userId, "update", "production_order", req.params.id, null, null, {
        blocked: true, reason: canModify.reason
      });
      return res.status(400).json({ error: canModify.reason });
    }

    const existing = await storage.getProductionOrder(req.params.id, tenantId);
    const order = await storage.updateProductionOrder(req.params.id, tenantId, req.body);
    if (!order) {
      return res.status(404).json({ error: "Production order not found" });
    }

    await logFurnitureAudit(tenantId, userId, "update", "production_order", req.params.id, existing, order);
    res.json(order);
  } catch (error) {
    console.error("Error updating production order:", error);
    res.status(500).json({ error: "Failed to update production order" });
  }
});

router.delete("/production-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteProductionOrder(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting production order:", error);
    res.status(500).json({ error: "Failed to delete production order" });
  }
});

// Production Stages
router.patch("/production-orders/:orderId/stages/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const canModify = await furnitureGuardrails.canModifyProductionOrder(req.params.orderId, tenantId);
    if (!canModify.allowed) {
      await logFurnitureAudit(tenantId, userId, "update", "production_stage", req.params.id, null, null, {
        blocked: true, reason: canModify.reason
      });
      return res.status(400).json({ error: canModify.reason });
    }

    const existingStage = await storage.getProductionStage(req.params.id, req.params.orderId, tenantId);
    if (!existingStage) {
      return res.status(404).json({ error: "Production stage not found" });
    }

    if (req.body.stageType && req.body.stageType !== existingStage.stageType) {
      await logFurnitureAudit(tenantId, userId, "update", "production_stage", req.params.id, null, null, {
        blocked: true, reason: "Cannot change stage type after creation"
      });
      return res.status(400).json({ error: "Cannot change stage type after creation" });
    }

    if (req.body.status && req.body.status !== existingStage.status) {
      const allStages = await storage.getProductionStages(req.params.orderId, tenantId);
      const targetStageType = existingStage.stageType || "";
      const desiredStatus = req.body.status;
      
      const validation = furnitureGuardrails.validateProductionStageTransition(
        targetStageType,
        desiredStatus,
        allStages.map(s => ({ stageType: s.stageType || "", status: s.status || "" }))
      );
      if (!validation.valid) {
        await logFurnitureAudit(tenantId, userId, "update", "production_stage", req.params.id, null, null, {
          blocked: true, reason: validation.error, attemptedStatus: desiredStatus, stageType: targetStageType
        });
        return res.status(400).json({ error: validation.error });
      }
    }

    const stage = await storage.updateProductionStage(req.params.id, req.params.orderId, tenantId, req.body);
    if (!stage) {
      return res.status(404).json({ error: "Production stage not found" });
    }

    await logFurnitureAudit(tenantId, userId, "update", "production_stage", req.params.id, existingStage, stage);
    res.json(stage);
  } catch (error) {
    console.error("Error updating production stage:", error);
    res.status(500).json({ error: "Failed to update production stage" });
  }
});

// ============================================
// DELIVERY ORDERS
// ============================================

router.get("/delivery-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const orders = await storage.getDeliveryOrders(tenantId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    res.status(500).json({ error: "Failed to fetch delivery orders" });
  }
});

router.get("/delivery-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.getDeliveryOrder(req.params.id, tenantId);
    if (!order) {
      return res.status(404).json({ error: "Delivery order not found" });
    }
    const items = await storage.getDeliveryOrderItems(order.id, tenantId);
    res.json({ ...order, items });
  } catch (error) {
    console.error("Error fetching delivery order:", error);
    res.status(500).json({ error: "Failed to fetch delivery order" });
  }
});

router.post("/delivery-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    const deliveryNumber = `DEL-${Date.now()}`;
    
    const data = insertDeliveryOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      deliveryNumber,
    });
    const order = await storage.createDeliveryOrder(data);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating delivery order:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create delivery order" });
  }
});

router.patch("/delivery-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const existing = await storage.getDeliveryOrder(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: "Delivery order not found" });
    }

    if (furnitureGuardrails.isReadOnly(existing.deliveryStatus || "", "delivery")) {
      await logFurnitureAudit(tenantId, userId, "update", "delivery_order", req.params.id, null, null, {
        blocked: true, reason: `Delivery is ${existing.deliveryStatus} and cannot be modified`
      });
      return res.status(400).json({ error: `Cannot modify delivery order with status: ${existing.deliveryStatus}` });
    }

    if (req.body.deliveryStatus === "delivered" && existing.deliveryStatus !== "delivered") {
      const canComplete = await furnitureGuardrails.canCompleteDelivery(req.params.id, tenantId);
      if (!canComplete.allowed) {
        await logFurnitureAudit(tenantId, userId, "update", "delivery_order", req.params.id, null, null, {
          blocked: true, reason: canComplete.reason, attemptedStatus: "delivered"
        });
        return res.status(400).json({ error: canComplete.reason });
      }
    }

    const order = await storage.updateDeliveryOrder(req.params.id, tenantId, req.body);
    await logFurnitureAudit(tenantId, userId, "update", "delivery_order", req.params.id, existing, order);
    res.json(order);
  } catch (error) {
    console.error("Error updating delivery order:", error);
    res.status(500).json({ error: "Failed to update delivery order" });
  }
});

router.delete("/delivery-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteDeliveryOrder(req.params.id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting delivery order:", error);
    res.status(500).json({ error: "Failed to delete delivery order" });
  }
});

// Delivery Order Items
router.post("/delivery-orders/:orderId/items", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertDeliveryOrderItemSchema.parse({ 
      ...req.body, 
      deliveryOrderId: req.params.orderId 
    });
    const item = await storage.createDeliveryOrderItem(data, tenantId);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating delivery order item:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create delivery order item" });
  }
});

router.patch("/delivery-orders/:orderId/items/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const item = await storage.updateDeliveryOrderItem(req.params.id, req.params.orderId, tenantId, req.body);
    if (!item) {
      return res.status(404).json({ error: "Delivery order item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error updating delivery order item:", error);
    res.status(500).json({ error: "Failed to update delivery order item" });
  }
});

// ============================================
// INSTALLATION ORDERS
// ============================================

router.get("/installation-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const orders = await storage.getInstallationOrders(tenantId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching installation orders:", error);
    res.status(500).json({ error: "Failed to fetch installation orders" });
  }
});

router.get("/installation-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.getInstallationOrder(req.params.id, tenantId);
    if (!order) {
      return res.status(404).json({ error: "Installation order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching installation order:", error);
    res.status(500).json({ error: "Failed to fetch installation order" });
  }
});

router.post("/installation-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    if (req.body.deliveryOrderId) {
      const canStart = await furnitureGuardrails.canStartInstallation(req.body.deliveryOrderId, tenantId);
      if (!canStart.allowed) {
        await logFurnitureAudit(tenantId, userId, "create", "installation_order", "new", null, null, {
          blocked: true, reason: canStart.reason, deliveryOrderId: req.body.deliveryOrderId
        });
        return res.status(400).json({ error: canStart.reason });
      }
    }
    
    const installationNumber = `INS-${Date.now()}`;
    
    const data = insertInstallationOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      installationNumber,
    });
    const order = await storage.createInstallationOrder(data);
    await logFurnitureAudit(tenantId, userId, "create", "installation_order", order.id, null, order);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating installation order:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create installation order" });
  }
});

router.patch("/installation-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const existing = await storage.getInstallationOrder(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: "Installation order not found" });
    }

    if (furnitureGuardrails.isReadOnly(existing.installationStatus || "", "installation")) {
      await logFurnitureAudit(tenantId, userId, "update", "installation_order", req.params.id, null, null, {
        blocked: true, reason: `Installation is ${existing.installationStatus} and cannot be modified`
      });
      return res.status(400).json({ error: `Cannot modify installation order with status: ${existing.installationStatus}` });
    }

    const order = await storage.updateInstallationOrder(req.params.id, tenantId, req.body);
    await logFurnitureAudit(tenantId, userId, "update", "installation_order", req.params.id, existing, order);
    res.json(order);
  } catch (error) {
    console.error("Error updating installation order:", error);
    res.status(500).json({ error: "Failed to update installation order" });
  }
});

// ============================================
// FURNITURE SALES ORDERS
// ============================================

router.get("/sales-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const orders = await storage.getFurnitureSalesOrders(tenantId);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    res.status(500).json({ error: "Failed to fetch sales orders" });
  }
});

router.get("/sales-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.getFurnitureSalesOrder(req.params.id, tenantId);
    if (!order) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    const items = await storage.getFurnitureSalesOrderItems(order.id, tenantId);
    res.json({ ...order, items });
  } catch (error) {
    console.error("Error fetching sales order:", error);
    res.status(500).json({ error: "Failed to fetch sales order" });
  }
});

router.post("/sales-orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    if (req.body.subtotal && req.body.taxAmount && req.body.totalAmount) {
      const totalsCheck = furnitureGuardrails.validateTotals(
        req.body.subtotal, req.body.taxAmount, req.body.totalAmount
      );
      if (!totalsCheck.valid) {
        await logFurnitureAudit(tenantId, userId, "create", "sales_order", "new", null, null, {
          blocked: true, reason: totalsCheck.error
        });
        return res.status(400).json({ error: totalsCheck.error });
      }
    }

    if (req.body.advanceAmount !== undefined && req.body.totalAmount) {
      const advanceCheck = furnitureGuardrails.validateAdvancePayment(
        req.body.advanceAmount, req.body.totalAmount
      );
      if (!advanceCheck.valid) {
        await logFurnitureAudit(tenantId, userId, "create", "sales_order", "new", null, null, {
          blocked: true, reason: advanceCheck.error
        });
        return res.status(400).json({ error: advanceCheck.error });
      }
    }
    
    const orderNumber = `SO-${Date.now()}`;
    
    const data = insertFurnitureSalesOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      orderNumber,
    });
    const order = await storage.createFurnitureSalesOrder(data);
    await logFurnitureAudit(tenantId, userId, "create", "sales_order", order.id, null, order);
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating sales order:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create sales order" });
  }
});

router.patch("/sales-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const existing = await storage.getFurnitureSalesOrder(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (furnitureGuardrails.isReadOnly(existing.status || "", "salesOrder")) {
      await logFurnitureAudit(tenantId, userId, "update", "sales_order", req.params.id, null, null, {
        blocked: true, reason: `Order is ${existing.status} and cannot be modified`
      });
      return res.status(400).json({ error: `Cannot modify sales order with status: ${existing.status}` });
    }

    const mergedSubtotal = req.body.subtotal ?? existing.subtotal;
    const mergedTax = req.body.taxAmount ?? existing.taxAmount;
    const mergedTotal = req.body.totalAmount ?? existing.totalAmount;

    if (mergedSubtotal || mergedTax || mergedTotal) {
      const totalsCheck = furnitureGuardrails.validateTotals(mergedSubtotal, mergedTax, mergedTotal);
      if (!totalsCheck.valid) {
        await logFurnitureAudit(tenantId, userId, "update", "sales_order", req.params.id, null, null, {
          blocked: true, reason: totalsCheck.error, subtotalVal: mergedSubtotal, taxVal: mergedTax, totalVal: mergedTotal
        });
        return res.status(400).json({ error: totalsCheck.error });
      }
    }

    const mergedAdvance = req.body.advanceAmount ?? existing.advanceAmount;
    if (mergedAdvance !== undefined && mergedAdvance !== null) {
      const advanceCheck = furnitureGuardrails.validateAdvancePayment(mergedAdvance, mergedTotal);
      if (!advanceCheck.valid) {
        await logFurnitureAudit(tenantId, userId, "update", "sales_order", req.params.id, null, null, {
          blocked: true, reason: advanceCheck.error, advance: mergedAdvance, total: mergedTotal
        });
        return res.status(400).json({ error: advanceCheck.error });
      }
    }

    const order = await storage.updateFurnitureSalesOrder(req.params.id, tenantId, req.body);
    await logFurnitureAudit(tenantId, userId, "update", "sales_order", req.params.id, existing, order);
    res.json(order);
  } catch (error) {
    console.error("Error updating sales order:", error);
    res.status(500).json({ error: "Failed to update sales order" });
  }
});

router.delete("/sales-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const canDelete = await furnitureGuardrails.canDeleteSalesOrder(req.params.id, tenantId);
    if (!canDelete.allowed) {
      await logFurnitureAudit(tenantId, userId, "delete", "sales_order", req.params.id, null, null, {
        blocked: true, reason: canDelete.reason
      });
      return res.status(400).json({ error: canDelete.reason });
    }

    const existing = await storage.getFurnitureSalesOrder(req.params.id, tenantId);
    await storage.deleteFurnitureSalesOrder(req.params.id, tenantId);
    await logFurnitureAudit(tenantId, userId, "delete", "sales_order", req.params.id, existing, null);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sales order:", error);
    res.status(500).json({ error: "Failed to delete sales order" });
  }
});

// Sales Order Items
router.post("/sales-orders/:orderId/items", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const data = insertFurnitureSalesOrderItemSchema.parse({ 
      ...req.body, 
      salesOrderId: req.params.orderId 
    });
    const item = await storage.createFurnitureSalesOrderItem(data, tenantId);
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating sales order item:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create sales order item" });
  }
});

router.patch("/sales-orders/:orderId/items/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const item = await storage.updateFurnitureSalesOrderItem(req.params.id, req.params.orderId, tenantId, req.body);
    if (!item) {
      return res.status(404).json({ error: "Sales order item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error updating sales order item:", error);
    res.status(500).json({ error: "Failed to update sales order item" });
  }
});

router.delete("/sales-orders/:orderId/items/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteFurnitureSalesOrderItem(req.params.id, req.params.orderId, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sales order item:", error);
    res.status(500).json({ error: "Failed to delete sales order item" });
  }
});

// ============================================
// FURNITURE INVOICING & PAYMENTS
// ============================================

router.post("/sales-orders/:orderId/generate-invoice", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const salesOrder = await storage.getFurnitureSalesOrder(req.params.orderId, tenantId);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (!["confirmed", "processing", "ready", "delivered"].includes(salesOrder.status || "")) {
      return res.status(400).json({ error: `Cannot generate invoice for sales order with status: ${salesOrder.status}` });
    }

    const invoiceType = req.body.invoiceType || "tax_invoice";
    const invoiceNumber = `INV-${Date.now()}`;
    
    const subtotal = parseFloat(String(salesOrder.subtotal)) || 0;
    const taxAmount = parseFloat(String(salesOrder.taxAmount)) || 0;
    const totalAmount = parseFloat(String(salesOrder.totalAmount)) || 0;

    const gstDetails = {
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      isInterState: req.body.isInterState || false,
    };
    
    if (gstDetails.isInterState) {
      gstDetails.igst = taxAmount;
      gstDetails.cgst = 0;
      gstDetails.sgst = 0;
    }

    const invoice = await storage.createInvoice({
      tenantId,
      customerId: salesOrder.customerId,
      invoiceNumber,
      status: "pending",
      currency: salesOrder.currency || "INR",
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      totalAmount: String(totalAmount),
      paidAmount: String(salesOrder.paidAmount || 0),
      dueDate: req.body.dueDate || null,
      notes: req.body.notes || null,
      metadata: { 
        salesOrderId: salesOrder.id, 
        invoiceType,
        gstDetails,
        lockedAt: new Date().toISOString(),
      },
      createdBy: userId || null,
    });

    const orderItems = await storage.getFurnitureSalesOrderItems(salesOrder.id, tenantId);
    for (const item of orderItems) {
      await storage.createInvoiceItem({
        invoiceId: invoice.id,
        description: item.description || "Furniture item",
        quantity: item.quantity || 1,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
        taxRate: String(item.taxRate || 0),
      });
    }

    await logFurnitureAudit(tenantId, userId, "create", "invoice", invoice.id, null, invoice, {
      salesOrderId: salesOrder.id, invoiceType
    });

    res.status(201).json({ 
      invoice, 
      gstDetails,
      message: "Invoice generated and locked" 
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

router.get("/sales-orders/:orderId/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const allInvoices = await storage.getInvoices(tenantId);
    const orderInvoices = allInvoices.filter(inv => {
      const meta = inv.metadata as any;
      return meta?.salesOrderId === req.params.orderId;
    });

    res.json(orderInvoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/sales-orders/:orderId/payments", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const salesOrder = await storage.getFurnitureSalesOrder(req.params.orderId, tenantId);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    if (furnitureGuardrails.isReadOnly(salesOrder.status || "", "salesOrder")) {
      await logFurnitureAudit(tenantId, userId, "create", "payment", "new", null, null, {
        blocked: true, reason: `Cannot add payment to ${salesOrder.status} order`, salesOrderId: salesOrder.id
      });
      return res.status(400).json({ error: `Cannot add payment to ${salesOrder.status} order` });
    }

    const paymentAmount = parseFloat(req.body.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be a positive number" });
    }

    const totalAmount = parseFloat(String(salesOrder.totalAmount)) || 0;
    const currentPaid = parseFloat(String(salesOrder.paidAmount)) || 0;
    const maxPayable = totalAmount - currentPaid;

    if (paymentAmount > maxPayable + 0.01) {
      await logFurnitureAudit(tenantId, userId, "create", "payment", "new", null, null, {
        blocked: true, reason: "Overpayment not allowed", paymentAmount, maxPayable, salesOrderId: salesOrder.id
      });
      return res.status(400).json({ 
        error: `Payment amount (${paymentAmount}) exceeds remaining balance (${maxPayable.toFixed(2)})` 
      });
    }

    const allInvoices = await storage.getInvoices(tenantId);
    const orderInvoice = allInvoices.find(inv => {
      const meta = inv.metadata as any;
      return meta?.salesOrderId === req.params.orderId;
    });

    const newPaidAmount = currentPaid + paymentAmount;
    const newBalance = totalAmount - newPaidAmount;
    
    let newPaymentStatus = "partial";
    if (newPaidAmount >= totalAmount - 0.01) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount === 0) {
      newPaymentStatus = "pending";
    }

    let payment: any;
    
    await db.transaction(async (tx) => {
      const [createdPayment] = await tx.insert(payments).values({
        tenantId,
        invoiceId: orderInvoice?.id || null,
        customerId: salesOrder.customerId,
        currency: salesOrder.currency || "INR",
        amount: String(paymentAmount),
        method: req.body.method || "cash",
        status: "paid",
        transactionId: req.body.transactionId || null,
        notes: req.body.notes || null,
        paidAt: new Date(),
        createdBy: userId || null,
      }).returning();
      payment = createdPayment;

      await tx.update(furnitureSalesOrders)
        .set({
          paidAmount: String(newPaidAmount),
          balanceAmount: String(newBalance),
          paymentStatus: newPaymentStatus,
          status: newPaymentStatus === "paid" && salesOrder.status === "delivered" ? "completed" : salesOrder.status,
          updatedAt: new Date(),
        })
        .where(and(eq(furnitureSalesOrders.id, salesOrder.id), eq(furnitureSalesOrders.tenantId, tenantId)));

      if (orderInvoice) {
        await tx.update(invoices)
          .set({
            paidAmount: String(newPaidAmount),
            status: newPaymentStatus === "paid" ? "paid" : "partial",
            updatedAt: new Date(),
          })
          .where(and(eq(invoices.id, orderInvoice.id), eq(invoices.tenantId, tenantId)));
      }
    });

    await logFurnitureAudit(tenantId, userId, "create", "payment", payment.id, null, payment, {
      salesOrderId: salesOrder.id, paymentAmount, newPaidAmount, newBalance, paymentStatus: newPaymentStatus
    });

    res.status(201).json({
      payment,
      salesOrderUpdate: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalance,
        paymentStatus: newPaymentStatus,
      },
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.get("/sales-orders/:orderId/payments", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const salesOrder = await storage.getFurnitureSalesOrder(req.params.orderId, tenantId);
    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    const allPayments = await storage.getPayments(tenantId);
    const allInvoices = await storage.getInvoices(tenantId);
    
    const orderInvoice = allInvoices.find(inv => {
      const meta = inv.metadata as any;
      return meta?.salesOrderId === req.params.orderId;
    });

    const orderPayments = allPayments.filter(p => 
      p.invoiceId === orderInvoice?.id || p.customerId === salesOrder.customerId
    );

    const totalAmount = parseFloat(String(salesOrder.totalAmount)) || 0;
    const paidAmount = parseFloat(String(salesOrder.paidAmount)) || 0;

    res.json({
      payments: orderPayments,
      summary: {
        totalAmount,
        paidAmount,
        balanceAmount: totalAmount - paidAmount,
        paymentStatus: paidAmount >= totalAmount - 0.01 ? "paid" : (paidAmount > 0 ? "partial" : "pending"),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.patch("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const existing = await storage.getInvoice(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const meta = existing.metadata as any;
    if (meta?.lockedAt && existing.status !== "draft") {
      const allowedFields = ["notes", "dueDate"];
      const attemptedFields = Object.keys(req.body);
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));
      
      if (disallowedFields.length > 0) {
        await logFurnitureAudit(tenantId, userId, "update", "invoice", req.params.id, null, null, {
          blocked: true, reason: "Invoice is locked after issuance", disallowedFields
        });
        return res.status(400).json({ 
          error: "Invoice is locked. Only notes and dueDate can be modified.",
          lockedAt: meta.lockedAt,
        });
      }
    }

    const invoice = await storage.updateInvoice(req.params.id, tenantId, req.body);
    await logFurnitureAudit(tenantId, userId, "update", "invoice", req.params.id, existing, invoice);
    res.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// ============================================
// DEMO SEED DATA (Development Only)
// ============================================

router.post("/seed-demo-data", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Seed endpoint disabled in production" });
    }

    const result = await seedFurnitureDemoData(tenantId);
    
    if (result.success) {
      await logFurnitureAudit(tenantId, getUserId(req), "create", "demo-data", "seed", null, null, { action: "seed_demo_data" });
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error seeding demo data:", error);
    res.status(500).json({ error: "Failed to seed demo data" });
  }
});

// ============================================
// GUARDRAIL ENDPOINTS
// ============================================

router.post("/validate-totals", async (req: Request, res: Response) => {
  try {
    const { subtotal, taxAmount, totalAmount, advanceAmount } = req.body;
    
    const totalsValidation = furnitureGuardrails.validateTotals(subtotal, taxAmount, totalAmount);
    if (!totalsValidation.valid) {
      return res.status(400).json({ valid: false, error: totalsValidation.error });
    }

    if (advanceAmount !== undefined) {
      const advanceValidation = furnitureGuardrails.validateAdvancePayment(advanceAmount, totalAmount);
      if (!advanceValidation.valid) {
        return res.status(400).json({ valid: false, error: advanceValidation.error });
      }
    }

    const outstanding = furnitureGuardrails.calculateOutstandingAmount(totalAmount, advanceAmount || 0);
    res.json({ valid: true, outstandingAmount: outstanding });
  } catch (error) {
    console.error("Error validating totals:", error);
    res.status(500).json({ error: "Validation failed" });
  }
});

router.get("/sales-orders/:id/can-delete", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await furnitureGuardrails.canDeleteSalesOrder(req.params.id, tenantId);
    res.json(result);
  } catch (error) {
    console.error("Error checking delete permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

router.get("/production-orders/:id/can-modify", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await furnitureGuardrails.canModifyProductionOrder(req.params.id, tenantId);
    res.json(result);
  } catch (error) {
    console.error("Error checking modify permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

router.get("/installation-orders/:deliveryId/can-start", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await furnitureGuardrails.canStartInstallation(req.params.deliveryId, tenantId);
    res.json(result);
  } catch (error) {
    console.error("Error checking installation permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

export default router;