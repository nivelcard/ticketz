import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ContactAiMemories", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      memoryType: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      category: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      key: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      verificationStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "unverified"
      },
      inferenceConfidence: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      source: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "inferred"
      },
      sourceTicketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      sourceMessageId: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      retentionDays: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      anonymizedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdByAgentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "AiAgents", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("ContactAiMemories", [
      "companyId",
      "contactId",
      "memoryType",
      "key"
    ]);

    await queryInterface.addIndex("ContactAiMemories", [
      "companyId",
      "contactId",
      "verificationStatus",
      "active"
    ]);

    await queryInterface.addIndex("ContactAiMemories", ["expiresAt"]);

    await queryInterface.createTable("ContactAiMemoryJobs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      bullJobId: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "queued"
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      payloadHash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.createTable("ContactAiMemoryLogs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      memoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "ContactAiMemories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      action: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      actorType: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      actorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      before: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      after: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.createTable("AiAgentTools", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      aiAgentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "AiAgents", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      toolId: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      config: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("AiAgentTools", [
      "companyId",
      "aiAgentId",
      "toolId"
    ], { unique: true });

    await queryInterface.createTable("AiToolExecutionLogs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      aiAgentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "AiAgents", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      toolId: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      iteration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      inputSanitized: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      outputSanitized: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      errorCode: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      retentionExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("AiToolExecutionLogs", [
      "companyId",
      "ticketId"
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AiToolExecutionLogs");
    await queryInterface.dropTable("AiAgentTools");
    await queryInterface.dropTable("ContactAiMemoryLogs");
    await queryInterface.dropTable("ContactAiMemoryJobs");
    await queryInterface.dropTable("ContactAiMemories");
  }
};
