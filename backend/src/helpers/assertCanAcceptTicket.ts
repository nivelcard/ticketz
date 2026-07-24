import AppError from "../errors/AppError";
import Queue from "../models/Queue";
import Ticket from "../models/Ticket";
import User from "../models/User";
import canViewTicket from "./canViewTicket";
import { isMasterAdminUser } from "./isMasterAdmin";
import { isAiHandlingTicket } from "../services/AiServices/AiHelpers";

export const isHandoffPendingTicketState = (ticket: Ticket): boolean =>
  !!ticket.aiHandoff && ticket.status === "pending" && !ticket.userId;

export const assertCanAcceptTicket = async (
  ticket: Ticket,
  user: User
): Promise<void> => {
  if (user.profile === "admin" || user.super || isMasterAdminUser(user)) {
    return;
  }

  if (ticket.status === "closed") {
    throw new AppError("ERR_TICKET_CLOSED", 400);
  }

  if (ticket.userId && Number(ticket.userId) !== Number(user.id)) {
    throw new AppError("ERR_TICKET_ALREADY_ASSIGNED", 409);
  }

  if (isHandoffPendingTicketState(ticket)) {
    return;
  }

  if (isAiHandlingTicket(ticket) && canViewTicket(ticket, user)) {
    return;
  }

  const needsQueueCheck =
    ticket.queueId || (!ticket.queueId && ticket.status === "pending");

  if (!needsQueueCheck) {
    return;
  }

  if (!ticket.queueId && ticket.status === "pending") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (ticket.queueId) {
    const userWithQueues = user.queues?.length
      ? user
      : await User.findByPk(user.id, {
          include: [{ model: Queue, as: "queues" }]
        });

    const queueIds = userWithQueues?.queues?.map(q => q.id) || [];
    if (!queueIds.includes(ticket.queueId)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }
};
