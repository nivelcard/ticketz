import {
  buildRetrievalSqlParts,
  resolveRetrievalMode
} from "../KnowledgeRetrievalPolicy";

describe("KnowledgeRetrievalPolicy", () => {
  it("uses legacy document join when CMS is off", () => {
    const mode = resolveRetrievalMode(false);
    expect(mode).toBe("legacy");

    const parts = buildRetrievalSqlParts(mode);
    expect(parts.joins).toContain("KnowledgeDocuments");
    expect(parts.where).toContain("kd.status = 'ready'");
    expect(parts.selectDocumentId).toContain("knowledgeDocumentId");
  });

  it("filters published asset versions when CMS is on", () => {
    const mode = resolveRetrievalMode(true);
    expect(mode).toBe("cms");

    const parts = buildRetrievalSqlParts(mode);
    expect(parts.joins).toContain("KnowledgeAssets");
    expect(parts.joins).toContain("KnowledgeAssetVersions");
    expect(parts.where).toContain("lifecycleStatus");
    expect(parts.where).toContain("publishedVersionId");
    expect(parts.where).toContain("ingestionStatus");
  });
});
