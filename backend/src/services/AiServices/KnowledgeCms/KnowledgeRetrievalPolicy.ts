export type RetrievalPolicyMode = "cms" | "legacy";

export type RetrievalSqlParts = {
  joins: string;
  where: string;
  selectDocumentId: string;
};

export const buildRetrievalSqlParts = (
  mode: RetrievalPolicyMode
): RetrievalSqlParts => {
  if (mode === "legacy") {
    return {
      joins: `
        INNER JOIN "KnowledgeDocuments" kd ON kd.id = kc."knowledgeDocumentId"
      `,
      where: `
        AND kd."knowledgeBaseId" IN (:knowledgeBaseIds)
        AND kd.status = 'ready'
      `,
      selectDocumentId: `kc."knowledgeDocumentId"`
    };
  }

  return {
    joins: `
      INNER JOIN "KnowledgeAssets" ka ON ka.id = kc."knowledgeAssetId"
      INNER JOIN "KnowledgeAssetVersions" kav ON kav.id = kc."knowledgeAssetVersionId"
    `,
    where: `
      AND kc."knowledgeBaseId" IN (:knowledgeBaseIds)
      AND kc."lifecycleStatus" = 'published'
      AND ka."lifecycleStatus" = 'published'
      AND ka."publishedVersionId" = kc."knowledgeAssetVersionId"
      AND kav."ingestionStatus" = 'indexed'
    `,
    selectDocumentId: `COALESCE(kc."knowledgeDocumentId", kc."knowledgeAssetId")`
  };
};

export const resolveRetrievalMode = (
  cmsEnabled: boolean
): RetrievalPolicyMode => (cmsEnabled ? "cms" : "legacy");
