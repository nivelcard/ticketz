import {
  Table,
  Column,
  CreatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import KnowledgeAsset from "./KnowledgeAsset";
import User from "./User";

export type KnowledgeIngestionStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed";

@Table({ updatedAt: false })
class KnowledgeAssetVersion extends Model<KnowledgeAssetVersion> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => KnowledgeAsset)
  @Column
  knowledgeAssetId: number;

  @BelongsTo(() => KnowledgeAsset)
  knowledgeAsset: KnowledgeAsset;

  @Column
  versionNumber: number;

  @Column
  title: string;

  @Column
  storageUrl: string;

  @Column
  contentHash: string;

  @Column
  rawTextPreview: string;

  @Column
  changeSummary: string;

  @Column
  embeddingModel: string;

  @Column
  embeddingProvider: string;

  @Column
  chunkSize: number;

  @Column
  chunkOverlap: number;

  @Column
  ingestionPipeline: string;

  @Column
  tokenEstimate: number;

  @Column
  chunkCount: number;

  @Default("pending")
  @Column
  ingestionStatus: KnowledgeIngestionStatus;

  @Column
  errorMessage: string;

  @ForeignKey(() => User)
  @Column
  createdByUserId: number;

  @CreatedAt
  createdAt: Date;
}

export default KnowledgeAssetVersion;
