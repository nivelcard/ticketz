import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { GetCompanySetting } from "../../helpers/CheckSettings";
import { convertAudioToMp4 } from "../../helpers/mediaConversion";
import { readMediaBuffer, streamToBuffer } from "../../helpers/mediaStorage";
import { isAudioPlaceholder } from "../../helpers/mediaPlaceholders";
import { transcribeAudioBuffer } from "./AudioTranscriptionService";
import { logAudioPipeline } from "./AudioPipelineLogger";

export type AudioResolveInput = {
  companyId: number;
  ticketId?: number;
  messageId?: string;
  audioBuffer?: Buffer | null;
  mediaUrl?: string | null;
  filename?: string;
  mimeType?: string;
  existingText?: string;
  transcriptionModel?: string;
  providerId?: string;
};

export type AudioResolveResult = {
  text: string;
  success: boolean;
  source: "existing_text" | "buffer" | "storage" | "failed";
  errorReason?: string;
};

const WHATSAPP_AUDIO_EXTENSIONS = new Set([
  "ogg",
  "opus",
  "webm",
  "m4a",
  "mp4"
]);

const resolveExtension = (filename?: string, mimeType?: string): string => {
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName) {
    return fromName;
  }

  const normalized = (mimeType || "").split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a"
  };

  return map[normalized] || "ogg";
};

const shouldConvertForTranscription = (
  extension: string,
  mimeType?: string
): boolean => {
  const normalizedMime = (mimeType || "").toLowerCase();
  return (
    WHATSAPP_AUDIO_EXTENSIONS.has(extension) ||
    normalizedMime.includes("opus") ||
    normalizedMime.includes("ogg")
  );
};

const convertBufferToMp3 = async (
  buffer: Buffer,
  extension: string,
  context: Record<string, unknown>
): Promise<Buffer> => {
  const tempInput = path.join(
    tmpdir(),
    `ticketz-audio-in-${Date.now()}.${extension}`
  );

  try {
    fs.writeFileSync(tempInput, new Uint8Array(buffer));
    logAudioPipeline("ffmpeg_convert", {
      ...context,
      extension,
      inputSize: buffer.length
    });

    const converted = await convertAudioToMp4(tempInput);
    const mp3Buffer = Buffer.isBuffer(converted.data)
      ? converted.data
      : await streamToBuffer(converted.data);

    logAudioPipeline("ffmpeg_convert_ok", {
      ...context,
      outputSize: mp3Buffer.length
    });

    return mp3Buffer;
  } catch (error) {
    logAudioPipeline("ffmpeg_convert_failed", {
      ...context,
      reason: error instanceof Error ? error.message : String(error)
    });
    return buffer;
  } finally {
    try {
      if (fs.existsSync(tempInput)) {
        fs.unlinkSync(tempInput);
      }
    } catch {
      // ignore cleanup errors
    }
  }
};

export const resolveInboundAudioText = async ({
  companyId,
  ticketId,
  messageId,
  audioBuffer,
  mediaUrl,
  filename = "audio.ogg",
  mimeType,
  existingText = "",
  transcriptionModel,
  providerId
}: AudioResolveInput): Promise<AudioResolveResult> => {
  const context = {
    companyId,
    ticketId,
    messageId,
    mediaUrl,
    filename,
    mimeType
  };

  if (existingText?.trim() && !isAudioPlaceholder(existingText)) {
    logAudioPipeline("deliver_to_llm", {
      ...context,
      source: "existing_text",
      textLength: existingText.length
    });
    return {
      text: existingText.trim(),
      success: true,
      source: "existing_text"
    };
  }

  let workingBuffer = audioBuffer || null;

  if (!workingBuffer && mediaUrl) {
    logAudioPipeline("download_start", context);
    workingBuffer = await readMediaBuffer(mediaUrl, companyId);

    if (!workingBuffer?.length) {
      logAudioPipeline("download_failed", {
        ...context,
        reason: "buffer_empty_after_read"
      });
      return {
        text: "",
        success: false,
        source: "failed",
        errorReason: "download_failed"
      };
    }

    logAudioPipeline("download_ok", {
      ...context,
      bufferSize: workingBuffer.length
    });
  }

  if (!workingBuffer?.length) {
    logAudioPipeline("buffer_empty", context);
    return {
      text: "",
      success: false,
      source: "failed",
      errorReason: "buffer_empty"
    };
  }

  logAudioPipeline("buffer_loaded", {
    ...context,
    bufferSize: workingBuffer.length
  });

  const extension = resolveExtension(filename, mimeType);
  logAudioPipeline("mime_detected", {
    ...context,
    extension,
    mimeType: mimeType || "unknown"
  });

  let uploadBuffer = workingBuffer;
  let uploadFilename = filename;
  let uploadMimeType = mimeType || `audio/${extension}`;

  if (shouldConvertForTranscription(extension, mimeType)) {
    uploadBuffer = await convertBufferToMp3(workingBuffer, extension, context);
    uploadFilename = filename.replace(/\.[^.]+$/, ".m4a") || "audio.m4a";
    uploadMimeType = "audio/mp4";
  }

  const transcriptionProvider =
    providerId ||
    (await GetCompanySetting(companyId, "aiProvider", "openai")) ||
    "openai";

  logAudioPipeline("transcribe_start", {
    ...context,
    model: transcriptionModel,
    provider: transcriptionProvider,
    uploadSize: uploadBuffer.length,
    uploadFilename
  });

  const transcription = await transcribeAudioBuffer({
    companyId,
    audioBuffer: uploadBuffer,
    filename: uploadFilename,
    mimeType: uploadMimeType,
    model: transcriptionModel,
    providerId: transcriptionProvider,
    ticketId,
    messageId
  });

  if (transcription.success && transcription.text) {
    logAudioPipeline("transcribe_ok", {
      ...context,
      textLength: transcription.text.length,
      attempts: transcription.attempts,
      model: transcription.model
    });

    logAudioPipeline("deliver_to_llm", {
      ...context,
      textLength: transcription.text.length
    });

    return {
      text: transcription.text,
      success: true,
      source: audioBuffer ? "buffer" : "storage"
    };
  }

  const errorReason = transcription.errorReason || "transcribe_failed";
  const stage =
    errorReason.includes("timeout") || errorReason.includes("timed out")
      ? "transcribe_timeout"
      : errorReason.includes("model")
        ? "model_error"
        : "transcribe_failed";

  logAudioPipeline(stage, {
    ...context,
    reason: errorReason,
    attempts: transcription.attempts,
    model: transcription.model,
    provider: transcription.provider
  });

  return {
    text: "",
    success: false,
    source: "failed",
    errorReason
  };
};
