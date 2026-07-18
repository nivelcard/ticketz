# Relatório Técnico — Fase 3: Memória de Contato + Ferramentas Executáveis

**Data:** 2026-07-18  
**Ambiente:** Homologação / local  
**Status:** Implementado — feature flags **desligadas por padrão**  
**Spec:** [`AI_PHASE3_ARCHITECTURE.md`](AI_PHASE3_ARCHITECTURE.md)  
**Produção:** Não deployado · **push:** não realizado

---

## 1. Resumo executivo

A Fase 3 adiciona **memória persistente por contato** (com verificação de origem e fila Bull resiliente) e **ferramentas executáveis** (4 tools piloto com logs sanitizados e handoff idempotente) aos especialistas da Fase 1, preservando RAG/CMS das Fases 1–2 quando flags desligadas.

---

## 2. Feature flags

### Memória

| Camada | Chave | Default |
|--------|-------|---------|
| Global | `AI_CONTACT_MEMORY_ENABLED` | `false` |
| Empresa | Setting `aiContactMemoryEnabled` | `disabled` |

### Tools

| Camada | Chave | Default |
|--------|-------|---------|
| Global | `AI_TOOLS_ENABLED` | `false` |
| Empresa | Setting `aiToolsEnabled` | `disabled` |

---

## 3. Migration

`backend/src/database/migrations/20260730100000-ai-phase3-memory-tools.ts`

| Tabela | Função |
|--------|--------|
| `ContactAiMemories` | Memória por contato + `verificationStatus` |
| `ContactAiMemoryJobs` | Jobs Bull + idempotencyKey |
| `ContactAiMemoryLogs` | Auditoria LGPD |
| `AiAgentTools` | Vínculo agente ↔ tool |
| `AiToolExecutionLogs` | Auditoria sanitizada |

---

## 4. Serviços principais

| Caminho | Função |
|---------|--------|
| `ContactMemory/` | Policy, sanitizer, service, extractor, Bull queue |
| `tools/` | Registry, executor, loop, 4 pilot tools, sanitizers |
| `AiPromptBuilder.ts` | Prompt unificado + anti-injection |
| `ProcessInboundMessageService.ts` | Memória + tools + enqueue Bull |
| `AiSpecialistReplyService.ts` | Playground + inbound reply path |

### Tools piloto

- `get_ticket_status` (read)
- `get_business_hours` (read)
- `search_published_knowledge` (read)
- `request_human_handoff` (handoff idempotente)

### Fila Bull memória

- Nome: `AiContactMemoryQueue`
- Job: `persist-contact-memory`
- **Sem** `setImmediate`

---

## 5. API

| Método | Rota |
|--------|------|
| GET | `/ai/memory/status` |
| GET | `/ai/tools/status` |
| GET | `/ai/tools` |
| GET/PUT | `/ai/agents/:agentId/tools` |
| GET/POST/PATCH/DELETE | `/ai/contacts/:contactId/memory` |
| GET | `/ai/contacts/:contactId/memory/export` |
| GET | `/ai/tool-executions` |

---

## 6. Frontend

- `AiAgents` — seção Ferramentas (Fase 3) com toggles por tool
- `AiPlayground` — métricas `toolCallsExecuted` e `handoffTriggered`

---

## 7. Scripts operacionais

```bash
cd backend && npm run build && npm run db:migrate
COMPANY_ID=<id> npm run seed:ai-phase3
COMPANY_ID=<id> npm run audit:ai-phase3
```

---

## 8. Testes

| Suite | Resultado |
|-------|-----------|
| ContactAiMemoryPolicy + Sanitizer | PASS |
| ToolLogSanitizer + RequestHumanHandoff + ToolLoop | PASS |
| Regressão Fase 1 (42) + Fase 2 (23) | PASS |
| Backend build | OK |
| Frontend build | OK |

---

## 9. Ativação homologação

```bash
# .env
AI_CONTACT_MEMORY_ENABLED=true
AI_TOOLS_ENABLED=true

# Settings empresa
aiContactMemoryEnabled=enabled
aiToolsEnabled=enabled

COMPANY_ID=<id> npm run seed:ai-phase3
COMPANY_ID=<id> npm run audit:ai-phase3
```

---

## 10. Veredito

**FASE 3 IMPLEMENTADA** conforme `AI_PHASE3_ARCHITECTURE.md`, com memória verificada, persistência Bull, LGPD, logs sanitizados, proteção prompt injection, handoff idempotente e compatibilidade total com flags OFF.
