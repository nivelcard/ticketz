import fs from "fs";
import os from "os";
import path from "path";
import { FileContents } from "@flystorage/file-storage";
import axios from "axios";
import StorageService from "../services/StorageService/StorageService";
import { getPublicPath } from "./GetPublicPath";
import { makeRandomId } from "./MakeRandomId";
import { logger } from "../utils/logger";

export const streamToBuffer = async (data: FileContents): Promise<Buffer> => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (typeof data === "string") {
    return Buffer.from(data);
  }

  const chunks: Buffer[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of data as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks as unknown as Uint8Array[]);
};

export const inferMediaFolder = (
  mimetype: string,
  baseFolder?: string,
  persistant?: boolean
): string => {
  if (persistant || baseFolder === "media-persistant") {
    return "persistent/media";
  }

  if (baseFolder) {
    return baseFolder;
  }

  const normalized = (mimetype || "").split(";")[0].toLowerCase();
  const [type, subtype] = normalized.split("/");

  if (type === "audio") return "media/audio";
  if (type === "image") return "media/images";
  if (type === "video") return "media/video";

  if (
    subtype?.includes("pdf") ||
    subtype?.includes("document") ||
    subtype?.includes("msword") ||
    subtype?.includes("spreadsheet") ||
    subtype?.includes("presentation") ||
    normalized.includes("officedocument")
  ) {
    return "media/documents";
  }

  return "media/attachments";
};

export const normalizeStorageReference = (mediaPath: string): string =>
  mediaPath.replace(/^\/public\//, "").trim();

export const readMediaBuffer = async (
  mediaPath: string,
  companyId: number
): Promise<Buffer | null> => {
  if (!mediaPath?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(mediaPath)) {
    try {
      const response = await axios.get(mediaPath, {
        responseType: "arraybuffer",
        timeout: 30000
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error({ error, mediaPath }, "Failed to download media from URL");
      return null;
    }
  }

  const localPath = path.join(getPublicPath(), mediaPath);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  try {
    await StorageService.ensureReady(companyId);
    const key = normalizeStorageReference(mediaPath);
    return await StorageService.download(key, companyId);
  } catch (error) {
    logger.debug({ error, mediaPath }, "Media not found in object storage");
    return null;
  }
};

export const resolveMediaAccessPath = async (
  mediaPath: string,
  companyId: number
): Promise<string | null> => {
  if (!mediaPath?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(mediaPath)) {
    return mediaPath;
  }

  const localPath = path.join(getPublicPath(), mediaPath);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  const buffer = await readMediaBuffer(mediaPath, companyId);
  if (!buffer) {
    return null;
  }

  const filename = path.basename(mediaPath) || `media-${makeRandomId(6)}.bin`;
  const tempPath = path.join(
    os.tmpdir(),
    `ticketz-${makeRandomId(8)}-${filename}`
  );
  fs.writeFileSync(tempPath, buffer as Uint8Array);
  return tempPath;
};

export const deleteStoredMedia = async (
  mediaPath: string,
  companyId: number
): Promise<void> => {
  if (!mediaPath?.trim()) {
    return;
  }

  if (/^https?:\/\//i.test(mediaPath)) {
    return;
  }

  const localPath = path.join(getPublicPath(), mediaPath);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    return;
  }

  try {
    await StorageService.ensureReady(companyId);
    const key = normalizeStorageReference(mediaPath);
    await StorageService.delete(key, companyId);
  } catch (error) {
    logger.debug({ error, mediaPath }, "Could not delete media from storage");
  }
};

export const toStoredMediaReference = (input: {
  key: string;
  publicUrl: string;
}): string => {
  if (input.publicUrl?.startsWith("http")) {
    return input.publicUrl;
  }

  return input.key;
};
