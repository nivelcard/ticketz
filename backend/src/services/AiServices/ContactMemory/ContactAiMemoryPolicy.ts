import { sanitizeMemoryValue } from "./ContactAiMemorySanitizer";

export type ContactAiMemoryType =
  | "preference"
  | "summary"
  | "fact"
  | "human_note"
  | "agent_note";

export type VerificationStatus =
  | "unverified"
  | "user_stated"
  | "system_verified"
  | "human_verified";

export type MemorySource =
  | "inferred"
  | "explicit"
  | "system"
  | "human"
  | "agent";

export type SensitiveCategory =
  | "billing_plan"
  | "payment_status"
  | "financial_data"
  | "permissions"
  | "company_identity"
  | "identity"
  | "registration_data";

export type ContactAiMemoryCandidate = {
  memoryType: ContactAiMemoryType;
  category?: string | null;
  key: string;
  value: string;
  verificationStatus: VerificationStatus;
  inferenceConfidence?: number | null;
  source: MemorySource;
};

export type MemoryPolicyResult =
  | { allowed: true; candidate: ContactAiMemoryCandidate }
  | { allowed: false; reason: string };

const SENSITIVE_CATEGORIES = new Set<string>([
  "billing_plan",
  "payment_status",
  "financial_data",
  "permissions",
  "company_identity",
  "identity",
  "registration_data"
]);

const VALID_MEMORY_TYPES = new Set<string>([
  "preference",
  "summary",
  "fact",
  "human_note",
  "agent_note"
]);

const VALID_VERIFICATION = new Set<string>([
  "unverified",
  "user_stated",
  "system_verified",
  "human_verified"
]);

const MIN_INFERENCE_CONFIDENCE = (): number => {
  const parsed = Number(process.env.AI_MEMORY_INFERENCE_MIN);
  return Number.isFinite(parsed) ? parsed : 0.7;
};

const isSensitiveCategory = (category?: string | null): boolean =>
  Boolean(category && SENSITIVE_CATEGORIES.has(category));

export const isPromptEligibleVerification = (
  status: VerificationStatus
): boolean =>
  status === "user_stated" ||
  status === "system_verified" ||
  status === "human_verified";

export const validateMemoryCandidate = (
  candidate: ContactAiMemoryCandidate
): MemoryPolicyResult => {
  if (!VALID_MEMORY_TYPES.has(candidate.memoryType)) {
    return { allowed: false, reason: "invalid_memory_type" };
  }

  if (!VALID_VERIFICATION.has(candidate.verificationStatus)) {
    return { allowed: false, reason: "invalid_verification_status" };
  }

  if (!candidate.key?.trim()) {
    return { allowed: false, reason: "missing_key" };
  }

  const sanitized = sanitizeMemoryValue(candidate.value);
  if (sanitized.allowed === false) {
    return { allowed: false, reason: sanitized.reason };
  }

  if (candidate.category === "identity") {
    return { allowed: false, reason: "identity_prohibited" };
  }

  if (
    candidate.source === "inferred" &&
    candidate.verificationStatus !== "unverified"
  ) {
    return { allowed: false, reason: "inferred_must_be_unverified" };
  }

  if (
    candidate.source === "agent" &&
    candidate.verificationStatus === "human_verified"
  ) {
    return { allowed: false, reason: "agent_cannot_be_human_verified" };
  }

  if (
    candidate.source === "agent" &&
    candidate.memoryType !== "agent_note" &&
    candidate.memoryType !== "summary" &&
    candidate.memoryType !== "fact"
  ) {
    return {
      allowed: false,
      reason: "agent_source_requires_agent_note_or_unverified_inference"
    };
  }

  if (
    candidate.source === "human" &&
    candidate.verificationStatus === "human_verified" &&
    candidate.memoryType === "agent_note"
  ) {
    return { allowed: false, reason: "agent_note_requires_agent_source" };
  }

  if (candidate.source === "inferred") {
    const confidence = Number(candidate.inferenceConfidence);
    if (
      !Number.isFinite(confidence) ||
      confidence < MIN_INFERENCE_CONFIDENCE()
    ) {
      return { allowed: false, reason: "inference_below_threshold" };
    }
  }

  if (isSensitiveCategory(candidate.category)) {
    if (
      candidate.verificationStatus === "user_stated" ||
      (candidate.source === "inferred" &&
        candidate.verificationStatus === "unverified")
    ) {
      return {
        allowed: false,
        reason: "sensitive_category_requires_system_or_human_verification"
      };
    }
  }

  if (
    candidate.verificationStatus === "user_stated" &&
    isSensitiveCategory(candidate.category)
  ) {
    return { allowed: false, reason: "user_stated_sensitive_blocked" };
  }

  return {
    allowed: true,
    candidate: {
      ...candidate,
      value: sanitized.value,
      key: candidate.key.trim().slice(0, 128),
      category: candidate.category || null
    }
  };
};

export type PromotionPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export const validateVerificationPromotion = (
  currentStatus: VerificationStatus,
  nextStatus: VerificationStatus,
  category?: string | null,
  actorUserId?: number
): PromotionPolicyResult => {
  if (!VALID_VERIFICATION.has(nextStatus)) {
    return { allowed: false, reason: "invalid_verification_status" };
  }

  if (currentStatus === "unverified" && nextStatus === "unverified") {
    return { allowed: true };
  }

  if (currentStatus !== "unverified" && nextStatus === "unverified") {
    return { allowed: false, reason: "cannot_demote_verification" };
  }

  if (
    isSensitiveCategory(category) &&
    nextStatus !== "system_verified" &&
    nextStatus !== "human_verified"
  ) {
    return {
      allowed: false,
      reason: "sensitive_category_requires_system_or_human_verification"
    };
  }

  if (category === "identity") {
    return { allowed: false, reason: "identity_prohibited" };
  }

  if (nextStatus === "human_verified") {
    if (!actorUserId || !Number.isFinite(actorUserId)) {
      return {
        allowed: false,
        reason: "human_verified_requires_authenticated_human"
      };
    }
  }

  return { allowed: true };
};
