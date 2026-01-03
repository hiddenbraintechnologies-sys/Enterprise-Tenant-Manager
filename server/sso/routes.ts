/**
 * SSO Routes
 * 
 * API endpoints for SSO provider management and authentication flows.
 */

import { Router, Request, Response } from 'express';
import { ssoService } from './sso-service';
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

export default router;
