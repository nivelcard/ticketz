import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import KnowledgeAsset from "./KnowledgeAsset";
import KnowledgeAssetVersion from "./KnowledgeAssetVersion";

@Table
class KnowledgeIngestionJob extends Model<KnowledgeIngestionJob> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  scopeType: string;

  @Column
  scopeId: number;

  @ForeignKey(() => KnowledgeAsset)
  @Column
  knowledgeAssetId: number;

  @BelongsTo(() => KnowledgeAsset)
  knowledgeAsset: KnowledgeAsset;

  @ForeignKey(() => KnowledgeAssetVersion)
  @Column
  knowledgeAssetVersionId: number;

  @BelongsTo(() => KnowledgeAssetVersion)
  knowledgeAssetVersion: KnowledgeAssetVersion;

  @Column
  jobType: string;

  @Column
  bullJobId: string;

  @Default("queued")
  @Column
  status: string;

  @Default(0)
  @Column
  attempts: number;

  @Column
  errorMessage: string;

  @Column
  itemsTotal: number;

  @Column
  itemsDone: number;

  @Column
  startedAt: Date;

  @Column
  finishedAt: Date;

  @Column
  latencyMs: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeIngestionJob;
