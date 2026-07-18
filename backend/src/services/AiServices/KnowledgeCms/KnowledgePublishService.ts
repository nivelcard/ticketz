import KnowledgeAsset from "../../../models/KnowledgeAsset";
import AppError from "../../../errors/AppError";
import {
  createNewAssetVersionFromCurrent,
  getKnowledgeAsset
} from "./KnowledgeAssetCmsService";
import { getAssetVersion } from "./KnowledgeAssetVersionService";
import {
  enqueueIndexAssetVersion,
  enqueuePublishAssetSwap
} from "./AiKnowledgeIngestionQueueService";
import { executeAtomicSwap } from "./KnowledgeAtomicSwapService";

export type PublishAssetInput = {
  companyId: number;
  assetId: number;
  userId?: number;
  versionId?: number;
};

export const publishKnowledgeAsset = async (
  input: PublishAssetInput
): Promise<KnowledgeAsset> => {
  const asset = await getKnowledgeAsset(input.companyId, input.assetId);

  if (!["approved", "published", "archived"].includes(asset.lifecycleStatus)) {
    throw new AppError("Asset must be approved before publishing", 409);
  }

  let versionId = input.versionId || asset.currentVersionId;

  if (!versionId) {
    const version = await createNewAssetVersionFromCurrent(
      input.companyId,
      asset.id,
      input.userId,
      "Initial publish"
    );
    versionId = version.id;
  }

  const version = await getAssetVersion(input.companyId, versionId);

  if (version.knowledgeAssetId !== asset.id) {
    throw new AppError("Version does not belong to asset", 400);
  }

  if (version.ingestionStatus === "indexed") {
    return executeAtomicSwap({
      companyId: input.companyId,
      assetId: asset.id,
      newVersionId: version.id,
      previousVersionId: asset.publishedVersionId,
      publishedByUserId: input.userId
    });
  }

  if (["pending", "failed"].includes(version.ingestionStatus)) {
    await enqueueIndexAssetVersion({
      companyId: input.companyId,
      assetVersionId: version.id,
      autoPublish: true,
      publishedByUserId: input.userId
    });
    await asset.update({ lifecycleStatus: "approved" });
    return getKnowledgeAsset(input.companyId, asset.id);
  }

  if (version.ingestionStatus === "processing") {
    await enqueuePublishAssetSwap({
      companyId: input.companyId,
      assetId: asset.id,
      newVersionId: version.id,
      previousVersionId: asset.publishedVersionId,
      publishedByUserId: input.userId
    });
    return getKnowledgeAsset(input.companyId, asset.id);
  }

  throw new AppError("Version ingestion state not publishable", 409);
};

export const handlePostIndexPublish = async (input: {
  companyId: number;
  assetVersionId: number;
  publishedByUserId?: number;
}): Promise<KnowledgeAsset> => {
  const version = await getAssetVersion(input.companyId, input.assetVersionId);
  const asset = await getKnowledgeAsset(
    input.companyId,
    version.knowledgeAssetId
  );

  return executeAtomicSwap({
    companyId: input.companyId,
    assetId: asset.id,
    newVersionId: version.id,
    previousVersionId: asset.publishedVersionId,
    publishedByUserId: input.publishedByUserId
  });
};
