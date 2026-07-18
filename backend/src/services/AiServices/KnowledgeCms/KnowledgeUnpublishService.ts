import KnowledgeAsset from "../../../models/KnowledgeAsset";
import KnowledgeChunk from "../../../models/KnowledgeChunk";
import AppError from "../../../errors/AppError";
import { getKnowledgeAsset } from "./KnowledgeAssetCmsService";
import { enqueueCleanupAssetVersion } from "./AiKnowledgeIngestionQueueService";

export const unpublishKnowledgeAsset = async (
  companyId: number,
  assetId: number
): Promise<KnowledgeAsset> => {
  const asset = await getKnowledgeAsset(companyId, assetId);

  if (asset.lifecycleStatus !== "published") {
    throw new AppError("Asset is not published", 409);
  }

  const previousVersionId = asset.publishedVersionId;

  await asset.update({
    lifecycleStatus: "archived",
    archivedAt: new Date(),
    publishedVersionId: null
  });

  await KnowledgeChunk.update(
    { lifecycleStatus: "archived" },
    {
      where: {
        companyId,
        knowledgeAssetId: asset.id
      }
    }
  );

  if (previousVersionId) {
    await enqueueCleanupAssetVersion({
      companyId,
      assetVersionId: previousVersionId
    });
  }

  return getKnowledgeAsset(companyId, assetId);
};

export const cleanupArchivedVersionChunks = async (
  companyId: number,
  assetVersionId: number
): Promise<number> => {
  const deleted = await KnowledgeChunk.destroy({
    where: {
      companyId,
      knowledgeAssetVersionId: assetVersionId,
      lifecycleStatus: "archived"
    }
  });

  return deleted;
};
