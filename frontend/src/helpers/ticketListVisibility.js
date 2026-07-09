import { isAiHandlingTicket } from "./aiTicketStatus";

export const ticketMatchesSelectedQueues = (ticket, selectedQueueIds = []) => {
  if (!ticket?.queueId) {
    return isAiHandlingTicket(ticket) || !!ticket?.aiHandoff;
  }

  return selectedQueueIds.includes(ticket.queueId);
};

export const shouldShowTicketInList = ({
  ticket,
  status,
  supervision,
  selectedQueueIds,
  profile,
  showAll
}) => {
  if (!ticket) {
    return false;
  }

  if (!supervision && status === "pending" && isAiHandlingTicket(ticket)) {
    return false;
  }

  if (profile === "admin" || showAll) {
    return ticketMatchesSelectedQueues(ticket, selectedQueueIds);
  }

  return ticketMatchesSelectedQueues(ticket, selectedQueueIds);
};
