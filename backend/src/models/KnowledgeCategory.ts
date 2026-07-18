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

@Table
class KnowledgeCategory extends Model<KnowledgeCategory> {
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
  parentCategoryId: number;

  @BelongsTo(() => KnowledgeCategory, "parentCategoryId")
  parentCategory: KnowledgeCategory;

  @HasMany(() => KnowledgeCategory, "parentCategoryId")
  children: KnowledgeCategory[];

  @Column
  slug: string;

  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Default(100)
  @Column
  sortOrder: number;

  @Default(0)
  @Column
  depth: number;

  @Column(DataType.JSONB)
  pathIds: number[];

  @Default(true)
  @Column
  active: boolean;

  @Column(DataType.JSONB)
  metadata: Record<string, unknown>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeCategory;
