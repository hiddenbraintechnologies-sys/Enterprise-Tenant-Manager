import { z } from "zod";

// Shared name validation regex: starts with letter, allows letters/spaces/hyphens/apostrophes
export const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;

// International name regex with Unicode support
export const NAME_REGEX_INTL = /^[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F][A-Za-z\u00C0-\u024F\u0400-\u04FF\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\s'-]{0,49}$/;

export const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(50, `${label} must be at most 50 characters`)
    .regex(
      NAME_REGEX_INTL,
      `${label} can only contain letters, spaces, hyphens (-), or apostrophes (') and must start with a letter`
    );
