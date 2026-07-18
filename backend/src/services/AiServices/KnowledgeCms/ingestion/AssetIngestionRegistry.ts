import { KnowledgeAssetType } from "../../../../models/KnowledgeAsset";
import { BaseAssetHandler } from "./BaseAssetHandler";
import {
  FaqAssetHandler,
  MarkdownAssetHandler,
  PdfAssetHandler,
  TextAssetHandler,
  UrlAssetHandler,
  WordAssetHandler
} from "./handlers";

const handlers: BaseAssetHandler[] = [
  new TextAssetHandler(),
  new MarkdownAssetHandler(),
  new PdfAssetHandler(),
  new WordAssetHandler(),
  new FaqAssetHandler(),
  new UrlAssetHandler()
];

const handlerMap = new Map<string, BaseAssetHandler>(
  handlers.map(handler => [handler.assetType, handler])
);

export const getAssetIngestionHandler = (
  assetType: KnowledgeAssetType | string
): BaseAssetHandler => {
  const normalized = assetType === "document" ? "text" : assetType;
  const handler = handlerMap.get(normalized);

  if (!handler) {
    throw new Error(
      `No ingestion handler registered for assetType=${assetType}`
    );
  }

  return handler;
};

export const listRegisteredAssetTypes = (): string[] => [...handlerMap.keys()];
