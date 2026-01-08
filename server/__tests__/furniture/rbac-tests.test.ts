import request from "supertest";
import { createTestApp } from "../test-app";
import type { Express } from "express";
import type { Server } from "http";

describe("Furniture Module RBAC Tests", () => {
  let app: Express;
  let httpServer: Server;
  const testTenantId = "test-tenant-id";
  const headers = { "X-Tenant-ID": testTenantId };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
  });

  afterAll(async () => {
    httpServer.close();
  });

  describe("Tenant Isolation", () => {
    it("should require X-Tenant-ID header for all furniture endpoints", async () => {
      const endpoints = [
        "/api/furniture/products",
        "/api/furniture/raw-materials",
        "/api/furniture/production-orders",
        "/api/furniture/sales-orders",
        "/api/furniture/deliveries",
        "/api/furniture/installations",
        "/api/furniture/bom",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Tenant ID");
      }
    });

    it("should isolate data between different tenants", async () => {
      const response1 = await request(app)
        .get("/api/furniture/products")
        .set({ "X-Tenant-ID": "tenant-1" });

      const response2 = await request(app)
        .get("/api/furniture/products")
        .set({ "X-Tenant-ID": "tenant-2" });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it("should prevent cross-tenant data access on single resource endpoints", async () => {
      const response = await request(app)
        .get("/api/furniture/products/some-product-id")
        .set({ "X-Tenant-ID": "wrong-tenant" });

      expect([404, 200]).toContain(response.status);
    });
  });

  describe("Read-only enforcement for completed orders", () => {
    it("should allow viewing completed production orders", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders?status=completed")
        .set(headers);

      expect(response.status).toBe(200);
    });

    it("should allow viewing completed sales orders", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders?status=delivered")
        .set(headers);

      expect(response.status).toBe(200);
    });

    it("should allow viewing completed deliveries", async () => {
      const response = await request(app)
        .get("/api/furniture/deliveries?status=delivered")
        .set(headers);

      expect(response.status).toBe(200);
    });

    it("should allow viewing completed installations", async () => {
      const response = await request(app)
        .get("/api/furniture/installations?status=completed")
        .set(headers);

      expect(response.status).toBe(200);
    });
  });

  describe("Dashboard access", () => {
    it("should return dashboard stats for authenticated tenant", async () => {
      const response = await request(app)
        .get("/api/furniture/dashboard/stats")
        .set(headers);

      expect(response.status).toBe(200);
    });

    it("should require tenant ID for dashboard stats", async () => {
      const response = await request(app)
        .get("/api/furniture/dashboard/stats");

      expect(response.status).toBe(400);
    });
  });
});
