# Relatório Técnico — Fase 2: Knowledge CMS + Assets + Domínios

**Data:** 2026-07-18  
**Ambiente:** Homologação  
**Status:** Implementado — feature flag **desligada por padrão**  
**Produção:** Não deployado · **push main:** não realizado

---

## 1. Resumo executivo

A Fase 2 transforma a camada de documentos em **Knowledge Assets** com domínios, categorias, versionamento imutável, publicação atômica blue-green e ingestão assíncrona via Bull. O RAG com CMS ativo consulta apenas chunks de versões **publicadas** e **indexadas**. Com `AI_KB_CMS_ENABLED=false`, o fluxo legado permanece inalterado.

---

## 2. Arquitetura implementada

```
Empresa → Domínio → Base → Categoria → KnowledgeAsset → AssetVersion → Chunks
```

Publicação atômica: indexa nova versão → valida chunks → swap `publishedVersionId` → cleanup assíncrono dos chunks antigos.

---

## 3. Migrations

| Migration | Conteúdo |
|-----------|----------|
| `20260725100000-ai-phase2-knowledge-cms.ts` | Domains, Categories, Assets, Versions, Permissions, IngestionJobs; evolução Bases + Chunks |

Executada em homologação: **sim**.

---

## 4. Backfill

Script: `COMPANY_ID=<id> npm run backfill:knowledge-assets` (idempotente; `COMPANY_ID` obrigatório para escopo por empresa)

Resultado companyId=1:

- domainsUpserted: 1 (Geral)
- assetsUpserted: 1
- versionsUpserted: 1
- chunksUpdated: 2
- errors: []

---

## 5. Validação de preservação

Script: `COMPANY_ID=1 npm run validate:knowledge-assets`

| Check | Resultado |
|-------|-----------|
| documents = assets(legacy) | PASS (1=1) |
| chunk count | PASS (2) |
| embeddings preserved | PASS (2) |
| ready docs published | PASS |
| no orphan chunks | PASS |

---

## 6. Serviços e workers

- `KnowledgeCms/*` — CMS, publish, atomic swap, permissions, retrieval policy, legacy adapter
- `AiKnowledgeIngestionQueueService` — fila Bull `AiKnowledgeIngestionQueue`
- Jobs: `index-asset-version`, `publish-asset-swap`, `reindex-asset`, `unpublish-asset`, `cleanup-asset-version`

---

## 7. APIs

Rotas `/ai/knowledge-domains`, `/ai/categories`, `/ai/assets/*` — ver `docs/api.md`.  
Legado `/ai/documents/*` delega via `LegacyKnowledgeAdapter`.  
**Nenhuma rota 501.**

---

## 8. Frontend

- `/ai/knowledge-domains` — CRUD domínios
- `/ai/assets` — CMS completo (lifecycle, versões, ingestão)
- `/ai/documents` → redirect `/ai/assets`
- Bases: coluna domínio + contagem assets
- Agentes: alerta bases sem assets publicados

---

## 9. Integração Fase 1

Orquestrador, `AiAgentKnowledgeBases` e `getKnowledgeBaseIdsForAgent` **inalterados**.  
`RetrievalEngine` aplica filtros CMS quando flag ON.

---

## 10. Testes

| Suite | Resultado |
|-------|-----------|
| KnowledgeCms/__tests__ (4 suites, incl. auditoria ampliada) | ver validação consolidada |
| AiOrchestratorRouting (regressão Fase 1) | 42 passed |
| Backend build | OK |
| Frontend build | OK |
| audit:ai-phase2 | 8/8 PASS |

---

## 11. Feature flags

| Flag | Default |
|------|---------|
| `AI_KB_CMS_ENABLED` | `false` |
| Setting `aiKbCmsEnabled` | `disabled` |

---

## 12. Ativação homologação

```bash
cd backend && npm run build && npm run db:migrate
COMPANY_ID=<id> npm run backfill:knowledge-assets
COMPANY_ID=<id> npm run validate:knowledge-assets
# .env: AI_KB_CMS_ENABLED=true
# Setting: aiKbCmsEnabled=enabled
COMPANY_ID=<id> npm run seed:ai-phase2-permissions
```

---

## 13. Veredito

**FASE 2 APROVADA** — MVP enxuto implementado conforme `docs/AI_PHASE2_ARCHITECTURE.md`, com migração segura, publicação atômica, testes PASS e compatibilidade legado preservada.
