import Ticket from "../../../../models/Ticket";
import AiAgent from "../../../../models/AiAgent";
import {
  AiTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult
} from "../ToolRegistry";

const definition: ToolDefinition = {
  id: "get_ticket_status",
  name: "get_ticket_status",
  description: "Retorna status, fila e agente IA do ticket atual da conversa.",
  parameters: {
    type: "object",
    properties: {
      includeHistory: {
        type: "boolean",
        description: "Incluir contagem de respostas IA"
      }
    },
    required: []
  },
  riskLevel: "read",
  enabled: true,
  allowedOverrideParams: []
};

export const GetTicketStatusTool: AiTool = {
  definition,
  execute: async (
    _input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> => {
    const ticket = await Ticket.findOne({
      where: { id: context.ticketId, companyId: context.companyId },
      attributes: [
        "id",
        "status",
        "queueId",
        "userId",
        "aiHandoff",
        "aiAgentId",
        "aiResponseCount",
        "aiHandoffAt"
      ]
    });

    if (!ticket) {
      return {
        success: false,
        output: JSON.stringify({ error: "ticket_not_found" }),
        errorCode: "ticket_not_found"
      };
    }

    let agentName: string | null = null;
    if (ticket.aiAgentId) {
      const agent = await AiAgent.findOne({
        where: { id: ticket.aiAgentId, companyId: context.companyId },
        attributes: ["id", "name", "specialty"]
      });
      agentName = agent?.name || null;
    }

    return {
      success: true,
      output: JSON.stringify({
        ticketId: ticket.id,
        status: ticket.status,
        queueId: ticket.queueId,
        assignedUserId: ticket.userId,
        aiHandoff: ticket.aiHandoff,
        aiAgentId: ticket.aiAgentId,
        aiAgentName: agentName,
        aiResponseCount: ticket.aiResponseCount,
        aiHandoffAt: ticket.aiHandoffAt
      })
    };
  }
};
