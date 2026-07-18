import { sanitizeMemoryValue } from "../ContactAiMemorySanitizer";

describe("ContactAiMemorySanitizer", () => {
  it("rejects full CPF values", () => {
    const result = sanitizeMemoryValue("Meu CPF é 123.456.789-00");
    expect(result.allowed).toBe(false);
  });

  it("rejects API keys", () => {
    const result = sanitizeMemoryValue("Use sk-abcdefghijklmnopqrstuvwxyz");
    expect(result.allowed).toBe(false);
  });

  it("allows safe preference text", () => {
    const result = sanitizeMemoryValue("Prefiro atendimento em português");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.value).toContain("português");
    }
  });

  it("rejects empty values", () => {
    const result = sanitizeMemoryValue("   ");
    expect(result.allowed).toBe(false);
  });
});
