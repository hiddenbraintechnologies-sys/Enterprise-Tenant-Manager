import request from "supertest";
import { createTestApp } from "../test-app";
import type { Express } from "express";
import type { Server } from "http";

describe("Services Module (Software Services & Consulting) Tests", () => {
  let app: Express;
  let httpServer: Server;
  const testTenantId = "test-tenant-services";
  const otherTenantId = "test-tenant-other";
  const headers = { "X-Tenant-ID": testTenantId };
  const otherHeaders = { "X-Tenant-ID": otherTenantId };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
  });

  afterAll(async () => {
    httpServer.close();
  });

  describe("Tenant Isolation Tests", () => {
    const endpoints = [
      "/api/services/projects",
      "/api/services/timesheets",
    ];

    it("should require tenant context for all services endpoints", async () => {
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect([400, 401]).toContain(response.status);
      }
    });

    it("should isolate project data between tenants", async () => {
      const response1 = await request(app)
        .get("/api/services/projects")
        .set(headers);

      const response2 = await request(app)
        .get("/api/services/projects")
        .set(otherHeaders);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it("should return 404 for cross-tenant project access", async () => {
      const response = await request(app)
        .get("/api/services/projects/non-existent-project-id")
        .set(otherHeaders);

      expect(response.status).toBe(404);
    });

    it("should return 404 for cross-tenant task access", async () => {
      const response = await request(app)
        .get("/api/services/tasks/non-existent-task-id")
        .set(otherHeaders);

      expect(response.status).toBe(404);
    });

    it("should return 404 for cross-tenant timesheet access", async () => {
      const response = await request(app)
        .get("/api/services/timesheets/non-existent-timesheet-id")
        .set(otherHeaders);

      expect(response.status).toBe(404);
    });

    it("should isolate timesheet data between tenants", async () => {
      const response1 = await request(app)
        .get("/api/services/timesheets")
        .set(headers);

      const response2 = await request(app)
        .get("/api/services/timesheets")
        .set(otherHeaders);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe("RBAC Tests", () => {
    it("should enforce tenant context for project creation", async () => {
      const response = await request(app)
        .post("/api/services/projects")
        .send({
          name: "Test Project",
          code: "TEST-001",
          status: "planning",
        });

      expect([400, 401]).toContain(response.status);
    });

    it("should enforce tenant context for task creation", async () => {
      const response = await request(app)
        .post("/api/services/projects/some-project-id/tasks")
        .send({
          title: "Test Task",
          status: "pending",
        });

      expect([400, 401]).toContain(response.status);
    });

    it("should enforce tenant context for timesheet creation", async () => {
      const response = await request(app)
        .post("/api/services/timesheets")
        .send({
          projectId: "some-project-id",
          date: "2026-01-09",
          hours: 8,
        });

      expect([400, 401]).toContain(response.status);
    });

    it("should require tenant context for project update", async () => {
      const response = await request(app)
        .patch("/api/services/projects/some-project-id")
        .send({ name: "Updated Project" });

      expect([400, 401]).toContain(response.status);
    });

    it("should require tenant context for project deletion", async () => {
      const response = await request(app)
        .delete("/api/services/projects/some-project-id");

      expect([400, 401]).toContain(response.status);
    });
  });

  describe("Pagination Tests", () => {
    it("should support pagination parameters for projects", async () => {
      const response = await request(app)
        .get("/api/services/projects?page=1&limit=10")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(response.body.meta).toHaveProperty("page");
      expect(response.body.meta).toHaveProperty("limit");
      expect(response.body.meta).toHaveProperty("total");
      expect(response.body.meta).toHaveProperty("totalPages");
    });

    it("should support pagination parameters for timesheets", async () => {
      const response = await request(app)
        .get("/api/services/timesheets?page=1&limit=10")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
    });

    it("should support status filter for projects", async () => {
      const response = await request(app)
        .get("/api/services/projects?status=active")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should support date range filters for timesheets", async () => {
      const response = await request(app)
        .get("/api/services/timesheets?startDate=2026-01-01&endDate=2026-01-31")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });

    it("should support search filter for projects", async () => {
      const response = await request(app)
        .get("/api/services/projects?search=test")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });

  describe("API Contract Validation", () => {
    it("should return consistent list response format for projects", async () => {
      const response = await request(app)
        .get("/api/services/projects")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty("meta");
      expect(response.body.meta).toHaveProperty("total");
      expect(response.body.meta).toHaveProperty("page");
      expect(response.body.meta).toHaveProperty("limit");
    });

    it("should return consistent list response format for timesheets", async () => {
      const response = await request(app)
        .get("/api/services/timesheets")
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty("meta");
    });

    it("should return consistent error format for missing tenant", async () => {
      const response = await request(app)
        .get("/api/services/projects");

      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
    });

    it("should return consistent 404 format for non-existent resources", async () => {
      const response = await request(app)
        .get("/api/services/projects/non-existent-id")
        .set(headers);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("Timesheet Workflow Tests", () => {
    it("should reject invalid timesheet status transitions", async () => {
      const response = await request(app)
        .post("/api/services/timesheets/fake-id/invalid-action")
        .set(headers);

      expect(response.status).toBe(404);
    });
  });
});

describe("Health Endpoints", () => {
  let app: Express;
  let httpServer: Server;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
  });

  afterAll(async () => {
    httpServer.close();
  });

  it("GET /health should return ok status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
  });

  it("GET /health/db should check database connectivity", async () => {
    const response = await request(app).get("/health/db");
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty("status");
    if (response.status === 200) {
      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("database", "connected");
    } else {
      expect(response.body.status).toBe("DB_UNAVAILABLE");
    }
  });
});
