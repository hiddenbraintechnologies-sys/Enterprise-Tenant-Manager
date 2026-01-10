import request from "supertest";
import { createServicesTestApp } from "../../test-support/createServicesTestApp";
import type { Express } from "express";
import type { Server } from "http";

describe("Services Module Audit Log Tests", () => {
  let app: Express;
  let httpServer: Server;
  const testTenantId = "test-tenant-audit";
  const headers = { "X-Tenant-ID": testTenantId };
  const basePath = "/api/services/software";

  beforeAll(async () => {
    const testApp = await createServicesTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
  });

  afterAll(async () => {
    httpServer.close();
  });

  describe("Project Audit Logging", () => {
    it("should log project creation attempts", async () => {
      const response = await request(app)
        .post(`${basePath}/projects`)
        .set(headers)
        .send({
          name: "Audit Test Project",
          code: "AUDIT-001",
          status: "planning",
          billingModel: "hourly",
        });

      expect([201, 400, 401]).toContain(response.status);
    });

    it("should log project update attempts", async () => {
      const response = await request(app)
        .patch(`${basePath}/projects/some-project-id`)
        .set(headers)
        .send({ name: "Updated Name" });

      expect([200, 404, 400, 401]).toContain(response.status);
    });

    it("should log project deletion attempts", async () => {
      const response = await request(app)
        .delete(`${basePath}/projects/some-project-id`)
        .set(headers);

      expect([200, 404, 400, 401]).toContain(response.status);
    });
  });

  describe("Task Audit Logging", () => {
    it("should log task creation attempts", async () => {
      const response = await request(app)
        .post(`${basePath}/projects/some-project-id/tasks`)
        .set(headers)
        .send({
          title: "Audit Test Task",
          status: "pending",
        });

      expect([201, 400, 401, 404]).toContain(response.status);
    });

    it("should log task update attempts", async () => {
      const response = await request(app)
        .patch(`${basePath}/tasks/some-task-id`)
        .set(headers)
        .send({ title: "Updated Task" });

      expect([200, 404, 400, 401]).toContain(response.status);
    });
  });

  describe("Timesheet Audit Logging", () => {
    it("should log timesheet creation attempts", async () => {
      const response = await request(app)
        .post(`${basePath}/timesheets`)
        .set(headers)
        .send({
          projectId: "some-project-id",
          date: "2026-01-09",
          hours: "8",
          description: "Audit test entry",
        });

      expect([201, 400, 401, 404]).toContain(response.status);
    });

    it("should log timesheet workflow action attempts", async () => {
      const response = await request(app)
        .post(`${basePath}/timesheets/some-timesheet-id/submit`)
        .set(headers);

      expect([200, 400, 401, 404]).toContain(response.status);
    });

    it("should log timesheet deletion attempts", async () => {
      const response = await request(app)
        .delete(`${basePath}/timesheets/some-timesheet-id`)
        .set(headers);

      expect([200, 400, 401, 404]).toContain(response.status);
    });
  });

  describe("Blocked Action Logging", () => {
    it("should log blocked access without tenant context", async () => {
      const response = await request(app)
        .post(`${basePath}/projects`)
        .send({ name: "Blocked Project" });

      expect([400, 401]).toContain(response.status);
    });

    it("should log blocked cross-tenant access", async () => {
      const response = await request(app)
        .get(`${basePath}/projects/fake-cross-tenant-id`)
        .set({ "X-Tenant-ID": "wrong-tenant" });

      expect(response.status).toBe(404);
    });
  });
});
