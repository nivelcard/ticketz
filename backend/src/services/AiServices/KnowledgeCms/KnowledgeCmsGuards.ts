import { KnowledgeMetadata } from "./KnowledgeMetadataSchema";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export const assertSecureAssetUrl = (url: string): void => {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Insecure URL: HTTPS is required");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Insecure URL: local addresses are not allowed");
  }

  if (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error("Insecure URL: private network addresses are not allowed");
  }
};

export const isAssetMetadataExpired = (
  metadata: KnowledgeMetadata | null | undefined,
  now: Date = new Date()
): boolean => {
  const validUntil = metadata?.validUntil;
  if (validUntil == null || typeof validUntil !== "string") {
    return false;
  }

  const expiresAt = Date.parse(validUntil);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt < now.getTime();
};

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "markdown",
  "html"
] as const;

export const assertAllowedUploadExtension = (filename: string): void => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (
    !ALLOWED_UPLOAD_EXTENSIONS.includes(
      ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]
    )
  ) {
    throw new Error("Unsupported file type");
  }
};
