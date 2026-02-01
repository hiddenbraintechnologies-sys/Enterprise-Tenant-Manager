import { z } from "zod";

export interface BusinessNameValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export const BUSINESS_NAME_REGEX = /^[\p{L}\p{N}\p{M}\s&.,'\-()\/]+$/u;
export const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

export function validateBusinessName(input: string, label: string = "Business name"): BusinessNameValidationResult {
  const normalized = normalizeText(input);
  
  if (normalized.length < 2) {
    return { 
      valid: false, 
      normalized, 
      error: `${label} must be at least 2 characters` 
    };
  }
  
  if (normalized.length > 120) {
    return { 
      valid: false, 
      normalized, 
      error: `${label} must be at most 120 characters` 
    };
  }
  
  if (!HAS_LETTER_OR_NUMBER.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: `${label} must contain at least one letter or number` 
    };
  }
  
  if (!BUSINESS_NAME_REGEX.test(normalized)) {
    return { 
      valid: false, 
      normalized, 
      error: `${label} contains invalid characters` 
    };
  }
  
  return { valid: true, normalized };
}

export const businessNameField = (label: string = "Business name") =>
  z
    .string()
    .transform(normalizeText)
    .refine((val) => val.length >= 2, {
      message: `${label} must be at least 2 characters`,
    })
    .refine((val) => val.length <= 120, {
      message: `${label} must be at most 120 characters`,
    })
    .refine((val) => HAS_LETTER_OR_NUMBER.test(val), {
      message: `${label} must contain at least one letter or number`,
    })
    .refine((val) => BUSINESS_NAME_REGEX.test(val), {
      message: `${label} contains invalid characters`,
    });
