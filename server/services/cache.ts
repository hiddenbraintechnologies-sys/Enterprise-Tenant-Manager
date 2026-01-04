import Redis from "ioredis";

const CACHE_VERSION = "v1";
const DEFAULT_TTL = 300; // 5 minutes

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private isConnected = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log("[CacheService] No REDIS_URL configured, using in-memory fallback");
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn("[CacheService] Redis retry limit reached, falling back to memory cache");
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        console.log("[CacheService] Redis connected");
      });

      this.redis.on("error", (err) => {
        console.error("[CacheService] Redis error:", err.message);
        this.isConnected = false;
      });

      this.redis.on("close", () => {
        this.isConnected = false;
        console.log("[CacheService] Redis connection closed");
      });

      this.redis.connect().catch((err) => {
        console.warn("[CacheService] Redis connection failed:", err.message);
      });
    } catch (error: any) {
      console.warn("[CacheService] Redis initialization failed:", error.message);
    }
  }

  private getTenantKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}:${CACHE_VERSION}`;
  }

  private getGlobalKey(key: string): string {
    return `global:${key}:${CACHE_VERSION}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis && this.isConnected) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      }

      const cached = this.memoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return JSON.parse(cached.value) as T;
      }
      
      if (cached) {
        this.memoryCache.delete(key);
      }
      return null;
    } catch (error: any) {
      console.error("[CacheService] Get error:", error.message);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.redis && this.isConnected) {
        await this.redis.set(key, serialized, "EX", ttlSeconds);
        return true;
      }

      this.memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return true;
    } catch (error: any) {
      console.error("[CacheService] Set error:", error.message);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.redis && this.isConnected) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
      return true;
    } catch (error: any) {
      console.error("[CacheService] Delete error:", error.message);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.redis && this.isConnected) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return keys.length;
      }

      let count = 0;
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      const keys = Array.from(this.memoryCache.keys());
      for (const key of keys) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          count++;
        }
      }
      return count;
    } catch (error: any) {
      console.error("[CacheService] DeletePattern error:", error.message);
      return 0;
    }
  }

  async getTenantFeatureMatrix<T>(tenantId: string): Promise<T | null> {
    const key = this.getTenantKey(tenantId, "feature-matrix");
    return this.get<T>(key);
  }

  async setTenantFeatureMatrix(tenantId: string, matrix: any, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> {
    const key = this.getTenantKey(tenantId, "feature-matrix");
    return this.set(key, matrix, ttlSeconds);
  }

  async invalidateTenantCache(tenantId: string): Promise<number> {
    const pattern = `tenant:${tenantId}:*`;
    return this.deletePattern(pattern);
  }

  async invalidateAllFeatureMatrices(): Promise<number> {
    const pattern = `tenant:*:feature-matrix:*`;
    return this.deletePattern(pattern);
  }

  isRedisAvailable(): boolean {
    return this.redis !== null && this.isConnected;
  }

  async healthCheck(): Promise<{ redis: boolean; fallback: boolean }> {
    try {
      if (this.redis && this.isConnected) {
        await this.redis.ping();
        return { redis: true, fallback: false };
      }
    } catch {
      // Redis not available
    }
    return { redis: false, fallback: true };
  }
}

export const cacheService = new CacheService();
