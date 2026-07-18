import { Op } from "sequelize";
import AiAgentTool from "../../../models/AiAgentTool";
import AiAgent from "../../../models/AiAgent";
import {
  getAllowedTools,
  listTools,
  ToolDefinition,
  isWriteRiskLevel
} from "./ToolRegistry";

export const listAgentToolBindings = async (
  companyId: number,
  aiAgentId: number
): Promise<
  Array<{
    toolId: string;
    enabled: boolean;
    config: Record<string, unknown> | null;
    definition?: ToolDefinition;
  }>
> => {
  const agent = await AiAgent.findOne({ where: { companyId, id: aiAgentId } });
  if (!agent) return [];

  const bindings = await AiAgentTool.findAll({
    where: { companyId, aiAgentId }
  });

  const definitions = listTools();
  const definitionMap = new Map(definitions.map(item => [item.id, item]));

  return bindings.map(binding => ({
    toolId: binding.toolId,
    enabled: binding.enabled,
    config: binding.config,
    definition: definitionMap.get(binding.toolId)
  }));
};

export const getEnabledToolIdsForAgent = async (
  companyId: number,
  aiAgentId: number
): Promise<string[]> => {
  const bindings = await AiAgentTool.findAll({
    where: { companyId, aiAgentId, enabled: true }
  });

  return bindings.map(binding => binding.toolId);
};

export const syncAgentTools = async (input: {
  companyId: number;
  aiAgentId: number;
  tools: Array<{
    toolId: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;
}): Promise<void> => {
  const agent = await AiAgent.findOne({
    where: { companyId: input.companyId, id: input.aiAgentId }
  });

  if (!agent) {
    throw new Error("agent_not_found");
  }

  if (agent.role === "orchestrator") {
    throw new Error("orchestrator_cannot_have_tools");
  }

  const registeredIds = new Set(listTools().map(tool => tool.id));

  await Promise.all(
    input.tools.map(async tool => {
      if (!registeredIds.has(tool.toolId)) {
        throw new Error(`unknown_tool:${tool.toolId}`);
      }

      const existing = await AiAgentTool.findOne({
        where: {
          companyId: input.companyId,
          aiAgentId: input.aiAgentId,
          toolId: tool.toolId
        }
      });

      if (existing) {
        await existing.update({
          enabled: tool.enabled,
          config: tool.config || null
        });
      } else {
        await AiAgentTool.create({
          companyId: input.companyId,
          aiAgentId: input.aiAgentId,
          toolId: tool.toolId,
          enabled: tool.enabled,
          config: tool.config || null
        });
      }
    })
  );

  const allowedIds = input.tools.map(item => item.toolId);
  await AiAgentTool.destroy({
    where: {
      companyId: input.companyId,
      aiAgentId: input.aiAgentId,
      toolId: { [Op.notIn]: allowedIds }
    }
  });
};

export const resolveExecutableTools = async (
  companyId: number,
  aiAgentId: number
) => {
  const enabledIds = await getEnabledToolIdsForAgent(companyId, aiAgentId);
  return getAllowedTools(enabledIds);
};

export const seedDefaultAgentTools = async (
  companyId: number,
  aiAgentId: number
): Promise<void> => {
  const toolIds = listTools().map(tool => tool.id);

  await Promise.all(
    toolIds.map(toolId => {
      const definition = listTools().find(tool => tool.id === toolId);
      const defaultEnabled =
        toolId !== "request_human_handoff" &&
        !isWriteRiskLevel(definition?.riskLevel || "read");

      return AiAgentTool.findOrCreate({
        where: { companyId, aiAgentId, toolId },
        defaults: {
          companyId,
          aiAgentId,
          toolId,
          enabled: defaultEnabled,
          config: null
        }
      });
    })
  );
};
