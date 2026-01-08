import { storage } from "../storage";

export async function seedFurnitureDemoData(tenantId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[furniture-seed] Starting furniture demo data seed for tenant: ${tenantId}`);

    const existingProducts = await storage.getFurnitureProducts(tenantId);
    if (existingProducts.length > 0) {
      console.log("[furniture-seed] Furniture data already exists for this tenant, skipping seed");
      return { success: true, message: "Demo data already exists" };
    }

    const categories = await storage.getRawMaterialCategories(tenantId);
    const createdCategories: Record<string, string> = {};
    
    if (categories.length === 0) {
      const categoryData = [
        { tenantId, name: "Wood", description: "All types of wood materials", color: "#8B4513" },
        { tenantId, name: "Hardware", description: "Screws, nails, hinges, handles", color: "#708090" },
        { tenantId, name: "Fabrics", description: "Upholstery and cushioning materials", color: "#DDA0DD" },
        { tenantId, name: "Finishes", description: "Paints, varnishes, laminates", color: "#FFD700" },
      ];

      for (const cat of categoryData) {
        const created = await storage.createRawMaterialCategory(cat);
        createdCategories[cat.name] = created.id;
      }
      console.log("[furniture-seed] Created raw material categories");
    } else {
      for (const cat of categories) {
        createdCategories[cat.name] = cat.id;
      }
    }

    const materialData = [
      { tenantId, categoryId: createdCategories["Wood"] || "", name: "Teak Wood", sku: "RM-TEAK-001", unitOfMeasure: "cubic_feet", currentStock: "100.0000", reorderLevel: "20.0000", unitCost: "2500.00" },
      { tenantId, categoryId: createdCategories["Wood"] || "", name: "Sheesham Wood", sku: "RM-SHEE-001", unitOfMeasure: "cubic_feet", currentStock: "75.0000", reorderLevel: "15.0000", unitCost: "1800.00" },
      { tenantId, categoryId: createdCategories["Hardware"] || "", name: "Wood Screws", sku: "RM-SCREW-001", unitOfMeasure: "pieces", currentStock: "5000.0000", reorderLevel: "500.0000", unitCost: "2.00" },
      { tenantId, categoryId: createdCategories["Fabrics"] || "", name: "Velvet Fabric", sku: "RM-VEL-001", unitOfMeasure: "meters", currentStock: "80.0000", reorderLevel: "15.0000", unitCost: "650.00" },
      { tenantId, categoryId: createdCategories["Finishes"] || "", name: "Teak Polish", sku: "RM-POL-001", unitOfMeasure: "liters", currentStock: "25.0000", reorderLevel: "5.0000", unitCost: "450.00" },
    ];

    const createdMaterials: Record<string, string> = {};
    for (const mat of materialData) {
      if (mat.categoryId) {
        const created = await storage.createRawMaterial(mat);
        createdMaterials[mat.sku] = created.id;
      }
    }
    console.log("[furniture-seed] Created raw materials");

    const productData = [
      { tenantId, sku: "FP-SOFA-3S", name: "3-Seater Teak Sofa", productType: "ready_made" as const, dimensions: "200x85x90 cm", sellingPrice: "65000.00", costPrice: "42000.00", gstRate: "18.00", hsnCode: "94016100", isActive: true },
      { tenantId, sku: "FP-BED-KING", name: "King Size Bed", productType: "made_to_order" as const, dimensions: "200x180x120 cm", sellingPrice: "85000.00", costPrice: "55000.00", gstRate: "18.00", hsnCode: "94035010", isActive: true },
      { tenantId, sku: "FP-DINE-6S", name: "6-Seater Dining Set", productType: "ready_made" as const, dimensions: "180x90x75 cm", sellingPrice: "75000.00", costPrice: "48000.00", gstRate: "18.00", hsnCode: "94036010", isActive: true },
      { tenantId, sku: "FP-TVUNIT", name: "TV Unit with Drawers", productType: "ready_made" as const, dimensions: "180x45x50 cm", sellingPrice: "28000.00", costPrice: "18000.00", gstRate: "18.00", hsnCode: "94036010", isActive: true },
    ];

    const createdProducts: Record<string, string> = {};
    for (const prod of productData) {
      const created = await storage.createFurnitureProduct(prod);
      createdProducts[prod.sku] = created.id;
    }
    console.log("[furniture-seed] Created furniture products");

    const sofaBom = await storage.createBillOfMaterials({
      tenantId,
      productId: createdProducts["FP-SOFA-3S"],
      version: 1,
      name: "3-Seater Teak Sofa BOM",
      isActive: true,
    });

    if (createdMaterials["RM-TEAK-001"]) {
      await storage.createBomComponent({
        bomId: sofaBom.id,
        rawMaterialId: createdMaterials["RM-TEAK-001"],
        quantity: "8.0000",
        unitOfMeasure: "cubic_feet",
        wastePercentage: "5.00",
      }, tenantId);
    }
    console.log("[furniture-seed] Created BOM for sofa");

    const prodOrder = await storage.createProductionOrder({
      tenantId,
      orderNumber: `PO-DEMO-${Date.now()}`,
      productId: createdProducts["FP-SOFA-3S"],
      bomId: sofaBom.id,
      quantity: 2,
      status: "in_progress" as const,
    });

    const stageTypes = ["cutting", "assembly", "finishing", "quality_check", "ready_for_dispatch"] as const;
    for (let i = 0; i < stageTypes.length; i++) {
      await storage.createProductionStage({
        productionOrderId: prodOrder.id,
        stageType: stageTypes[i],
        stageOrder: i + 1,
        status: i === 0 ? "in_progress" : "pending",
      }, tenantId);
    }
    console.log("[furniture-seed] Created production order with stages");

    console.log(`[furniture-seed] Successfully seeded furniture demo data for tenant: ${tenantId}`);
    return { success: true, message: "Furniture demo data created successfully" };
  } catch (error) {
    console.error("[furniture-seed] Error seeding furniture demo data:", error);
    return { success: false, message: `Failed to seed demo data: ${error}` };
  }
}

export async function clearFurnitureDemoData(tenantId: string): Promise<{ success: boolean; message: string }> {
  console.log(`[furniture-seed] Clear demo data not implemented for tenant: ${tenantId}`);
  return { success: false, message: "Clear demo data not implemented - use database admin tools" };
}
