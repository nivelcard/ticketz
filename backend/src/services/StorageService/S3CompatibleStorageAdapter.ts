import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import {
  IStorageAdapter,
  StorageProvider,
  UploadInput,
  UploadResult
} from "./types";
import { ResolvedStorageConfig } from "./StorageConfigService";

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks as unknown as Uint8Array[]);
};

export class S3CompatibleStorageAdapter implements IStorageAdapter {
  private client: S3Client;

  private bucket: string;

  private provider: StorageProvider;

  private publicUrlBase: string;

  constructor(config: ResolvedStorageConfig) {
    this.bucket = config.bucket;
    this.provider = config.provider;
    this.publicUrlBase = config.publicUrl;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: process.env.STORAGE_REGION || "us-east-1",
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.secretKey
      },
      forcePathStyle: true
    });
  }

  getPublicUrl(key: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key}`;
    }

    return key;
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const body =
      typeof input.body === "string"
        ? Buffer.from(input.body, "utf-8")
        : input.body;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: body,
        ContentType: input.contentType || "application/octet-stream",
        Metadata: input.metadata
      })
    );

    return {
      provider: this.provider,
      bucket: this.bucket,
      key: input.key,
      publicUrl: this.getPublicUrl(input.key),
      sizeBytes: body.length
    };
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );

    return streamToBuffer(response.Body as Readable);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
  }
}
