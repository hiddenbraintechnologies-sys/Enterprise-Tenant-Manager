import { z } from "zod";

/**
 * Unicode-safe name validation regex using property escapes
 * - \p{L} = any letter from any language
 * - \p{M} = combining marks (for accents like é, ñ)
 * - Allows spaces, hyphens, and apostrophes as separators
 * - Must start with a letter
 * - Length 2-50 characters
 * 
 * Tested with: José, Renée, Łukasz, محمد, 张伟, அருண், O'Connor, Jean-Paul, Mary Ann
 */
export const NAME_REGEX = /^\p{L}[\p{L}\p{M}\s'-]{1,49}$/u;

/**
 * Normalizes a name for consistent storage:
 * - NFC Unicode normalization (canonical composition)
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces to single space
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Creates a Zod name field with proper validation and normalization
 */
export const nameField = (label: string) =>
  z
    .string()
    .transform(normalizeName)
    .refine((val) => val.length >= 2, {
      message: `${label} must be at least 2 characters`,
    })
    .refine((val) => val.length <= 50, {
      message: `${label} must be at most 50 characters`,
    })
    .refine((val) => NAME_REGEX.test(val), {
      message: `${label} can only contain letters, spaces, hyphens (-), or apostrophes (') and must start with a letter`,
    })
    .refine((val) => !/--/.test(val) && !/''+/.test(val) && !/\s\s/.test(val), {
      message: `${label} cannot contain consecutive separators`,
    })
    .refine((val) => !/^[-'\s]/.test(val) && !/[-'\s]$/.test(val), {
      message: `${label} cannot start or end with a separator`,
    });
