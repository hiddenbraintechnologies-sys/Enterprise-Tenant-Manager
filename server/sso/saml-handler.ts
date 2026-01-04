/**
 * SAML 2.0 Handler
 * 
 * Handles SAML 2.0 authentication flows including:
 * - SP-initiated SSO
 * - IdP-initiated SSO
 * - Single Logout (SLO)
 * - Metadata exchange
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { users, userTenants, roles, tenants } from '@shared/schema';
import {
  ssoProviderConfigs,
  ssoUserIdentities,
  ssoAuthSessions,
  ssoAuditLog,
  SsoProviderConfig,
} from '../../shared/models/sso';
import {
  encryptToken,
  decryptToken,
  generateState,
} from './token-handler';
import crypto from 'crypto';
import { z } from 'zod';

interface SamlConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  signatureAlgorithm?: string;
  nameIdFormat?: string;
  wantAssertionsSigned?: boolean;
  wantResponseSigned?: boolean;
}

interface SamlAssertion {
  issuer: string;
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  conditions?: {
    notBefore?: Date;
    notOnOrAfter?: Date;
    audience?: string;
  };
}

interface SamlAuthResult {
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    groups?: string[];
  };
  sessionIndex?: string;
  relayState?: string;
}

const SAML_NAMESPACE = 'urn:oasis:names:tc:SAML:2.0';
const SAML_BINDINGS = {
  HTTP_REDIRECT: `${SAML_NAMESPACE}:bindings:HTTP-Redirect`,
  HTTP_POST: `${SAML_NAMESPACE}:bindings:HTTP-POST`,
};

const NAME_ID_FORMATS = {
  EMAIL: `${SAML_NAMESPACE}:nameid-format:emailAddress`,
  PERSISTENT: `${SAML_NAMESPACE}:nameid-format:persistent`,
  TRANSIENT: `${SAML_NAMESPACE}:nameid-format:transient`,
  UNSPECIFIED: `${SAML_NAMESPACE}:nameid-format:unspecified`,
};

export class SamlHandler {
  private spEntityId: string;
  private spAcsUrl: string;
  private spSloUrl: string;

  constructor(baseUrl: string) {
    this.spEntityId = `${baseUrl}/saml/metadata`;
    this.spAcsUrl = `${baseUrl}/api/sso/saml/acs`;
    this.spSloUrl = `${baseUrl}/api/sso/saml/slo`;
  }

  /**
   * Setup SAML provider for a tenant
   */
  async setupSamlProvider(
    tenantId: string,
    config: {
      providerName: string;
      displayName?: string;
      metadataUrl?: string;
      entityId: string;
      ssoUrl: string;
      sloUrl?: string;
      certificate: string;
      allowedDomains?: string[];
      autoCreateUsers?: boolean;
      attributeMappings?: Record<string, string>;
    }
  ): Promise<SsoProviderConfig> {
    let idpConfig: Partial<SamlConfig> = {
      entityId: config.entityId,
      ssoUrl: config.ssoUrl,
      sloUrl: config.sloUrl,
      certificate: config.certificate,
    };

    if (config.metadataUrl) {
      const metadata = await this.fetchIdpMetadata(config.metadataUrl);
      if (metadata) {
        idpConfig = { ...idpConfig, ...metadata };
      }
    }

    const [provider] = await db.insert(ssoProviderConfigs).values({
      tenantId,
      providerType: 'saml',
      providerName: config.providerName,
      displayName: config.displayName || config.providerName,
      clientId: this.spEntityId,
      clientSecretEncrypted: encryptToken('saml-no-secret'),
      samlMetadataUrl: config.metadataUrl || null,
      samlEntityId: idpConfig.entityId,
      authorizationUrl: idpConfig.ssoUrl,
      logoutUrl: idpConfig.sloUrl || null,
      samlCertificate: idpConfig.certificate,
      claimMappings: config.attributeMappings || {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        groups: 'groups',
      },
      allowedDomains: config.allowedDomains || [],
      autoCreateUsers: config.autoCreateUsers ?? true,
      status: 'inactive',
    }).returning();

    await this.logAuditEvent(tenantId, 'saml.provider.created', {
      providerId: provider.id,
      entityId: idpConfig.entityId,
    });

    return provider;
  }

  /**
   * Generate SP metadata XML
   */
  generateSpMetadata(tenantId?: string): string {
    const entityId = tenantId 
      ? `${this.spEntityId}?tenant=${tenantId}`
      : this.spEntityId;

    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="${SAML_NAMESPACE}:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true" 
                       protocolSupportEnumeration="${SAML_NAMESPACE}:protocol">
    <md:NameIDFormat>${NAME_ID_FORMATS.EMAIL}</md:NameIDFormat>
    <md:NameIDFormat>${NAME_ID_FORMATS.PERSISTENT}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="${SAML_BINDINGS.HTTP_POST}" 
                                  Location="${this.spAcsUrl}" index="0" isDefault="true"/>
    <md:SingleLogoutService Binding="${SAML_BINDINGS.HTTP_REDIRECT}" 
                            Location="${this.spSloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Generate SAML AuthnRequest
   */
  async generateAuthnRequest(
    provider: SsoProviderConfig,
    returnUrl?: string
  ): Promise<{ url: string; relayState: string }> {
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();
    const state = generateState();
    const relayState = `${provider.id}:${state}`;

    const authnRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="${SAML_NAMESPACE}:protocol"
                    xmlns:saml="${SAML_NAMESPACE}:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${provider.authorizationUrl}"
                    AssertionConsumerServiceURL="${this.spAcsUrl}"
                    ProtocolBinding="${SAML_BINDINGS.HTTP_POST}">
  <saml:Issuer>${this.spEntityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="${NAME_ID_FORMATS.EMAIL}" AllowCreate="true"/>
</samlp:AuthnRequest>`;

    await db.insert(ssoAuthSessions).values({
      tenantId: provider.tenantId,
      providerId: provider.id,
      state,
      nonce: requestId,
      redirectUri: this.spAcsUrl,
      returnUrl,
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const encodedRequest = Buffer.from(authnRequest).toString('base64');
    const url = new URL(provider.authorizationUrl!);
    url.searchParams.set('SAMLRequest', encodedRequest);
    url.searchParams.set('RelayState', relayState);

    return { url: url.toString(), relayState };
  }

  /**
   * Parse and validate SAML Response
   */
  async parseSamlResponse(
    provider: SsoProviderConfig,
    samlResponse: string,
    relayState: string
  ): Promise<SamlAuthResult> {
    const [providerId, state] = relayState.split(':');
    
    if (providerId !== provider.id) {
      throw new Error('Provider ID mismatch in SAML response');
    }
    
    const [session] = await db.select()
      .from(ssoAuthSessions)
      .where(and(
        eq(ssoAuthSessions.state, state || relayState),
        eq(ssoAuthSessions.providerId, provider.id),
        eq(ssoAuthSessions.status, 'pending')
      ));

    if (!session) {
      throw new Error('Invalid SAML session');
    }
    
    if (session.providerId !== provider.id) {
      throw new Error('Session provider mismatch - potential security issue');
    }

    if (new Date() > session.expiresAt) {
      await db.update(ssoAuthSessions)
        .set({ status: 'expired' })
        .where(eq(ssoAuthSessions.id, session.id));
      throw new Error('SAML session expired');
    }

    const responseXml = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    const assertion = this.extractAssertion(responseXml);
    
    if (!assertion) {
      throw new Error('No valid assertion found in SAML response');
    }

    this.validateAssertion(assertion, provider);

    await db.update(ssoAuthSessions)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(ssoAuthSessions.id, session.id));

    const claimMappings = provider.claimMappings as Record<string, string>;
    const attrs = assertion.attributes;

    return {
      user: {
        email: this.getAttributeValue(attrs, claimMappings.email || 'email'),
        firstName: this.getAttributeValue(attrs, claimMappings.firstName || 'firstName'),
        lastName: this.getAttributeValue(attrs, claimMappings.lastName || 'lastName'),
        groups: this.getAttributeArray(attrs, claimMappings.groups || 'groups'),
      },
      sessionIndex: assertion.sessionIndex,
      relayState: session.returnUrl || undefined,
    };
  }

  /**
   * Generate SAML LogoutRequest
   */
  async generateLogoutRequest(
    provider: SsoProviderConfig,
    nameId: string,
    sessionIndex?: string
  ): Promise<string> {
    if (!provider.logoutUrl) {
      throw new Error('Provider does not support SAML logout');
    }

    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    const logoutRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="${SAML_NAMESPACE}:protocol"
                     xmlns:saml="${SAML_NAMESPACE}:assertion"
                     ID="${requestId}"
                     Version="2.0"
                     IssueInstant="${issueInstant}"
                     Destination="${provider.logoutUrl}">
  <saml:Issuer>${this.spEntityId}</saml:Issuer>
  <saml:NameID Format="${NAME_ID_FORMATS.EMAIL}">${nameId}</saml:NameID>
  ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
</samlp:LogoutRequest>`;

    const encodedRequest = Buffer.from(logoutRequest).toString('base64');
    const url = new URL(provider.logoutUrl);
    url.searchParams.set('SAMLRequest', encodedRequest);

    return url.toString();
  }

  /**
   * Fetch and parse IdP metadata
   */
  private async fetchIdpMetadata(metadataUrl: string): Promise<SamlConfig | null> {
    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) return null;

      const xml = await response.text();
      return this.parseIdpMetadata(xml);
    } catch {
      return null;
    }
  }

  /**
   * Parse IdP metadata XML
   */
  private parseIdpMetadata(xml: string): SamlConfig | null {
    const entityIdMatch = xml.match(/entityID="([^"]+)"/);
    const ssoUrlMatch = xml.match(/SingleSignOnService[^>]+Location="([^"]+)"/);
    const sloUrlMatch = xml.match(/SingleLogoutService[^>]+Location="([^"]+)"/);
    const certMatch = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);

    if (!entityIdMatch || !ssoUrlMatch || !certMatch) {
      return null;
    }

    return {
      entityId: entityIdMatch[1],
      ssoUrl: ssoUrlMatch[1],
      sloUrl: sloUrlMatch?.[1],
      certificate: certMatch[1].replace(/\s/g, ''),
    };
  }

  /**
   * Extract assertion from SAML response (simplified parsing)
   */
  private extractAssertion(responseXml: string): SamlAssertion | null {
    const issuerMatch = responseXml.match(/<(?:saml2?:)?Issuer[^>]*>([^<]+)<\/(?:saml2?:)?Issuer>/);
    const nameIdMatch = responseXml.match(/<(?:saml2?:)?NameID[^>]*Format="([^"]*)"[^>]*>([^<]+)<\/(?:saml2?:)?NameID>/);
    const sessionIndexMatch = responseXml.match(/SessionIndex="([^"]+)"/);

    if (!issuerMatch || !nameIdMatch) {
      return null;
    }

    const attributes: Record<string, string | string[]> = {};
    const attrRegex = /<(?:saml2?:)?Attribute\s+Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\/(?:saml2?:)?AttributeValue>[\s\S]*?<\/(?:saml2?:)?Attribute>/g;
    
    let match;
    while ((match = attrRegex.exec(responseXml)) !== null) {
      const name = match[1];
      const value = match[2];
      if (attributes[name]) {
        if (Array.isArray(attributes[name])) {
          (attributes[name] as string[]).push(value);
        } else {
          attributes[name] = [attributes[name] as string, value];
        }
      } else {
        attributes[name] = value;
      }
    }

    return {
      issuer: issuerMatch[1],
      nameId: nameIdMatch[2],
      nameIdFormat: nameIdMatch[1],
      sessionIndex: sessionIndexMatch?.[1],
      attributes,
    };
  }

  /**
   * Validate SAML assertion
   */
  private validateAssertion(assertion: SamlAssertion, provider: SsoProviderConfig): void {
    if (assertion.issuer !== provider.samlEntityId) {
      throw new Error('Invalid SAML issuer');
    }

    if (assertion.conditions?.notOnOrAfter) {
      if (new Date() > assertion.conditions.notOnOrAfter) {
        throw new Error('SAML assertion has expired');
      }
    }
  }

  private getAttributeValue(attrs: Record<string, string | string[]>, key: string): string {
    const value = attrs[key];
    return Array.isArray(value) ? value[0] : value || '';
  }

  private getAttributeArray(attrs: Record<string, string | string[]>, key: string): string[] {
    const value = attrs[key];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private async logAuditEvent(
    tenantId: string,
    action: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await db.insert(ssoAuditLog).values({
      tenantId,
      action,
      status: 'success',
      metadata,
      createdAt: new Date(),
    });
  }
}

export function createSamlHandler(baseUrl: string): SamlHandler {
  return new SamlHandler(baseUrl);
}
