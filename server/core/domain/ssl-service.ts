/**
 * SSL Certificate Service
 * 
 * Handles automated SSL certificate provisioning and renewal for custom domains.
 * Designed to work with Let's Encrypt ACME protocol in production.
 */

import { db } from '../../db';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { tenantDomains, TenantDomain } from '@shared/schema';
import crypto from 'crypto';
import { cache, cacheTTL } from '../../lib/cache';

// Certificate status types
type CertificateStatus = 
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'failed'
  | 'revoked';

interface CertificateInfo {
  status: CertificateStatus;
  domain: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  fingerprint?: string;
  renewalDate?: Date;
  lastError?: string;
}

interface ACMEChallenge {
  type: 'http-01' | 'dns-01';
  token: string;
  keyAuthorization: string;
  expiresAt: Date;
}

// In-memory storage for ACME challenges (would use Redis in production)
const acmeChallenges = new Map<string, ACMEChallenge>();

// Certificate renewal threshold (days before expiry)
const RENEWAL_THRESHOLD_DAYS = 30;
const EXPIRING_SOON_DAYS = 14;

export class SSLService {
  private acmeDirectoryUrl: string;
  private accountKeyPem: string | null = null;

  constructor() {
    // Use Let's Encrypt staging for development, production for real certs
    this.acmeDirectoryUrl = process.env.NODE_ENV === 'production'
      ? 'https://acme-v02.api.letsencrypt.org/directory'
      : 'https://acme-staging-v02.api.letsencrypt.org/directory';
  }

  /**
   * Request a new SSL certificate for a domain
   */
  async requestCertificate(domainId: string): Promise<CertificateInfo> {
    const domain = await this.getDomain(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    if (!domain.isVerified) {
      throw new Error('Domain must be verified before requesting SSL certificate');
    }

    // Update status to provisioning
    await this.updateCertificateStatus(domainId, 'provisioning');

    try {
      // Generate ACME challenge
      const challenge = await this.createACMEChallenge(domain.domain);
      
      // Store challenge for HTTP-01 validation
      acmeChallenges.set(domain.domain, challenge);

      // In production, this would:
      // 1. Register with ACME server
      // 2. Request certificate order
      // 3. Complete HTTP-01 or DNS-01 challenge
      // 4. Download and store certificate

      // For now, simulate certificate provisioning
      const certInfo = await this.simulateCertificateProvisioning(domain.domain);

      // Update database with certificate info
      await db.update(tenantDomains)
        .set({
          certificateStatus: 'active',
          certificateExpiresAt: certInfo.validTo,
          updatedAt: new Date(),
        })
        .where(eq(tenantDomains.id, domainId));

      // Clear challenge
      acmeChallenges.delete(domain.domain);

      return certInfo;
    } catch (error: any) {
      await this.updateCertificateStatus(domainId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Check and renew certificates expiring soon
   */
  async checkAndRenewCertificates(): Promise<{ renewed: number; failed: number }> {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + RENEWAL_THRESHOLD_DAYS);

    // Find domains with certificates expiring soon
    const expiringDomains = await db.select()
      .from(tenantDomains)
      .where(and(
        eq(tenantDomains.isVerified, true),
        eq(tenantDomains.certificateStatus, 'active'),
        lt(tenantDomains.certificateExpiresAt, renewalDate),
        isNotNull(tenantDomains.certificateExpiresAt)
      ));

    let renewed = 0;
    let failed = 0;

    for (const domain of expiringDomains) {
      try {
        console.log(`Renewing certificate for ${domain.domain}`);
        await this.requestCertificate(domain.id);
        renewed++;
      } catch (error: any) {
        console.error(`Failed to renew certificate for ${domain.domain}:`, error.message);
        failed++;
      }
    }

    return { renewed, failed };
  }

  /**
   * Get certificate status for a domain
   */
  async getCertificateStatus(domainId: string): Promise<CertificateInfo | null> {
    const domain = await this.getDomain(domainId);
    if (!domain) {
      return null;
    }

    const now = new Date();
    let status: CertificateStatus = (domain.certificateStatus as CertificateStatus) || 'pending';

    // Check if certificate is expiring soon or expired
    if (domain.certificateExpiresAt) {
      const expiresAt = new Date(domain.certificateExpiresAt);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= EXPIRING_SOON_DAYS) {
        status = 'expiring_soon';
      }
    }

    return {
      status,
      domain: domain.domain,
      validTo: domain.certificateExpiresAt || undefined,
      renewalDate: domain.certificateExpiresAt 
        ? new Date(new Date(domain.certificateExpiresAt).getTime() - (RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000))
        : undefined,
    };
  }

  /**
   * Handle ACME HTTP-01 challenge
   */
  getACMEChallengeResponse(token: string): string | null {
    // Find challenge by token
    const entries = Array.from(acmeChallenges.entries());
    for (const [domain, challenge] of entries) {
      if (challenge.token === token) {
        return challenge.keyAuthorization;
      }
    }
    return null;
  }

  /**
   * Revoke certificate for a domain
   */
  async revokeCertificate(domainId: string, reason?: string): Promise<void> {
    await this.updateCertificateStatus(domainId, 'revoked', reason);
    
    await db.update(tenantDomains)
      .set({
        certificateExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));
  }

  /**
   * Create ACME challenge for domain verification
   */
  private async createACMEChallenge(domain: string): Promise<ACMEChallenge> {
    const token = crypto.randomBytes(32).toString('base64url');
    const thumbprint = crypto.randomBytes(32).toString('base64url');
    const keyAuthorization = `${token}.${thumbprint}`;

    return {
      type: 'http-01',
      token,
      keyAuthorization,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };
  }

  /**
   * Simulate certificate provisioning (for development)
   */
  private async simulateCertificateProvisioning(domain: string): Promise<CertificateInfo> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    const now = new Date();
    const validTo = new Date(now);
    validTo.setDate(validTo.getDate() + 90); // 90 days validity

    return {
      status: 'active',
      domain,
      issuer: 'Let\'s Encrypt',
      validFrom: now,
      validTo,
      fingerprint: crypto.randomBytes(20).toString('hex'),
    };
  }

  /**
   * Update certificate status in database
   */
  private async updateCertificateStatus(
    domainId: string, 
    status: CertificateStatus,
    error?: string
  ): Promise<void> {
    const metadata = error ? { lastCertError: error, lastCertErrorAt: new Date() } : {};
    
    await db.update(tenantDomains)
      .set({
        certificateStatus: status,
        metadata: metadata as any,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));
  }

  /**
   * Get domain by ID
   */
  private async getDomain(domainId: string): Promise<TenantDomain | null> {
    const [domain] = await db.select()
      .from(tenantDomains)
      .where(eq(tenantDomains.id, domainId));
    return domain || null;
  }

  /**
   * Get domains needing certificate renewal
   */
  async getDomainsNeedingRenewal(): Promise<TenantDomain[]> {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + RENEWAL_THRESHOLD_DAYS);

    return db.select()
      .from(tenantDomains)
      .where(and(
        eq(tenantDomains.isVerified, true),
        lt(tenantDomains.certificateExpiresAt, renewalDate),
        isNotNull(tenantDomains.certificateExpiresAt)
      ));
  }
}

export const sslService = new SSLService();
