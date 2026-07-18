import crypto from "crypto";
import { Op } from "sequelize";
import KnowledgeAssetVersion, {
  KnowledgeIngestionStatus
} from "../../../models/KnowledgeAssetVersion";
import KnowledgeAsset from "../../../models/KnowledgeAsset";
import KnowledgeChunk from "../../../models/KnowledgeChunk";
import AppError from "../../../errors/AppError";
import { GetCompanySetting } from "../../../helpers/CheckSettings";

export const getNextVersionNumber = async (
  companyId: number,
  knowledgeAssetId: number
): Promise<number> => {
  const latest = await KnowledgeAssetVersion.findOne({
    where: { companyId, knowledgeAssetId },
    order: [["versionNumber", "DESC"]]
  });

  return (latest?.versionNumber || 0) + 1;
};

export type CreateVersionInput = {
  companyId: number;
  knowledgeAssetId: number;
  versionNumber?: number;
  title: string;
  storageUrl?: string;
  rawTextPreview?: string;
  changeSummary?: string;
  createdByUserId?: number;
  contentHash?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  embeddingModel?: string;
  embeddingProvider?: string;
  ingestionPipeline?: string;
};

const resolveEmbeddingConfig = async (
  companyId: number
): Promise<{ embeddingModel: string; embeddingProvider: string }> => {
  const embeddingModel =
    (await GetCompanySetting(companyId, "aiEmbeddingModel", "")) ||
    process.env.AI_EMBEDDING_MODEL ||
    "text-embedding-3-small";

  const embeddingProvider =
    (await GetCompanySetting(companyId, "aiEmbeddingProvider", "")) ||
    process.env.AI_EMBEDDING_PROVIDER ||
    "openai";

  return { embeddingModel, embeddingProvider };
};

export const createAssetVersion = async (
  input: CreateVersionInput
): Promise<KnowledgeAssetVersion> => {
  const asset = await KnowledgeAsset.findOne({
    where: { id: input.knowledgeAssetId, companyId: input.companyId }
  });

  if (!asset) {
    throw new AppError("Knowledge asset not found", 404);
  }

  const versionNumber =
    input.versionNumber ??
    (await getNextVersionNumber(input.companyId, input.knowledgeAssetId));

  const embeddingConfig = await resolveEmbeddingConfig(input.companyId);

  return KnowledgeAssetVersion.create({
    companyId: input.companyId,
    knowledgeAssetId: input.knowledgeAssetId,
    versionNumber,
    title: input.title,
    storageUrl: input.storageUrl || "",
    contentHash:
      input.contentHash ||
      crypto
        .createHash("sha256")
        .update(input.storageUrl || "")
        .digest("hex"),
    rawTextPreview: input.rawTextPreview || "",
    changeSummary: input.changeSummary || "",
    embeddingModel: input.embeddingModel || embeddingConfig.embeddingModel,
    embeddingProvider:
      input.embeddingProvider || embeddingConfig.embeddingProvider,
    chunkSize: input.chunkSize || 1800,
    chunkOverlap: input.chunkOverlap || 200,
    ingestionPipeline: input.ingestionPipeline || "cms-v2",
    ingestionStatus: "pending" as KnowledgeIngestionStatus,
    createdByUserId: input.createdByUserId || null
  });
};

export const listAssetVersions = async (
  companyId: number,
  knowledgeAssetId: number
): Promise<KnowledgeAssetVersion[]> => {
  const asset = await KnowledgeAsset.findOne({
    where: { id: knowledgeAssetId, companyId }
  });

  if (!asset) {
    throw new AppError("Knowledge asset not found", 404);
  }

  return KnowledgeAssetVersion.findAll({
    where: { companyId, knowledgeAssetId },
    order: [["versionNumber", "DESC"]]
  });
};

export const getAssetVersion = async (
  companyId: number,
  versionId: number
): Promise<KnowledgeAssetVersion> => {
  const version = await KnowledgeAssetVersion.findOne({
    where: { id: versionId, companyId }
  });

  if (!version) {
    throw new AppError("Asset version not found", 404);
  }

  return version;
};

export type RollbackPrepResult = {
  asset: KnowledgeAsset;
  targetVersion: KnowledgeAssetVersion;
  chunkCount: number;
  canRollback: boolean;
  reason?: string;
};

export const prepareAssetRollback = async (
  companyId: number,
  assetId: number,
  targetVersionId: number
): Promise<RollbackPrepResult> => {
  const asset = await KnowledgeAsset.findOne({
    where: { id: assetId, companyId }
  });

  if (!asset) {
    throw new AppError("Knowledge asset not found", 404);
  }

  const targetVersion = await getAssetVersion(companyId, targetVersionId);

  if (targetVersion.knowledgeAssetId !== asset.id) {
    throw new AppError("Version does not belong to asset", 400);
  }

  const chunkCount = await KnowledgeChunk.count({
    where: {
      companyId,
      knowledgeAssetVersionId: targetVersion.id,
      lifecycleStatus: { [Op.in]: ["published", "draft", "archived"] }
    }
  });

  const canRollback =
    targetVersion.ingestionStatus === "indexed" && chunkCount > 0;

  return {
    asset,
    targetVersion,
    chunkCount,
    canRollback,
    reason: canRollback
      ? undefined
      : "Target version must be indexed with existing chunks"
  };
};
