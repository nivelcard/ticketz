import {
  AiTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult
} from "../ToolRegistry";
import { buildKnowledgeContextForQuery } from "../../KnowledgeContextService";

const definition: ToolDefinition = {
  id: "search_published_knowledge",
  name: "search_published_knowledge",
  description:
    "Busca conhecimento publicado nas bases vinculadas ao agente especialista.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Consulta de busca na base de conhecimento"
      },
      limit: {
        type: "number",
        description: "Quantidade máxima de trechos"
      }
    },
    required: ["query"]
  },
  riskLevel: "read",
  enabled: true,
  allowedOverrideParams: []
};

export const SearchPublishedKnowledgeTool: AiTool = {
  definition,
  execute: async (
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> => {
    const query = String(input.query || context.userText || "").trim();
    const knowledgeBaseIds = context.knowledgeBaseIds || [];

    if (!query) {
      return {
        success: false,
        output: JSON.stringify({ error: "missing_query" }),
        errorCode: "missing_query"
      };
    }

    if (!knowledgeBaseIds.length) {
      return {
        success: true,
        output: JSON.stringify({
          query,
          chunks: [],
          hasReadyDocuments: false
        })
      };
    }

    const knowledgeContext = await buildKnowledgeContextForQuery({
      companyId: context.companyId,
      knowledgeBaseIds,
      userText: query,
      provider: context.providerId
    });

    return {
      success: true,
      output: JSON.stringify({
        query,
        contextBlock: knowledgeContext.contextBlock,
        hasReadyDocuments: knowledgeContext.hasReadyDocuments,
        chunks: knowledgeContext.usedChunks.map(chunk => ({
          id: chunk.id,
          similarity: chunk.similarity,
          documentTitle: chunk.documentTitle,
          content: chunk.content
        }))
      })
    };
  }
};
