/**
 * Domain Management API Routes
 * 
 * Endpoints for managing white-label domains.
 */

import { Router, Request, Response } from 'express';
import { domainService } from './domain-service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addDomainSchema = z.object({
  domain: z.string().min(4).max(255),
  isPrimary: z.boolean().optional(),
});

const updateDomainSchema = z.object({
  isPrimary: z.boolean().optional(),
  enforceHttps: z.boolean().optional(),
  redirectToSlug: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/domains
 * List all domains for the current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant context required' });
    }

    const domains = await domainService.getTenantDomains(tenantId);
    res.json({ domains });
  } catch (error: any) {
    console.error('List domains error:', error);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

/**
 * POST /api/domains
 * Add a new custom domain
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant context required' });
    }

    const parsed = addDomainSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.errors 
      });
    }

    const domain = await domainService.addDomain({
      tenantId,
      domain: parsed.data.domain,
      isPrimary: parsed.data.isPrimary,
      createdBy: userId,
    });

    // Get verification instructions
    const instructions = domainService.getVerificationInstructions(domain);

    res.status(201).json({ 
      domain,
      verification: instructions,
    });
  } catch (error: any) {
    console.error('Add domain error:', error);
    if (error.message.includes('already registered') || 
        error.message.includes('reserved') ||
        error.message.includes('Invalid domain')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

/**
 * GET /api/domains/:domainId
 * Get domain details
 */
router.get('/:domainId', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const tenantId = req.context?.tenant?.id;

    const domain = await domainService.getDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Verify tenant owns this domain
    if (tenantId && domain.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const instructions = domainService.getVerificationInstructions(domain);

    res.json({ domain, verification: instructions });
  } catch (error: any) {
    console.error('Get domain error:', error);
    res.status(500).json({ error: 'Failed to get domain' });
  }
});

/**
 * POST /api/domains/:domainId/verify
 * Trigger domain verification
 */
router.post('/:domainId/verify', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const tenantId = req.context?.tenant?.id;

    const domain = await domainService.getDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (tenantId && domain.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await domainService.verifyDomain(domainId);

    res.json({ 
      success: result.verified,
      result,
    });
  } catch (error: any) {
    console.error('Verify domain error:', error);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

/**
 * PATCH /api/domains/:domainId
 * Update domain settings
 */
router.patch('/:domainId', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const tenantId = req.context?.tenant?.id;

    const domain = await domainService.getDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (tenantId && domain.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const parsed = updateDomainSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parsed.error.errors 
      });
    }

    const updated = await domainService.updateDomain(domainId, parsed.data);
    res.json({ domain: updated });
  } catch (error: any) {
    console.error('Update domain error:', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

/**
 * DELETE /api/domains/:domainId
 * Remove a custom domain
 */
router.delete('/:domainId', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const tenantId = req.context?.tenant?.id;

    const domain = await domainService.getDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (tenantId && domain.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await domainService.deleteDomain(domainId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

/**
 * POST /api/domains/:domainId/revoke
 * Revoke domain verification (admin only)
 */
router.post('/:domainId/revoke', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const { reason } = req.body;

    const domain = await domainService.getDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await domainService.revokeDomain(domainId, reason);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Revoke domain error:', error);
    res.status(500).json({ error: 'Failed to revoke domain' });
  }
});

/**
 * GET /api/domains/resolve/:hostname
 * Resolve tenant from hostname (public endpoint)
 */
router.get('/resolve/:hostname', async (req: Request, res: Response) => {
  try {
    const { hostname } = req.params;
    
    const resolved = await domainService.resolveTenantByHost(hostname);
    
    if (!resolved) {
      return res.status(404).json({ error: 'Domain not found or not verified' });
    }

    res.json({
      tenant: {
        id: resolved.id,
        name: resolved.name,
        slug: resolved.slug,
        businessType: resolved.businessType,
        primaryColor: resolved.primaryColor,
        logoUrl: resolved.logoUrl,
      },
      domain: {
        domain: resolved.domain.domain,
        isPrimary: resolved.domain.isPrimary,
      },
    });
  } catch (error: any) {
    console.error('Resolve domain error:', error);
    res.status(500).json({ error: 'Failed to resolve domain' });
  }
});

export default router;
