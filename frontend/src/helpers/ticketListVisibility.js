import {
  canSuperviseAi,
  isAiHandlingTicket,
  isHandoffPendingTicket
} from "./aiTicketStatus";

export const ticketMatchesSelectedQueues = (ticket, selectedQueueIds = []) => {
  if (!ticket?.queueId) {
    return false;
  }

  if (!selectedQueueIds?.length) {
    return true;
  }

  return selectedQueueIds.includes(ticket.queueId);
};

export const shouldShowTicketInList = ({
  ticket,
  status,
  supervision,
  selectedQueueIds,
  profile,
  showAll,
  userId
}) => {
  if (!ticket) {
    return false;
  }

  if (!ticketMatchesSelectedQueues(ticket, selectedQueueIds)) {
    return false;
  }

  if (supervision) {
    return true;
  }

  if (status === "pending") {
    return !isAiHandlingTicket(ticket);
  }

  if (status === "open") {
    if (showAll && profile === "admin") {
      return true;
    }

    return !ticket.userId || Number(ticket.userId) === Number(userId);
  }

  return true;
};

export const isTicketObservationMode = (ticket, user) => {
  if (!ticket?.id || !user?.id) {
    return false;
  }

  if (
    ticket.status === "open" &&
    ticket.userId &&
    Number(ticket.userId) === Number(user.id)
  ) {
    return false;
  }

  if (isHandoffPendingTicket(ticket)) {
    return true;
  }

  if (isAiHandlingTicket(ticket)) {
    return canSuperviseAi(user);
  }

  if (ticket.status === "pending" && !ticket.userId) {
    return true;
  }

  return false;
};
