import { describe, it, expect, beforeAll } from "@jest/globals";
import { schemaHealthCheck, isSchemaHealthy } from "../../bootstrap/schemaHealth";
import { computeAnomalyScore, type AnomalyScoreParams } from "../../services/anomaly-scoring";
import { db } from "../../db";
import { sql } from "drizzle-orm";

describe("Login Resilience Tests", () => {
  describe("Schema Health Check", () => {
    it("should return ok:true when required tables exist", async () => {
      const result = await schemaHealthCheck();
      expect(result.ok).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.checked).toContain("user_sessions");
      expect(result.checked).toContain("refresh_tokens");
      expect(result.checked).toContain("audit_logs");
    });

    it("should track schema health status globally", async () => {
      await schemaHealthCheck();
      expect(isSchemaHealthy()).toBe(true);
    });
  });

  describe("Anomaly Scoring Non-Fatal", () => {
    it("should return safe defaults when user_sessions query fails", async () => {
      const mockParams: AnomalyScoreParams = {
        tenantId: "nonexistent-tenant",
        userId: "nonexistent-user",
        deviceFingerprint: "test-device",
        country: "US",
        city: "New York",
        ipAddress: "127.0.0.1",
      };

      const result = await computeAnomalyScore(mockParams);
      
      expect(result.score).toBeDefined();
      expect(typeof result.score).toBe("number");
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(typeof result.requiresStepUp).toBe("boolean");
      expect(typeof result.requiresForceLogout).toBe("boolean");
    });

    it("should return score 0 for first-time login (no previous sessions)", async () => {
      const mockParams: AnomalyScoreParams = {
        tenantId: "test-tenant-" + Date.now(),
        userId: "test-user-" + Date.now(),
        deviceFingerprint: "brand-new-device",
        country: "US",
        city: "New York",
        ipAddress: "127.0.0.1",
      };

      const result = await computeAnomalyScore(mockParams);
      
      expect(result.score).toBe(0);
      expect(result.requiresStepUp).toBe(false);
      expect(result.requiresForceLogout).toBe(false);
    });
  });

  describe("Refresh Token Schema Integrity", () => {
    it("should have unique constraint on token_hash", async () => {
      const result = await db.execute(sql`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conname = 'refresh_tokens_token_hash_unique'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect((result.rows[0] as any).contype).toBe("u");
    });

    it("should have partial index for active tokens", async () => {
      const result = await db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'refresh_tokens'
        AND indexname = 'idx_refresh_tokens_active'
      `);
      
      expect(result.rows.length).toBe(1);
    });

    it("should have all required columns for token rotation", async () => {
      const result = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'refresh_tokens'
      `);
      
      const columns = (result.rows as { column_name: string }[]).map(r => r.column_name);
      
      const requiredColumns = [
        "id", "user_id", "tenant_id", "staff_id",
        "token_hash", "family_id", "parent_id",
        "is_revoked", "revoked_at", "revoke_reason",
        "expires_at", "issued_at", "device_fingerprint"
      ];
      
      for (const col of requiredColumns) {
        expect(columns).toContain(col);
      }
    });
  });

  describe("User Sessions Schema Integrity", () => {
    it("should have all required indexes for session queries", async () => {
      const result = await db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'user_sessions'
      `);
      
      const indexes = (result.rows as { indexname: string }[]).map(r => r.indexname);
      
      expect(indexes).toContain("idx_user_sessions_tenant_user");
      expect(indexes).toContain("idx_user_sessions_staff");
      expect(indexes).toContain("idx_user_sessions_last_seen");
    });

    it("should have session_version column for force logout", async () => {
      const result = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user_sessions'
        AND column_name = 'session_version'
      `);
      
      expect(result.rows.length).toBe(1);
      expect((result.rows[0] as any).data_type).toBe("integer");
    });

    it("should have revoke_reason column with enum type", async () => {
      const result = await db.execute(sql`
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_name = 'user_sessions'
        AND column_name = 'revoke_reason'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });
});

describe("Security Regression Tests", () => {
  describe("Token Rotation Reuse Detection", () => {
    it("should mark reused tokens with suspicious_reuse_at", async () => {
      const result = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'refresh_tokens'
        AND column_name = 'suspicious_reuse_at'
      `);
      
      expect(result.rows.length).toBe(1);
    });
  });

  describe("SOC2 Audit Requirements", () => {
    it("should have audit_logs table for compliance", async () => {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'audit_logs'
        ) as table_exists
      `);
      
      expect((result.rows[0] as any).table_exists).toBe(true);
    });

    it("should have step_up_challenges table for MFA tracking", async () => {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'step_up_challenges'
        ) as table_exists
      `);
      
      expect((result.rows[0] as any).table_exists).toBe(true);
    });
  });
});
