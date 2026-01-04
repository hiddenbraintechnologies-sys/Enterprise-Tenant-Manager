import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  tenantBranding,
  tenantEmailTemplates,
  tenants,
  TenantBranding,
  TenantEmailTemplate,
  InsertTenantBranding,
  InsertTenantEmailTemplate,
} from "@shared/schema";
import { auditService } from "../audit";

interface ThemeTokens {
  [key: string]: string | number;
}

interface BrandingResolution {
  tenantId: string;
  tenantName: string;
  branding: TenantBranding | null;
  cssVariables: Record<string, string>;
}

const DEFAULT_BRANDING = {
  primaryColor: "#3B82F6",
  secondaryColor: "#1E40AF",
  accentColor: "#10B981",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#111827",
  mutedColor: "#6B7280",
  borderColor: "#E5E7EB",
  fontFamily: "Inter",
  fontFamilyMono: "JetBrains Mono",
};

class TenantBrandingService {
  async getBranding(tenantId: string): Promise<TenantBranding | null> {
    const [branding] = await db
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    return branding || null;
  }

  async getOrCreateBranding(tenantId: string): Promise<TenantBranding> {
    let branding = await this.getBranding(tenantId);
    
    if (!branding) {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      const [newBranding] = await db
        .insert(tenantBranding)
        .values({
          tenantId,
          primaryColor: tenant?.primaryColor || DEFAULT_BRANDING.primaryColor,
          secondaryColor: tenant?.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          logoUrl: tenant?.logoUrl,
        })
        .returning();

      branding = newBranding;
    }

    return branding;
  }

  async updateBranding(
    tenantId: string,
    data: Partial<InsertTenantBranding>,
    actorId?: string
  ): Promise<TenantBranding> {
    await this.getOrCreateBranding(tenantId);

    const [updated] = await db
      .update(tenantBranding)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenantBranding.tenantId, tenantId))
      .returning();

    if (actorId) {
      await auditService.log({
        tenantId,
        userId: actorId,
        action: "update",
        resource: "tenant_branding",
        resourceId: updated.id,
        metadata: { updatedFields: Object.keys(data) },
      });
    }

    return updated;
  }

  async deleteBranding(tenantId: string, actorId?: string): Promise<void> {
    await db
      .delete(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId));

    if (actorId) {
      await auditService.log({
        tenantId,
        userId: actorId,
        action: "delete",
        resource: "tenant_branding",
        metadata: {},
      });
    }
  }

  generateCssVariables(branding: TenantBranding | null): Record<string, string> {
    const b = branding || DEFAULT_BRANDING;

    const hexToHsl = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return "0 0% 0%";

      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let bl = parseInt(result[3], 16) / 255;

      const max = Math.max(r, g, bl);
      const min = Math.min(r, g, bl);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - bl) / d + (g < bl ? 6 : 0)) / 6;
            break;
          case g:
            h = ((bl - r) / d + 2) / 6;
            break;
          case bl:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const vars: Record<string, string> = {
      "--primary": hexToHsl((b as any).primaryColor || DEFAULT_BRANDING.primaryColor),
      "--secondary": hexToHsl((b as any).secondaryColor || DEFAULT_BRANDING.secondaryColor),
      "--accent": hexToHsl((b as any).accentColor || DEFAULT_BRANDING.accentColor),
      "--background": hexToHsl((b as any).backgroundColor || DEFAULT_BRANDING.backgroundColor),
      "--foreground": hexToHsl((b as any).foregroundColor || DEFAULT_BRANDING.foregroundColor),
      "--muted": hexToHsl((b as any).mutedColor || DEFAULT_BRANDING.mutedColor),
      "--border": hexToHsl((b as any).borderColor || DEFAULT_BRANDING.borderColor),
      "--font-family": (b as any).fontFamily || DEFAULT_BRANDING.fontFamily,
      "--font-family-mono": (b as any).fontFamilyMono || DEFAULT_BRANDING.fontFamilyMono,
    };

    if (branding?.themeTokens && typeof branding.themeTokens === "object") {
      for (const [key, value] of Object.entries(branding.themeTokens as ThemeTokens)) {
        vars[`--${key}`] = String(value);
      }
    }

    return vars;
  }

  async resolveBrandingForTenant(tenantId: string): Promise<BrandingResolution> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const branding = await this.getBranding(tenantId);

    return {
      tenantId,
      tenantName: tenant.name,
      branding,
      cssVariables: this.generateCssVariables(branding),
    };
  }

  async getEmailTemplates(
    tenantId: string,
    templateType?: string
  ): Promise<TenantEmailTemplate[]> {
    if (templateType) {
      return db
        .select()
        .from(tenantEmailTemplates)
        .where(
          eq(tenantEmailTemplates.tenantId, tenantId)
        );
    }

    return db
      .select()
      .from(tenantEmailTemplates)
      .where(eq(tenantEmailTemplates.tenantId, tenantId));
  }

  async getEmailTemplate(
    tenantId: string,
    templateType: string
  ): Promise<TenantEmailTemplate | null> {
    const [template] = await db
      .select()
      .from(tenantEmailTemplates)
      .where(eq(tenantEmailTemplates.tenantId, tenantId))
      .limit(1);

    return template || null;
  }

  async createEmailTemplate(
    data: InsertTenantEmailTemplate,
    actorId?: string
  ): Promise<TenantEmailTemplate> {
    const [template] = await db
      .insert(tenantEmailTemplates)
      .values(data)
      .returning();

    if (actorId) {
      await auditService.log({
        tenantId: data.tenantId,
        userId: actorId,
        action: "create",
        resource: "email_template",
        resourceId: template.id,
        metadata: { templateType: data.templateType, templateName: data.templateName },
      });
    }

    return template;
  }

  async updateEmailTemplate(
    templateId: string,
    data: Partial<InsertTenantEmailTemplate>,
    actorId?: string
  ): Promise<TenantEmailTemplate | null> {
    const [existing] = await db
      .select()
      .from(tenantEmailTemplates)
      .where(eq(tenantEmailTemplates.id, templateId))
      .limit(1);

    if (!existing) {
      return null;
    }

    const [updated] = await db
      .update(tenantEmailTemplates)
      .set({
        ...data,
        version: (existing.version || 1) + 1,
        updatedAt: new Date(),
      })
      .where(eq(tenantEmailTemplates.id, templateId))
      .returning();

    if (actorId) {
      await auditService.log({
        tenantId: existing.tenantId,
        userId: actorId,
        action: "update",
        resource: "email_template",
        resourceId: templateId,
        metadata: { updatedFields: Object.keys(data) },
      });
    }

    return updated;
  }

  async deleteEmailTemplate(templateId: string, actorId?: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(tenantEmailTemplates)
      .where(eq(tenantEmailTemplates.id, templateId))
      .limit(1);

    if (!existing) {
      return false;
    }

    await db
      .delete(tenantEmailTemplates)
      .where(eq(tenantEmailTemplates.id, templateId));

    if (actorId) {
      await auditService.log({
        tenantId: existing.tenantId,
        userId: actorId,
        action: "delete",
        resource: "email_template",
        resourceId: templateId,
        metadata: { templateType: existing.templateType },
      });
    }

    return true;
  }

  renderEmailTemplate(
    template: TenantEmailTemplate,
    variables: Record<string, string>
  ): { subject: string; bodyHtml: string; bodyText: string } {
    let subject = template.subject;
    let bodyHtml = template.bodyHtml;
    let bodyText = template.bodyText || "";

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), value);
      bodyHtml = bodyHtml.replace(new RegExp(placeholder, "g"), value);
      bodyText = bodyText.replace(new RegExp(placeholder, "g"), value);
    }

    return { subject, bodyHtml, bodyText };
  }

  async getDefaultTemplates(): Promise<Partial<InsertTenantEmailTemplate>[]> {
    return [
      {
        templateType: "welcome",
        templateName: "Welcome Email",
        subject: "Welcome to {{businessName}}!",
        bodyHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome, {{customerName}}!</h1>
            <p>Thank you for joining {{businessName}}. We're excited to have you.</p>
            <p>If you have any questions, feel free to reach out.</p>
            <p>Best regards,<br/>{{businessName}}</p>
          </div>
        `,
        bodyText: "Welcome, {{customerName}}! Thank you for joining {{businessName}}.",
        availableVariables: ["customerName", "businessName", "email"],
      },
      {
        templateType: "booking_confirmation",
        templateName: "Booking Confirmation",
        subject: "Your booking is confirmed - {{serviceName}}",
        bodyHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Booking Confirmed</h1>
            <p>Hi {{customerName}},</p>
            <p>Your booking has been confirmed:</p>
            <ul>
              <li><strong>Service:</strong> {{serviceName}}</li>
              <li><strong>Date:</strong> {{bookingDate}}</li>
              <li><strong>Time:</strong> {{bookingTime}}</li>
            </ul>
            <p>We look forward to seeing you!</p>
          </div>
        `,
        bodyText: "Your booking for {{serviceName}} on {{bookingDate}} at {{bookingTime}} is confirmed.",
        availableVariables: ["customerName", "serviceName", "bookingDate", "bookingTime", "businessName"],
      },
      {
        templateType: "invoice",
        templateName: "Invoice",
        subject: "Invoice #{{invoiceNumber}} from {{businessName}}",
        bodyHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Invoice #{{invoiceNumber}}</h1>
            <p>Hi {{customerName}},</p>
            <p>Please find your invoice attached.</p>
            <p><strong>Amount Due:</strong> {{amount}}</p>
            <p><strong>Due Date:</strong> {{dueDate}}</p>
          </div>
        `,
        bodyText: "Invoice #{{invoiceNumber}} - Amount: {{amount}}, Due: {{dueDate}}",
        availableVariables: ["customerName", "invoiceNumber", "amount", "dueDate", "businessName"],
      },
    ];
  }

  async seedDefaultTemplates(tenantId: string, actorId?: string): Promise<void> {
    const existing = await this.getEmailTemplates(tenantId);
    if (existing.length > 0) {
      return;
    }

    const defaults = await this.getDefaultTemplates();
    for (const template of defaults) {
      await this.createEmailTemplate(
        { ...template, tenantId } as InsertTenantEmailTemplate,
        actorId
      );
    }
  }
}

export const tenantBrandingService = new TenantBrandingService();
export { TenantBrandingService };
