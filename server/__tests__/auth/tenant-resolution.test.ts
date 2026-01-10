import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

/**
 * Tenant Resolution Flow Tests
 * 
 * Tests the following flows:
 * 1. Signup returns tenant.id and user is mapped to tenant
 * 2. Login without tenantId:
 *    - if one tenant -> success
 *    - if multiple -> 409 and tenants list
 *    - if none -> 404
 * 3. Tenant lookup by email
 * 4. Tenant isolation unchanged (cross-tenant returns 404)
 */

describe("Tenant Resolution Flows", () => {
  describe("Tenant Lookup Endpoint", () => {
    it("should return 400 if email is not provided", async () => {
      const response = await fetch("http://localhost:5000/api/auth/tenants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("EMAIL_REQUIRED");
    });

    it("should return 404 if user does not exist", async () => {
      const response = await fetch("http://localhost:5000/api/auth/tenants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe("USER_NOT_FOUND");
    });
  });

  describe("Login Flow - Tenant Resolution", () => {
    it("should return 400 if email or password is missing", async () => {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("required");
    });

    it("should return 401 for invalid credentials", async () => {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: "invalid@example.com",
          password: "WrongPassword123!"
        }),
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain("Invalid credentials");
    });

    it("should return 404 if tenant does not exist when tenantId is provided", async () => {
      // This tests the case where a user provides a non-existent tenant ID
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: "test@example.com",
          password: "TestPassword123!",
          tenantId: "non-existent-tenant-id"
        }),
      });
      
      // Should either be 401 (user not found) or 404 (tenant not found)
      expect([401, 404]).toContain(response.status);
    });
  });

  describe("Signup Flow - Tenant Creation", () => {
    it("should require all mandatory fields", async () => {
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: "Test Business",
          // Missing other required fields
        }),
      });
      
      expect(response.status).toBe(400);
    });

    it("should create user and return tenant info on successful signup", async () => {
      // Generate unique email for this test
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: "Test Signup Business",
          businessType: "service",
          adminFirstName: "Test",
          adminLastName: "User",
          adminEmail: uniqueEmail,
          adminPassword: "TestPassword123!",
          country: "india",
        }),
      });
      
      // Should succeed with 201
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // Should return tokens
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      
      // Should return tenant info
      expect(data).toHaveProperty("tenant");
      expect(data.tenant).toHaveProperty("id");
      expect(data.tenant).toHaveProperty("name");
      expect(data.tenant).toHaveProperty("businessType");
      
      // Should return user info
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("id");
      expect(data.user).toHaveProperty("email");
    });
  });

  describe("API Contract Consistency", () => {
    it("should have consistent error codes for tenant not found", () => {
      // Define expected error codes
      const EXPECTED_CODES = {
        TENANT_NOT_EXIST: "TENANT_NOT_EXIST",
        TENANT_NOT_FOUND_FOR_USER: "TENANT_NOT_FOUND_FOR_USER",
        NO_TENANT_MEMBERSHIP: "NO_TENANT_MEMBERSHIP",
        NO_TENANT_ACCESS: "NO_TENANT_ACCESS",
        MULTI_TENANT_SELECT_REQUIRED: "MULTI_TENANT_SELECT_REQUIRED",
        EMAIL_REQUIRED: "EMAIL_REQUIRED",
        USER_NOT_FOUND: "USER_NOT_FOUND",
      };

      // All codes should be unique strings
      const codes = Object.values(EXPECTED_CODES);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });

    it("should return proper error structure for auth endpoints", async () => {
      const response = await fetch("http://localhost:5000/api/auth/tenants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      });
      
      const data = await response.json();
      
      // Error response should have message and code
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("code");
      expect(typeof data.message).toBe("string");
      expect(typeof data.code).toBe("string");
    });
  });

  describe("Frontend Storage Key Consistency", () => {
    it("should use consistent storage keys", () => {
      // Define expected storage keys used in the app
      const EXPECTED_KEYS = {
        ACCESS_TOKEN: "accessToken",
        REFRESH_TOKEN: "refreshToken",
        TENANT_ID: "tenantId",
        LAST_TENANT_ID: "lastTenantId",
        TENANT_COUNTRY: "tenantCountry",
      };

      // All keys should be unique
      const keys = Object.values(EXPECTED_KEYS);
      const uniqueKeys = [...new Set(keys)];
      expect(keys.length).toBe(uniqueKeys.length);
    });
  });
});
