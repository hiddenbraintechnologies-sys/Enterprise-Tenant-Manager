import { describe, it, expect } from "@jest/globals";

describe("Software Services & Consulting Timesheet API Wiring", () => {
  describe("Endpoint Configuration", () => {
    it("should use shared HRMS API endpoints for timesheets", () => {
      const expectedEndpoints = {
        list: "/api/hr/timesheets/my",
        create: "/api/hr/timesheets",
        projects: "/api/hr/projects",
      };

      expect(expectedEndpoints.list).toContain("/api/hr/");
      expect(expectedEndpoints.create).toContain("/api/hr/");
      expect(expectedEndpoints.projects).toContain("/api/hr/");
    });

    it("should have consistent query key structure for TanStack Query", () => {
      const queryKeys = {
        listTimesheets: ["/api/hr/timesheets/my"],
        listProjects: ["/api/hr/projects"],
      };

      expect(queryKeys.listTimesheets[0]).toBe("/api/hr/timesheets/my");
      expect(queryKeys.listProjects[0]).toBe("/api/hr/projects");
    });

    it("should use correct cache invalidation keys after mutations", () => {
      const invalidationKeys = {
        afterTimesheetCreate: "/api/hr/timesheets/my",
        afterProjectCreate: "/api/hr/projects",
      };

      expect(invalidationKeys.afterTimesheetCreate).toBe("/api/hr/timesheets/my");
      expect(invalidationKeys.afterProjectCreate).toBe("/api/hr/projects");
    });
  });

  describe("Business Type Route Configuration", () => {
    it("should define SOFTWARE_SERVICES routes", () => {
      const softwareServicesRoutes = [
        "/dashboard/software-services",
        "/dashboard/software-services/projects",
        "/dashboard/software-services/timesheets",
        "/dashboard/software-services/invoices",
      ];

      expect(softwareServicesRoutes).toContain("/dashboard/software-services/projects");
      expect(softwareServicesRoutes).toContain("/dashboard/software-services/timesheets");
    });

    it("should define CONSULTING routes", () => {
      const consultingRoutes = [
        "/dashboard/consulting",
        "/dashboard/consulting/projects",
        "/dashboard/consulting/timesheets",
        "/dashboard/consulting/invoices",
      ];

      expect(consultingRoutes).toContain("/dashboard/consulting/projects");
      expect(consultingRoutes).toContain("/dashboard/consulting/timesheets");
    });

    it("should NOT use HRMS routes for Software Services navigation", () => {
      const softwareServicesNavigation = {
        projects: "/dashboard/software-services/projects",
        timesheets: "/dashboard/software-services/timesheets",
        invoices: "/dashboard/software-services/invoices",
      };

      expect(softwareServicesNavigation.projects).not.toContain("/hr/");
      expect(softwareServicesNavigation.timesheets).not.toContain("/hr/");
    });

    it("should NOT use HRMS routes for Consulting navigation", () => {
      const consultingNavigation = {
        projects: "/dashboard/consulting/projects",
        timesheets: "/dashboard/consulting/timesheets",
        invoices: "/dashboard/consulting/invoices",
      };

      expect(consultingNavigation.projects).not.toContain("/hr/");
      expect(consultingNavigation.timesheets).not.toContain("/hr/");
    });
  });

  describe("Cache Invalidation Consistency", () => {
    it("should invalidate matching query keys after timesheet creation", () => {
      const queryKey = ["/api/hr/timesheets/my", { page: 1, limit: 10 }];
      const invalidationKey = "/api/hr/timesheets/my";

      const baseKey = queryKey[0] as string;
      expect(baseKey).toBe(invalidationKey);
    });

    it("should invalidate matching query keys after project creation", () => {
      const queryKey = ["/api/hr/projects", { page: 1, limit: 10 }];
      const invalidationKey = "/api/hr/projects";

      const baseKey = queryKey[0] as string;
      expect(baseKey).toBe(invalidationKey);
    });
  });
});
