export type AssetExtractionContext = {
  companyId: number;
  storageUrl?: string;
  rawText?: string;
  metadata?: Record<string, unknown>;
};

export type AssetExtractionResult = {
  text: string;
  metadata?: Record<string, unknown>;
};

export abstract class BaseAssetHandler {
  abstract readonly assetType: string;

  abstract extract(
    context: AssetExtractionContext
  ): Promise<AssetExtractionResult>;
}
