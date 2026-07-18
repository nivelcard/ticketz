const MAX_OUTPUT_CHARS = 4000;

const INSTRUCTION_PATTERNS = [
  /ignore\s+previous/i,
  /system\s*:/i,
  /you\s+are\s+now/i,
  /forget\s+your\s+instructions/i
];

export type ToolOutputSanitizeResult = {
  output: string;
  instructionLikeLinesRemoved: number;
};

export const sanitizeToolOutput = (
  output: string
): ToolOutputSanitizeResult => {
  let sanitized = String(output || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  const lines = sanitized.split("\n");
  let instructionLikeLinesRemoved = 0;

  const filtered = lines.filter(line => {
    const suspicious = INSTRUCTION_PATTERNS.some(pattern => pattern.test(line));
    if (suspicious) {
      instructionLikeLinesRemoved += 1;
      return false;
    }
    return true;
  });

  sanitized = filtered.join("\n");

  sanitized = sanitized
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "**.***.***/****-**")
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]");

  if (sanitized.length > MAX_OUTPUT_CHARS) {
    sanitized = `${sanitized.slice(0, MAX_OUTPUT_CHARS)}...[truncated]`;
  }

  return { output: sanitized, instructionLikeLinesRemoved };
};

export const wrapOperationalToolContent = (sanitizedJson: string): string =>
  `[OPERATIONAL_DATA]\n${sanitizedJson}\n[/OPERATIONAL_DATA]`;
