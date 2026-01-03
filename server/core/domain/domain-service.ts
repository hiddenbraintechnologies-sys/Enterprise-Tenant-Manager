/**
 * Domain Service
 * 
 * Handles white-label domain management, verification, and resolution.
 */

import { db } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import { tenantDomains, tenants, TenantDomain } from '@shared/schema';
import crypto from 'crypto';
import { cache, cacheTTL } from '../../lib/cache';

// Domain verification token prefix
const VERIFICATION_PREFIX = 'bizflow-verify=';

// Reserved domains that cannot be used
const RESERVED_DOMAINS = [
  'localhost',
  'bizflow.app',
  'bizflow.io',
  'bizflow.com',
  'replit.app',
  'replit.dev',
];

interface DomainVerificationResult {
  verified: boolean;
  method: string;
  token?: string;
  error?: string;
  checkedAt: Date;
}

interface ResolvedTenant {
  id: string;
  name: string;
  slug: string | null;
  businessType: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  domain: TenantDomain;
}

export class DomainService {
  /**
   * Add a new custom domain to a tenant
   */
  async addDomain(params: {
    tenantId: string;
    domain: string;
    isPrimary?: boolean;
    createdBy?: string;
  }): Promise<TenantDomain> {
    const normalizedDomain = this.normalizeDomain(params.domain);

    // Validate domain format
    if (!this.isValidDomain(normalizedDomain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is reserved
    if (this.isReservedDomain(normalizedDomain)) {
      throw new Error('This domain is reserved and cannot be used');
    }

    // Check if domain already exists
    const existing = await this.getDomainByName(normalizedDomain);
    if (existing) {
      throw new Error('This domain is already registered');
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken();
    const verificationTokenHash = this.hashToken(verificationToken);

    // If setting as primary, unset other primary domains for this tenant
    if (params.isPrimary) {
      await db.update(tenantDomains)
        .set({ isPrimary: false })
        .where(eq(tenantDomains.tenantId, params.tenantId));
    }

    // Create domain record
    const [domain] = await db.insert(tenantDomains).values({
      tenantId: params.tenantId,
      domain: normalizedDomain,
      isPrimary: params.isPrimary ?? false,
      isVerified: false,
      verificationStatus: 'pending',
      verificationToken,
      verificationTokenHash,
      verificationMethod: 'dns_txt',
      verificationRequestedAt: new Date(),
      verificationAttempts: 0,
      enforceHttps: true,
      createdBy: params.createdBy,
    }).returning();

    // Invalidate cache
    await this.invalidateDomainCache(normalizedDomain);

    return domain;
  }

  /**
   * Get domain by name
   */
  async getDomainByName(domain: string): Promise<TenantDomain | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    
    const [result] = await db.select()
      .from(tenantDomains)
      .where(eq(tenantDomains.domain, normalizedDomain));

    return result || null;
  }

  /**
   * Get all domains for a tenant
   */
  async getTenantDomains(tenantId: string): Promise<TenantDomain[]> {
    return db.select()
      .from(tenantDomains)
      .where(eq(tenantDomains.tenantId, tenantId))
      .orderBy(desc(tenantDomains.isPrimary));
  }

  /**
   * Verify domain ownership via DNS TXT record
   */
  async verifyDomain(domainId: string): Promise<DomainVerificationResult> {
    const domain = await this.getDomainById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    // Update status to verifying
    await db.update(tenantDomains)
      .set({
        verificationStatus: 'verifying',
        verificationCheckedAt: new Date(),
        verificationAttempts: (domain.verificationAttempts || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));

    try {
      // Perform DNS TXT record lookup
      const verified = await this.checkDnsTxtRecord(domain.domain, domain.verificationToken!);

      if (verified) {
        await db.update(tenantDomains)
          .set({
            isVerified: true,
            verificationStatus: 'verified',
            verifiedAt: new Date(),
            verificationError: null,
            updatedAt: new Date(),
          })
          .where(eq(tenantDomains.id, domainId));

        // Invalidate and warm cache
        await this.invalidateDomainCache(domain.domain);

        return {
          verified: true,
          method: 'dns_txt',
          checkedAt: new Date(),
        };
      }

      // Verification failed
      await db.update(tenantDomains)
        .set({
          verificationStatus: 'failed',
          verificationError: 'DNS TXT record not found or does not match',
          updatedAt: new Date(),
        })
        .where(eq(tenantDomains.id, domainId));

      return {
        verified: false,
        method: 'dns_txt',
        token: domain.verificationToken!,
        error: 'DNS TXT record not found. Please add the verification record.',
        checkedAt: new Date(),
      };
    } catch (error: any) {
      await db.update(tenantDomains)
        .set({
          verificationStatus: 'failed',
          verificationError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(tenantDomains.id, domainId));

      return {
        verified: false,
        method: 'dns_txt',
        error: error.message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Check DNS TXT record for verification token
   */
  private async checkDnsTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
    const dns = require('dns').promises;
    const expectedValue = `${VERIFICATION_PREFIX}${expectedToken}`;

    try {
      // Check TXT records on the domain itself
      const records = await dns.resolveTxt(domain);
      for (const record of records) {
        const txt = record.join('');
        if (txt === expectedValue) {
          return true;
        }
      }

      // Also check _bizflow subdomain
      try {
        const subdomainRecords = await dns.resolveTxt(`_bizflow.${domain}`);
        for (const record of subdomainRecords) {
          const txt = record.join('');
          if (txt === expectedValue) {
            return true;
          }
        }
      } catch {
        // Subdomain may not exist, that's fine
      }

      return false;
    } catch (error: any) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Resolve tenant from hostname
   */
  async resolveTenantByHost(hostname: string): Promise<ResolvedTenant | null> {
    const normalizedHost = this.normalizeDomain(hostname);

    // Check cache first
    const cacheKey = `domain:tenant:${normalizedHost}`;
    const cached = await cache.get<ResolvedTenant>(cacheKey);
    if (cached) {
      return cached;
    }

    // Look up domain in database
    const [domain] = await db.select()
      .from(tenantDomains)
      .where(and(
        eq(tenantDomains.domain, normalizedHost),
        eq(tenantDomains.isVerified, true),
        eq(tenantDomains.verificationStatus, 'verified')
      ));

    if (!domain) {
      return null;
    }

    // Get tenant details
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, domain.tenantId));

    if (!tenant || !tenant.isActive) {
      return null;
    }

    const result: ResolvedTenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
      primaryColor: tenant.primaryColor,
      logoUrl: tenant.logoUrl,
      domain,
    };

    // Cache the result
    await cache.set(cacheKey, result, { ttl: cacheTTL.medium });

    return result;
  }

  /**
   * Get domain by ID
   */
  async getDomainById(domainId: string): Promise<TenantDomain | null> {
    const [domain] = await db.select()
      .from(tenantDomains)
      .where(eq(tenantDomains.id, domainId));
    return domain || null;
  }

  /**
   * Update domain
   */
  async updateDomain(domainId: string, updates: {
    isPrimary?: boolean;
    enforceHttps?: boolean;
    redirectToSlug?: string;
    metadata?: Record<string, any>;
  }): Promise<TenantDomain> {
    const domain = await this.getDomainById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    // If setting as primary, unset other primary domains
    if (updates.isPrimary) {
      await db.update(tenantDomains)
        .set({ isPrimary: false })
        .where(eq(tenantDomains.tenantId, domain.tenantId));
    }

    const [updated] = await db.update(tenantDomains)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId))
      .returning();

    // Invalidate cache
    await this.invalidateDomainCache(domain.domain);

    return updated;
  }

  /**
   * Delete domain
   */
  async deleteDomain(domainId: string): Promise<void> {
    const domain = await this.getDomainById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    await db.delete(tenantDomains)
      .where(eq(tenantDomains.id, domainId));

    // Invalidate cache
    await this.invalidateDomainCache(domain.domain);
  }

  /**
   * Revoke domain verification
   */
  async revokeDomain(domainId: string, reason?: string): Promise<void> {
    const domain = await this.getDomainById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    await db.update(tenantDomains)
      .set({
        isVerified: false,
        verificationStatus: 'revoked',
        verificationError: reason || 'Verification revoked',
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));

    // Invalidate cache
    await this.invalidateDomainCache(domain.domain);
  }

  /**
   * Get verification instructions for a domain
   */
  getVerificationInstructions(domain: TenantDomain): {
    method: string;
    record: {
      type: string;
      name: string;
      value: string;
    };
    alternative: {
      type: string;
      name: string;
      value: string;
    };
  } {
    return {
      method: 'DNS TXT Record',
      record: {
        type: 'TXT',
        name: domain.domain,
        value: `${VERIFICATION_PREFIX}${domain.verificationToken}`,
      },
      alternative: {
        type: 'TXT',
        name: `_bizflow.${domain.domain}`,
        value: `${VERIFICATION_PREFIX}${domain.verificationToken}`,
      },
    };
  }

  /**
   * Normalize domain (lowercase, strip protocol, strip port, strip trailing slash)
   */
  private normalizeDomain(domain: string): string {
    let normalized = domain.toLowerCase().trim();
    
    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, '');
    
    // Remove port
    normalized = normalized.replace(/:\d+$/, '');
    
    // Remove path
    normalized = normalized.replace(/\/.*$/, '');
    
    // Remove www prefix (optional - depends on business requirements)
    // normalized = normalized.replace(/^www\./, '');

    return normalized;
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    // Basic domain regex
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    return domainRegex.test(domain);
  }

  /**
   * Check if domain is reserved
   */
  private isReservedDomain(domain: string): boolean {
    return RESERVED_DOMAINS.some(reserved => 
      domain === reserved || domain.endsWith(`.${reserved}`)
    );
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash verification token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Invalidate domain cache
   */
  private async invalidateDomainCache(domain: string): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    await cache.del(`domain:tenant:${normalizedDomain}`);
  }

  /**
   * Get primary domain for tenant
   */
  async getPrimaryDomain(tenantId: string): Promise<TenantDomain | null> {
    const [domain] = await db.select()
      .from(tenantDomains)
      .where(and(
        eq(tenantDomains.tenantId, tenantId),
        eq(tenantDomains.isPrimary, true),
        eq(tenantDomains.isVerified, true)
      ));
    return domain || null;
  }
}

export const domainService = new DomainService();
