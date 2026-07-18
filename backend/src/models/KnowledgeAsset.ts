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
  HasMany,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import KnowledgeBase from "./KnowledgeBase";
import KnowledgeCategory from "./KnowledgeCategory";
import KnowledgeDocument from "./KnowledgeDocument";
import KnowledgeAssetVersion from "./KnowledgeAssetVersion";
import User from "./User";

export type KnowledgeAssetType =
  | "text"
  | "markdown"
  | "pdf"
  | "word"
  | "url"
  | "faq"
  | "document"
  | "web_page"
  | "excel"
  | "csv"
  | "api"
  | "prompt"
  | "procedure"
  | "image_ocr"
  | "audio_transcript"
  | "video_transcript";

export type KnowledgeLifecycleStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "archived";

@Table
class KnowledgeAsset extends Model<KnowledgeAsset> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => KnowledgeBase)
  @Column
  knowledgeBaseId: number;

  @BelongsTo(() => KnowledgeBase)
  knowledgeBase: KnowledgeBase;

  @ForeignKey(() => KnowledgeCategory)
  @Column
  categoryId: number;

  @BelongsTo(() => KnowledgeCategory)
  category: KnowledgeCategory;

  @Default("text")
  @Column
  assetType: KnowledgeAssetType;

  @Default("draft")
  @Column
  lifecycleStatus: KnowledgeLifecycleStatus;

  @ForeignKey(() => KnowledgeAssetVersion)
  @Column
  publishedVersionId: number;

  @BelongsTo(() => KnowledgeAssetVersion, "publishedVersionId")
  publishedVersion: KnowledgeAssetVersion;

  @ForeignKey(() => KnowledgeAssetVersion)
  @Column
  currentVersionId: number;

  @BelongsTo(() => KnowledgeAssetVersion, "currentVersionId")
  currentVersion: KnowledgeAssetVersion;

  @Column
  title: string;

  @Column
  slug: string;

  @Column(DataType.TEXT)
  summary: string;

  @ForeignKey(() => User)
  @Column
  authorUserId: number;

  @ForeignKey(() => User)
  @Column
  publishedByUserId: number;

  @Column
  publishedAt: Date;

  @Column
  archivedAt: Date;

  @Column(DataType.JSONB)
  metadata: Record<string, unknown>;

  @ForeignKey(() => KnowledgeDocument)
  @Column
  legacyDocumentId: number;

  @BelongsTo(() => KnowledgeDocument)
  legacyDocument: KnowledgeDocument;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => KnowledgeAssetVersion)
  versions: KnowledgeAssetVersion[];
}

export default KnowledgeAsset;
