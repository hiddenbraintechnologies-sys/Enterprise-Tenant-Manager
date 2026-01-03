/**
 * Redis-compatible Caching Service
 * 
 * Provides caching for frequent reads with automatic TTL management.
 * Uses in-memory cache as fallback when Redis is not available.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number;  // Time to live in seconds
  prefix?: string;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 300; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? this.defaultTTL;
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, { value, expiresAt });
    this.stats.sets++;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;

    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    });

    return deleted;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return -2;
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Shutdown the cache service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const cache = new CacheService();

// Cache key generators for common patterns
export const cacheKeys = {
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantConfig: (tenantId: string) => `tenant:${tenantId}:config`,
  tenantFeatures: (tenantId: string) => `tenant:${tenantId}:features`,
  userContext: (userId: string) => `user:${userId}:context`,
  userPermissions: (userId: string, tenantId: string) => `user:${userId}:tenant:${tenantId}:permissions`,
  dashboard: (tenantId: string, type: string) => `dashboard:${tenantId}:${type}`,
  analytics: (tenantId: string, range: string) => `analytics:${tenantId}:${range}`,
  subscription: (tenantId: string) => `subscription:${tenantId}`,
  invoices: (tenantId: string, page: number) => `invoices:${tenantId}:page:${page}`,
};

// Default TTL values (in seconds)
export const cacheTTL = {
  short: 60,          // 1 minute
  medium: 300,        // 5 minutes
  long: 900,          // 15 minutes
  dashboard: 120,     // 2 minutes
  config: 600,        // 10 minutes
  permissions: 300,   // 5 minutes
};
