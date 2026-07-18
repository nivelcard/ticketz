import AiAgent from "../../../../models/AiAgent";
import { runToolLoop } from "../ToolLoopService";
import { chatCompletion } from "../../ModelGateway";
import { isToolsEnabledForCompany } from "../AiToolsFeatureFlag";
import { resolveExecutableTools } from "../AiAgentToolService";
import { executeToolCall } from "../ToolExecutorService";
import { GetTicketStatusTool } from "../definitions/GetTicketStatusTool";
import "../registerPilotTools";

jest.mock("../../ModelGateway");
jest.mock("../AiToolsFeatureFlag");
jest.mock("../AiAgentToolService");
jest.mock("../ToolExecutorService");

const mockedChatCompletion = chatCompletion as jest.MockedFunction<
  typeof chatCompletion
>;
const mockedToolsEnabled = isToolsEnabledForCompany as jest.MockedFunction<
  typeof isToolsEnabledForCompany
>;
const mockedResolveTools = resolveExecutableTools as jest.MockedFunction<
  typeof resolveExecutableTools
>;
const mockedExecuteTool = executeToolCall as jest.MockedFunction<
  typeof executeToolCall
>;

const agent = {
  id: 1,
  role: "specialist",
  provider: "openai",
  textModel: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 256
} as AiAgent;

describe("ToolLoopService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_TOOLS_MAX_ITERATIONS = "3";
    mockedToolsEnabled.mockResolvedValue(true);
    mockedResolveTools.mockResolvedValue([GetTicketStatusTool]);
  });

  it("wraps tool output with OPERATIONAL_DATA markers", async () => {
    mockedChatCompletion
      .mockResolvedValueOnce({
        content: "",
        tokensInput: 10,
        tokensOutput: 5,
        model: "gpt-4o-mini",
        toolCalls: [
          { id: "call_1", name: "get_ticket_status", arguments: "{}" }
        ]
      })
      .mockResolvedValueOnce({
        content: "Resposta final",
        tokensInput: 20,
        tokensOutput: 8,
        model: "gpt-4o-mini",
        toolCalls: []
      });

    mockedExecuteTool.mockResolvedValue({
      toolId: "get_ticket_status",
      toolCallId: "call_1",
      success: true,
      wrappedOutput:
        '[OPERATIONAL_DATA]\n{"status":"pending"}\n[/OPERATIONAL_DATA]',
      rawOutput: '{"status":"pending"}',
      latencyMs: 12
    });

    const result = await runToolLoop({
      companyId: 1,
      agent,
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "status?" }
      ],
      context: {
        companyId: 1,
        aiAgentId: 1,
        ticketId: 10,
        contactId: 5
      }
    });

    expect(result.toolCallsExecuted).toBe(1);
    expect(result.content).toBe("Resposta final");
    expect(mockedExecuteTool).toHaveBeenCalled();
  });

  it("falls back to plain completion when tools disabled", async () => {
    mockedToolsEnabled.mockResolvedValue(false);
    mockedChatCompletion.mockResolvedValue({
      content: "Sem tools",
      tokensInput: 3,
      tokensOutput: 2,
      model: "gpt-4o-mini"
    });

    const result = await runToolLoop({
      companyId: 1,
      agent,
      messages: [{ role: "user", content: "oi" }],
      context: {
        companyId: 1,
        aiAgentId: 1,
        ticketId: 10,
        contactId: 5
      }
    });

    expect(result.toolCallsExecuted).toBe(0);
    expect(result.content).toBe("Sem tools");
    expect(mockedExecuteTool).not.toHaveBeenCalled();
  });
});
