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
import Contact from "./Contact";
import Ticket from "./Ticket";
import AiAgent from "./AiAgent";
import User from "./User";

@Table({ paranoid: false })
class ContactAiMemory extends Model<ContactAiMemory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @Column
  memoryType: string;

  @Column
  category: string;

  @Column
  key: string;

  @Column(DataType.TEXT)
  value: string;

  @Default("unverified")
  @Column
  verificationStatus: string;

  @Column(DataType.FLOAT)
  inferenceConfidence: number;

  @Default("inferred")
  @Column
  source: string;

  @ForeignKey(() => Ticket)
  @Column
  sourceTicketId: number;

  @Column
  sourceMessageId: string;

  @Column
  retentionDays: number;

  @Column
  expiresAt: Date;

  @Column
  deletedAt: Date;

  @Column
  anonymizedAt: Date;

  @Column
  lastUsedAt: Date;

  @ForeignKey(() => AiAgent)
  @Column
  createdByAgentId: number;

  @ForeignKey(() => User)
  @Column
  createdByUserId: number;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ContactAiMemory;
