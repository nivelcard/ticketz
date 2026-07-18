import { validateToolInput } from "../ToolInputValidator";

describe("ToolInputValidator", () => {
  it("rejects unknown properties", () => {
    const result = validateToolInput(
      {
        id: "test",
        name: "test",
        description: "test",
        parameters: {
          type: "object",
          properties: { priority: { type: "string", enum: ["low", "high"] } }
        },
        riskLevel: "write",
        enabled: true,
        allowedOverrideParams: []
      },
      { priority: "low", companyId: 999 }
    );

    expect(result.valid).toBe(true);
    expect(result.sanitized.companyId).toBeUndefined();
  });

  it("rejects invalid enum", () => {
    const result = validateToolInput(
      {
        id: "test",
        name: "test",
        description: "test",
        parameters: {
          type: "object",
          properties: { priority: { type: "string", enum: ["low", "high"] } },
          required: ["priority"]
        },
        riskLevel: "write",
        enabled: true,
        allowedOverrideParams: []
      },
      { priority: "critical" }
    );

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("invalid_param_enum");
  });
});
