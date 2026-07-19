import Ticket from "../../../models/Ticket";
import { buildTicketOperationalState } from "../TicketOperationalStateService";

describe("TicketOperationalStateService", () => {
  it("classifies AI handling ticket", () => {
    const state = buildTicketOperationalState({
      aiAgentId: 1,
      aiHandoff: false,
      aiPaused: false,
      userId: null,
      status: "open"
    } as Ticket);

    expect(state.ownerType).toBe("ai");
    expect(state.listColumn).toBe("ai");
    expect(state.allowedActions.assume).toBe(true);
  });

  it("classifies handoff pending without operational mode", () => {
    const state = buildTicketOperationalState({
      aiAgentId: 1,
      aiHandoff: true,
      aiHandoffMode: "definitive",
      status: "pending",
      userId: null
    } as Ticket);

    expect(state.listColumn).toBe("pending");
    expect(state.isHandoffPending).toBe(true);
    expect(state.allowedActions.accept).toBe(true);
  });

  it("classifies human handling and allows release to AI for owner", () => {
    const state = buildTicketOperationalState(
      {
        userId: 9,
        status: "open",
        aiAgentId: 1,
        aiStartedAt: new Date(),
        user: { name: "Thiago" }
      } as Ticket,
      9
    );

    expect(state.ownerType).toBe("human");
    expect(state.listColumn).toBe("open");
    expect(state.allowedActions.releaseToAi).toBe(true);
  });
});
