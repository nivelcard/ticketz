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
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";

@Table
class AiCopilotSuggestion extends Model<AiCopilotSuggestion> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @Column
  suggestedResponse: string;

  @Column
  rationale: string;

  @Column(DataType.JSONB)
  usedChunks: object;

  @Column
  confidence: number;

  @Default("pending")
  @Column
  status: string;

  @Column
  improvedResponse: string;

  @Column
  relatedDocument: string;

  @Column
  nextSteps: string;

  @Column
  riskAssessment: string;

  @Column
  customerSentiment: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiCopilotSuggestion;
