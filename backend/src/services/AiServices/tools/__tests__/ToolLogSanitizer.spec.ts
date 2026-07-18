import { sanitizeToolLogPayload } from "../ToolLogSanitizer";

describe("ToolLogSanitizer", () => {
  it("masks CPF and API keys", () => {
    const result = sanitizeToolLogPayload({
      cpf: "123.456.789-00",
      token: "sk-abc123secret"
    });

    expect(result.value).toContain("***");
    expect(result.value).toContain("[REDACTED]");
    expect(result.rejected).toBe(false);
  });

  it("truncates oversized payloads", () => {
    const result = sanitizeToolLogPayload("x".repeat(5000));
    expect(result.value.length).toBeLessThan(5000);
    expect(result.value).toContain("[truncated]");
  });
});
