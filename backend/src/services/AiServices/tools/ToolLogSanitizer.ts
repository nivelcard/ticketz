const parsePositiveInt = (
  value: string | undefined,
  fallback: number
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_LOG_CHARS = (): number =>
  parsePositiveInt(process.env.AI_TOOL_LOG_MAX_CHARS, 2048);

const maskDocuments = (text: string): string =>
  text
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "**.***.***/****-**")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "****");

const redactSecrets = (text: string): string =>
  text
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(
      /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      "[REDACTED]"
    );

export const sanitizeToolLogPayload = (
  payload: unknown
): { value: string; rejected: boolean } => {
  let text =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? {});

  text = redactSecrets(maskDocuments(text));

  if (text.length > MAX_LOG_CHARS()) {
    return {
      value: `${text.slice(0, MAX_LOG_CHARS())}...[truncated]`,
      rejected: false
    };
  }

  return { value: text, rejected: false };
};

export const getToolLogRetentionDays = (): number =>
  parsePositiveInt(process.env.AI_TOOL_LOG_RETENTION_DAYS, 90);
