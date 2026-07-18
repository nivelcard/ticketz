import KnowledgeAsset from "../../../models/KnowledgeAsset";
import AppError from "../../../errors/AppError";
import {
  createNewAssetVersionFromCurrent,
  getKnowledgeAsset
} from "./KnowledgeAssetCmsService";
import { enqueueIndexAssetVersion } from "./AiKnowledgeIngestionQueueService";

export type ReindexScopeType =
  | "asset"
  | "category"
  | "base"
  | "domain"
  | "company";

export const enqueueAssetReindex = async (input: {
  companyId: number;
  assetId: number;
  userId?: number;
}): Promise<KnowledgeAsset> => {
  const asset = await getKnowledgeAsset(input.companyId, input.assetId);

  if (!["published", "approved"].includes(asset.lifecycleStatus)) {
    throw new AppError(
      "Only published or approved assets can be reindexed",
      409
    );
  }

  const version = await createNewAssetVersionFromCurrent(
    input.companyId,
    asset.id,
    input.userId,
    "Reindex"
  );

  await enqueueIndexAssetVersion({
    companyId: input.companyId,
    assetVersionId: version.id,
    autoPublish: asset.lifecycleStatus === "published",
    publishedByUserId: input.userId
  });

  return getKnowledgeAsset(input.companyId, asset.id);
};

export const enqueueBulkReindex = (
  scopeType: Exclude<ReindexScopeType, "asset">,
  _companyId: number,
  _scopeId?: number
): never => {
  throw new Error(
    `Bulk reindex for scopeType=${scopeType} is not implemented in Phase 2`
  );
};
