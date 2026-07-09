import { logger } from "../../utils/logger";

export type AudioPipelineStage =
  | "download_start"
  | "download_ok"
  | "download_failed"
  | "storage_read"
  | "buffer_loaded"
  | "buffer_empty"
  | "mime_detected"
  | "ffmpeg_convert"
  | "ffmpeg_convert_ok"
  | "ffmpeg_convert_failed"
  | "transcribe_start"
  | "transcribe_ok"
  | "transcribe_failed"
  | "transcribe_timeout"
  | "model_error"
  | "deliver_to_llm"
  | "response_generated";

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
