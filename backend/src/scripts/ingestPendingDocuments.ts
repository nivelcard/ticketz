import "../bootstrap";
import { Op } from "sequelize";
import KnowledgeDocument from "../models/KnowledgeDocument";
import { ingestKnowledgeDocument } from "../services/AiServices/IngestKnowledgeDocumentService";
import { logger } from "../utils/logger";

const run = async (): Promise<void> => {
  const pendingDocuments = await KnowledgeDocument.findAll({
    where: { status: { [Op.in]: ["pending", "error"] } },
    order: [["id", "ASC"]]
  });

  if (!pendingDocuments.length) {
    logger.info("No pending knowledge documents found");
    return;
  }

  await Promise.all(
    pendingDocuments.map(async document => {
      try {
        await ingestKnowledgeDocument(document.id, document.companyId);
        logger.info(
          { documentId: document.id, title: document.title },
          "Knowledge document ingested"
        );
      } catch (error) {
        logger.error(
          { error, documentId: document.id, title: document.title },
          "Failed to ingest knowledge document"
        );
      }
    })
  );
};

run()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error({ error }, "ingestPendingDocuments failed");
    process.exit(1);
  });
