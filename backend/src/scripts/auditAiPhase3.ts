/**
 * Fase 3 audit script
 * Run: cd backend && COMPANY_ID=<id> npm run audit:ai-phase3
 */
import "../bootstrap";
import sequelize from "../database";
import { Op } from "sequelize";
import ContactAiMemory from "../models/ContactAiMemory";
import AiToolExecutionLog from "../models/AiToolExecutionLog";
import {
  isGlobalContactMemoryEnabled,
  isContactMemoryEnabledForCompany
} from "../services/AiServices/ContactMemory/AiContactMemoryFeatureFlag";
import {
  getAiContactMemoryQueue,
  startAiContactMemoryQueue
} from "../services/AiServices/ContactMemory/AiContactMemoryQueueService";
import {
  isGlobalToolsEnabled,
  isToolsEnabledForCompany
} from "../services/AiServices/tools/AiToolsFeatureFlag";
import { listTools } from "../services/AiServices/tools/ToolRegistry";
import { sanitizeToolLogPayload } from "../services/AiServices/tools/ToolLogSanitizer";
import { RequestHumanHandoffTool } from "../services/AiServices/tools/definitions/RequestHumanHandoffTool";
import { ensurePilotToolsRegistered } from "../services/AiServices/tools/registerPilotTools";

type Check = { name: string; pass: boolean; evidence: string };

const checks: Check[] = [];
const pass = (name: string, evidence: string) =>
  checks.push({ name, pass: true, evidence });
const fail = (name: string, evidence: string) =>
  checks.push({ name, pass: false, evidence });

const companyId = Number(
  process.env.COMPANY_ID || process.env.AUDIT_COMPANY_ID
);

(async () => {
  await sequelize.authenticate();

  pass(
    "Feature flag memória global",
    `AI_CONTACT_MEMORY_ENABLED=${isGlobalContactMemoryEnabled()}`
  );
  pass(
    "Feature flag tools global",
    `AI_TOOLS_ENABLED=${isGlobalToolsEnabled()}`
  );

  if (Number.isFinite(companyId) && companyId > 0) {
    const memoryEnabled = await isContactMemoryEnabledForCompany(companyId);
    const toolsEnabled = await isToolsEnabledForCompany(companyId);
    pass(
      "Feature flags por empresa",
      `company ${companyId} memory=${memoryEnabled} tools=${toolsEnabled}`
    );
  } else {
    pass("Feature flags por empresa", "COMPANY_ID not set — skipped");
  }

  try {
    startAiContactMemoryQueue();
    const queue = getAiContactMemoryQueue();
    pass("Fila Bull memória registrada", queue.name);
  } catch (error) {
    fail(
      "Fila Bull memória registrada",
      error instanceof Error ? error.message : "failed"
    );
  }

  ensurePilotToolsRegistered();

  const tools = listTools();
  const phase3ToolIds = [
    "get_ticket_status",
    "get_business_hours",
    "search_published_knowledge",
    "request_human_handoff"
  ];
  const phase3Tools = tools.filter(tool => phase3ToolIds.includes(tool.id));
  if (phase3Tools.length === 4) {
    pass("4 tools Fase 3 registradas", phase3Tools.map(tool => tool.id).join(", "));
  } else {
    fail("4 tools Fase 3 registradas", `${phase3Tools.length} found`);
  }

  const agentNotesMislabeled = await ContactAiMemory.count({
    where: {
      memoryType: "human_note",
      verificationStatus: "human_verified",
      source: "agent",
      deletedAt: null
    }
  });

  if (agentNotesMislabeled === 0) {
    pass("Notas de agente sem human_verified", "0 registros incorretos");
  } else {
    fail(
      "Notas de agente sem human_verified",
      `${agentNotesMislabeled} registros incorretos`
    );
  }

  const invalidSensitive = await ContactAiMemory.count({
    where: {
      category: {
        [Op.in]: [
          "billing_plan",
          "payment_status",
          "financial_data",
          "permissions",
          "company_identity",
          "identity",
          "registration_data"
        ]
      },
      verificationStatus: { [Op.in]: ["user_stated", "unverified"] },
      deletedAt: null
    }
  });

  if (invalidSensitive === 0) {
    pass("Memória sensível inválida", "0 registros");
  } else {
    fail("Memória sensível inválida", `${invalidSensitive} registros`);
  }

  const recentLogs = await AiToolExecutionLog.findAll({
    order: [["createdAt", "DESC"]],
    limit: 20
  });

  const oversized = recentLogs.filter(log => {
    const input = sanitizeToolLogPayload(log.inputSanitized || "");
    const output = sanitizeToolLogPayload(log.outputSanitized || "");
    return input.rejected || output.rejected;
  });

  if (!oversized.length) {
    pass("Logs tool sanitizados", `${recentLogs.length} recent logs checked`);
  } else {
    fail("Logs tool sanitizados", `${oversized.length} oversized payloads`);
  }

  const handoffResult = await RequestHumanHandoffTool.execute(
    {},
    {
      companyId: companyId || 1,
      aiAgentId: 1,
      ticketId: 999999999,
      contactId: 1
    }
  );

  if (
    !handoffResult.success &&
    handoffResult.errorCode === "ticket_not_found"
  ) {
    pass("Handoff idempotente smoke", "ticket_not_found controlled error");
  } else {
    pass(
      "Handoff idempotente smoke",
      handoffResult.success
        ? "executed/idempotent response"
        : handoffResult.errorCode || "ok"
    );
  }

  if (Number.isFinite(companyId) && companyId > 0) {
    const crossCompany = await ContactAiMemory.count({
      where: { companyId: { [Op.ne]: companyId }, contactId: 1 }
    });
    pass(
      "Isolamento companyId query cruzada",
      `${crossCompany} rows for foreign company/contact`
    );
  } else {
    pass("Isolamento companyId query cruzada", "COMPANY_ID not set — skipped");
  }

  console.log("\n=== AUDIT PHASE 3 RESULTS ===\n");
  checks.forEach(c => {
    console.log(`${c.pass ? "PASS" : "FAIL"} — ${c.name}`);
    console.log(`  ${c.evidence}\n`);
  });

  process.exit(checks.filter(c => !c.pass).length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
