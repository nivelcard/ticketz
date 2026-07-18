import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("KnowledgeDomains", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      slug: { type: DataTypes.STRING(64), allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      linkedSpecialty: { type: DataTypes.STRING(64), allowNull: true },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("KnowledgeDomains", {
      fields: ["companyId", "slug"],
      unique: true,
      name: "knowledge_domains_company_slug_unique"
    });

    await queryInterface.addColumn("KnowledgeBases", "knowledgeDomainId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "KnowledgeDomains", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("KnowledgeBases", "slug", {
      type: DataTypes.STRING(128),
      allowNull: true
    });
    await queryInterface.addColumn("KnowledgeBases", "linkedSpecialty", {
      type: DataTypes.STRING(64),
      allowNull: true
    });
    await queryInterface.addColumn("KnowledgeBases", "requiresPublishWorkflow", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.createTable("KnowledgeCategories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      knowledgeBaseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "KnowledgeBases", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      parentCategoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeCategories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      slug: { type: DataTypes.STRING(128), allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      depth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      pathIds: { type: DataTypes.JSONB, allowNull: true },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("KnowledgeCategories", {
      fields: ["companyId", "knowledgeBaseId", "parentCategoryId", "slug"],
      unique: true,
      name: "knowledge_categories_company_base_parent_slug_unique"
    });

    await queryInterface.createTable("KnowledgeAssets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      knowledgeBaseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "KnowledgeBases", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeCategories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      assetType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "text"
      },
      lifecycleStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft"
      },
      publishedVersionId: { type: DataTypes.INTEGER, allowNull: true },
      currentVersionId: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING(128), allowNull: false },
      summary: { type: DataTypes.TEXT, allowNull: true },
      authorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      publishedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      legacyDocumentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeDocuments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("KnowledgeAssets", {
      fields: ["companyId", "knowledgeBaseId", "slug"],
      unique: true,
      name: "knowledge_assets_company_base_slug_unique"
    });
    await queryInterface.addIndex("KnowledgeAssets", {
      fields: ["legacyDocumentId"],
      unique: true,
      name: "knowledge_assets_legacy_document_unique"
    });

    await queryInterface.createTable("KnowledgeAssetVersions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      knowledgeAssetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "KnowledgeAssets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      versionNumber: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      storageUrl: { type: DataTypes.TEXT, allowNull: true },
      contentHash: { type: DataTypes.STRING(128), allowNull: true },
      rawTextPreview: { type: DataTypes.TEXT, allowNull: true },
      changeSummary: { type: DataTypes.TEXT, allowNull: true },
      embeddingModel: { type: DataTypes.STRING, allowNull: true },
      embeddingProvider: { type: DataTypes.STRING, allowNull: true },
      chunkSize: { type: DataTypes.INTEGER, allowNull: true },
      chunkOverlap: { type: DataTypes.INTEGER, allowNull: true },
      ingestionPipeline: { type: DataTypes.STRING(64), allowNull: true },
      tokenEstimate: { type: DataTypes.INTEGER, allowNull: true },
      chunkCount: { type: DataTypes.INTEGER, allowNull: true },
      ingestionStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending"
      },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      createdAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("KnowledgeAssetVersions", {
      fields: ["knowledgeAssetId", "versionNumber"],
      unique: true,
      name: "knowledge_asset_versions_asset_version_unique"
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "KnowledgeAssets"
      ADD CONSTRAINT "knowledge_assets_published_version_fk"
      FOREIGN KEY ("publishedVersionId") REFERENCES "KnowledgeAssetVersions"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "KnowledgeAssets"
      ADD CONSTRAINT "knowledge_assets_current_version_fk"
      FOREIGN KEY ("currentVersionId") REFERENCES "KnowledgeAssetVersions"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    await queryInterface.createTable("KnowledgePermissions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      resourceType: { type: DataTypes.STRING(32), allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: true },
      principalType: { type: DataTypes.STRING(32), allowNull: false },
      principalId: { type: DataTypes.INTEGER, allowNull: true },
      permission: { type: DataTypes.STRING(32), allowNull: false },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable("KnowledgeIngestionJobs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      scopeType: { type: DataTypes.STRING(32), allowNull: false },
      scopeId: { type: DataTypes.INTEGER, allowNull: true },
      knowledgeAssetId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeAssets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      knowledgeAssetVersionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeAssetVersions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      jobType: { type: DataTypes.STRING(32), allowNull: false },
      bullJobId: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "queued"
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      itemsTotal: { type: DataTypes.INTEGER, allowNull: true },
      itemsDone: { type: DataTypes.INTEGER, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      latencyMs: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addColumn(
      "KnowledgeChunks",
      "knowledgeAssetVersionId",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "KnowledgeAssetVersions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      }
    );
    await queryInterface.addColumn("KnowledgeChunks", "knowledgeAssetId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "KnowledgeAssets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
    await queryInterface.addColumn("KnowledgeChunks", "knowledgeBaseId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "KnowledgeBases", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
    await queryInterface.addColumn("KnowledgeChunks", "knowledgeDomainId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "KnowledgeDomains", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("KnowledgeChunks", "categoryId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "KnowledgeCategories", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("KnowledgeChunks", "lifecycleStatus", {
      type: DataTypes.STRING(32),
      allowNull: true
    });

    await queryInterface.addIndex("KnowledgeChunks", {
      fields: ["companyId", "knowledgeAssetVersionId"],
      name: "knowledge_chunks_company_asset_version_idx"
    });
    await queryInterface.addIndex("KnowledgeChunks", {
      fields: ["companyId", "knowledgeBaseId", "lifecycleStatus"],
      name: "knowledge_chunks_company_base_lifecycle_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(
      "KnowledgeChunks",
      "knowledge_chunks_company_base_lifecycle_idx"
    );
    await queryInterface.removeIndex(
      "KnowledgeChunks",
      "knowledge_chunks_company_asset_version_idx"
    );
    await queryInterface.removeColumn("KnowledgeChunks", "lifecycleStatus");
    await queryInterface.removeColumn("KnowledgeChunks", "categoryId");
    await queryInterface.removeColumn("KnowledgeChunks", "knowledgeDomainId");
    await queryInterface.removeColumn("KnowledgeChunks", "knowledgeBaseId");
    await queryInterface.removeColumn("KnowledgeChunks", "knowledgeAssetId");
    await queryInterface.removeColumn(
      "KnowledgeChunks",
      "knowledgeAssetVersionId"
    );

    await queryInterface.dropTable("KnowledgeIngestionJobs");
    await queryInterface.dropTable("KnowledgePermissions");

    await queryInterface.sequelize.query(
      `ALTER TABLE "KnowledgeAssets" DROP CONSTRAINT IF EXISTS "knowledge_assets_current_version_fk";`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "KnowledgeAssets" DROP CONSTRAINT IF EXISTS "knowledge_assets_published_version_fk";`
    );
    await queryInterface.dropTable("KnowledgeAssetVersions");
    await queryInterface.dropTable("KnowledgeAssets");
    await queryInterface.dropTable("KnowledgeCategories");

    await queryInterface.removeColumn(
      "KnowledgeBases",
      "requiresPublishWorkflow"
    );
    await queryInterface.removeColumn("KnowledgeBases", "linkedSpecialty");
    await queryInterface.removeColumn("KnowledgeBases", "slug");
    await queryInterface.removeColumn("KnowledgeBases", "knowledgeDomainId");

    await queryInterface.removeIndex(
      "KnowledgeDomains",
      "knowledge_domains_company_slug_unique"
    );
    await queryInterface.dropTable("KnowledgeDomains");
  }
};
