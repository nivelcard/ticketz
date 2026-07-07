# Plano Arquitetural Definitivo — IA Fortmax / Ticketz

**Status:** Fase 0 em implementação (itens 1–3 concluídos nesta entrega)  
**Princípio:** `companyId` permanece como único eixo de isolamento operacional

---

## 1. Revisão da arquitetura atual

### O que já existe (entregue em `de775b3`)

| Camada | Estado | Observação |
|--------|--------|------------|
| Tabelas IA/KB/RAG | ✅ | `AiAgents`, `KnowledgeBases`, `KnowledgeDocuments`, `KnowledgeChunks` (pgvector), logs |
| Orquestração WhatsApp | ✅ | `ProcessInboundMessageService` integrado ao `wbotMessageListener` |
| RAG | ✅ | Embedding → busca HNSW → trechos → resposta |
| Handoff IA ↔ humano | ✅ | Keywords, temas sensíveis, baixa confiança |
| Painel admin IA | ✅ | Agentes, bases, documentos, logs |
| StorageService | ⚠️ Parcial | IA/KB usam storage; WhatsApp geral ainda usa disco local |
| OpenAI | ⚠️ Acoplado | `ModelGateway` + `transcriber.ts` ainda com chamadas diretas em partes legadas |

### Conflitos identificados

1. **B2 só via `process.env`** — produção Cloudflare não tinha vars; secrets estavam no banco sem leitura automática.
2. **OpenAI espalhada** — `ModelGateway`, `transcriber.ts`, `wbotMessageListener` (transcrição legada).
3. **Um agente por empresa na prática** — schema suporta múltiplos, mas roteamento usa “primeiro agente ativo”.
4. **KB sem versionamento** — documentos não têm histórico/rollback/autor.
5. **Sem memória por cliente** — `Contact` não persiste preferências de atendimento IA.
6. **Ferramentas inexistentes** — sem registry/execução.
7. **Arquivos WhatsApp fora do StorageService** — `saveMediaToFile` grava em disco local.
8. **Migration não roda no deploy Cloudflare** — exige execução manual no Supabase.
9. **Dashboard IA limitado** — logs existem; métricas agregadas (custo, economia) não.

---

## 2. Estrutura de pastas no Backblaze (implementado)

Todos os arquivos do módulo Suporte Fortmax usam o prefixo configurável `STORAGE_ROOT_PREFIX` (padrão: `suporte`):

```
suporte/
  {companyId}/
    media/
      audio/
      images/
      video/          (futuro)
      attachments/    (futuro)
    knowledge/
      text/
      documents/
```

Credenciais lidas de `Settings` (companyId da empresa + fallback companyId=1), com aliases:

- `b2ApplicationKeyId`, `B2_APPLICATION_KEY_ID`, `B2_KEY_ID`
- `b2ApplicationKey`, `B2_APPLICATION_KEY`
- `b2Bucket`, `B2_BUCKET`, `B2_BUCKET_NAME`
- `b2Endpoint`, `B2_ENDPOINT`
- `b2PublicUrl`, `B2_PUBLIC_URL`
- `storageProvider` (`backblaze`, `s3`, `r2`, `minio`)

Variáveis de ambiente continuam como override opcional.

---

## 3. Plano por fases

### Fase 0 — Fundação (esta entrega) ✅

- [x] StorageService lê B2 do banco (`StorageConfigService`)
- [x] Prefixo `suporte/` nos objetos
- [x] Adapter S3-compatível (B2/R2/S3/MinIO)
- [x] Interface `AIProvider` + `OpenAIProvider` + `ProviderFactory`
- [x] `ModelGateway` desacoplado de OpenAI direto
- [x] Skeleton `ToolRegistry`
- [x] Scripts: `validate-ai-setup.sql`, `seed-webg3-ai.sql`, `ingest:pending`
- [x] `STORAGE_ROOT_PREFIX=suporte` no Wrangler

### Fase 1 — Providers e agentes (2–3 semanas)

| Entrega | Arquivos principais |
|---------|---------------------|
| Providers Gemini, Claude, Azure, Ollama, custom | `providers/GeminiProvider.ts`, `AnthropicProvider.ts`, etc. |
| Roteamento multiagente por fila/intenção | `AiHelpers.ts`, `ProcessInboundMessageService.ts` |
| Agentes com KB e tools permitidas | migration `AiAgentTools`, `AiAgentKnowledgeBases` |
| Unificar transcrição legada | `transcriber.ts` → `AIProvider` |

### Fase 2 — Base de conhecimento enterprise (2 semanas)

| Entrega | Arquivos |
|---------|----------|
| Versão, autor, histórico, rollback | `KnowledgeDocumentVersions` migration + models |
| URL, HTML, paste, sync pasta (stub) | `IngestKnowledgeDocumentService`, controllers |
| Reindex assíncrono (Bull) | `queues/aiIngestion.ts` |

### Fase 3 — Memória e ferramentas (2 semanas)

| Entrega | Arquivos |
|---------|----------|
| Memória por `Contact` | `ContactAiMemory` model + service |
| Tool framework executável | `tools/ToolRegistry.ts`, `ToolExecutor.ts` |
| Permissões por agente | `AiAgentTools` join table |

### Fase 4 — Storage unificado (1–2 semanas)

| Entrega | Arquivos |
|---------|----------|
| Todo WhatsApp via StorageService | `wbotMessageListener.ts`, `saveMediaToFile` refactor |
| Metadados em `MessageMediaFiles` para 100% mídias | migration + listener |
| Painel storage no frontend | `Settings/Options.js` ✅ (parcial nesta entrega) |

### Fase 5 — Dashboard e observabilidade (2 semanas)

| Entrega | Arquivos |
|---------|----------|
| Dashboard IA (tokens, custo, handoff, docs) | `AiDashboardService.ts`, `pages/AiDashboard/` |
| Agregações SQL + cache Redis | `ReportService/` |
| Auditoria sem secrets | revisão `AiConversationLog` |

### Fase 6 — Escala e deploy (1 semana)

| Entrega | Arquivos |
|---------|----------|
| Migration automática no container | `entrypoint.sh` |
| CI: validar pgvector pós-deploy | `scripts/validate-ai-setup.sql` no workflow |
| Rate limit / fila IA por empresa | Bull queue `ai-processing` |

---

## 4. Arquivos alterados nesta entrega

### Backend (novos)

- `src/services/StorageService/StorageConfigService.ts`
- `src/services/StorageService/S3CompatibleStorageAdapter.ts`
- `src/services/AiServices/providers/AIProvider.ts`
- `src/services/AiServices/providers/OpenAIProvider.ts`
- `src/services/AiServices/providers/ProviderFactory.ts`
- `src/services/AiServices/tools/ToolRegistry.ts`
- `src/scripts/ingestPendingDocuments.ts`

### Backend (modificados)

- `src/services/StorageService/StorageService.ts`
- `src/services/StorageService/BackblazeB2Adapter.ts`
- `src/services/AiServices/ModelGateway.ts`
- `src/services/AiServices/IngestKnowledgeDocumentService.ts`
- `src/services/AiServices/ProcessInboundMessageService.ts`
- `src/controllers/KnowledgeDocumentController.ts`
- `package.json`

### Infra / scripts / docs

- `api-worker/wrangler.toml`
- `scripts/validate-ai-setup.sql`
- `scripts/seed-webg3-ai.sql`
- `docs/AI_SETUP.md`
- `docs/AI_ARCHITECTURE_PLAN.md`

### Frontend (modificados)

- `src/components/Settings/Options.js` — seção Armazenamento (B2)

---

## 5. Ordem de execução em produção

```bash
# 1) Migration (se ainda não rodou)
cd backend && npm run build && npm run db:migrate

# 2) Validar no Supabase SQL Editor
# scripts/validate-ai-setup.sql

# 3) Seed WEBG3
# scripts/seed-webg3-ai.sql

# 4) Gerar embeddings da FAQ (requer OpenAI Key no painel)
cd backend && npm run ingest:pending

# 5) Deploy API (B2 vem do banco — não precisa wrangler secret B2)
```

---

## 6. Decisões preservadas

- RAG sempre via pgvector; nunca documento inteiro no prompt
- Metadados no Postgres; binários no object storage
- API keys e secrets apenas em `Settings` / secrets de deploy — nunca em logs
- Isolamento total por `companyId`
- Handoff IA ↔ humano mantido

---

## 7. Próximo passo recomendado

Após validar o seed WEBG3 em produção, iniciar **Fase 1** com roteamento multiagente (WEBG3 Comercial, Financeiro, RH, Produção) vinculado a filas e bases específicas.
