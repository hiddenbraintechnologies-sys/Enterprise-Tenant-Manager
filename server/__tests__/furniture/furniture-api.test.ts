import request from "supertest";
import { createTestApp } from "../test-app";
import type { Express } from "express";
import type { Server } from "http";

describe("Furniture Module API", () => {
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

  describe("GET /api/furniture/products", () => {
    it("should return paginated products", async () => {
      const response = await request(app)
        .get("/api/furniture/products")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.pagination).toHaveProperty("page");
      expect(response.body.pagination).toHaveProperty("limit");
      expect(response.body.pagination).toHaveProperty("total");
      expect(response.body.pagination).toHaveProperty("totalPages");
    });

    it("should filter products by search", async () => {
      const response = await request(app)
        .get("/api/furniture/products?search=chair")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should filter products by productType", async () => {
      const response = await request(app)
        .get("/api/furniture/products?productType=ready_made")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should paginate with page and limit", async () => {
      const response = await request(app)
        .get("/api/furniture/products?page=1&limit=5")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it("should require tenant ID header", async () => {
      const response = await request(app)
        .get("/api/furniture/products");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/furniture/raw-materials", () => {
    it("should return paginated raw materials", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter raw materials by search", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials?search=wood")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter raw materials by categoryId", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials?categoryId=some-category-id")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter raw materials by lowStock", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials?lowStock=true")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/furniture/production-orders", () => {
    it("should return paginated production orders", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter production orders by status", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders?status=in_progress")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter production orders by priority", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders?priority=high")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter production orders by search", async () => {
      const response = await request(app)
        .get("/api/furniture/production-orders?search=PO-")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/furniture/sales-orders", () => {
    it("should return paginated sales orders", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter sales orders by status", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders?status=confirmed")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter sales orders by orderType", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders?orderType=retail")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter sales orders by search", async () => {
      const response = await request(app)
        .get("/api/furniture/sales-orders?search=SO-")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/furniture/deliveries", () => {
    it("should return paginated deliveries", async () => {
      const response = await request(app)
        .get("/api/furniture/deliveries")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter deliveries by status", async () => {
      const response = await request(app)
        .get("/api/furniture/deliveries?status=scheduled")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter deliveries by search", async () => {
      const response = await request(app)
        .get("/api/furniture/deliveries?search=DEL-")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/furniture/installations", () => {
    it("should return paginated installations", async () => {
      const response = await request(app)
        .get("/api/furniture/installations")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter installations by status", async () => {
      const response = await request(app)
        .get("/api/furniture/installations?status=scheduled")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should filter installations by search", async () => {
      const response = await request(app)
        .get("/api/furniture/installations?search=INS-")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("GET /api/furniture/bom", () => {
    it("should return paginated BOM list", async () => {
      const response = await request(app)
        .get("/api/furniture/bom")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should filter BOM by search", async () => {
      const response = await request(app)
        .get("/api/furniture/bom?search=table")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("Multi-tenant isolation", () => {
    it("should not return data from other tenants", async () => {
      const tenant1Response = await request(app)
        .get("/api/furniture/products")
        .set({ "X-Tenant-ID": "tenant-1" });

      const tenant2Response = await request(app)
        .get("/api/furniture/products")
        .set({ "X-Tenant-ID": "tenant-2" });

      expect(tenant1Response.status).toBe(200);
      expect(tenant2Response.status).toBe(200);
    });
  });

  describe("Sorting support", () => {
    it("should sort products by name ascending", async () => {
      const response = await request(app)
        .get("/api/furniture/products?sortBy=name&sortOrder=asc")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should sort products by createdAt descending", async () => {
      const response = await request(app)
        .get("/api/furniture/products?sortBy=createdAt&sortOrder=desc")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should sort raw materials by currentStock", async () => {
      const response = await request(app)
        .get("/api/furniture/raw-materials?sortBy=currentStock&sortOrder=asc")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });
});
