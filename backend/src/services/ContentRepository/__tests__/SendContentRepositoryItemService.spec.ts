jest.mock("../../WbotServices/SendWhatsAppMedia", () => jest.fn());
jest.mock("../../WbotServices/SendWhatsAppMessage", () => jest.fn());
jest.mock("../../AiServices/Triage/AiTicketTimelineService", () => ({
  logAiTicketTimelineEvent: jest.fn()
}));
jest.mock("../ContentRepositoryService", () => ({
  getRepositoryItem: jest.fn(),
  recordRepositoryUsage: jest.fn(),
  canAccessRepositoryItem: jest.fn(() => true),
  resolveRepositoryMime: jest.fn(() => "text/plain")
}));

import sendRepositoryItemToTicket from "../SendContentRepositoryItemService";
import {
  getRepositoryItem,
  recordRepositoryUsage
} from "../ContentRepositoryService";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import SendWhatsAppMessage from "../../WbotServices/SendWhatsAppMessage";

jest.mock("../../../models/Ticket");
jest.mock("../../../models/User");

describe("SendContentRepositoryItemService", () => {
  const item = {
    id: 5,
    companyId: 1,
    contentType: "text",
    active: true,
    allowHumanUse: true,
    useForDelivery: true,
    description: "Hello",
    usageCount: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRepositoryItem as jest.Mock).mockResolvedValue(item);
    (Ticket.findOne as jest.Mock).mockResolvedValue({
      id: 9,
      companyId: 1,
      status: "open",
      channel: "whatsapp",
      contact: {},
      whatsapp: {}
    });
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 7,
      queues: []
    });
    (SendWhatsAppMessage as jest.Mock).mockResolvedValue(undefined);
    (recordRepositoryUsage as jest.Mock).mockResolvedValue(undefined);
  });

  it("sends text repository item and records usage", async () => {
    const result = await sendRepositoryItemToTicket({
      companyId: 1,
      ticketId: 9,
      itemId: 5,
      userId: 7,
      profile: "user"
    });

    expect(result.messageType).toBe("text");
    expect(SendWhatsAppMessage).toHaveBeenCalled();
    expect(recordRepositoryUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "human",
        ticketId: 9,
        userId: 7
      })
    );
  });

  it("blocks send on closed ticket", async () => {
    (Ticket.findOne as jest.Mock).mockResolvedValue({
      id: 9,
      companyId: 1,
      status: "closed"
    });

    await expect(
      sendRepositoryItemToTicket({
        companyId: 1,
        ticketId: 9,
        itemId: 5,
        userId: 7,
        profile: "user"
      })
    ).rejects.toMatchObject({ message: "ERR_TICKET_CLOSED" });
  });
});
