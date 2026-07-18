import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class KnowledgePermission extends Model<KnowledgePermission> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  resourceType: string;

  @Column
  resourceId: number;

  @Column
  principalType: string;

  @Column
  principalId: number;

  @Column
  permission: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgePermission;
