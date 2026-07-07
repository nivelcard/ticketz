export type AIProviderId =
  | "openai"
  | "groq"
  | "gemini"
  | "anthropic"
  | "openrouter"
  | "azure"
  | "ollama"
  | "custom";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResult = {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  model: string;
};

export type ChatCompletionParams = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export interface AIProvider {
  readonly id: AIProviderId;

  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>;

  createEmbedding(text: string, model?: string): Promise<number[]>;

  transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    model?: string
  ): Promise<string>;

  analyzeImage(
    imageUrl: string,
    model?: string,
    prompt?: string
  ): Promise<string>;
}
