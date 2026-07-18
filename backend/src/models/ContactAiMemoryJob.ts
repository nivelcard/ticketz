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

@Table
class ContactAiMemoryJob extends Model<ContactAiMemoryJob> {
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

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @Column
  idempotencyKey: string;

  @Column
  bullJobId: string;

  @Default("queued")
  @Column
  status: string;

  @Default(0)
  @Column
  attempts: number;

  @Column
  payloadHash: string;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  latencyMs: number;

  @Column
  startedAt: Date;

  @Column
  finishedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ContactAiMemoryJob;
