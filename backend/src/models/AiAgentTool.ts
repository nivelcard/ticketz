import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import AiAgent from "./AiAgent";

@Table
class AiAgentTool extends Model<AiAgentTool> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => AiAgent)
  @Column
  aiAgentId: number;

  @Column
  toolId: string;

  @Default(true)
  @Column
  enabled: boolean;

  @Column(DataType.JSONB)
  config: Record<string, unknown>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiAgentTool;
