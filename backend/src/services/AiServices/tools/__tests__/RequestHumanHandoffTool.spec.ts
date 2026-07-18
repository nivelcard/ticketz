import Ticket from "../../../../models/Ticket";
import { RequestHumanHandoffTool } from "../definitions/RequestHumanHandoffTool";

jest.mock("../../../../models/Ticket");
jest.mock("../../HandoffToHumanService", () => jest.fn());
jest.mock("../../AiInboundQueueService", () => ({
  getAiInboundQueue: () => ({
    client: {
      set: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1)
    }
  })
}));

const mockedTicket = Ticket as jest.Mocked<typeof Ticket>;

describe("RequestHumanHandoffTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns alreadyInHandoff without reexecuting handoff", async () => {
    mockedTicket.findOne.mockResolvedValue({
      id: 10,
      companyId: 1,
      status: "pending",
      aiHandoff: true,
      userId: null
    } as Ticket);

    const result = await RequestHumanHandoffTool.execute(
      {},
      {
        companyId: 1,
        aiAgentId: 2,
        ticketId: 10,
        contactId: 5
      }
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("already_in_handoff");
  });

  it("returns alreadyAssigned when ticket has human user", async () => {
    mockedTicket.findOne.mockResolvedValue({
      id: 11,
      companyId: 1,
      status: "open",
      aiHandoff: false,
      userId: 99
    } as Ticket);

    const result = await RequestHumanHandoffTool.execute(
      {},
      {
        companyId: 1,
        aiAgentId: 2,
        ticketId: 11,
        contactId: 5
      }
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("already_assigned");
  });

  it("returns controlled error for closed ticket", async () => {
    mockedTicket.findOne.mockResolvedValue({
      id: 12,
      companyId: 1,
      status: "closed",
      aiHandoff: false,
      userId: null
    } as Ticket);

    const result = await RequestHumanHandoffTool.execute(
      {},
      {
        companyId: 1,
        aiAgentId: 2,
        ticketId: 12,
        contactId: 5
      }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ticket_closed");
  });
});
