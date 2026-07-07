-- Validação do setup de IA no Supabase / Postgres (schema ticketz)
-- Execute no SQL Editor do Supabase. Não expõe secrets.

\set ON_ERROR_STOP on

SELECT current_database() AS database_name,
       current_schema() AS current_schema;

-- 1) Extensão pgvector
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

-- 2) Tabelas obrigatórias
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'AiAgents',
    'AiAgentQueues',
    'KnowledgeBases',
    'KnowledgeDocuments',
    'KnowledgeChunks',
    'AiConversationLogs',
    'MessageMediaFiles'
  ]) AS table_name
)
SELECT
  r.table_name,
  CASE
    WHEN t.table_name IS NOT NULL THEN 'OK'
    ELSE 'MISSING'
  END AS status
FROM required_tables r
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'ticketz'
 AND t.table_name = r.table_name
ORDER BY r.table_name;

-- 3) Colunas novas em Tickets
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'ticketz'
  AND table_name = 'Tickets'
  AND column_name IN ('aiHandoff', 'aiAgentId')
ORDER BY column_name;

-- 4) Índice vetorial
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'ticketz'
  AND tablename = 'KnowledgeChunks'
  AND indexname ILIKE '%embedding%';

-- 5) Contagens (deve retornar 0+ sem erro)
SELECT 'AiAgents' AS entity, COUNT(*)::int AS total
FROM ticketz."AiAgents"
UNION ALL
SELECT 'KnowledgeBases', COUNT(*)::int FROM ticketz."KnowledgeBases"
UNION ALL
SELECT 'KnowledgeDocuments', COUNT(*)::int FROM ticketz."KnowledgeDocuments"
UNION ALL
SELECT 'KnowledgeChunks', COUNT(*)::int FROM ticketz."KnowledgeChunks"
UNION ALL
SELECT 'AiConversationLogs', COUNT(*)::int FROM ticketz."AiConversationLogs"
UNION ALL
SELECT 'MessageMediaFiles', COUNT(*)::int FROM ticketz."MessageMediaFiles";

-- 6) Settings de storage (somente presença, sem valores)
SELECT key,
       CASE
         WHEN value IS NULL OR btrim(value) = '' THEN 'EMPTY'
         ELSE 'CONFIGURED'
       END AS status
FROM ticketz."Settings"
WHERE "companyId" = 1
  AND key IN (
    'storageProvider',
    'b2ApplicationKeyId',
    'b2ApplicationKey',
    'b2Bucket',
    'b2Endpoint',
    'b2PublicUrl',
    'B2_APPLICATION_KEY_ID',
    'B2_APPLICATION_KEY',
    'B2_BUCKET',
    'B2_BUCKET_NAME',
    'B2_ENDPOINT',
    'B2_PUBLIC_URL',
    'B2_KEY_ID'
  )
ORDER BY key;

-- 7) Documentos pendentes de ingestão
SELECT id, title, status, "createdAt"
FROM ticketz."KnowledgeDocuments"
WHERE status IN ('pending', 'processing', 'error')
ORDER BY "createdAt" DESC
LIMIT 20;

-- 8) Agentes ativos
SELECT id, name, active, provider, "textModel", "fallbackQueueId"
FROM ticketz."AiAgents"
WHERE active = true
ORDER BY id;
