/**
 * Profanity detection utility for business name moderation.
 * 
 * IMPORTANT: This list is intentionally minimal and server-side only.
 * Do not expose this list to the frontend.
 * 
 * Detection strategies:
 * 1. Direct match against normalized text
 * 2. Obfuscation detection (punctuation/space removal)
 * 3. Character repetition normalization (fuuuck -> fuck)
 * 4. Leet-speak normalization (f@ck -> fack)
 */

interface ProfanityResult {
  hit: boolean;
  match?: string;
  ruleId?: string;
}

const PROFANITY_RULES: Array<{ pattern: string; ruleId: string }> = [
  { pattern: "fuck", ruleId: "PROF_001" },
  { pattern: "shit", ruleId: "PROF_002" },
  { pattern: "ass", ruleId: "PROF_003" },
  { pattern: "bitch", ruleId: "PROF_004" },
  { pattern: "cunt", ruleId: "PROF_005" },
  { pattern: "dick", ruleId: "PROF_006" },
  { pattern: "cock", ruleId: "PROF_007" },
  { pattern: "pussy", ruleId: "PROF_008" },
  { pattern: "whore", ruleId: "PROF_009" },
  { pattern: "slut", ruleId: "PROF_010" },
  { pattern: "nigger", ruleId: "PROF_011" },
  { pattern: "nigga", ruleId: "PROF_012" },
  { pattern: "faggot", ruleId: "PROF_013" },
  { pattern: "retard", ruleId: "PROF_014" },
  { pattern: "damn", ruleId: "PROF_015" },
];

const FALSE_POSITIVE_ALLOWLIST = [
  "assistant",
  "classic", 
  "class",
  "assess",
  "massage",
  "compass",
  "passage",
  "embassy",
  "brass",
  "grass",
  "glass",
  "pass",
  "mass",
  "bass",
  "cockpit",
  "cocktail",
  "peacock",
  "hancock",
  "babcock",
  "scunthorpe",
  "shitake",
  "pussycat",
  "dickens",
  "dickson",
  "sussex",
  "essex",
  "analyst",
  "amsterdam",
  "cassandra",
  "assassin",
];

function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function removeNonAlphanumeric(input: string): string {
  return input.replace(/[^a-z0-9]/gi, "");
}

function collapseRepeatedChars(input: string): string {
  return input.replace(/(.)\1{1,}/g, "$1");
}

function normalizeLeetSpeak(input: string): string {
  const leetMap: Record<string, string> = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "@": "a",
    "$": "s",
    "!": "i",
  };
  
  return input.split("").map(c => leetMap[c] || c).join("");
}

function isInAllowlist(input: string): boolean {
  const normalized = normalizeText(input);
  return FALSE_POSITIVE_ALLOWLIST.some(allowed => normalized.includes(allowed));
}

function checkAgainstRules(text: string): ProfanityResult {
  for (const rule of PROFANITY_RULES) {
    if (text.includes(rule.pattern)) {
      return { hit: true, match: rule.pattern, ruleId: rule.ruleId };
    }
  }
  return { hit: false };
}

export function containsProfanity(input: string): ProfanityResult {
  if (!input || typeof input !== "string") {
    return { hit: false };
  }

  if (isInAllowlist(input)) {
    return { hit: false };
  }

  const normalized = normalizeText(input);
  
  let result = checkAgainstRules(normalized);
  if (result.hit) {
    return result;
  }

  const noSpacesPunctuation = removeNonAlphanumeric(normalized);
  result = checkAgainstRules(noSpacesPunctuation);
  if (result.hit) {
    return result;
  }

  const collapsedRepeats = collapseRepeatedChars(noSpacesPunctuation);
  result = checkAgainstRules(collapsedRepeats);
  if (result.hit) {
    return result;
  }

  const leetNormalized = normalizeLeetSpeak(collapsedRepeats);
  result = checkAgainstRules(leetNormalized);
  if (result.hit) {
    return result;
  }
  
  const leetBeforeStrip = normalizeLeetSpeak(normalized);
  const leetStripped = removeNonAlphanumeric(leetBeforeStrip);
  result = checkAgainstRules(leetStripped);
  if (result.hit) {
    return result;
  }

  return { hit: false };
}

export function isProfanityCheckEnabled(): boolean {
  return process.env.ENABLE_PROFANITY_CHECK === "true";
}

export function isStrictProfanityBlock(): boolean {
  return process.env.STRICT_PROFANITY_BLOCK === "true";
}
