import { resolveMx } from "node:dns/promises";

export interface MxValidationResult {
  valid: boolean;
  hasMx: boolean;
  error?: string;
  records?: Array<{ exchange: string; priority: number }>;
}

/**
 * Validates that an email domain has valid MX records
 * This is a best-effort check - DNS failures don't necessarily mean invalid email
 * 
 * @param email - The email address to validate
 * @param strict - If true, DNS failures will be treated as invalid
 * @returns MxValidationResult with validation status
 */
export async function validateEmailMx(
  email: string,
  strict: boolean = false
): Promise<MxValidationResult> {
  try {
    const domain = email.split("@")[1];
    if (!domain) {
      return { valid: false, hasMx: false, error: "Invalid email format" };
    }

    const records = await resolveMx(domain);
    
    if (!records || records.length === 0) {
      return { 
        valid: false, 
        hasMx: false, 
        error: "No mail server found for this domain" 
      };
    }

    return { 
      valid: true, 
      hasMx: true, 
      records: records.map(r => ({ exchange: r.exchange, priority: r.priority }))
    };
  } catch (err: any) {
    const errorCode = err.code || "UNKNOWN";
    
    // ENOTFOUND = domain doesn't exist
    // ENODATA = domain exists but no MX records
    if (errorCode === "ENOTFOUND" || errorCode === "ENODATA") {
      return { 
        valid: false, 
        hasMx: false, 
        error: "Email domain does not exist or has no mail server" 
      };
    }

    // For other DNS errors (timeouts, etc.), be lenient unless strict mode
    if (strict) {
      return { 
        valid: false, 
        hasMx: false, 
        error: `DNS lookup failed: ${errorCode}` 
      };
    }

    // Best-effort: allow if DNS temporarily fails
    console.warn(`[email-mx] DNS lookup warning for ${email}: ${errorCode}`);
    return { 
      valid: true, 
      hasMx: false, 
      error: `DNS lookup inconclusive: ${errorCode}` 
    };
  }
}

/**
 * Quick check if email MX validation is enabled
 * Can be controlled via environment variable
 */
export function isMxValidationEnabled(): boolean {
  return process.env.ENABLE_EMAIL_MX_VALIDATION === "true";
}

/**
 * Check if strict MX validation mode is enabled
 * In strict mode, DNS failures will block registration
 */
export function isMxValidationStrict(): boolean {
  return process.env.STRICT_EMAIL_MX_VALIDATION === "true";
}
