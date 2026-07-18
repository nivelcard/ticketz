import Ticket from "../../../../models/Ticket";
import {
  AiTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult
} from "../ToolRegistry";
import {
  buildAiSchedulePromptBlock,
  getAiScheduleContext
} from "../../AiScheduleContextService";

const definition: ToolDefinition = {
  id: "get_business_hours",
  name: "get_business_hours",
  description:
    "Consulta horário comercial configurado e se está dentro do expediente.",
  parameters: {
    type: "object",
    properties: {},
    required: []
  },
  riskLevel: "read",
  enabled: true,
  allowedOverrideParams: []
};

export const GetBusinessHoursTool: AiTool = {
  definition,
  execute: async (
    _input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> => {
    const ticket = await Ticket.findOne({
      where: { id: context.ticketId, companyId: context.companyId }
    });

    if (!ticket) {
      return {
        success: false,
        output: JSON.stringify({ error: "ticket_not_found" }),
        errorCode: "ticket_not_found"
      };
    }

    const scheduleContext = await getAiScheduleContext(ticket);

    return {
      success: true,
      output: JSON.stringify({
        scheduleEnabled: scheduleContext.scheduleEnabled,
        inBusinessHours: scheduleContext.inBusinessHours,
        officialNotice: scheduleContext.officialNotice,
        scheduleSummary: scheduleContext.scheduleSummary,
        promptBlock: buildAiSchedulePromptBlock(scheduleContext)
      })
    };
  }
};
