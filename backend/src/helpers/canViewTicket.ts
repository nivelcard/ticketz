import Ticket from "../models/Ticket";
import User from "../models/User";
import { isAiHandlingTicket } from "../services/AiServices/AiHelpers";
import { isHandoffPendingTicketState } from "./assertCanAcceptTicket";

export const canViewTicket = (ticket: Ticket, user: User): boolean => {
  if (user.profile === "admin" || user.super) {
    return true;
  }

  const userId = Number(user.id);
  const queueIds = (user.queues || []).map(queue => Number(queue.id));

  if (ticket.userId && Number(ticket.userId) === userId) {
    return true;
  }

  if (isHandoffPendingTicketState(ticket)) {
    return true;
  }

  if (isAiHandlingTicket(ticket)) {
    return true;
  }

  if (ticket.status === "pending" && !ticket.userId) {
    if (!ticket.queueId) {
      return false;
    }
    return queueIds.includes(Number(ticket.queueId));
  }

  if (ticket.status === "closed") {
    return true;
  }

  if (
    ticket.status === "open" &&
    ticket.queueId &&
    queueIds.includes(Number(ticket.queueId))
  ) {
    return true;
  }

  return false;
};

export default canViewTicket;
