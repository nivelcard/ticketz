import Ticket from "../../../../models/Ticket";
import AiAgent from "../../../../models/AiAgent";
import {
  AiTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult
} from "../ToolRegistry";
import HandoffToHumanService from "../../HandoffToHumanService";
import { AI_HANDOFF_REASONS } from "../../AiOperationalTypes";
import { getAiInboundQueue } from "../../AiInboundQueueService";
import { logger } from "../../../../utils/logger";
import {
  detectHumanHandoffRequest,
  detectSensitiveTopic
} from "../../AiHelpers";
import {
  evaluateCaseCompleteness,
  shouldBlockAutomaticHandoff
} from "../../Triage/CaseCompletenessEngine";

const definition: ToolDefinition = {
  id: "request_human_handoff",
  name: "request_human_handoff",
  description:
    "Solicita transferência idempotente para atendimento humano no ticket atual.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Motivo curto da transferência"
      }
    },
    required: []
  },
  riskLevel: "handoff",
  enabled: true,
  allowedOverrideParams: []
};

const handoffLockKey = (companyId: number, ticketId: number): string =>
  `ai:handoff:${companyId}:${ticketId}`;

export const RequestHumanHandoffTool: AiTool = {
  definition,
  execute: async (
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> => {
    const ticket = await Ticket.findOne({
      where: { id: context.ticketId, companyId: context.companyId },
      include: ["contact", "whatsapp", "queue"]
    });

    if (!ticket) {
      return {
        success: false,
        output: JSON.stringify({ error: "ticket_not_found" }),
        errorCode: "ticket_not_found"
      };
    }

    if (ticket.status === "closed") {
      return {
        success: false,
        output: JSON.stringify({
          error: "ticket_closed",
          message: "Ticket encerrado; sugira abrir novo atendimento."
        }),
        errorCode: "ticket_closed"
      };
    }

    if (ticket.userId) {
      return {
        success: true,
        output: JSON.stringify({
          action: "handoff",
          status: "already_assigned",
          alreadyAssigned: true
        })
      };
    }

    if (ticket.aiHandoff) {
      return {
        success: true,
        output: JSON.stringify({
          action: "handoff",
          status: "already_in_handoff",
          alreadyInHandoff: true
        })
      };
    }

    const lockKey = handoffLockKey(context.companyId, context.ticketId);
    const redis = getAiInboundQueue().client;
    const lock = await redis.set(lockKey, "1", "EX", 30, "NX");

    if (lock !== "OK") {
      await ticket.reload();
      if (ticket.aiHandoff || ticket.userId) {
        return {
          success: true,
          output: JSON.stringify({
            action: "handoff",
            status: ticket.aiHandoff
              ? "already_in_handoff"
              : "already_assigned",
            alreadyInHandoff: ticket.aiHandoff,
            alreadyAssigned: Boolean(ticket.userId)
          })
        };
      }
    }

    try {
      const agent =
        (await AiAgent.findOne({
          where: { id: context.aiAgentId, companyId: context.companyId }
        })) ||
        (await AiAgent.findOne({
          where: { companyId: context.companyId, active: true, role: "legacy" }
        }));

      if (!agent) {
        return {
          success: false,
          output: JSON.stringify({ error: "agent_not_found" }),
          errorCode: "agent_not_found"
        };
      }

      const userText = context.userText || "";
      const snapshot = evaluateCaseCompleteness({
        latestMessage: userText,
        conversationText: context.conversationText || userText,
        investigationRound: Number((ticket as any).aiInvestigationRound || 0)
      });
      const explicitHumanRequest = detectHumanHandoffRequest(userText);
      const sensitive = detectSensitiveTopic(userText);

      if (
        shouldBlockAutomaticHandoff(snapshot, {
          explicitHumanRequest,
          sensitive
        })
      ) {
        return {
          success: false,
          output: JSON.stringify({
            error: "case_incomplete",
            message:
              "Colete mais detalhes do problema antes de transferir para um humano.",
            missingInformation: snapshot.missingInformation,
            investigationRound: snapshot.investigationRound
          }),
          errorCode: "case_incomplete"
        };
      }

      await HandoffToHumanService({
        ticket,
        agent,
        userMessage: context.userText || "",
        reason: String(input.reason || "tool_handoff"),
        handoffReason: AI_HANDOFF_REASONS.customer_requested_human,
        conversationText: context.conversationText
      });

      return {
        success: true,
        output: JSON.stringify({
          action: "handoff",
          status: "executed"
        }),
        handoffTriggered: true
      };
    } catch (error) {
      logger.error(
        { error, ticketId: context.ticketId },
        "Handoff tool execution failed"
      );
      return {
        success: false,
        output: JSON.stringify({
          error: "handoff_failed",
          message: error instanceof Error ? error.message : "unknown"
        }),
        errorCode: "handoff_failed"
      };
    } finally {
      await redis.del(lockKey);
    }
  }
};
