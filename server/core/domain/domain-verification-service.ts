/**
 * Domain Verification Service
 * 
 * Enhanced domain ownership verification with multiple methods.
 */

import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { tenantDomains, TenantDomain } from '@shared/schema';
import crypto from 'crypto';
import dns from 'dns';

const VERIFICATION_PREFIX = 'bizflow-verify=';
const HTTP_VERIFICATION_PATH = '/.well-known/bizflow-verification.txt';

type VerificationMethod = 'dns_txt' | 'dns_cname' | 'http' | 'meta_tag';

interface VerificationResult {
  success: boolean;
  method: VerificationMethod;
  message: string;
  details?: Record<string, any>;
  checkedAt: Date;
}

interface VerificationCheck {
  check: (domain: string, token: string) => Promise<boolean>;
  instructions: (domain: string, token: string) => VerificationInstructions;
}

interface VerificationInstructions {
  method: string;
  title: string;
  steps: string[];
  record?: {
    type: string;
    name: string;
    value: string;
  };
}

export class DomainVerificationService {
  private verificationMethods: Record<VerificationMethod, VerificationCheck>;

  constructor() {
    this.verificationMethods = {
      dns_txt: {
        check: this.checkDnsTxt.bind(this),
        instructions: this.getDnsTxtInstructions.bind(this),
      },
      dns_cname: {
        check: this.checkDnsCname.bind(this),
        instructions: this.getDnsCnameInstructions.bind(this),
      },
      http: {
        check: this.checkHttpFile.bind(this),
        instructions: this.getHttpInstructions.bind(this),
      },
      meta_tag: {
        check: async () => false, // Not implemented
        instructions: () => ({
          method: 'meta_tag',
          title: 'Meta Tag Verification',
          steps: ['Not yet supported'],
        }),
      },
    };
  }

  /**
   * Verify domain using all available methods
   */
  async verifyDomain(domainId: string): Promise<VerificationResult> {
    const domain = await this.getDomain(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    if (!domain.verificationToken) {
      throw new Error('No verification token found');
    }

    // Update status
    await this.updateVerificationStatus(domainId, 'verifying');

    // Try each verification method
    const methods: VerificationMethod[] = ['dns_txt', 'http', 'dns_cname'];
    
    for (const method of methods) {
      const checker = this.verificationMethods[method];
      if (!checker) continue;

      try {
        const success = await checker.check(domain.domain, domain.verificationToken);
        
        if (success) {
          await this.markAsVerified(domainId, method);
          return {
            success: true,
            method,
            message: `Domain verified successfully using ${method} method`,
            checkedAt: new Date(),
          };
        }
      } catch (error) {
        console.log(`Verification method ${method} failed:`, error);
      }
    }

    // All methods failed
    await this.updateVerificationStatus(domainId, 'failed', 'No verification record found');
    
    return {
      success: false,
      method: 'dns_txt',
      message: 'Verification failed. Please ensure the verification record is properly configured.',
      checkedAt: new Date(),
    };
  }

  /**
   * Get verification instructions for all methods
   */
  getVerificationInstructions(domain: TenantDomain): {
    token: string;
    methods: VerificationInstructions[];
  } {
    if (!domain.verificationToken) {
      throw new Error('No verification token available');
    }

    const instructions: VerificationInstructions[] = [];

    const methods: VerificationMethod[] = ['dns_txt', 'dns_cname', 'http'];
    for (const method of methods) {
      const checker = this.verificationMethods[method];
      if (checker) {
        instructions.push(checker.instructions(domain.domain, domain.verificationToken));
      }
    }

    return {
      token: domain.verificationToken,
      methods: instructions,
    };
  }

  /**
   * Generate new verification token
   */
  async regenerateToken(domainId: string): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await db.update(tenantDomains)
      .set({
        verificationToken: token,
        verificationTokenHash: tokenHash,
        verificationStatus: 'pending',
        verificationAttempts: 0,
        verificationError: null,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));

    return token;
  }

  /**
   * Check DNS TXT record
   */
  private async checkDnsTxt(domain: string, token: string): Promise<boolean> {
    const expectedValue = `${VERIFICATION_PREFIX}${token}`;
    const dnsResolver = new dns.promises.Resolver();
    dnsResolver.setServers(['8.8.8.8', '1.1.1.1']); // Use public DNS

    // Check root domain
    try {
      const records = await dnsResolver.resolveTxt(domain);
      for (const record of records) {
        const txt = record.join('');
        if (txt === expectedValue) {
          return true;
        }
      }
    } catch (error) {
      // Continue to check subdomain
    }

    // Check _bizflow subdomain
    try {
      const subdomainRecords = await dnsResolver.resolveTxt(`_bizflow.${domain}`);
      for (const record of subdomainRecords) {
        const txt = record.join('');
        if (txt === expectedValue) {
          return true;
        }
      }
    } catch (error) {
      // Subdomain doesn't exist
    }

    return false;
  }

  /**
   * Check DNS CNAME record
   */
  private async checkDnsCname(domain: string, token: string): Promise<boolean> {
    const expectedCname = `verify.bizflow.app`;
    const verifySubdomain = `_bizflow-verify.${domain}`;

    try {
      const dnsResolver = new dns.promises.Resolver();
      dnsResolver.setServers(['8.8.8.8', '1.1.1.1']);
      
      const records = await dnsResolver.resolveCname(verifySubdomain);
      return records.includes(expectedCname);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check HTTP file verification
   */
  private async checkHttpFile(domain: string, token: string): Promise<boolean> {
    const expectedContent = token;
    const urls = [
      `https://${domain}${HTTP_VERIFICATION_PATH}`,
      `http://${domain}${HTTP_VERIFICATION_PATH}`,
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'BizFlow-Domain-Verification/1.0',
          },
        });

        clearTimeout(timeout);

        if (response.ok) {
          const content = await response.text();
          if (content.trim() === expectedContent) {
            return true;
          }
        }
      } catch (error) {
        // Continue to next URL
      }
    }

    return false;
  }

  /**
   * Get DNS TXT verification instructions
   */
  private getDnsTxtInstructions(domain: string, token: string): VerificationInstructions {
    return {
      method: 'dns_txt',
      title: 'DNS TXT Record Verification',
      steps: [
        'Log into your domain registrar or DNS provider',
        'Navigate to DNS settings for your domain',
        'Add a new TXT record with the following details:',
        `   Name/Host: @ or ${domain}`,
        `   Value: ${VERIFICATION_PREFIX}${token}`,
        'Save the record and wait for DNS propagation (may take up to 48 hours)',
        'Click Verify to check the record',
      ],
      record: {
        type: 'TXT',
        name: domain,
        value: `${VERIFICATION_PREFIX}${token}`,
      },
    };
  }

  /**
   * Get DNS CNAME verification instructions
   */
  private getDnsCnameInstructions(domain: string, token: string): VerificationInstructions {
    return {
      method: 'dns_cname',
      title: 'DNS CNAME Record Verification',
      steps: [
        'Log into your domain registrar or DNS provider',
        'Navigate to DNS settings for your domain',
        'Add a new CNAME record with the following details:',
        `   Name/Host: _bizflow-verify`,
        '   Value: verify.bizflow.app',
        'Save the record and wait for DNS propagation',
        'Click Verify to check the record',
      ],
      record: {
        type: 'CNAME',
        name: `_bizflow-verify.${domain}`,
        value: 'verify.bizflow.app',
      },
    };
  }

  /**
   * Get HTTP file verification instructions
   */
  private getHttpInstructions(domain: string, token: string): VerificationInstructions {
    return {
      method: 'http',
      title: 'HTTP File Verification',
      steps: [
        `Create a file at the following path on your server: ${HTTP_VERIFICATION_PATH}`,
        `The file content should be exactly: ${token}`,
        'Ensure the file is accessible via HTTPS',
        'Click Verify to check the file',
      ],
    };
  }

  /**
   * Update verification status
   */
  private async updateVerificationStatus(
    domainId: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    const domain = await this.getDomain(domainId);
    
    await db.update(tenantDomains)
      .set({
        verificationStatus: status as any,
        verificationCheckedAt: new Date(),
        verificationAttempts: (domain?.verificationAttempts || 0) + 1,
        verificationError: error || null,
        updatedAt: new Date(),
      })
      .where(eq(tenantDomains.id, domainId));
  }

  /**
   * Mark domain as verified
   */
  private async markAsVerified(domainId: string, method: VerificationMethod): Promise<void> {
    await db.update(tenantDomains)
      .set({
        isVerified: true,
        verificationStatus: 'verified',
        verificationMethod: method,
        verifiedAt: new Date(),
        verificationError: null,
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
   * Check if domain is properly configured for SSL
   */
  async checkSSLReadiness(domain: string): Promise<{
    ready: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check DNS resolution
    try {
      const dnsResolver = new dns.promises.Resolver();
      await dnsResolver.resolve4(domain);
    } catch (error) {
      issues.push('Domain does not resolve to an IP address');
    }

    // Check HTTP accessibility
    try {
      const response = await fetch(`http://${domain}/`, {
        method: 'HEAD',
        redirect: 'manual',
      });
      if (response.status >= 500) {
        issues.push('Server returned an error response');
      }
    } catch (error) {
      issues.push('Domain is not accessible via HTTP');
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }
}

export const domainVerificationService = new DomainVerificationService();
