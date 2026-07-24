import {
  AI_ASSISTANT_IDENTITY_REPLY,
  buildAgentIdentityReply,
  detectAgentIdentityQuestion
} from "../AiHelpers";

describe("AiHelpers identity", () => {
  it("detects direct name questions", () => {
    expect(detectAgentIdentityQuestion("Qual seu nome")).toBe(true);
    expect(detectAgentIdentityQuestion("Como você se chama?")).toBe(true);
  });

  it("detects naming suggestions for Webin", () => {
    expect(
      detectAgentIdentityQuestion("Vc precisa ter um nome. Será Webin")
    ).toBe(true);
  });

  it("returns the fixed Webin identity reply", () => {
    expect(buildAgentIdentityReply()).toBe(AI_ASSISTANT_IDENTITY_REPLY);
    expect(buildAgentIdentityReply()).toBe(
      "Me chamo Webin, Assistente Virtual da Fortmax."
    );
  });
});
