/**
 * Idempotent wiring for Nível Velo WhatsApp support line.
 *
 * Usage (production):
 *   COMPANY_ID=1 npm run wire:nivel-support
 */
import "../src/bootstrap";
import { Op } from "sequelize";
import Company from "../src/models/Company";
import Queue from "../src/models/Queue";
import Whatsapp from "../src/models/Whatsapp";
import AiAgent from "../src/models/AiAgent";
import KnowledgeBase from "../src/models/KnowledgeBase";
import KnowledgeDomain from "../src/models/KnowledgeDomain";
import { syncAgentKnowledgeBases } from "../src/services/AiServices/AiAgentKnowledgeBaseService";
import { syncExclusiveAgentQueueLinks } from "../src/services/AiServices/syncExclusiveAgentQueueLinks";
import AssociateWhatsappQueue from "../src/services/WhatsappService/AssociateWhatsappQueue";
import { logger } from "../src/utils/logger";

const COMPANY_ID = Number(process.env.COMPANY_ID || 1);

const NIVEL_PROMPT = `Você é o Nivelton, assistente virtual da Nível Cashback (Grupo Fortmax).
Responda em português do Brasil, de forma educada, objetiva e profissional.
Use apenas as bases de conhecimento vinculadas (clientes e empresas).
Nunca invente preços, prazos, políticas ou dados que não estejam na base.
Se não souber responder com segurança, ofereça transferir para um atendente humano.
Quando perguntarem seu nome, diga que é o Nivelton, assistente da Nível Cashback.`;

const findByNameLoose = async (
  model: {
    findOne: (options: object) => Promise<{
      id: number;
      name: string;
      knowledgeDomainId?: number;
      basePrompt?: string;
      fallbackQueueId?: number;
      update: (values: object) => Promise<unknown>;
    } | null>;
  },
  companyId: number,
  patterns: string[],
  extraWhere: Record<string, unknown> = {}
) => {
  const matches = await Promise.all(
    patterns.map(pattern =>
      model.findOne({
        where: {
          companyId,
          name: { [Op.iLike]: `%${pattern}%` },
          ...extraWhere
        },
        order: [["id", "ASC"]]
      })
    )
  );

  return matches.find(Boolean) || null;
};

const run = async (): Promise<void> => {
  const company = await Company.findByPk(COMPANY_ID);
  if (!company) {
    throw new Error(`Company ${COMPANY_ID} not found`);
  }

  const nivelDomain =
    (await findByNameLoose(KnowledgeDomain, COMPANY_ID, [
      "nivel cashback",
      "nível cashback"
    ])) ||
    (await KnowledgeDomain.create({
      companyId: COMPANY_ID,
      name: "Nível Cashback",
      slug: "nivel-cashback",
      active: true,
      sortOrder: 20
    }));

  const clientBase =
    (await findByNameLoose(KnowledgeBase, COMPANY_ID, [
      "nivel site clientes",
      "nível site clientes"
    ])) ||
    (await KnowledgeBase.create({
      companyId: COMPANY_ID,
      name: "Nivel site clientes",
      description: "FAQ e políticas para clientes Nível Cashback",
      knowledgeDomainId: nivelDomain.id,
      active: true
    }));

  const empresaBase =
    (await findByNameLoose(KnowledgeBase, COMPANY_ID, [
      "nivel empresa",
      "nível empresa"
    ])) ||
    (await KnowledgeBase.create({
      companyId: COMPANY_ID,
      name: "Nivel empresa",
      description: "FAQ e políticas para empresas parceiras Nível",
      knowledgeDomainId: nivelDomain.id,
      active: true
    }));

  if (!clientBase.knowledgeDomainId) {
    await clientBase.update({ knowledgeDomainId: nivelDomain.id });
  }
  if (!empresaBase.knowledgeDomainId) {
    await empresaBase.update({ knowledgeDomainId: nivelDomain.id });
  }

  const queue =
    (await findByNameLoose(Queue, COMPANY_ID, ["suporte nivel", "suporte nível"])) ||
    (await Queue.create({
      companyId: COMPANY_ID,
      name: "Suporte Nível",
      color: "#2196F3",
      greetingMessage: ""
    }));

  let agent =
    (await findByNameLoose(AiAgent, COMPANY_ID, [
      "agente nivel cashback",
      "nivelton"
    ])) ||
    (await AiAgent.create({
      companyId: COMPANY_ID,
      name: "Nivelton",
      active: true,
      role: "legacy",
      provider: "openai",
      textModel: "gpt-4o-mini",
      visionModel: "gpt-4o-mini",
      transcriptionModel: "gpt-4o-mini-transcribe",
      basePrompt: NIVEL_PROMPT,
      temperature: 0.3,
      maxTokens: 1024,
      fallbackQueueId: queue.id,
      handoffMessage:
        "Vou transferir você para um atendente humano. Por favor, aguarde.",
      ackEnabled: false
    }));

  if (!agent.basePrompt?.trim()) {
    await agent.update({ basePrompt: NIVEL_PROMPT });
  }
  if (!agent.fallbackQueueId) {
    await agent.update({ fallbackQueueId: queue.id, active: true });
  }

  await syncAgentKnowledgeBases({
    companyId: COMPANY_ID,
    aiAgentId: agent.id,
    knowledgeBaseIds: [clientBase.id, empresaBase.id]
  });

  await syncExclusiveAgentQueueLinks({
    companyId: COMPANY_ID,
    aiAgentId: agent.id,
    queueLinks: [
      {
        queueId: queue.id,
        knowledgeBaseId: clientBase.id
      }
    ]
  });

  const whatsapp =
    (await findByNameLoose(
      Whatsapp,
      COMPANY_ID,
      ["nivel velo", "nível velo"],
      { channel: "whatsapp" }
    )) ||
    (await Whatsapp.create({
      companyId: COMPANY_ID,
      name: "Nível Velo",
      status: "OPENING",
      channel: "whatsapp",
      provider: "beta",
      token: "",
      isDefault: false,
      language: "pt"
    }));

  await AssociateWhatsappQueue(whatsapp, [queue.id]);

  logger.info(
    {
      companyId: COMPANY_ID,
      domainId: nivelDomain.id,
      domainName: nivelDomain.name,
      queueId: queue.id,
      queueName: queue.name,
      agentId: agent.id,
      agentName: agent.name,
      whatsappId: whatsapp.id,
      whatsappName: whatsapp.name,
      knowledgeBaseIds: [clientBase.id, empresaBase.id]
    },
    "Nível support line wired successfully"
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        domain: { id: nivelDomain.id, name: nivelDomain.name },
        queue: { id: queue.id, name: queue.name },
        agent: { id: agent.id, name: agent.name },
        whatsapp: { id: whatsapp.id, name: whatsapp.name },
        knowledgeBases: [
          { id: clientBase.id, name: clientBase.name },
          { id: empresaBase.id, name: empresaBase.name }
        ],
        nextStep:
          "Escaneie o QR Code em Administração → Conexões → Nível Velo se ainda não conectou."
      },
      null,
      2
    )
  );
};

run()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error({ error }, "Failed to wire Nível support");
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
