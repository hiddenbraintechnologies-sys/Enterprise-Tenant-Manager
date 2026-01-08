import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { z } from "zod";
import { eq, and, desc, asc, sql, count, ilike, gte, lte, or } from "drizzle-orm";
import {
  payments,
  invoices,
  furnitureSalesOrders,
  furnitureSalesOrderItems,
  furnitureProducts,
  rawMaterials,
  rawMaterialCategories,
  billOfMaterials,
  productionOrders,
  deliveryOrders,
  installationOrders,
  furnitureInvoices,
  furnitureInvoiceItems,
  furnitureInvoicePayments,
  customers,
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
  insertFurnitureInvoiceSchema,
  insertFurnitureInvoiceItemSchema,
} from "@shared/schema";
import {
  getPaginationParams,
  paginatedResponse,
  getFilterParams,
  type PaginatedResult,
  type PaginationParams,
} from "../lib/pagination";
import {
  furnitureGuardrails,
  logFurnitureAudit,
  enforceTenantScope,
  enforceReadOnlyForCompleted,
  validateFinancialConsistency,
} from "./furniture-guardrails";
import { seedFurnitureDemoData } from "../seed/furniture-demo-data";
import { currencyService } from "../services/currency";
import { taxCalculatorService } from "../services/tax-calculator";
import { invoicePDFService } from "../services/invoice-pdf";
import { analyticsService } from "../services/analytics";
import { aiInsightsService } from "../services/ai-insights";
import { startOfDay, endOfDay, subDays, subMonths, parseISO } from "date-fns";

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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(furnitureProducts.tenantId, tenantId),
      sql`${furnitureProducts.deletedAt} IS NULL`
    ];
    
    if (filters.productType) {
      conditions.push(eq(furnitureProducts.productType, filters.productType as any));
    }
    if (filters.materialType) {
      conditions.push(eq(furnitureProducts.materialType, filters.materialType as any));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(furnitureProducts.isActive, filters.isActive));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(furnitureProducts.name, `%${filters.search}%`),
          ilike(furnitureProducts.sku, `%${filters.search}%`)
        )!
      );
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: furnitureProducts.createdAt,
      name: furnitureProducts.name,
      sku: furnitureProducts.sku,
      productType: furnitureProducts.productType,
    };
    const orderColumn = columnMap[sortBy] || furnitureProducts.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(furnitureProducts)
      .where(whereClause);
    
    const data = await db.select()
      .from(furnitureProducts)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(rawMaterials.tenantId, tenantId),
      sql`${rawMaterials.deletedAt} IS NULL`
    ];
    
    if (filters.search) {
      conditions.push(ilike(rawMaterials.name, `%${filters.search}%`));
    }
    if (req.query.categoryId) {
      conditions.push(eq(rawMaterials.categoryId, req.query.categoryId as string));
    }
    if (req.query.lowStock === "true") {
      conditions.push(sql`CAST(${rawMaterials.currentStock} AS NUMERIC) <= CAST(${rawMaterials.minStockLevel} AS NUMERIC)`);
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: rawMaterials.createdAt,
      name: rawMaterials.name,
      sku: rawMaterials.sku,
      currentStock: rawMaterials.currentStock,
    };
    const orderColumn = columnMap[sortBy] || rawMaterials.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(rawMaterials)
      .where(whereClause);
    
    const data = await db.select()
      .from(rawMaterials)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(billOfMaterials.tenantId, tenantId),
      sql`${billOfMaterials.deletedAt} IS NULL`
    ];
    
    if (req.query.productId) {
      conditions.push(eq(billOfMaterials.productId, req.query.productId as string));
    }
    if (req.query.search) {
      conditions.push(ilike(billOfMaterials.name, `%${req.query.search}%`));
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: billOfMaterials.createdAt,
      version: billOfMaterials.version,
    };
    const orderColumn = columnMap[sortBy] || billOfMaterials.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(billOfMaterials)
      .where(whereClause);
    
    const data = await db.select()
      .from(billOfMaterials)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(productionOrders.tenantId, tenantId),
      sql`${productionOrders.deletedAt} IS NULL`
    ];
    
    if (filters.status) {
      conditions.push(eq(productionOrders.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(productionOrders.priority, filters.priority as any));
    }
    if (filters.search) {
      conditions.push(ilike(productionOrders.orderNumber, `%${filters.search}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(productionOrders.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(productionOrders.createdAt, filters.endDate));
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: productionOrders.createdAt,
      orderNumber: productionOrders.orderNumber,
      status: productionOrders.status,
      scheduledStartDate: productionOrders.scheduledStartDate,
    };
    const orderColumn = columnMap[sortBy] || productionOrders.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(productionOrders)
      .where(whereClause);
    
    const data = await db.select()
      .from(productionOrders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(deliveryOrders.tenantId, tenantId),
      sql`${deliveryOrders.deletedAt} IS NULL`
    ];
    
    if (filters.status) {
      conditions.push(eq(deliveryOrders.deliveryStatus, filters.status as any));
    }
    if (filters.search) {
      conditions.push(ilike(deliveryOrders.deliveryNumber, `%${filters.search}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(deliveryOrders.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(deliveryOrders.createdAt, filters.endDate));
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: deliveryOrders.createdAt,
      deliveryNumber: deliveryOrders.deliveryNumber,
      deliveryStatus: deliveryOrders.deliveryStatus,
      scheduledDate: deliveryOrders.scheduledDate,
    };
    const orderColumn = columnMap[sortBy] || deliveryOrders.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(deliveryOrders)
      .where(whereClause);
    
    const data = await db.select()
      .from(deliveryOrders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(installationOrders.tenantId, tenantId),
      sql`${installationOrders.deletedAt} IS NULL`
    ];
    
    if (filters.status) {
      conditions.push(eq(installationOrders.installationStatus, filters.status as any));
    }
    if (filters.search) {
      conditions.push(ilike(installationOrders.installationNumber, `%${filters.search}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(installationOrders.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(installationOrders.createdAt, filters.endDate));
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: installationOrders.createdAt,
      installationNumber: installationOrders.installationNumber,
      installationStatus: installationOrders.installationStatus,
      scheduledDate: installationOrders.scheduledDate,
    };
    const orderColumn = columnMap[sortBy] || installationOrders.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(installationOrders)
      .where(whereClause);
    
    const data = await db.select()
      .from(installationOrders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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
    
    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    const conditions = [
      eq(furnitureSalesOrders.tenantId, tenantId),
      sql`${furnitureSalesOrders.deletedAt} IS NULL`
    ];
    
    if (filters.status) {
      conditions.push(eq(furnitureSalesOrders.status, filters.status as any));
    }
    if (filters.search) {
      conditions.push(ilike(furnitureSalesOrders.orderNumber, `%${filters.search}%`));
    }
    if (filters.orderType) {
      conditions.push(eq(furnitureSalesOrders.orderType, filters.orderType as any));
    }
    if (filters.startDate) {
      conditions.push(gte(furnitureSalesOrders.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(furnitureSalesOrders.createdAt, filters.endDate));
    }
    if (req.query.orderType) {
      conditions.push(eq(furnitureSalesOrders.orderType, req.query.orderType as any));
    }
    
    const whereClause = and(...conditions);
    
    const columnMap: Record<string, any> = {
      createdAt: furnitureSalesOrders.createdAt,
      orderNumber: furnitureSalesOrders.orderNumber,
      status: furnitureSalesOrders.status,
      totalAmount: furnitureSalesOrders.totalAmount,
    };
    const orderColumn = columnMap[sortBy] || furnitureSalesOrders.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    const [countResult] = await db.select({ count: count() })
      .from(furnitureSalesOrders)
      .where(whereClause);
    
    const data = await db.select()
      .from(furnitureSalesOrders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(pagination.offset);
    
    res.json(paginatedResponse(data, Number(countResult?.count || 0), pagination));
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

// ============================================
// FURNITURE INVOICES
// ============================================

// List invoices with pagination and filtering
router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const pagination = getPaginationParams(req);
    const filters = getFilterParams(req);
    const sortBy = (req.query.sortBy as string) || 'invoiceDate';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const conditions = [
      eq(furnitureInvoices.tenantId, tenantId),
      sql`${furnitureInvoices.deletedAt} IS NULL`
    ];

    if (filters.status) {
      conditions.push(eq(furnitureInvoices.status, filters.status as any));
    }
    if (filters.currency) {
      conditions.push(eq(furnitureInvoices.currency, filters.currency as string));
    }
    if (filters.customerId) {
      conditions.push(eq(furnitureInvoices.customerId, filters.customerId as string));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(furnitureInvoices.invoiceNumber, `%${filters.search}%`),
          ilike(furnitureInvoices.billingName, `%${filters.search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    const columnMap: Record<string, any> = {
      invoiceDate: furnitureInvoices.invoiceDate,
      invoiceNumber: furnitureInvoices.invoiceNumber,
      totalAmount: furnitureInvoices.totalAmount,
      status: furnitureInvoices.status,
      createdAt: furnitureInvoices.createdAt,
    };
    const orderColumn = columnMap[sortBy] || furnitureInvoices.invoiceDate;
    const orderBy = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const [countResult] = await db.select({ count: count() })
      .from(furnitureInvoices)
      .where(whereClause);

    const invoicesList = await db.select()
      .from(furnitureInvoices)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    res.json(paginatedResponse(invoicesList, countResult.count, pagination));
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Get single invoice with items
router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const items = await db.select()
      .from(furnitureInvoiceItems)
      .where(eq(furnitureInvoiceItems.invoiceId, invoice.id))
      .orderBy(furnitureInvoiceItems.sortOrder);

    const paymentsList = await db.select()
      .from(furnitureInvoicePayments)
      .where(eq(furnitureInvoicePayments.invoiceId, invoice.id))
      .orderBy(desc(furnitureInvoicePayments.paymentDate));

    res.json({ ...invoice, items, payments: paymentsList });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// Create invoice from sales order
router.post("/invoices/from-sales-order/:salesOrderId", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const { salesOrderId } = req.params;
    const { currency, invoiceType, notes, termsAndConditions, taxMetadata } = req.body;

    // Fetch sales order
    const [salesOrder] = await db.select()
      .from(furnitureSalesOrders)
      .where(and(
        eq(furnitureSalesOrders.id, salesOrderId),
        eq(furnitureSalesOrders.tenantId, tenantId)
      ));

    if (!salesOrder) {
      return res.status(404).json({ error: "Sales order not found" });
    }

    // Fetch sales order items
    const orderItems = await db.select()
      .from(furnitureSalesOrderItems)
      .where(eq(furnitureSalesOrderItems.salesOrderId, salesOrderId));

    // Fetch customer
    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.id, salesOrder.customerId));

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Get exchange rate if currency differs from base
    const invoiceCurrency = currency || salesOrder.currency || "INR";
    const baseCurrency = "USD";
    let exchangeRate = "1.00000000";
    let exchangeRateId = null;

    if (invoiceCurrency !== baseCurrency) {
      const rate = await currencyService.getExchangeRate(invoiceCurrency, baseCurrency);
      if (rate) {
        exchangeRate = rate.rate.toFixed(8);
        exchangeRateId = rate.id !== "same-currency" ? rate.id : null;
      }
    }

    // Calculate totals
    const subtotal = parseFloat(salesOrder.subtotal);
    const discountAmount = parseFloat(salesOrder.discountAmount || "0");
    const deliveryCharges = parseFloat(salesOrder.deliveryCharges || "0");
    const installationCharges = parseFloat(salesOrder.installationCharges || "0");

    // Calculate tax
    let taxResult = { totalTaxAmount: 0, breakdown: [], metadata: {} };
    const complianceCountry = taxMetadata?.country || "IN";
    
    if (taxMetadata) {
      taxResult = await taxCalculatorService.calculateTax(
        tenantId,
        complianceCountry,
        subtotal - discountAmount + deliveryCharges + installationCharges,
        taxMetadata
      );
    }

    const taxAmount = taxResult.totalTaxAmount;
    const totalAmount = subtotal - discountAmount + deliveryCharges + installationCharges + taxAmount;

    // Calculate base currency amounts
    const exchangeRateNum = parseFloat(exchangeRate);
    const baseSubtotal = (subtotal * exchangeRateNum).toFixed(2);
    const baseTaxAmount = (taxAmount * exchangeRateNum).toFixed(2);
    const baseTotalAmount = (totalAmount * exchangeRateNum).toFixed(2);

    // Create invoice
    const [newInvoice] = await db.insert(furnitureInvoices).values({
      tenantId,
      invoiceNumber,
      invoiceType: invoiceType || "tax_invoice",
      status: "draft",
      salesOrderId,
      customerId: salesOrder.customerId,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: invoiceCurrency,
      baseCurrency,
      exchangeRate,
      exchangeRateId,
      exchangeRateDate: new Date(),
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      deliveryCharges: deliveryCharges.toFixed(2),
      installationCharges: installationCharges.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      baseSubtotal,
      baseTaxAmount,
      baseTotalAmount,
      paidAmount: "0",
      balanceAmount: totalAmount.toFixed(2),
      paymentStatus: "pending",
      billingName: customer?.name,
      billingAddress: customer?.address,
      billingCity: customer?.city,
      billingState: customer?.state,
      billingPostalCode: customer?.postalCode,
      billingCountry: customer?.country,
      billingEmail: customer?.email,
      billingPhone: customer?.phone,
      customerTaxId: customer?.taxId,
      customerTaxIdType: customer?.taxIdType,
      notes,
      termsAndConditions,
      complianceCountry,
      taxMetadata: {
        ...taxResult.metadata,
        breakdown: taxResult.breakdown,
      },
      createdBy: userId,
    }).returning();

    // Create invoice items
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;
      const itemDiscount = parseFloat(item.discountAmount || "0");
      const itemTaxable = itemSubtotal - itemDiscount;
      
      // Calculate item tax
      let itemTaxResult = { totalTaxAmount: 0, breakdown: [] };
      if (taxMetadata) {
        itemTaxResult = await taxCalculatorService.calculateTax(
          tenantId,
          complianceCountry,
          itemTaxable,
          taxMetadata
        );
      }

      const itemTotal = itemTaxable + itemTaxResult.totalTaxAmount;

      await db.insert(furnitureInvoiceItems).values({
        invoiceId: newInvoice.id,
        salesOrderItemId: item.id,
        productId: item.productId,
        description: item.productName || "Product",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || "0",
        taxRate: taxMetadata?.taxRate?.toString() || "0",
        taxAmount: itemTaxResult.totalTaxAmount.toFixed(2),
        totalPrice: itemTotal.toFixed(2),
        hsnCode: item.hsnCode,
        taxBreakdown: { breakdown: itemTaxResult.breakdown },
        sortOrder: i,
      });
    }

    // Log audit
    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "invoice",
      entityId: newInvoice.id,
      details: { invoiceNumber, salesOrderId, totalAmount },
    });

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Create standalone invoice
router.post("/invoices", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const validatedData = insertFurnitureInvoiceSchema.parse({
      ...req.body,
      tenantId,
    });

    // Generate invoice number
    const invoiceNumber = validatedData.invoiceNumber || `INV-${Date.now()}`;

    const [newInvoice] = await db.insert(furnitureInvoices).values({
      ...validatedData,
      invoiceNumber,
      balanceAmount: validatedData.totalAmount,
      createdBy: userId,
    }).returning();

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "invoice",
      entityId: newInvoice.id,
      details: { invoiceNumber },
    });

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Update invoice schema - only allow safe fields
const updateInvoiceSchema = z.object({
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  billingName: z.string().max(255).optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().max(100).optional(),
  billingState: z.string().max(100).optional(),
  billingPostalCode: z.string().max(20).optional(),
  billingCountry: z.string().max(100).optional(),
  billingEmail: z.string().email().optional(),
  billingPhone: z.string().max(50).optional(),
});

// Update invoice (only if not locked)
router.patch("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // Validate request body
    const validationResult = updateInvoiceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.error.errors 
      });
    }

    const [existing] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (existing.isLocked) {
      return res.status(400).json({ error: "Invoice is locked and cannot be modified" });
    }

    const [updated] = await db.update(furnitureInvoices)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(furnitureInvoices.id, req.params.id))
      .returning();

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "invoice",
      entityId: updated.id,
      details: validationResult.data,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

// Issue/finalize invoice
router.post("/invoices/:id/issue", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [existing] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (existing.status !== "draft") {
      return res.status(400).json({ error: "Only draft invoices can be issued" });
    }

    // Generate PDF (validation that it can be generated)
    await invoicePDFService.generateInvoicePDF(existing.id);
    const pdfStorageKey = `invoices/${tenantId}/${existing.invoiceNumber}.pdf`;

    const [updated] = await db.update(furnitureInvoices)
      .set({
        status: "issued",
        isLocked: true,
        lockedAt: new Date(),
        pdfStorageKey,
        pdfGeneratedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(furnitureInvoices.id, req.params.id))
      .returning();

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "invoice",
      entityId: updated.id,
      details: { action: "issued", pdfGenerated: true },
    });

    res.json({ ...updated, pdfAvailable: true });
  } catch (error) {
    console.error("Error issuing invoice:", error);
    res.status(500).json({ error: "Failed to issue invoice" });
  }
});

// Payment schema
const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  paymentMethod: z.string().max(50).optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().optional(),
});

// Record payment
router.post("/invoices/:id/payments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // Validate request body
    const validationResult = recordPaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.error.errors 
      });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const { amount, currency, paymentMethod, paymentReference, notes } = validationResult.data;

    // Calculate invoice amount if payment currency differs
    let invoiceAmount = amount;
    let exchangeRate = "1.00000000";

    if (currency !== invoice.currency) {
      const rate = await currencyService.getExchangeRate(currency, invoice.currency);
      if (rate) {
        invoiceAmount = amount * rate.rate;
        exchangeRate = rate.rate.toFixed(8);
      }
    }

    const paymentNumber = `PAY-${Date.now()}`;

    const [payment] = await db.insert(furnitureInvoicePayments).values({
      invoiceId: invoice.id,
      paymentNumber,
      paymentDate: new Date(),
      amount: amount.toString(),
      currency: currency || invoice.currency,
      invoiceAmount: invoiceAmount.toString(),
      exchangeRate,
      paymentMethod,
      paymentReference,
      status: "completed",
      notes,
      createdBy: userId,
    }).returning();

    // Update invoice paid amount
    const newPaidAmount = parseFloat(invoice.paidAmount || "0") + parseFloat(invoiceAmount.toString());
    const totalAmount = parseFloat(invoice.totalAmount);
    const newBalance = totalAmount - newPaidAmount;

    let newStatus = invoice.status;
    if (newBalance <= 0) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partially_paid";
    }

    await db.update(furnitureInvoices)
      .set({
        paidAmount: newPaidAmount.toFixed(2),
        balanceAmount: Math.max(0, newBalance).toFixed(2),
        paymentStatus: newBalance <= 0 ? "paid" : "partial",
        status: newStatus,
        lastPaymentDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(furnitureInvoices.id, invoice.id));

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "invoice_payment",
      entityId: payment.id,
      details: { invoiceId: invoice.id, amount, paymentMethod },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// Download invoice PDF
router.get("/invoices/:id/pdf", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const pdfBuffer = await invoicePDFService.generateInvoicePDF(invoice.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Cancel invoice
router.post("/invoices/:id/cancel", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [existing] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!existing) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (existing.status === "paid") {
      return res.status(400).json({ error: "Cannot cancel a paid invoice. Use refund instead." });
    }

    const [updated] = await db.update(furnitureInvoices)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(furnitureInvoices.id, req.params.id))
      .returning();

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "invoice",
      entityId: updated.id,
      details: { action: "cancelled", reason: req.body.reason },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res.status(500).json({ error: "Failed to cancel invoice" });
  }
});

// Get invoice payments
router.get("/invoices/:id/payments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const paymentsList = await db.select()
      .from(furnitureInvoicePayments)
      .where(eq(furnitureInvoicePayments.invoiceId, invoice.id))
      .orderBy(desc(furnitureInvoicePayments.paymentDate));

    res.json(paymentsList);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// ============================================
// INVOICE NOTIFICATIONS
// ============================================

import { notificationService, type NotificationChannel, type NotificationEventType } from "../services/notification";

// Send notification for invoice
router.post("/invoices/:id/notify", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const channel = req.query.channel as NotificationChannel;
    if (!channel || !["email", "whatsapp"].includes(channel)) {
      return res.status(400).json({ error: "Valid channel required (email or whatsapp)" });
    }

    const eventType = (req.body.eventType || "invoice_issued") as NotificationEventType;
    const validEventTypes = [
      "invoice_created", "invoice_issued", "payment_reminder", 
      "payment_received", "payment_partial", "invoice_overdue", 
      "invoice_cancelled", "custom"
    ];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ error: "Invalid event type" });
    }

    const result = await notificationService.sendInvoiceNotification(
      tenantId,
      req.params.id,
      eventType,
      channel,
      userId
    );

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "notification",
      entityId: result.logId,
      details: { 
        invoiceId: req.params.id, 
        channel, 
        eventType,
        success: result.success,
        error: result.error 
      },
    });

    if (result.success) {
      res.json({ 
        message: "Notification sent successfully", 
        logId: result.logId,
        messageId: result.messageId 
      });
    } else {
      res.status(400).json({ 
        error: result.error,
        logId: result.logId 
      });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Get notification history for invoice
router.get("/invoices/:id/notifications", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, req.params.id),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const logs = await notificationService.getNotificationLogs(tenantId, req.params.id);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    res.status(500).json({ error: "Failed to fetch notification logs" });
  }
});

// Bulk send reminders for overdue invoices
router.post("/invoices/bulk-reminders", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const channel = (req.query.channel || "email") as NotificationChannel;
    if (!["email", "whatsapp"].includes(channel)) {
      return res.status(400).json({ error: "Valid channel required (email or whatsapp)" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.tenantId, tenantId),
        or(
          eq(furnitureInvoices.status, "issued"),
          eq(furnitureInvoices.status, "partially_paid")
        ),
        lte(furnitureInvoices.dueDate, today)
      ));

    const results: Array<{ invoiceId: string; invoiceNumber: string; success: boolean; error?: string }> = [];

    for (const invoice of overdueInvoices) {
      const result = await notificationService.sendInvoiceNotification(
        tenantId,
        invoice.id,
        "invoice_overdue",
        channel,
        userId
      );

      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        success: result.success,
        error: result.error
      });
    }

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "bulk_notification",
      entityId: `bulk-${Date.now()}`,
      details: { 
        channel,
        totalInvoices: overdueInvoices.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      },
    });

    res.json({
      message: `Sent ${results.filter(r => r.success).length} of ${overdueInvoices.length} reminders`,
      results
    });
  } catch (error) {
    console.error("Error sending bulk reminders:", error);
    res.status(500).json({ error: "Failed to send bulk reminders" });
  }
});

// ============================================
// RECURRING PAYMENTS
// ============================================

import { recurringPaymentService } from "../services/recurring-payments";
import { autoReminderService } from "../services/auto-reminders";
import { scheduledBillingService } from "../services/scheduled-billing";

router.post("/invoices/:id/recurring", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const invoiceId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, invoiceId),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
      intervalCount: z.number().int().positive().optional().default(1),
      amount: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      preferredPaymentMethod: z.string().optional(),
      autoGenerateInvoice: z.boolean().optional().default(true),
      invoicePrefix: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const data = parsed.data;

    const schedule = await recurringPaymentService.createSchedule({
      tenantId,
      customerId: invoice.customerId,
      sourceInvoiceId: invoiceId,
      name: data.name,
      description: data.description,
      frequency: data.frequency,
      intervalCount: data.intervalCount,
      amount: data.amount || invoice.totalAmount,
      currency: invoice.currency,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      preferredPaymentMethod: data.preferredPaymentMethod,
      autoGenerateInvoice: data.autoGenerateInvoice,
      invoicePrefix: data.invoicePrefix,
      createdBy: userId,
    });

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "recurring_schedule",
      entityId: schedule.id,
      details: { invoiceId, frequency: data.frequency },
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error creating recurring schedule:", error);
    res.status(500).json({ error: "Failed to create recurring schedule" });
  }
});

router.get("/recurring-schedules", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schedules = await recurringPaymentService.getSchedulesByTenant(tenantId);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching recurring schedules:", error);
    res.status(500).json({ error: "Failed to fetch recurring schedules" });
  }
});

router.get("/recurring-schedules/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const scheduleId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schedule = await recurringPaymentService.getScheduleById(scheduleId, tenantId);
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching recurring schedule:", error);
    res.status(500).json({ error: "Failed to fetch recurring schedule" });
  }
});

router.patch("/recurring-schedules/:id/status", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const scheduleId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schema = z.object({
      status: z.enum(["active", "paused", "cancelled"]),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const schedule = await recurringPaymentService.updateScheduleStatus(
      scheduleId,
      tenantId,
      parsed.data.status
    );

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "recurring_schedule",
      entityId: scheduleId,
      details: { newStatus: parsed.data.status },
    });

    res.json(schedule);
  } catch (error) {
    console.error("Error updating recurring schedule:", error);
    res.status(500).json({ error: "Failed to update recurring schedule" });
  }
});

router.get("/recurring-schedules/:id/executions", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const scheduleId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const executions = await recurringPaymentService.getExecutionHistory(scheduleId, tenantId);
    res.json(executions);
  } catch (error) {
    console.error("Error fetching execution history:", error);
    res.status(500).json({ error: "Failed to fetch execution history" });
  }
});

// ============================================
// AUTO-REMINDERS
// ============================================

router.post("/reminder-schedules", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      daysFromDueDate: z.number().int(),
      sendTimeHour: z.number().int().min(0).max(23).optional().default(9),
      sendTimeMinute: z.number().int().min(0).max(59).optional().default(0),
      channels: z.array(z.enum(["email", "whatsapp"])).min(1),
      emailTemplateId: z.string().optional(),
      whatsappTemplateId: z.string().optional(),
      eventType: z.string().optional(),
      appliesTo: z.enum(["all", "overdue_only", "upcoming_only"]).optional().default("all"),
      minBalanceAmount: z.string().optional(),
      maxRetryAttempts: z.number().int().positive().optional().default(3),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const schedule = await autoReminderService.createReminderSchedule({
      tenantId,
      ...parsed.data,
      createdBy: userId,
    });

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "reminder_schedule",
      entityId: schedule.id,
      details: { daysFromDueDate: parsed.data.daysFromDueDate, channels: parsed.data.channels },
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error creating reminder schedule:", error);
    res.status(500).json({ error: "Failed to create reminder schedule" });
  }
});

router.get("/reminder-schedules", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schedules = await autoReminderService.getReminderSchedulesByTenant(tenantId);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching reminder schedules:", error);
    res.status(500).json({ error: "Failed to fetch reminder schedules" });
  }
});

router.patch("/reminder-schedules/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const scheduleId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schedule = await autoReminderService.updateReminderSchedule(
      scheduleId,
      tenantId,
      req.body
    );

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "reminder_schedule",
      entityId: scheduleId,
      details: req.body,
    });

    res.json(schedule);
  } catch (error) {
    console.error("Error updating reminder schedule:", error);
    res.status(500).json({ error: "Failed to update reminder schedule" });
  }
});

router.delete("/reminder-schedules/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const scheduleId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    await autoReminderService.deleteReminderSchedule(scheduleId, tenantId);

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "delete",
      entityType: "reminder_schedule",
      entityId: scheduleId,
    });

    res.json({ message: "Reminder schedule deleted" });
  } catch (error) {
    console.error("Error deleting reminder schedule:", error);
    res.status(500).json({ error: "Failed to delete reminder schedule" });
  }
});

router.post("/invoices/:id/reminder", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const invoiceId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const channel = (req.query.channel || "email") as "email" | "whatsapp";
    if (!["email", "whatsapp"].includes(channel)) {
      return res.status(400).json({ error: "Valid channel required (email or whatsapp)" });
    }

    const [invoice] = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.id, invoiceId),
        eq(furnitureInvoices.tenantId, tenantId)
      ));

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const result = await autoReminderService.sendManualReminder(tenantId, invoiceId, channel);

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "manual_reminder",
      entityId: invoiceId,
      details: { channel, success: result.success },
    });

    if (result.success) {
      res.json({ message: "Reminder sent successfully", invoiceId, channel });
    } else {
      res.status(500).json({ error: result.error || "Failed to send reminder" });
    }
  } catch (error) {
    console.error("Error sending manual reminder:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

router.get("/scheduled-reminders", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const status = req.query.status as string | undefined;
    const reminders = await autoReminderService.getScheduledReminders(tenantId, status);
    res.json(reminders);
  } catch (error) {
    console.error("Error fetching scheduled reminders:", error);
    res.status(500).json({ error: "Failed to fetch scheduled reminders" });
  }
});

// ============================================
// SCHEDULED BILLING JOBS
// ============================================

router.post("/billing-jobs", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schema = z.object({
      jobType: z.enum(["recurring_invoice", "reminder_dispatch", "overdue_check"]),
      name: z.string().min(1),
      description: z.string().optional(),
      frequency: z.enum(["hourly", "daily", "weekly"]),
      runAtHour: z.number().int().min(0).max(23).optional().default(9),
      runAtMinute: z.number().int().min(0).max(59).optional().default(0),
      timezone: z.string().optional().default("UTC"),
      recurringScheduleId: z.string().optional(),
      reminderScheduleId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const job = await scheduledBillingService.createJob({
      tenantId,
      ...parsed.data,
    });

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "billing_job",
      entityId: job.id,
      details: { jobType: parsed.data.jobType, frequency: parsed.data.frequency },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("Error creating billing job:", error);
    res.status(500).json({ error: "Failed to create billing job" });
  }
});

router.get("/billing-jobs", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const jobs = await scheduledBillingService.getJobsByTenant(tenantId);
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching billing jobs:", error);
    res.status(500).json({ error: "Failed to fetch billing jobs" });
  }
});

router.patch("/billing-jobs/:id/toggle", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const jobId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const schema = z.object({
      isActive: z.boolean(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const job = await scheduledBillingService.toggleJobStatus(jobId, tenantId, parsed.data.isActive);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "update",
      entityType: "billing_job",
      entityId: jobId,
      details: { isActive: parsed.data.isActive },
    });

    res.json(job);
  } catch (error) {
    console.error("Error toggling billing job:", error);
    res.status(500).json({ error: "Failed to toggle billing job" });
  }
});

router.get("/billing-jobs/:id/logs", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const jobId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const logs = await scheduledBillingService.getJobLogs(jobId, tenantId, limit);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching job logs:", error);
    res.status(500).json({ error: "Failed to fetch job logs" });
  }
});

router.post("/billing-jobs/run-due", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await scheduledBillingService.runAllDueJobs();

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "billing_job_run",
      entityId: `run-${Date.now()}`,
      details: { jobsRun: result.jobsRun },
    });

    res.json(result);
  } catch (error) {
    console.error("Error running due jobs:", error);
    res.status(500).json({ error: "Failed to run due jobs" });
  }
});

router.get("/invoices/scheduled", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const data = await scheduledBillingService.getScheduledPaymentsAndReminders(tenantId);
    res.json(data);
  } catch (error) {
    console.error("Error fetching scheduled data:", error);
    res.status(500).json({ error: "Failed to fetch scheduled data" });
  }
});

router.get("/upcoming-payments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const daysAhead = parseInt(req.query.days as string) || 30;
    const payments = await recurringPaymentService.getUpcomingPayments(tenantId, daysAhead);
    res.json(payments);
  } catch (error) {
    console.error("Error fetching upcoming payments:", error);
    res.status(500).json({ error: "Failed to fetch upcoming payments" });
  }
});

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

router.get("/analytics/overview", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const period = (req.query.period as string) || "30d";
    let startDate: Date;
    const endDate = endOfDay(new Date());

    switch (period) {
      case "7d":
        startDate = startOfDay(subDays(new Date(), 7));
        break;
      case "30d":
        startDate = startOfDay(subDays(new Date(), 30));
        break;
      case "90d":
        startDate = startOfDay(subDays(new Date(), 90));
        break;
      case "1y":
        startDate = startOfDay(subMonths(new Date(), 12));
        break;
      default:
        startDate = startOfDay(subDays(new Date(), 30));
    }

    if (req.query.startDate) {
      startDate = startOfDay(parseISO(req.query.startDate as string));
    }
    if (req.query.endDate) {
      const customEndDate = endOfDay(parseISO(req.query.endDate as string));
      const overview = await analyticsService.getOverview(tenantId, { startDate, endDate: customEndDate });
      return res.json({ dateRange: { startDate, endDate: customEndDate }, ...overview });
    }

    const overview = await analyticsService.getOverview(tenantId, { startDate, endDate });
    res.json({ dateRange: { startDate, endDate }, ...overview });
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/analytics/production", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const startDate = req.query.startDate 
      ? startOfDay(parseISO(req.query.startDate as string))
      : startOfDay(subDays(new Date(), 30));
    const endDate = req.query.endDate 
      ? endOfDay(parseISO(req.query.endDate as string))
      : endOfDay(new Date());

    const metrics = await analyticsService.getProductionMetrics(tenantId, { startDate, endDate });
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching production analytics:", error);
    res.status(500).json({ error: "Failed to fetch production analytics" });
  }
});

router.get("/analytics/sales", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const startDate = req.query.startDate 
      ? startOfDay(parseISO(req.query.startDate as string))
      : startOfDay(subDays(new Date(), 30));
    const endDate = req.query.endDate 
      ? endOfDay(parseISO(req.query.endDate as string))
      : endOfDay(new Date());

    const metrics = await analyticsService.getSalesMetrics(tenantId, { startDate, endDate });
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    res.status(500).json({ error: "Failed to fetch sales analytics" });
  }
});

router.get("/analytics/payments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const startDate = req.query.startDate 
      ? startOfDay(parseISO(req.query.startDate as string))
      : startOfDay(subDays(new Date(), 30));
    const endDate = req.query.endDate 
      ? endOfDay(parseISO(req.query.endDate as string))
      : endOfDay(new Date());

    const metrics = await analyticsService.getPaymentMetrics(tenantId, { startDate, endDate });
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching payment analytics:", error);
    res.status(500).json({ error: "Failed to fetch payment analytics" });
  }
});

router.get("/analytics/operations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const startDate = req.query.startDate 
      ? startOfDay(parseISO(req.query.startDate as string))
      : startOfDay(subDays(new Date(), 30));
    const endDate = req.query.endDate 
      ? endOfDay(parseISO(req.query.endDate as string))
      : endOfDay(new Date());

    const metrics = await analyticsService.getOperationsMetrics(tenantId, { startDate, endDate });
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching operations analytics:", error);
    res.status(500).json({ error: "Failed to fetch operations analytics" });
  }
});

router.get("/analytics/trend/:metric", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const { metric } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const trendData = await analyticsService.getTrendData(tenantId, metric, days);
    res.json(trendData);
  } catch (error) {
    console.error("Error fetching trend data:", error);
    res.status(500).json({ error: "Failed to fetch trend data" });
  }
});

router.post("/analytics/snapshots/generate", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const date = req.body.date ? parseISO(req.body.date) : new Date();
    const snapshot = await analyticsService.createDailySnapshot(tenantId, date);

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "analytics_snapshot",
      entityId: snapshot.id,
      details: { date: snapshot.snapshotDate, type: snapshot.snapshotType },
    });

    res.json(snapshot);
  } catch (error) {
    console.error("Error generating snapshot:", error);
    res.status(500).json({ error: "Failed to generate analytics snapshot" });
  }
});

router.get("/analytics/snapshots", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const type = (req.query.type as "daily" | "weekly" | "monthly") || "daily";
    const startDate = req.query.startDate 
      ? startOfDay(parseISO(req.query.startDate as string))
      : startOfDay(subDays(new Date(), 30));
    const endDate = req.query.endDate 
      ? endOfDay(parseISO(req.query.endDate as string))
      : endOfDay(new Date());

    const snapshots = await analyticsService.getSnapshots(tenantId, { startDate, endDate }, type);
    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({ error: "Failed to fetch analytics snapshots" });
  }
});

// AI Insights endpoints
router.get("/insights", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const options = {
      category: req.query.category as string | undefined,
      severity: req.query.severity as string | undefined,
      includeRead: req.query.includeRead === "true",
      limit: parseInt(req.query.limit as string) || 20,
    };

    const insights = await aiInsightsService.getInsights(tenantId, options);
    res.json(insights);
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ error: "Failed to fetch AI insights" });
  }
});

router.post("/insights/generate", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const result = await aiInsightsService.generateInsights(tenantId);

    await logFurnitureAudit({
      tenantId,
      userId,
      action: "create",
      entityType: "ai_insights_generation",
      entityId: `gen-${Date.now()}`,
      details: { generated: result.generated },
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ error: "Failed to generate AI insights" });
  }
});

router.patch("/insights/:id/read", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const insight = await aiInsightsService.markInsightRead(req.params.id, tenantId);
    if (!insight) {
      return res.status(404).json({ error: "Insight not found" });
    }

    res.json(insight);
  } catch (error) {
    console.error("Error marking insight as read:", error);
    res.status(500).json({ error: "Failed to update insight" });
  }
});

router.patch("/insights/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }

    const insight = await aiInsightsService.dismissInsight(req.params.id, tenantId);
    if (!insight) {
      return res.status(404).json({ error: "Insight not found" });
    }

    res.json(insight);
  } catch (error) {
    console.error("Error dismissing insight:", error);
    res.status(500).json({ error: "Failed to dismiss insight" });
  }
});

export default router;