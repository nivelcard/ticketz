export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type ToolExecutionContext = {
  companyId: number;
  aiAgentId: number;
  ticketId: number;
  contactId: number;
};

export type ToolExecutionResult = {
  success: boolean;
  output: string;
};

export interface AiTool {
  definition: ToolDefinition;
  execute(
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;
}

const registeredTools: AiTool[] = [];

export const registerTool = (tool: AiTool): void => {
  registeredTools.push(tool);
};

export const listTools = (): ToolDefinition[] =>
  registeredTools.map(tool => tool.definition);

export const getAllowedTools = (allowedToolIds: string[]): AiTool[] =>
  registeredTools.filter(tool => allowedToolIds.includes(tool.definition.id));
