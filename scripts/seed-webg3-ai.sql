-- Seed inicial: Agente WEBG3 + Base de Conhecimento + FAQ
-- Execute APÓS a migration 20260707100000-create-ai-and-knowledge-tables
-- Depois rode: cd backend && npm run ingest:pending

BEGIN;

-- Base de conhecimento
INSERT INTO ticketz."KnowledgeBases" ("companyId", name, description, active, "createdAt", "updatedAt")
SELECT 1,
       'Suporte WEBG3',
       'FAQ e procedimentos de atendimento da WEBG3',
       true,
       NOW(),
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ticketz."KnowledgeBases"
  WHERE "companyId" = 1 AND name = 'Suporte WEBG3'
);

-- Agente IA
INSERT INTO ticketz."AiAgents" (
  "companyId",
  name,
  active,
  provider,
  "textModel",
  "visionModel",
  "transcriptionModel",
  "basePrompt",
  temperature,
  "maxTokens",
  "fallbackQueueId",
  "handoffMessage",
  "createdAt",
  "updatedAt"
)
SELECT
  1,
  'Atendente Virtual WEBG3',
  true,
  'openai',
  'gpt-4o-mini',
  'gpt-4o-mini',
  'gpt-4o-mini-transcribe',
  'Você é o assistente virtual da WEBG3, empresa do Grupo Fortmax.
Responda apenas com base na base de conhecimento fornecida.
Seja educado, objetivo e profissional em português do Brasil.
Se não souber a resposta com segurança, informe que vai transferir para um atendente humano.
Nunca invente informações, preços, prazos ou políticas.',
  0.3,
  1024,
  (
    SELECT id
    FROM ticketz."Queues"
    WHERE "companyId" = 1
      AND (
        LOWER(name) LIKE '%suporte%'
        OR LOWER(name) LIKE '%webg3%'
        OR LOWER(name) LIKE '%atendimento%'
      )
    ORDER BY id
    LIMIT 1
  ),
  'Vou transferir você para um atendente humano. Por favor, aguarde um momento.',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ticketz."AiAgents"
  WHERE "companyId" = 1 AND name = 'Atendente Virtual WEBG3'
);

-- Vincular agente à base e à primeira fila disponível
INSERT INTO ticketz."AiAgentQueues" (
  "companyId",
  "aiAgentId",
  "queueId",
  "knowledgeBaseId",
  "createdAt"
)
SELECT
  1,
  a.id,
  COALESCE(
    a."fallbackQueueId",
    (SELECT id FROM ticketz."Queues" WHERE "companyId" = 1 ORDER BY id LIMIT 1)
  ),
  kb.id,
  NOW()
FROM ticketz."AiAgents" a
JOIN ticketz."KnowledgeBases" kb
  ON kb."companyId" = a."companyId"
 AND kb.name = 'Suporte WEBG3'
WHERE a."companyId" = 1
  AND a.name = 'Atendente Virtual WEBG3'
  AND NOT EXISTS (
    SELECT 1
    FROM ticketz."AiAgentQueues" aq
    WHERE aq."aiAgentId" = a.id
      AND aq."knowledgeBaseId" = kb.id
  );

-- FAQ em texto manual (status pending — ingestão gera embeddings)
INSERT INTO ticketz."KnowledgeDocuments" (
  "companyId",
  "knowledgeBaseId",
  title,
  type,
  "originalFilename",
  "storageUrl",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  1,
  kb.id,
  'FAQ Suporte WEBG3',
  'text',
  'FAQ Suporte WEBG3.txt',
  'seed://faq-webg3',
  'pending',
  NOW(),
  NOW()
FROM ticketz."KnowledgeBases" kb
WHERE kb."companyId" = 1
  AND kb.name = 'Suporte WEBG3'
  AND NOT EXISTS (
    SELECT 1
    FROM ticketz."KnowledgeDocuments" d
    WHERE d."companyId" = 1
      AND d.title = 'FAQ Suporte WEBG3'
  );

COMMIT;

-- Conteúdo da FAQ (usado pelo script ingest:pending)
-- Pergunta: O que é a WEBG3?
-- Resposta: A WEBG3 é uma empresa do Grupo Fortmax especializada em soluções digitais e atendimento ao cliente.

-- Pergunta: Qual o horário de atendimento?
-- Resposta: O atendimento humano funciona em dias úteis, das 8h às 18h. O assistente virtual responde 24 horas.

-- Pergunta: Como falar com um atendente humano?
-- Resposta: Digite "quero falar com atendente" ou "suporte humano" a qualquer momento.

-- Pergunta: Como abrir um chamado de suporte?
-- Resposta: Envie sua dúvida por este WhatsApp. Se a IA não resolver, o chamado será encaminhado automaticamente para a fila de suporte.

-- Pergunta: Quais informações devo enviar ao abrir chamado?
-- Resposta: Informe nome, empresa, descrição do problema e, se possível, prints ou áudios explicando a situação.

-- Pergunta: A WEBG3 atende finanças e cobrança?
-- Resposta: Assuntos financeiros são tratados pela equipe especializada. Peça transferência para "financeiro" ou "atendente".

-- Pergunta: Esqueci minha senha, o que faço?
-- Resposta: Por segurança, solicite a recuperação de senha com um atendente humano. Não envie senhas por WhatsApp.

-- Pergunta: O assistente virtual grava conversas?
-- Resposta: Sim, para melhorar o atendimento e permitir continuidade. Dados sensíveis não devem ser compartilhados por este canal.
