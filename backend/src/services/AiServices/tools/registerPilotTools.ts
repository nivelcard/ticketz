import { AiTool, registerTools } from "./ToolRegistry";

let pilotToolsRegistered = false;

export const ensurePilotToolsRegistered = (): void => {
  if (pilotToolsRegistered) {
    return;
  }

  pilotToolsRegistered = true;

  // Lazy require avoids circular dependency during audit/seed bootstrap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GetTicketStatusTool } = require("./definitions/GetTicketStatusTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GetBusinessHoursTool } = require("./definitions/GetBusinessHoursTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    SearchPublishedKnowledgeTool
  } = require("./definitions/SearchPublishedKnowledgeTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    RequestHumanHandoffTool
  } = require("./definitions/RequestHumanHandoffTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AddTicketTagTool } = require("./definitions/write/AddTicketTagTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    UpdateTicketPriorityTool
  } = require("./definitions/write/UpdateTicketPriorityTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    TransferTicketQueueTool
  } = require("./definitions/write/TransferTicketQueueTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    CreateContactMemoryNoteTool
  } = require("./definitions/write/CreateContactMemoryNoteTool");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScheduleFollowupTool } = require("./definitions/write/ScheduleFollowupTool");

  const tools: AiTool[] = [
    GetTicketStatusTool,
    GetBusinessHoursTool,
    SearchPublishedKnowledgeTool,
    RequestHumanHandoffTool,
    AddTicketTagTool,
    UpdateTicketPriorityTool,
    TransferTicketQueueTool,
    CreateContactMemoryNoteTool,
    ScheduleFollowupTool
  ].filter(Boolean);

  registerTools(tools);
};

export { GetTicketStatusTool } from "./definitions/GetTicketStatusTool";
export { GetBusinessHoursTool } from "./definitions/GetBusinessHoursTool";
export { SearchPublishedKnowledgeTool } from "./definitions/SearchPublishedKnowledgeTool";
export { RequestHumanHandoffTool } from "./definitions/RequestHumanHandoffTool";
export { AddTicketTagTool } from "./definitions/write/AddTicketTagTool";
export { UpdateTicketPriorityTool } from "./definitions/write/UpdateTicketPriorityTool";
export { TransferTicketQueueTool } from "./definitions/write/TransferTicketQueueTool";
export { CreateContactMemoryNoteTool } from "./definitions/write/CreateContactMemoryNoteTool";
export { ScheduleFollowupTool } from "./definitions/write/ScheduleFollowupTool";

// Defer registration so circular imports finish before tools are bound.
setImmediate(() => {
  ensurePilotToolsRegistered();
});
