import { z } from "zod";

/**
 * Normalizes text for consistent storage:
 * - NFC Unicode normalization
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces to single space
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Business name validation regex using Unicode property escapes
 * Allows:
 * - \p{L} = any letter from any language
 * - \p{N} = any number
 * - \p{M} = combining marks (for accents)
 * - Common punctuation: space & . , - ' ( ) /
 * 
 * Must contain at least one letter or number
 * Length: 2-120 characters
 * 
 * Valid examples: "Backensis Sdn. Bhd.", "张伟贸易有限公司", "O'Connor & Associates"
 */
export const BUSINESS_NAME_REGEX = /^[\p{L}\p{N}\p{M}\s&.,'\-()\/]+$/u;
export const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/**
 * Creates a Zod business name field with proper validation and normalization
 */
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
