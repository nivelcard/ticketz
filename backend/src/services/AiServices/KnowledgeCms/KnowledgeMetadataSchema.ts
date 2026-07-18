export type KnowledgeMetadata = Record<string, unknown>;

const CRITICALITY_VALUES = new Set(["low", "medium", "high", "critical"]);

const isIsoDate = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
};

export const validateKnowledgeMetadata = (
  metadata: unknown
): KnowledgeMetadata => {
  if (metadata == null) {
    return {};
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("metadata must be a JSON object");
  }

  const input = metadata as Record<string, unknown>;
  const output: KnowledgeMetadata = { ...input };

  if (output.language != null && typeof output.language !== "string") {
    throw new Error("metadata.language must be a string");
  }

  if (output.origin != null && typeof output.origin !== "string") {
    throw new Error("metadata.origin must be a string");
  }

  if (output.author != null && typeof output.author !== "string") {
    throw new Error("metadata.author must be a string");
  }

  if (
    output.reliability != null &&
    (typeof output.reliability !== "number" ||
      output.reliability < 0 ||
      output.reliability > 1)
  ) {
    throw new Error("metadata.reliability must be a number between 0 and 1");
  }

  if (
    output.criticality != null &&
    !CRITICALITY_VALUES.has(String(output.criticality))
  ) {
    throw new Error("metadata.criticality must be low|medium|high|critical");
  }

  if (output.validFrom != null && !isIsoDate(output.validFrom)) {
    throw new Error("metadata.validFrom must be an ISO date string");
  }

  if (output.validUntil != null && !isIsoDate(output.validUntil)) {
    throw new Error("metadata.validUntil must be an ISO date string");
  }

  if (
    output.priority != null &&
    (!Number.isFinite(Number(output.priority)) ||
      !Number.isInteger(Number(output.priority)))
  ) {
    throw new Error("metadata.priority must be an integer");
  }

  if (output.source != null && typeof output.source !== "string") {
    throw new Error("metadata.source must be a string");
  }

  if (output.tags != null) {
    if (
      !Array.isArray(output.tags) ||
      !output.tags.every(tag => typeof tag === "string")
    ) {
      throw new Error("metadata.tags must be an array of strings");
    }
  }

  return output;
};
