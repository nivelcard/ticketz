import KnowledgeDocument from "../../../models/KnowledgeDocument";
import KnowledgeAsset from "../../../models/KnowledgeAsset";
import KnowledgeBase from "../../../models/KnowledgeBase";
import StorageService from "../../StorageService/StorageService";
import { ingestKnowledgeDocument } from "../IngestKnowledgeDocumentService";
import { isKbCmsEnabledForCompany } from "./AiKbCmsFeatureFlag";
import {
  archiveKnowledgeAsset,
  createKnowledgeAsset,
  listKnowledgeAssets
} from "./KnowledgeAssetCmsService";
import { slugify } from "./slugify";
import { enqueueIndexAssetVersion } from "./AiKnowledgeIngestionQueueService";
import { getAssetVersion } from "./KnowledgeAssetVersionService";
import AppError from "../../../errors/AppError";

const mapDocumentTypeToAssetType = (type: string): string => {
  const normalized = type.toLowerCase();
  if (normalized === "docx") return "word";
  if (normalized === "md" || normalized === "markdown") return "markdown";
  if (["pdf", "text", "url", "faq", "word", "markdown"].includes(normalized)) {
    return normalized;
  }
  return "text";
};

const mapAssetLifecycleToDocumentStatus = (
  lifecycleStatus: string,
  ingestionStatus?: string
): string => {
  if (lifecycleStatus === "published") return "ready";
  if (ingestionStatus === "failed") return "error";
  if (ingestionStatus === "processing") return "processing";
  if (ingestionStatus === "pending") return "pending";
  if (lifecycleStatus === "archived") return "error";
  return "pending";
};

export const syncDocumentToAsset = async (
  document: KnowledgeDocument
): Promise<KnowledgeAsset> => {
  const existing = await KnowledgeAsset.findOne({
    where: { companyId: document.companyId, legacyDocumentId: document.id }
  });

  if (existing) {
    const version = existing.currentVersionId
      ? await getAssetVersion(document.companyId, existing.currentVersionId)
      : null;

    await existing.update({
      title: document.title,
      knowledgeBaseId: document.knowledgeBaseId,
      assetType: mapDocumentTypeToAssetType(
        document.type
      ) as KnowledgeAsset["assetType"],
      lifecycleStatus:
        document.status === "ready"
          ? "published"
          : document.status === "error"
            ? "draft"
            : "draft"
    });

    if (version) {
      await version.update({
        storageUrl: document.storageUrl,
        ingestionStatus:
          document.status === "ready"
            ? "indexed"
            : document.status === "error"
              ? "failed"
              : "pending"
      });
    }

    return existing;
  }

  const asset = await createKnowledgeAsset({
    companyId: document.companyId,
    knowledgeBaseId: document.knowledgeBaseId,
    assetType: mapDocumentTypeToAssetType(
      document.type
    ) as KnowledgeAsset["assetType"],
    title: document.title,
    slug: slugify(`${document.title}-${document.id}`),
    storageUrl: document.storageUrl,
    legacyDocumentId: document.id
  });

  if (document.status === "ready") {
    await asset.update({
      lifecycleStatus: "published",
      publishedVersionId: asset.currentVersionId,
      publishedAt: new Date()
    });
  }

  return asset;
};

export const listLegacyDocuments = async (
  companyId: number,
  knowledgeBaseId?: number
): Promise<KnowledgeDocument[]> => {
  const cmsEnabled = await isKbCmsEnabledForCompany(companyId);

  if (!cmsEnabled) {
    const where: { companyId: number; knowledgeBaseId?: number } = {
      companyId
    };
    if (knowledgeBaseId) {
      where.knowledgeBaseId = knowledgeBaseId;
    }
    return KnowledgeDocument.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });
  }

  const assets = await listKnowledgeAssets({
    companyId,
    knowledgeBaseId
  });

  return assets
    .filter(asset => asset.legacyDocumentId)
    .map(asset => {
      const doc = KnowledgeDocument.build({
        id: asset.legacyDocumentId,
        companyId: asset.companyId,
        knowledgeBaseId: asset.knowledgeBaseId,
        title: asset.title,
        type: asset.assetType,
        storageUrl: asset.currentVersion?.storageUrl || "",
        status: mapAssetLifecycleToDocumentStatus(
          asset.lifecycleStatus,
          asset.currentVersion?.ingestionStatus
        ),
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      });
      return doc;
    });
};

export const createLegacyTextDocument = async (input: {
  companyId: number;
  knowledgeBaseId: number;
  title: string;
  content: string;
  authorUserId?: number;
}): Promise<KnowledgeDocument> => {
  const cmsEnabled = await isKbCmsEnabledForCompany(input.companyId);

  if (!cmsEnabled) {
    const base = await KnowledgeBase.findOne({
      where: { id: input.knowledgeBaseId, companyId: input.companyId }
    });
    if (!base) {
      throw new AppError("Knowledge base not found", 404);
    }

    await StorageService.ensureReady(input.companyId);
    const upload = await StorageService.uploadBuffer(
      Buffer.from(input.content, "utf-8"),
      {
        companyId: input.companyId,
        filename: `${input.title || "manual"}.txt`,
        contentType: "text/plain",
        folder: "knowledge/text"
      }
    );

    const document = await KnowledgeDocument.create({
      companyId: input.companyId,
      knowledgeBaseId: input.knowledgeBaseId,
      title: input.title,
      type: "text",
      originalFilename: `${input.title}.txt`,
      storageUrl: upload.key,
      status: "pending"
    });

    await ingestKnowledgeDocument(document.id, input.companyId, input.content);
    await document.reload();
    return document;
  }

  await StorageService.ensureReady(input.companyId);
  const upload = await StorageService.uploadBuffer(
    Buffer.from(input.content, "utf-8"),
    {
      companyId: input.companyId,
      filename: `${input.title || "manual"}.txt`,
      contentType: "text/plain",
      folder: "knowledge/text"
    }
  );

  const legacyDoc = await KnowledgeDocument.create({
    companyId: input.companyId,
    knowledgeBaseId: input.knowledgeBaseId,
    title: input.title,
    type: "text",
    originalFilename: `${input.title}.txt`,
    storageUrl: upload.key,
    status: "pending"
  });

  const asset = await createKnowledgeAsset({
    companyId: input.companyId,
    knowledgeBaseId: input.knowledgeBaseId,
    assetType: "text",
    title: input.title,
    slug: slugify(`${input.title}-${legacyDoc.id}`),
    storageUrl: upload.key,
    rawText: input.content,
    authorUserId: input.authorUserId,
    legacyDocumentId: legacyDoc.id
  });

  if (asset.currentVersionId) {
    await enqueueIndexAssetVersion({
      companyId: input.companyId,
      assetVersionId: asset.currentVersionId,
      autoPublish: true,
      rawText: input.content
    });
  }

  await legacyDoc.update({ status: "processing" });
  return legacyDoc;
};

export const createLegacyFileDocument = async (input: {
  companyId: number;
  knowledgeBaseId: number;
  title: string;
  file: Express.Multer.File;
  authorUserId?: number;
}): Promise<KnowledgeDocument> => {
  const cmsEnabled = await isKbCmsEnabledForCompany(input.companyId);
  const ext = input.file.originalname.split(".").pop()?.toLowerCase() || "bin";

  if (!cmsEnabled) {
    const base = await KnowledgeBase.findOne({
      where: { id: input.knowledgeBaseId, companyId: input.companyId }
    });
    if (!base) {
      throw new AppError("Knowledge base not found", 404);
    }

    await StorageService.ensureReady(input.companyId);
    const upload = await StorageService.uploadBuffer(input.file.buffer, {
      companyId: input.companyId,
      filename: input.file.originalname,
      contentType: input.file.mimetype,
      folder: "knowledge/documents"
    });

    const document = await KnowledgeDocument.create({
      companyId: input.companyId,
      knowledgeBaseId: input.knowledgeBaseId,
      title: input.title || input.file.originalname,
      type: ext,
      originalFilename: input.file.originalname,
      storageUrl: upload.key,
      status: "pending"
    });

    await ingestKnowledgeDocument(document.id, input.companyId);
    await document.reload();
    return document;
  }

  await StorageService.ensureReady(input.companyId);
  const upload = await StorageService.uploadBuffer(input.file.buffer, {
    companyId: input.companyId,
    filename: input.file.originalname,
    contentType: input.file.mimetype,
    folder: "knowledge/documents"
  });

  const legacyDoc = await KnowledgeDocument.create({
    companyId: input.companyId,
    knowledgeBaseId: input.knowledgeBaseId,
    title: input.title || input.file.originalname,
    type: ext,
    originalFilename: input.file.originalname,
    storageUrl: upload.key,
    status: "pending"
  });

  const asset = await createKnowledgeAsset({
    companyId: input.companyId,
    knowledgeBaseId: input.knowledgeBaseId,
    assetType: mapDocumentTypeToAssetType(ext) as KnowledgeAsset["assetType"],
    title: input.title || input.file.originalname,
    slug: slugify(`${input.title || input.file.originalname}-${legacyDoc.id}`),
    storageUrl: upload.key,
    authorUserId: input.authorUserId,
    legacyDocumentId: legacyDoc.id
  });

  if (asset.currentVersionId) {
    await enqueueIndexAssetVersion({
      companyId: input.companyId,
      assetVersionId: asset.currentVersionId,
      autoPublish: true
    });
  }

  await legacyDoc.update({ status: "processing" });
  return legacyDoc;
};

export const archiveLegacyDocument = async (
  companyId: number,
  documentId: number
): Promise<void> => {
  const cmsEnabled = await isKbCmsEnabledForCompany(companyId);

  if (!cmsEnabled) {
    const document = await KnowledgeDocument.findOne({
      where: { id: documentId, companyId }
    });
    if (!document) {
      throw new AppError("Document not found", 404);
    }

    const { default: KnowledgeChunk } =
      await import("../../../models/KnowledgeChunk");
    await KnowledgeChunk.destroy({
      where: { knowledgeDocumentId: document.id, companyId }
    });

    if (document.storageUrl) {
      try {
        await StorageService.delete(document.storageUrl, companyId);
      } catch {
        // ignore
      }
    }

    await document.destroy();
    return;
  }

  const asset = await KnowledgeAsset.findOne({
    where: { companyId, legacyDocumentId: documentId }
  });

  if (!asset) {
    throw new AppError("Document not found", 404);
  }

  await archiveKnowledgeAsset(companyId, asset.id);

  const document = await KnowledgeDocument.findOne({
    where: { id: documentId, companyId }
  });
  if (document) {
    await document.update({ status: "error" });
  }
};
