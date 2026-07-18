import sequelize from "../../../database";
import KnowledgeAsset from "../../../models/KnowledgeAsset";
import KnowledgeAssetVersion from "../../../models/KnowledgeAssetVersion";
import KnowledgeChunk from "../../../models/KnowledgeChunk";
import AppError from "../../../errors/AppError";
import { logger } from "../../../utils/logger";
import { enqueueCleanupAssetVersion } from "./AiKnowledgeIngestionQueueService";

export type AtomicSwapInput = {
  companyId: number;
  assetId: number;
  newVersionId: number;
  previousVersionId?: number | null;
  publishedByUserId?: number;
};

export const validateVersionForPublish = async (
  companyId: number,
  versionId: number,
  assetType: string
): Promise<{ chunkCount: number }> => {
  const version = await KnowledgeAssetVersion.findOne({
    where: { id: versionId, companyId }
  });

  if (!version) {
    throw new AppError("Asset version not found", 404);
  }

  if (version.ingestionStatus !== "indexed") {
    throw new AppError("Version is not indexed", 409);
  }

  const chunkCount = await KnowledgeChunk.count({
    where: { companyId, knowledgeAssetVersionId: versionId }
  });

  if (chunkCount === 0 && assetType !== "faq") {
    throw new AppError("Version has no chunks", 409);
  }

  const missingEmbeddings = await KnowledgeChunk.count({
    where: {
      companyId,
      knowledgeAssetVersionId: versionId
    }
  });

  if (missingEmbeddings > 0 && assetType !== "faq") {
    const [rows] = await sequelize.query(
      `
      SELECT COUNT(*)::int AS count
      FROM "KnowledgeChunks"
      WHERE "companyId" = :companyId
        AND "knowledgeAssetVersionId" = :versionId
        AND embedding IS NULL
      `,
      { replacements: { companyId, versionId } }
    );
    const nullEmbeddings = Number((rows as { count: number }[])[0]?.count || 0);
    if (nullEmbeddings > 0) {
      throw new AppError("Version has chunks without embeddings", 409);
    }
  }

  return { chunkCount };
};

export const executeAtomicSwap = async (
  input: AtomicSwapInput
): Promise<KnowledgeAsset> => {
  const asset = await KnowledgeAsset.findOne({
    where: { id: input.assetId, companyId: input.companyId }
  });

  if (!asset) {
    throw new AppError("Knowledge asset not found", 404);
  }

  const newVersion = await KnowledgeAssetVersion.findOne({
    where: { id: input.newVersionId, companyId: input.companyId }
  });

  if (!newVersion || newVersion.knowledgeAssetId !== asset.id) {
    throw new AppError("Version does not belong to asset", 400);
  }

  await validateVersionForPublish(
    input.companyId,
    input.newVersionId,
    asset.assetType
  );

  const previousVersionId =
    input.previousVersionId ?? asset.publishedVersionId ?? null;

  if (
    previousVersionId &&
    previousVersionId === input.newVersionId &&
    asset.lifecycleStatus === "published"
  ) {
    return asset;
  }

  await sequelize.transaction(async transaction => {
    await asset.update(
      {
        publishedVersionId: input.newVersionId,
        currentVersionId: input.newVersionId,
        lifecycleStatus: "published",
        publishedAt: new Date(),
        publishedByUserId: input.publishedByUserId || asset.publishedByUserId,
        archivedAt: null
      },
      { transaction }
    );

    await KnowledgeChunk.update(
      { lifecycleStatus: "published" },
      {
        where: {
          companyId: input.companyId,
          knowledgeAssetVersionId: input.newVersionId
        },
        transaction
      }
    );

    if (previousVersionId && previousVersionId !== input.newVersionId) {
      await KnowledgeChunk.update(
        { lifecycleStatus: "archived" },
        {
          where: {
            companyId: input.companyId,
            knowledgeAssetVersionId: previousVersionId
          },
          transaction
        }
      );
    }
  });

  if (previousVersionId && previousVersionId !== input.newVersionId) {
    try {
      await enqueueCleanupAssetVersion({
        companyId: input.companyId,
        assetVersionId: previousVersionId
      });
    } catch (error) {
      logger.warn(
        { error, previousVersionId, assetId: asset.id },
        "Failed to enqueue cleanup after atomic swap"
      );
    }
  }

  await asset.reload();
  return asset;
};

export const rollbackToVersion = async (input: {
  companyId: number;
  assetId: number;
  targetVersionId: number;
  publishedByUserId?: number;
}): Promise<KnowledgeAsset> => {
  const asset = await KnowledgeAsset.findOne({
    where: { id: input.assetId, companyId: input.companyId }
  });

  if (!asset) {
    throw new AppError("Knowledge asset not found", 404);
  }

  const previousVersionId = asset.publishedVersionId;

  return executeAtomicSwap({
    companyId: input.companyId,
    assetId: input.assetId,
    newVersionId: input.targetVersionId,
    previousVersionId,
    publishedByUserId: input.publishedByUserId
  });
};
