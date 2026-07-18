export type MemorySanitizeResult =
  | { allowed: true; value: string }
  | { allowed: false; reason: string };

const PROHIBITED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    reason: "cpf_full"
  },
  {
    pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,
    reason: "cnpj_full"
  },
  {
    pattern: /\b\d{11}\b/,
    reason: "cpf_digits"
  },
  {
    pattern: /\b\d{14}\b/,
    reason: "cnpj_digits"
  },
  {
    pattern: /\b(?:\d[ -]*?){13,19}\b/,
    reason: "credit_card"
  },
  {
    pattern: /sk-[a-zA-Z0-9]{8,}/,
    reason: "api_key"
  },
  {
    pattern: /Bearer\s+[a-zA-Z0-9._-]+/i,
    reason: "bearer_token"
  },
  {
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    reason: "jwt"
  },
  {
    pattern: /(?:senha|password)\s*[:=]\s*\S+/i,
    reason: "password"
  }
];

const MAX_VALUE_LENGTH = 2000;

export const sanitizeMemoryValue = (raw: string): MemorySanitizeResult => {
  const value = String(raw || "").trim();

  if (!value) {
    return { allowed: false, reason: "empty_value" };
  }

  if (value.length > MAX_VALUE_LENGTH) {
    return { allowed: false, reason: "value_too_long" };
  }

  const blocked = PROHIBITED_PATTERNS.find(rule => rule.pattern.test(value));
  if (blocked) {
    return { allowed: false, reason: blocked.reason };
  }

  return { allowed: true, value };
};

export const maskMemoryForExport = (value: string): string =>
  value
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ]")
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .slice(0, MAX_VALUE_LENGTH);

export const sanitizeMemorySnapshot = (
  snapshot: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!snapshot) return null;

  const clone = { ...snapshot };
  if (typeof clone.value === "string") {
    clone.value = maskMemoryForExport(clone.value);
  }
  return clone;
};
