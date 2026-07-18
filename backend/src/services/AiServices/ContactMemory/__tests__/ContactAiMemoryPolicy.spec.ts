import {
  isPromptEligibleVerification,
  validateMemoryCandidate,
  validateVerificationPromotion
} from "../ContactAiMemoryPolicy";

describe("ContactAiMemoryPolicy", () => {
  it("blocks sensitive categories with user_stated verification", () => {
    const result = validateMemoryCandidate({
      memoryType: "fact",
      category: "billing_plan",
      key: "plan",
      value: "Plano premium",
      verificationStatus: "user_stated",
      source: "explicit"
    });

    expect(result.allowed).toBe(false);
    if (result.allowed === false) {
      expect(result.reason).toContain("sensitive");
    }
  });

  it("allows unverified inferred memory for storage but not prompt eligibility", () => {
    const result = validateMemoryCandidate({
      memoryType: "summary",
      category: "conversation",
      key: "summary_1",
      value: "Cliente pediu suporte.",
      verificationStatus: "unverified",
      inferenceConfidence: 0.8,
      source: "inferred"
    });

    expect(result.allowed).toBe(true);
    expect(isPromptEligibleVerification("unverified")).toBe(false);
    expect(isPromptEligibleVerification("user_stated")).toBe(true);
  });

  it("blocks identity category entirely", () => {
    const result = validateMemoryCandidate({
      memoryType: "fact",
      category: "identity",
      key: "cpf",
      value: "Documento mencionado",
      verificationStatus: "system_verified",
      source: "system"
    });

    expect(result.allowed).toBe(false);
  });

  it("requires system or human verification to promote sensitive memory", () => {
    const promotion = validateVerificationPromotion(
      "unverified",
      "user_stated",
      "payment_status"
    );

    expect(promotion.allowed).toBe(false);
  });
});
