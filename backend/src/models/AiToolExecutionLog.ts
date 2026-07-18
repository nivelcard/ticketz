import {
  Table,
  Column,
  CreatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import Contact from "./Contact";
import AiAgent from "./AiAgent";

@Table({ updatedAt: false })
class AiToolExecutionLog extends Model<AiToolExecutionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => AiAgent)
  @Column
  aiAgentId: number;

  @Column
  toolId: string;

  @Default(1)
  @Column
  iteration: number;

  @Column(DataType.TEXT)
  inputSanitized: string;

  @Column(DataType.TEXT)
  outputSanitized: string;

  @Column
  success: boolean;

  @Column
  errorCode: string;

  @Column
  latencyMs: number;

  @Column
  riskLevel: string;

  @Column
  mutationTarget: string;

  @Column
  mutationTargetId: string;

  @Column
  idempotencyKey: string;

  @Column
  correlationId: string;

  @Default(1)
  @Column
  attempt: number;

  @Default(false)
  @Column
  reusedResult: boolean;

  @Column(DataType.TEXT)
  previousStateSanitized: string;

  @Column(DataType.TEXT)
  newStateSanitized: string;

  @Default(false)
  @Column
  reversible: boolean;

  @Column
  executedByAgentId: number;

  @Column
  retentionExpiresAt: Date;

  @CreatedAt
  createdAt: Date;
}

export default AiToolExecutionLog;
