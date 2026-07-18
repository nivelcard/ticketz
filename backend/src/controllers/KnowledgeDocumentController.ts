import { Request, Response } from "express";
import KnowledgeDocument from "../models/KnowledgeDocument";
import { ingestKnowledgeDocument } from "../services/AiServices/IngestKnowledgeDocumentService";
import AppError from "../errors/AppError";
import { safeAiQuery } from "../helpers/safeAiQuery";
import { logger } from "../utils/logger";
import { isKbCmsEnabledForCompany } from "../services/AiServices/KnowledgeCms/AiKbCmsFeatureFlag";
import {
  archiveLegacyDocument,
  createLegacyFileDocument,
  createLegacyTextDocument,
  listLegacyDocuments
} from "../services/AiServices/KnowledgeCms/LegacyKnowledgeAdapter";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { knowledgeBaseId } = req.query;

  const documents = await safeAiQuery(
    () =>
      listLegacyDocuments(
        companyId,
        knowledgeBaseId ? Number(knowledgeBaseId) : undefined
      ),
    []
  );

  return res.json(documents);
};

export const storeText = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id } = req.user;
  const { knowledgeBaseId, title, content } = req.body;

  try {
    const document = await createLegacyTextDocument({
      companyId,
      knowledgeBaseId: Number(knowledgeBaseId),
      title,
      content,
      authorUserId: Number(id)
    });
    return res.status(201).json(document);
  } catch (error) {
    logger.error(
      { error, companyId, knowledgeBaseId },
      "Failed to create legacy text document"
    );
    throw new AppError("ERR_KNOWLEDGE_INGEST_FAILED", 500);
  }
};

export const storeFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id } = req.user;
  const { knowledgeBaseId, title } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError("File is required", 400);
  }

  try {
    const document = await createLegacyFileDocument({
      companyId,
      knowledgeBaseId: Number(knowledgeBaseId),
      title,
      file,
      authorUserId: Number(id)
    });
    return res.status(201).json(document);
  } catch (error) {
    logger.error(
      { error, companyId, knowledgeBaseId },
      "Failed to create legacy file document"
    );
    throw new AppError("ERR_KNOWLEDGE_INGEST_FAILED", 500);
  }
};

export const reprocess = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { documentId } = req.params;

  const cmsEnabled = await isKbCmsEnabledForCompany(companyId);
  if (cmsEnabled) {
    throw new AppError(
      "Use /ai/assets/:assetId/reindex when CMS is enabled",
      400
    );
  }

  const document = await KnowledgeDocument.findOne({
    where: { id: documentId, companyId }
  });

  if (!document) {
    throw new AppError("Document not found", 404);
  }

  await ingestKnowledgeDocument(document.id, companyId);
  await document.reload();
  return res.json(document);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { documentId } = req.params;

  await archiveLegacyDocument(companyId, Number(documentId));
  return res.status(200).json({ message: "Document archived" });
};
