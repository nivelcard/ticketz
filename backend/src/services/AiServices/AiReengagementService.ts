import Ticket from "../../models/Ticket";
import { canAiEngageTicket, getActiveAgent } from "./AiHelpers";
import { isAiFeaturesEnabled } from "./AiPlatformState";
import { enqueueAiInboundMessage } from "./AiInboundQueueService";
import { persistAiDecisionLog } from "./AiDecisionLogger";
import { logger } from "../../utils/logger";

const isReengagementEnabled = (): boolean =>
  process.env.AI_REENGAGEMENT_ENABLED !== "false";

export { canAiEngageTicket };

export const resetTicketForAiEngagement = async (
  ticket: Ticket,
  reason: string
): Promise<void> => {
  const hadHandoff = ticket.aiHandoff;

  await ticket.update({
    aiHandoff: false,
    chatbot: false,
    queueId: null
  });

  if (hadHandoff) {
    await persistAiDecisionLog({
      companyId: ticket.companyId,
      ticketId: ticket.id,
      action: "enqueue",
      reason: "reengage_after_handoff",
      details: { trigger: reason }
    });

    logger.info(
      { ticketId: ticket.id, companyId: ticket.companyId, reason },
      "AI re-engaged ticket after previous handoff"
    );
  }
};

export const shouldAiBypassLegacyBotMessages = async (
  ticket: Ticket,
  companyId: number
): Promise<boolean> => {
  if (!isAiFeaturesEnabled() || !isReengagementEnabled()) {
    return false;
  }

  if (!canAiEngageTicket(ticket)) {
    return false;
  }

  const agent = await getActiveAgent(companyId, ticket.queueId);
  return !!agent;
};

export type EngageAiInboundParams = {
  companyId: number;
  ticket: Ticket;
  messageBody: string;
  messageId?: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaFilename?: string;
  trigger?: string;
};

export const tryEngageAiOnInboundMessage = async ({
  companyId,
  ticket,
  messageBody,
  messageId,
  mediaType,
  mediaUrl,
  mediaFilename,
  trigger = "inbound_message"
}: EngageAiInboundParams): Promise<boolean> => {
  if (!isAiFeaturesEnabled() || !isReengagementEnabled()) {
    return false;
  }

  if (!canAiEngageTicket(ticket)) {
    return false;
  }

  const activeAgent = await getActiveAgent(companyId, ticket.queueId);
  if (!activeAgent) {
    return false;
  }

  if (ticket.aiHandoff) {
    await resetTicketForAiEngagement(ticket, trigger);
    await ticket.reload();
  } else {
    if (ticket.chatbot || ticket.queueId) {
      await ticket.update({
        chatbot: false,
        queueId: null
      });
      await ticket.reload();
    }
  }

  const enqueued = await enqueueAiInboundMessage({
    companyId,
    ticketId: ticket.id,
    messageBody,
    messageId,
    mediaType,
    mediaUrl,
    mediaFilename
  });

  return enqueued;
};

export const tryEngageAiFromStoredMessage = async (
  ticket: Ticket,
  payload: {
    messageBody: string;
    messageId?: string;
    mediaType?: string;
    mediaUrl?: string;
    mediaFilename?: string;
  },
  trigger: string
): Promise<boolean> => {
  return tryEngageAiOnInboundMessage({
    companyId: ticket.companyId,
    ticket,
    messageBody: payload.messageBody,
    messageId: payload.messageId,
    mediaType: payload.mediaType,
    mediaUrl: payload.mediaUrl,
    mediaFilename: payload.mediaFilename,
    trigger
  });
};
