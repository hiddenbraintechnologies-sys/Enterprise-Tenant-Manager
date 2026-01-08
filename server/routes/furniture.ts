import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
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

const router = Router();

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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.updateProductionOrder(req.params.id, tenantId, req.body);
    if (!order) {
      return res.status(404).json({ error: "Production order not found" });
    }
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const stage = await storage.updateProductionStage(req.params.id, req.params.orderId, tenantId, req.body);
    if (!stage) {
      return res.status(404).json({ error: "Production stage not found" });
    }
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.updateDeliveryOrder(req.params.id, tenantId, req.body);
    if (!order) {
      return res.status(404).json({ error: "Delivery order not found" });
    }
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    const installationNumber = `INS-${Date.now()}`;
    
    const data = insertInstallationOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      installationNumber,
    });
    const order = await storage.createInstallationOrder(data);
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.updateInstallationOrder(req.params.id, tenantId, req.body);
    if (!order) {
      return res.status(404).json({ error: "Installation order not found" });
    }
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    
    const orderNumber = `SO-${Date.now()}`;
    
    const data = insertFurnitureSalesOrderSchema.parse({ 
      ...req.body, 
      tenantId,
      orderNumber,
    });
    const order = await storage.createFurnitureSalesOrder(data);
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
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    const order = await storage.updateFurnitureSalesOrder(req.params.id, tenantId, req.body);
    if (!order) {
      return res.status(404).json({ error: "Sales order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error updating sales order:", error);
    res.status(500).json({ error: "Failed to update sales order" });
  }
});

router.delete("/sales-orders/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required" });
    }
    await storage.deleteFurnitureSalesOrder(req.params.id, tenantId);
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

export default router;