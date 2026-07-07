import { getAIProvider } from "./providers/ProviderFactory";
import { ChatCompletionResult, ChatMessage } from "./providers/AIProvider";

export type { ChatMessage, ChatCompletionResult };

export const createEmbedding = async (
  companyId: number,
  text: string,
  providerId?: string
): Promise<number[]> => {
  const provider = await getAIProvider(companyId, providerId);
  return provider.createEmbedding(text);
};

export const chatCompletion = async (
  companyId: number,
  {
    model,
    messages,
    temperature = 0.3,
    maxTokens = 1024,
    providerId
  }: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    providerId?: string;
  }
): Promise<ChatCompletionResult> => {
  const provider = await getAIProvider(companyId, providerId);
  return provider.chatCompletion({
    model,
    messages,
    temperature,
    maxTokens
  });
};

export const transcribeAudio = async (
  companyId: number,
  audioBuffer: Buffer,
  filename: string,
  model = "gpt-4o-mini-transcribe",
  providerId?: string
): Promise<string> => {
  const provider = await getAIProvider(companyId, providerId);
  return provider.transcribeAudio(audioBuffer, filename, model);
};

export const analyzeImage = async (
  companyId: number,
  imageUrl: string,
  model = "gpt-4o-mini",
  prompt = "Descreva objetivamente o conteúdo desta imagem em português.",
  providerId?: string
): Promise<string> => {
  const provider = await getAIProvider(companyId, providerId);
  return provider.analyzeImage(imageUrl, model, prompt);
};
