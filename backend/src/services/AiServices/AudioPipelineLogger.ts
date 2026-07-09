import { logger } from "../../utils/logger";

export type AudioPipelineStage =
  | "download_start"
  | "download_ok"
  | "download_failed"
  | "storage_read"
  | "transcribe_start"
  | "transcribe_ok"
  | "transcribe_failed"
  | "deliver_to_llm";

export const logAudioPipeline = (
  stage: AudioPipelineStage,
  context: Record<string, unknown>
): void => {
  logger.info(
    {
      pipeline: "audio",
      stage,
      ...context
    },
    `AudioPipeline:${stage}`
  );
};
