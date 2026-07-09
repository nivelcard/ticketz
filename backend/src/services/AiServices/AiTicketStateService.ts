import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

export const AI_TICKET_STATES = {
  ai_handling: "ai_handling",
  handoff_pending: "handoff_pending",
  human_handling: "human_handling",
  ai_resolved: "ai_resolved",
  human_resolved: "human_resolved",
  ai_paused: "ai_paused",
  pending_human: "pending_human",
  invalid: "invalid"
} as const;

export type AiTicketState =
  (typeof AI_TICKET_STATES)[keyof typeof AI_TICKET_STATES];

export const classifyAiTicketState = (ticket: Ticket): AiTicketState => {
  if (ticket.status === "closed") {
    if (ticket.aiResolvedByAi) {
      return AI_TICKET_STATES.ai_resolved;
    }
    return AI_TICKET_STATES.human_resolved;
  }

  if (ticket.userId && ticket.status === "open") {
    return AI_TICKET_STATES.human_handling;
  }

  if (ticket.aiPaused && ticket.aiAgentId) {
    return AI_TICKET_STATES.ai_paused;
  }

  if (ticket.aiHandoff && ticket.status === "pending" && !ticket.userId) {
    return AI_TICKET_STATES.handoff_pending;
  }

  if (
    ticket.aiAgentId &&
    !ticket.aiHandoff &&
    !ticket.aiPaused &&
    !ticket.userId &&
    ticket.status !== "closed"
  ) {
    return AI_TICKET_STATES.ai_handling;
  }

  if (ticket.status === "pending" && !ticket.userId) {
    return AI_TICKET_STATES.pending_human;
  }

  return AI_TICKET_STATES.invalid;
};

export const validateAiTicketState = (
  ticket: Ticket
): { valid: boolean; state: AiTicketState; issues: string[] } => {
  const state = classifyAiTicketState(ticket);
  const issues: string[] = [];

  if (state === AI_TICKET_STATES.handoff_pending && !ticket.queueId) {
    issues.push("handoff_pending_without_queue");
  }

  if (
    state === AI_TICKET_STATES.ai_handling &&
    !ticket.aiAgentId &&
    !ticket.aiStartedAt
  ) {
    issues.push("ai_handling_without_agent");
  }

  if (
    ticket.aiHandoff &&
    ticket.aiAgentId &&
    !ticket.userId &&
    ticket.aiPaused
  ) {
    if (state !== AI_TICKET_STATES.ai_paused) {
      issues.push("paused_state_mismatch");
    }
  }

  if (
    ticket.aiHandoff &&
    !ticket.aiPaused &&
    ticket.userId &&
    ticket.status === "open"
  ) {
    if (state !== AI_TICKET_STATES.human_handling) {
      issues.push("human_assumed_state_mismatch");
    }
  }

  const valid =
    state !== AI_TICKET_STATES.invalid &&
    issues.length === 0 &&
    Boolean(ticket.queueId || state === AI_TICKET_STATES.ai_handling);

  return { valid, state, issues };
};

export const normalizeAiTicketFields = (
  ticket: Ticket,
  updates: Record<string, unknown> = {}
): Record<string, unknown> => {
  const merged = {
    status: updates.status ?? ticket.status,
    queueId: updates.queueId !== undefined ? updates.queueId : ticket.queueId,
    userId: updates.userId !== undefined ? updates.userId : ticket.userId,
    aiAgentId:
      updates.aiAgentId !== undefined ? updates.aiAgentId : ticket.aiAgentId,
    aiHandoff:
      updates.aiHandoff !== undefined ? updates.aiHandoff : ticket.aiHandoff,
    aiPaused:
      updates.aiPaused !== undefined ? updates.aiPaused : ticket.aiPaused,
    aiResolvedByAi:
      updates.aiResolvedByAi !== undefined
        ? updates.aiResolvedByAi
        : ticket.aiResolvedByAi
  };

  const normalized = { ...updates };

  if (merged.aiHandoff && merged.status === "pending" && !merged.userId) {
    if (!merged.queueId && ticket.queueId) {
      normalized.queueId = ticket.queueId;
    }
  }

  if (
    merged.aiAgentId &&
    !merged.aiHandoff &&
    !merged.aiPaused &&
    !merged.userId &&
    merged.status !== "closed"
  ) {
    if (normalized.queueId === null) {
      delete normalized.queueId;
    }
  }

  if (merged.userId && merged.status === "open") {
    normalized.aiPaused = normalized.aiPaused ?? true;
  }

  if (merged.status === "closed" && merged.aiResolvedByAi) {
    normalized.aiHandoff = false;
  }

  return normalized;
};

export const logInvalidAiTicketState = (
  ticket: Ticket,
  context: string
): void => {
  const validation = validateAiTicketState(ticket);

  if (!validation.valid) {
    logger.warn(
      {
        ticketId: ticket.id,
        context,
        state: validation.state,
        issues: validation.issues,
        status: ticket.status,
        queueId: ticket.queueId,
        userId: ticket.userId,
        aiAgentId: ticket.aiAgentId,
        aiHandoff: ticket.aiHandoff,
        aiPaused: ticket.aiPaused
      },
      "AiTicketState:invalid"
    );
  }
};
