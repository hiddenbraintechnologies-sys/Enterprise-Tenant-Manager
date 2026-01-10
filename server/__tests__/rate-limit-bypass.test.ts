import { isRateLimitBypassed } from "../core/auth-middleware";

describe("Rate Limit Bypass Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isRateLimitBypassed", () => {
    it("should NEVER bypass rate limiting in production, even if SKIP_RATE_LIMIT=true", () => {
      process.env.NODE_ENV = "production";
      process.env.SKIP_RATE_LIMIT = "true";

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(false);
    });

    it("should bypass rate limiting in test environment", () => {
      process.env.NODE_ENV = "test";
      delete process.env.SKIP_RATE_LIMIT;

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(true);
    });

    it("should bypass rate limiting in development when SKIP_RATE_LIMIT=true", () => {
      process.env.NODE_ENV = "development";
      process.env.SKIP_RATE_LIMIT = "true";

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(true);
    });

    it("should NOT bypass rate limiting in development without SKIP_RATE_LIMIT", () => {
      process.env.NODE_ENV = "development";
      delete process.env.SKIP_RATE_LIMIT;

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(false);
    });

    it("should NOT bypass rate limiting when NODE_ENV is undefined and no SKIP_RATE_LIMIT", () => {
      delete process.env.NODE_ENV;
      delete process.env.SKIP_RATE_LIMIT;

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(false);
    });

    it("should bypass when NODE_ENV is undefined but SKIP_RATE_LIMIT=true (defaults to dev)", () => {
      delete process.env.NODE_ENV;
      process.env.SKIP_RATE_LIMIT = "true";

      const { isRateLimitBypassed: freshBypass } = require("../core/auth-middleware");
      expect(freshBypass()).toBe(true);
    });
  });
});
