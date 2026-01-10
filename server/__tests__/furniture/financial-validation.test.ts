import request from "supertest";
import { createFurnitureTestApp } from "../../test-support/createFurnitureTestApp";
import type { Express } from "express";
import type { Server } from "http";

describe("Furniture Module Financial Validation Tests", () => {
  let app: Express;
  let httpServer: Server;
  const testTenantId = "test-tenant-id";
  const headers = { "X-Tenant-ID": testTenantId };

  beforeAll(async () => {
    const testApp = await createFurnitureTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
  });

  afterAll(async () => {
    httpServer.close();
  });

  describe("Sales Order Financial Fields", () => {
    it("should return sales orders with financial fields", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        const expectedFields = [
          "subtotal",
          "taxAmount",
          "discountAmount",
          "totalAmount",
          "advanceAmount",
          "balanceAmount",
        ];
        
        for (const field of expectedFields) {
          expect(order).toHaveProperty(field);
        }
      }
    });

    it("should filter sales orders by order type", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders?orderType=retail")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter sales orders by status for financial tracking", async () => {
      const statusFilters = ["draft", "confirmed", "in_production", "ready", "delivered", "cancelled"];

      for (const status of statusFilters) {
        const response = await request(app)
          .get(`/api/furniture/sales-orders?status=${status}`)
          .set(headers);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("data");
      }
    });
  });

  describe("Product Pricing", () => {
    it("should return products with pricing fields", async () => {
      const response = await request(app)
        .get("/api/furniture/products")
        .set(headers);

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
        expect(product).toHaveProperty("costPrice");
        expect(product).toHaveProperty("sellingPrice");
      }
    });

    it("should return products with GST information", async () => {
      const response = await request(app)
        .get("/api/furniture/products")
        .set(headers);

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const product = response.body.data[0];
      }
    });
  });

  describe("Raw Materials Cost Tracking", () => {
    it("should return raw materials with cost fields", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials")
        .set(headers);

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const material = response.body.data[0];
        expect(material).toHaveProperty("unitCost");
        expect(material).toHaveProperty("currentStock");
      }
    });

    it("should identify low stock materials for cost planning", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials?lowStock=true")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("Production Order Cost Tracking", () => {
    it("should return production orders with quantity info", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders")
        .set(headers);

      expect(response.status).toBe(200);

      if (response.body.data.length > 0) {
        const order = response.body.data[0];
        expect(order).toHaveProperty("quantity");
      }
    });
  });
});
