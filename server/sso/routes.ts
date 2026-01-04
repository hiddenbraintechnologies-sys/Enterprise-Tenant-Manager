/**
 * SSO Routes
 * 
 * API endpoints for SSO provider management and authentication flows.
 */

import { Router, Request, Response } from 'express';
import { ssoService } from './sso-service';
import { googleSsoService } from './google-sso';
import { microsoftSsoService } from './microsoft-sso';
import { oktaSsoService } from './okta-sso';
import { createSamlHandler } from './saml-handler';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createProviderSchema = z.object({
  providerType: z.enum(['google', 'microsoft', 'github', 'okta', 'auth0', 'saml', 'oidc_generic']),
  providerName: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  issuerUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
});

const initiateAuthSchema = z.object({
  providerId: z.string().uuid(),
  returnUrl: z.string().optional(),
});

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

/**
 * Get all SSO providers for current tenant
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const providers = await ssoService.getTenantProviders(tenantId);
    
    // Remove sensitive fields
    const safeProviders = providers.map(p => ({
      id: p.id,
      providerType: p.providerType,
      providerName: p.providerName,
      displayName: p.displayName,
      status: p.status,
      isDefault: p.isDefault,
      allowedDomains: p.allowedDomains,
      autoCreateUsers: p.autoCreateUsers,
      lastUsedAt: p.lastUsedAt,
      createdAt: p.createdAt,
    }));

    res.json({ providers: safeProviders });
  } catch (error: any) {
    console.error('Error fetching SSO providers:', error);
    res.status(500).json({ error: 'Failed to fetch SSO providers' });
  }
});

/**
 * Create a new SSO provider configuration
 */
router.post('/providers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    // Check permission (admin only)
    const hasPermission = req.context?.permissions?.includes('tenant:manage') ||
                          req.context?.role?.name === 'Admin';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const parsed = createProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const provider = await ssoService.createProviderConfig(tenantId, {
      ...parsed.data,
      createdBy: userId,
    });

    res.status(201).json({
      id: provider.id,
      providerType: provider.providerType,
      providerName: provider.providerName,
      status: provider.status,
    });
  } catch (error: any) {
    console.error('Error creating SSO provider:', error);
    res.status(500).json({ error: 'Failed to create SSO provider' });
  }
});

/**
 * Get a specific SSO provider
 */
router.get('/providers/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const provider = await ssoService.getProviderById(req.params.id);
    
    if (!provider || provider.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Return safe version without secrets
    res.json({
      id: provider.id,
      providerType: provider.providerType,
      providerName: provider.providerName,
      displayName: provider.displayName,
      clientId: provider.clientId,
      issuerUrl: provider.issuerUrl,
      scopes: provider.scopes,
      allowedDomains: provider.allowedDomains,
      status: provider.status,
      isDefault: provider.isDefault,
      autoCreateUsers: provider.autoCreateUsers,
      autoLinkUsers: provider.autoLinkUsers,
      lastUsedAt: provider.lastUsedAt,
      createdAt: provider.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching SSO provider:', error);
    res.status(500).json({ error: 'Failed to fetch SSO provider' });
  }
});

/**
 * Activate a SSO provider
 */
router.post('/providers/:id/activate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const provider = await ssoService.getProviderById(req.params.id);
    if (!provider || provider.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await ssoService.activateProvider(req.params.id);
    res.json({ success: true, status: 'active' });
  } catch (error: any) {
    console.error('Error activating SSO provider:', error);
    res.status(500).json({ error: 'Failed to activate SSO provider' });
  }
});

/**
 * Deactivate a SSO provider
 */
router.post('/providers/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const provider = await ssoService.getProviderById(req.params.id);
    if (!provider || provider.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    await ssoService.deactivateProvider(req.params.id);
    res.json({ success: true, status: 'inactive' });
  } catch (error: any) {
    console.error('Error deactivating SSO provider:', error);
    res.status(500).json({ error: 'Failed to deactivate SSO provider' });
  }
});

/**
 * Initiate SSO authentication flow
 */
router.post('/auth/initiate', async (req: Request, res: Response) => {
  try {
    const parsed = initiateAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const provider = await ssoService.getProviderById(parsed.data.providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Construct redirect URI
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/callback`;

    const authUrl = await ssoService.generateAuthorizationUrl({
      tenantId: provider.tenantId,
      providerId: provider.id,
      redirectUri,
      returnUrl: parsed.data.returnUrl,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({ authorizationUrl: authUrl });
  } catch (error: any) {
    console.error('Error initiating SSO:', error);
    res.status(500).json({ error: 'Failed to initiate SSO authentication' });
  }
});

/**
 * SSO callback endpoint
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('SSO callback error:', error, error_description);
      return res.redirect(`/auth/error?error=${error}&description=${error_description}`);
    }

    if (!code || !state) {
      return res.redirect('/auth/error?error=missing_params');
    }

    // Construct redirect URI (same as initiate)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/callback`;

    const result = await ssoService.exchangeCodeForTokens({
      state: state as string,
      code: code as string,
      redirectUri,
    });

    // Check if user exists or needs to be created
    let identity = await ssoService.findUserIdentity(
      result.provider.id,
      result.user.providerUserId
    );

    if (identity) {
      // Update existing identity
      await ssoService.updateIdentityOnLogin(identity.id, result.tokens);
      
      // Redirect to app with success
      const returnUrl = result.session.returnUrl || '/dashboard';
      return res.redirect(`${returnUrl}?sso_success=true&user_id=${identity.userId}`);
    }

    // New SSO user - check if auto-create is enabled
    if (result.provider.autoCreateUsers) {
      // This would integrate with the main user creation flow
      // For now, redirect to complete registration
      const userInfo = encodeURIComponent(JSON.stringify({
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        profileImage: result.user.profileImage,
        providerId: result.provider.id,
        providerUserId: result.user.providerUserId,
      }));
      
      return res.redirect(`/auth/complete-registration?sso_data=${userInfo}`);
    }

    // Auto-create disabled, redirect to error
    return res.redirect('/auth/error?error=user_not_found&provider=' + result.provider.providerName);
  } catch (error: any) {
    console.error('SSO callback error:', error);
    return res.redirect(`/auth/error?error=callback_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Home Realm Discovery - find provider by email domain
 */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { email, tenantId } = req.body;

    if (!email || !tenantId) {
      return res.status(400).json({ error: 'Email and tenantId required' });
    }

    const provider = await ssoService.findProviderByDomain(tenantId, email);
    
    if (!provider) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      provider: {
        id: provider.id,
        providerType: provider.providerType,
        displayName: provider.displayName,
      },
    });
  } catch (error: any) {
    console.error('Error in HRD:', error);
    res.status(500).json({ error: 'Failed to discover SSO provider' });
  }
});

// ==================== GOOGLE SSO ROUTES ====================

const setupGoogleSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  enforceForDomains: z.boolean().optional(),
});

/**
 * Setup/update Google SSO for a tenant
 */
router.post('/google/setup', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const hasPermission = req.context?.permissions?.includes('tenant:manage') ||
                          req.context?.role?.name === 'Admin';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const parsed = setupGoogleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const provider = await googleSsoService.setupGoogleProvider(tenantId, parsed.data);

    res.json({
      success: true,
      providerId: provider.id,
      status: provider.status,
    });
  } catch (error: any) {
    console.error('Error setting up Google SSO:', error);
    res.status(500).json({ error: 'Failed to setup Google SSO' });
  }
});

/**
 * Check if Google SSO is available for a tenant
 */
router.get('/google/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id || req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const provider = await googleSsoService.getGoogleProvider(tenantId);

    res.json({
      enabled: !!provider,
      providerId: provider?.id,
      allowedDomains: provider?.allowedDomains || [],
    });
  } catch (error: any) {
    console.error('Error checking Google SSO status:', error);
    res.status(500).json({ error: 'Failed to check Google SSO status' });
  }
});

/**
 * Initiate Google login
 */
router.get('/google/login', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.context?.tenant?.id;
    const returnUrl = req.query.returnUrl as string;
    const loginHint = req.query.loginHint as string;
    const hostedDomain = req.query.hd as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const provider = await googleSsoService.getGoogleProvider(tenantId);
    if (!provider) {
      return res.status(404).json({ error: 'Google SSO not configured for this tenant' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/google/callback`;

    const authUrl = await googleSsoService.getAuthorizationUrl({
      tenantId,
      providerId: provider.id,
      redirectUri,
      returnUrl,
      loginHint,
      hostedDomain: hostedDomain || (provider.allowedDomains as string[])?.[0],
    });

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Google login:', error);
    res.redirect(`/auth/error?error=google_init_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Google OAuth error:', error, error_description);
      return res.redirect(`/auth/error?error=${error}&description=${error_description}`);
    }

    if (!code || !state) {
      return res.redirect('/auth/error?error=missing_params');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/google/callback`;

    const result = await googleSsoService.handleCallback({
      code: code as string,
      state: state as string,
      redirectUri,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Set session with user info (integrate with existing auth system)
    if (req.session) {
      (req.session as any).userId = result.user.id;
      (req.session as any).tenantId = result.tenant.id;
      (req.session as any).ssoProvider = 'google';
    }

    // Redirect to dashboard or return URL
    const returnUrl = req.query.returnUrl as string || '/dashboard';
    res.redirect(`${returnUrl}?sso=google&new_user=${result.user.isNewUser}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`/auth/error?error=google_callback_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Revoke Google access for current user
 */
router.post('/google/revoke', async (req: Request, res: Response) => {
  try {
    const userId = req.context?.user?.id;
    const tenantId = req.context?.tenant?.id;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const provider = await googleSsoService.getGoogleProvider(tenantId);
    if (!provider) {
      return res.status(404).json({ error: 'Google SSO not configured' });
    }

    await googleSsoService.revokeAccess(userId, provider.id);

    res.json({ success: true, message: 'Google access revoked' });
  } catch (error: any) {
    console.error('Error revoking Google access:', error);
    res.status(500).json({ error: 'Failed to revoke Google access' });
  }
});

// ==================== MICROSOFT AZURE AD SSO ROUTES ====================

const setupMicrosoftSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  azureTenantId: z.string().optional(),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  requireEnterpriseAccounts: z.boolean().optional(),
  roleMapping: z.object({
    roleMap: z.record(z.string()).optional(),
    groupMap: z.record(z.string()).optional(),
    defaultRole: z.string().optional(),
  }).optional(),
});

/**
 * Setup/update Microsoft SSO for a tenant
 */
router.post('/microsoft/setup', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const hasPermission = req.context?.permissions?.includes('tenant:manage') ||
                          req.context?.role?.name === 'Admin';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const parsed = setupMicrosoftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const provider = await microsoftSsoService.setupMicrosoftProvider(tenantId, parsed.data);

    res.json({
      success: true,
      providerId: provider.id,
      status: provider.status,
    });
  } catch (error: any) {
    console.error('Error setting up Microsoft SSO:', error);
    res.status(500).json({ error: 'Failed to setup Microsoft SSO' });
  }
});

/**
 * Check if Microsoft SSO is available for a tenant
 */
router.get('/microsoft/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id || req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const provider = await microsoftSsoService.getMicrosoftProvider(tenantId);

    res.json({
      enabled: !!provider,
      providerId: provider?.id,
      allowedDomains: provider?.allowedDomains || [],
    });
  } catch (error: any) {
    console.error('Error checking Microsoft SSO status:', error);
    res.status(500).json({ error: 'Failed to check Microsoft SSO status' });
  }
});

/**
 * Initiate Microsoft login
 */
router.get('/microsoft/login', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.context?.tenant?.id;
    const returnUrl = req.query.returnUrl as string;
    const loginHint = req.query.loginHint as string;
    const domainHint = req.query.domainHint as string;
    const prompt = req.query.prompt as 'login' | 'consent' | 'select_account' | 'none';

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const provider = await microsoftSsoService.getMicrosoftProvider(tenantId);
    if (!provider) {
      return res.status(404).json({ error: 'Microsoft SSO not configured for this tenant' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/microsoft/callback`;

    const authUrl = await microsoftSsoService.getAuthorizationUrl({
      tenantId,
      providerId: provider.id,
      redirectUri,
      returnUrl,
      loginHint,
      domainHint,
      prompt,
    });

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Microsoft login:', error);
    res.redirect(`/auth/error?error=microsoft_init_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Microsoft OAuth callback
 */
router.get('/microsoft/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Microsoft OAuth error:', error, error_description);
      return res.redirect(`/auth/error?error=${error}&description=${error_description}`);
    }

    if (!code || !state) {
      return res.redirect('/auth/error?error=missing_params');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/microsoft/callback`;

    const result = await microsoftSsoService.handleCallback({
      code: code as string,
      state: state as string,
      redirectUri,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Set session with user info
    if (req.session) {
      (req.session as any).userId = result.user.id;
      (req.session as any).tenantId = result.tenant.id;
      (req.session as any).ssoProvider = 'microsoft';
      (req.session as any).azureClaims = result.claims;
    }

    // Redirect to dashboard or return URL
    const returnUrl = req.query.returnUrl as string || '/dashboard';
    res.redirect(`${returnUrl}?sso=microsoft&new_user=${result.user.isNewUser}`);
  } catch (error: any) {
    console.error('Microsoft OAuth callback error:', error);
    res.redirect(`/auth/error?error=microsoft_callback_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Revoke Microsoft access for current user
 */
router.post('/microsoft/revoke', async (req: Request, res: Response) => {
  try {
    const userId = req.context?.user?.id;
    const tenantId = req.context?.tenant?.id;
    
    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const provider = await microsoftSsoService.getMicrosoftProvider(tenantId);
    if (!provider) {
      return res.status(404).json({ error: 'Microsoft SSO not configured' });
    }

    await microsoftSsoService.revokeAccess(userId, provider.id);

    res.json({ success: true, message: 'Microsoft access revoked' });
  } catch (error: any) {
    console.error('Error revoking Microsoft access:', error);
    res.status(500).json({ error: 'Failed to revoke Microsoft access' });
  }
});

// ==================== OKTA SSO ROUTES ====================

const setupOktaSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  oktaDomain: z.string().min(1),
  authServerId: z.string().optional(),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  roleMapping: z.object({
    groupMap: z.record(z.string()).optional(),
    defaultRole: z.string().optional(),
  }).optional(),
  scopes: z.array(z.string()).optional(),
});

/**
 * Setup Okta SSO for a tenant
 */
router.post('/okta/setup', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const hasPermission = req.context?.permissions?.includes('tenant:manage') ||
                          req.context?.role?.name === 'Admin';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const parsed = setupOktaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const isValid = await oktaSsoService.validateDomain(parsed.data.oktaDomain);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Okta domain' });
    }

    const provider = await oktaSsoService.setupOktaProvider(tenantId, parsed.data);

    res.json({
      success: true,
      providerId: provider.id,
      status: provider.status,
    });
  } catch (error: any) {
    console.error('Error setting up Okta SSO:', error);
    res.status(500).json({ error: 'Failed to setup Okta SSO' });
  }
});

/**
 * Initiate Okta login
 */
router.get('/okta/login', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.context?.tenant?.id;
    const providerId = req.query.providerId as string;
    const returnUrl = req.query.returnUrl as string;

    if (!tenantId || !providerId) {
      return res.status(400).json({ error: 'Tenant ID and Provider ID required' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/okta/callback`;

    const authUrl = await oktaSsoService.generateAuthUrl(
      tenantId,
      providerId,
      redirectUri,
      returnUrl
    );

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Okta login:', error);
    res.redirect(`/auth/error?error=okta_init_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Okta OAuth callback
 */
router.get('/okta/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Okta OAuth error:', error, error_description);
      return res.redirect(`/auth/error?error=${error}&description=${error_description}`);
    }

    if (!code || !state) {
      return res.redirect('/auth/error?error=missing_params');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const redirectUri = `${protocol}://${host}/api/sso/okta/callback`;

    const result = await oktaSsoService.handleCallback({
      code: code as string,
      state: state as string,
      redirectUri,
    });

    let identity = await ssoService.findUserIdentity(
      result.provider.id,
      result.user.sub
    );

    if (identity) {
      await ssoService.updateIdentityOnLogin(identity.id, {
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
      });

      if (req.session) {
        (req.session as any).userId = identity.userId;
        (req.session as any).tenantId = result.session.tenantId;
        (req.session as any).ssoProvider = 'okta';
        (req.session as any).oktaGroups = result.groups;
      }

      const returnUrl = result.session.returnUrl || '/dashboard';
      return res.redirect(`${returnUrl}?sso_success=true&user_id=${identity.userId}`);
    }

    if (result.provider.autoCreateUsers) {
      const userInfo = encodeURIComponent(JSON.stringify({
        email: result.user.email,
        firstName: result.user.given_name,
        lastName: result.user.family_name,
        providerId: result.provider.id,
        providerUserId: result.user.sub,
        groups: result.groups,
        tenantId: result.session.tenantId,
      }));
      
      return res.redirect(`/auth/complete-registration?sso_data=${userInfo}`);
    }

    return res.redirect('/auth/error?error=user_not_found&provider=okta');
  } catch (error: any) {
    console.error('Okta OAuth callback error:', error);
    res.redirect(`/auth/error?error=okta_callback_failed&message=${encodeURIComponent(error.message)}`);
  }
});

// ==================== SAML 2.0 ROUTES ====================

const setupSamlSchema = z.object({
  providerName: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  metadataUrl: z.string().url().optional(),
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  sloUrl: z.string().url().optional(),
  certificate: z.string().min(1),
  allowedDomains: z.array(z.string()).optional(),
  autoCreateUsers: z.boolean().optional(),
  attributeMappings: z.record(z.string()).optional(),
});

/**
 * Setup SAML provider for a tenant
 */
router.post('/saml/setup', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const hasPermission = req.context?.permissions?.includes('tenant:manage') ||
                          req.context?.role?.name === 'Admin';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const parsed = setupSamlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    const samlHandler = createSamlHandler(baseUrl);
    const provider = await samlHandler.setupSamlProvider(tenantId, parsed.data);

    res.json({
      success: true,
      providerId: provider.id,
      status: provider.status,
    });
  } catch (error: any) {
    console.error('Error setting up SAML:', error);
    res.status(500).json({ error: 'Failed to setup SAML provider' });
  }
});

/**
 * Get SP metadata for SAML configuration
 */
router.get('/saml/metadata', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    const samlHandler = createSamlHandler(baseUrl);
    const metadata = samlHandler.generateSpMetadata(tenantId);

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error: any) {
    console.error('Error generating SAML metadata:', error);
    res.status(500).json({ error: 'Failed to generate SAML metadata' });
  }
});

/**
 * Initiate SAML login
 */
router.get('/saml/login', async (req: Request, res: Response) => {
  try {
    const providerId = req.query.providerId as string;
    const returnUrl = req.query.returnUrl as string;

    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID required' });
    }

    const provider = await ssoService.getProviderById(providerId);
    if (!provider || provider.providerType !== 'saml') {
      return res.status(404).json({ error: 'SAML provider not found' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    const samlHandler = createSamlHandler(baseUrl);
    const { url } = await samlHandler.generateAuthnRequest(provider, returnUrl);

    res.redirect(url);
  } catch (error: any) {
    console.error('Error initiating SAML login:', error);
    res.redirect(`/auth/error?error=saml_init_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * SAML Assertion Consumer Service (ACS)
 */
router.post('/saml/acs', async (req: Request, res: Response) => {
  try {
    const { SAMLResponse, RelayState } = req.body;

    if (!SAMLResponse || !RelayState) {
      return res.redirect('/auth/error?error=missing_saml_params');
    }

    const [providerId, state] = (RelayState as string).split(':');
    if (!providerId || !state) {
      return res.redirect('/auth/error?error=invalid_relay_state');
    }

    const provider = await ssoService.getProviderById(providerId);
    if (!provider || provider.providerType !== 'saml') {
      return res.redirect('/auth/error?error=provider_not_found');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    const samlHandler = createSamlHandler(baseUrl);
    const result = await samlHandler.parseSamlResponse(provider, SAMLResponse, RelayState);

    let identity = await ssoService.findUserIdentity(provider.id, result.user.email);

    if (identity) {
      if (req.session) {
        (req.session as any).userId = identity.userId;
        (req.session as any).tenantId = provider.tenantId;
        (req.session as any).ssoProvider = 'saml';
        (req.session as any).samlSessionIndex = result.sessionIndex;
      }

      const returnUrl = result.relayState || '/dashboard';
      return res.redirect(`${returnUrl}?sso_success=true&user_id=${identity.userId}`);
    }

    if (provider.autoCreateUsers) {
      const userInfo = encodeURIComponent(JSON.stringify({
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        providerId: provider.id,
        providerUserId: result.user.email,
        groups: result.user.groups,
        tenantId: provider.tenantId,
        sessionIndex: result.sessionIndex,
      }));
      
      return res.redirect(`/auth/complete-registration?sso_data=${userInfo}`);
    }

    return res.redirect('/auth/error?error=user_not_found&provider=saml');
  } catch (error: any) {
    console.error('SAML ACS error:', error);
    res.redirect(`/auth/error?error=saml_acs_failed&message=${encodeURIComponent(error.message)}`);
  }
});

// ==================== SSO FALLBACK LOGIC ====================

/**
 * Check if local authentication is allowed for a user
 * Returns whether to allow local auth or redirect to SSO
 */
router.post('/check-auth-method', async (req: Request, res: Response) => {
  try {
    const { email, tenantId } = req.body;

    if (!email || !tenantId) {
      return res.status(400).json({ error: 'Email and tenantId required' });
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return res.json({ allowLocalAuth: true, ssoRequired: false });
    }

    const provider = await ssoService.findProviderByDomain(tenantId, email);
    
    if (!provider) {
      return res.json({ allowLocalAuth: true, ssoRequired: false });
    }

    if (provider.status !== 'active') {
      return res.json({ allowLocalAuth: true, ssoRequired: false });
    }

    const enforceForDomains = provider.enforceForDomains ?? false;

    if (enforceForDomains) {
      return res.json({
        allowLocalAuth: false,
        ssoRequired: true,
        provider: {
          id: provider.id,
          type: provider.providerType,
          displayName: provider.displayName,
        },
        message: 'SSO authentication is required for your email domain',
      });
    }

    return res.json({
      allowLocalAuth: true,
      ssoRequired: false,
      ssoAvailable: true,
      provider: {
        id: provider.id,
        type: provider.providerType,
        displayName: provider.displayName,
      },
    });
  } catch (error: any) {
    console.error('Error checking auth method:', error);
    return res.json({ allowLocalAuth: true, ssoRequired: false });
  }
});

/**
 * Get available SSO providers for tenant login page
 */
router.get('/available-providers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const providers = await ssoService.getTenantProviders(tenantId);
    const activeProviders = providers
      .filter(p => p.status === 'active')
      .map(p => ({
        id: p.id,
        type: p.providerType,
        displayName: p.displayName,
        isDefault: p.isDefault,
      }));

    res.json({ providers: activeProviders });
  } catch (error: any) {
    console.error('Error fetching available providers:', error);
    res.status(500).json({ error: 'Failed to fetch SSO providers' });
  }
});

export default router;
