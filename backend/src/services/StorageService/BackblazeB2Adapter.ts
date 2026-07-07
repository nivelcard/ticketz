import { ResolvedStorageConfig } from "./StorageConfigService";
import { S3CompatibleStorageAdapter } from "./S3CompatibleStorageAdapter";
import { IStorageAdapter } from "./types";

export class BackblazeB2Adapter implements IStorageAdapter {
  private adapter: S3CompatibleStorageAdapter;

  constructor(config: ResolvedStorageConfig) {
    this.adapter = new S3CompatibleStorageAdapter({
      ...config,
      provider: "backblaze"
    });
  }

  upload(input: Parameters<IStorageAdapter["upload"]>[0]) {
    return this.adapter.upload(input);
  }

  download(key: string) {
    return this.adapter.download(key);
  }

  delete(key: string) {
    return this.adapter.delete(key);
  }

  getPublicUrl(key: string) {
    return this.adapter.getPublicUrl(key);
  }
}
