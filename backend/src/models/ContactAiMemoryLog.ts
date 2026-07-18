import {
  Table,
  Column,
  CreatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import ContactAiMemory from "./ContactAiMemory";

@Table({ updatedAt: false })
class ContactAiMemoryLog extends Model<ContactAiMemoryLog> {
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

  @ForeignKey(() => ContactAiMemory)
  @Column
  memoryId: number;

  @Column
  action: string;

  @Column
  actorType: string;

  @Column
  actorId: number;

  @Column(DataType.JSONB)
  before: unknown;

  @Column(DataType.JSONB)
  after: unknown;

  @Column(DataType.TEXT)
  reason: string;

  @CreatedAt
  createdAt: Date;
}

export default ContactAiMemoryLog;
