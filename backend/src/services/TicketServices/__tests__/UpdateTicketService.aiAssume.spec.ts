import Ticket from "../../../models/Ticket";
import { isAiHandlingTicket } from "../../AiServices/AiHelpers";

describe("UpdateTicketService AI assume gate", () => {
  it("allows non-admin assume when ticket is actively handled by AI without queue", () => {
    const ticket = {
      aiAgentId: 1,
      aiHandoff: false,
      aiPaused: false,
      userId: null,
      status: "pending",
      queueId: null
    } as Ticket;

    expect(isAiHandlingTicket(ticket)).toBe(true);
  });

  it("does not treat handoff-pending ticket as AI handling", () => {
    const ticket = {
      aiAgentId: 1,
      aiHandoff: true,
      aiHandoffMode: "definitive",
      aiPaused: true,
      userId: null,
      status: "pending",
      queueId: 5
    } as Ticket;

    expect(isAiHandlingTicket(ticket)).toBe(false);
  });
});
