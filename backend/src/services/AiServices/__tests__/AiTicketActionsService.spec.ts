import Ticket from "../../../models/Ticket";
import { isAssumeEligibleTicket } from "../AiTicketActionsService";

const buildTicket = (overrides: Partial<Ticket> = {}): Ticket =>
  ({
    id: 1,
    companyId: 1,
    status: "pending",
    userId: null,
    aiHandoff: false,
    aiAgentId: null,
    aiPaused: false,
    aiHandoffMode: null,
    ...overrides
  }) as Ticket;

describe("AiTicketActionsService", () => {
  describe("isAssumeEligibleTicket", () => {
    it("allows handoff pending tickets", () => {
      expect(
        isAssumeEligibleTicket(
          buildTicket({
            aiHandoff: true,
            status: "pending",
            aiAgentId: 10
          })
        )
      ).toBe(true);
    });

    it("allows pending tickets with AI history even without active handoff flag", () => {
      expect(
        isAssumeEligibleTicket(
          buildTicket({
            aiStartedAt: new Date(),
            aiHandoffReason: "customer_requested_human"
          })
        )
      ).toBe(true);
    });

    it("rejects regular pending tickets without AI context", () => {
      expect(isAssumeEligibleTicket(buildTicket())).toBe(false);
    });
  });
});
