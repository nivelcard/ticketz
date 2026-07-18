# Changelog — Documentação Ticketz

Histórico de alterações em `MANUAL_PLATAFORMA.md` e estrutura `docs/`.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.2.1] — 2026-07-18

### Adicionado (governança documental)

- `.cursor/rules/documentation-rules.mdc` — rule permanente versionada no repositório
- `docs/.documentation-rules.md` — spec completa de documentação
- Índices temáticos: `architecture.md`, `backend.md`, `deployment.md`, `frontend.md`, `integrations.md`
- `AGENTS.md` — guia para agentes de código
- Sincronização de índices com Fases 1 e 2 (`ai.md`, `database.md`, `rag.md`, `roadmap.md`)

---

## [1.2.0] — 2026-07-18

### Adicionado (Fase 2 — Knowledge CMS backend)

- Serviços `backend/src/services/AiServices/KnowledgeCms/` — domínios, categorias, assets, versionamento, publicação atômica, fila Bull `AiKnowledgeIngestionQueue`
- Controllers: `KnowledgeDomainController`, `KnowledgeCategoryController`, `KnowledgeAssetController`
- Rotas `/ai/knowledge-domains`, `/ai/categories`, `/ai/assets/*` em `aiRoutes.ts`
- `RetrievalEngine` — filtro RAG CMS ON via `KnowledgeRetrievalPolicy`
- Scripts: `COMPANY_ID=<id> npm run backfill:knowledge-assets`, `COMPANY_ID=<id> npm run validate:knowledge-assets`, `seed:ai-phase2-permissions`, `audit:ai-phase2`
- Spec: [`AI_PHASE2_ARCHITECTURE.md`](AI_PHASE2_ARCHITECTURE.md)
- Relatório: [`AI_PHASE2_REPORT.md`](AI_PHASE2_REPORT.md)
- Frontend: `/ai/assets`, `/ai/knowledge-domains`, CMS lifecycle UI

---

## [1.1.1] — 2026-07-18

### Adicionado

- `.cursor/rules/documentation-rules.mdc` — rule permanente (`alwaysApply: true`)
- `docs/.documentation-rules.md` — spec completa de documentação
- Índices temáticos: `architecture.md`, `ai.md`, `rag.md`, `database.md`, `api.md`, `deployment.md`, `frontend.md`, `backend.md`, `integrations.md`, `roadmap.md`
- Estrutura de documentação no cabeçalho de `MANUAL_PLATAFORMA.md`

---

## [1.1.0] — 2026-07-18

### Adicionado

- `docs/MANUAL_PLATAFORMA.md` v1.1 — manual oficial auditado contra o código
- Parte II: diagramas Mermaid, fluxos IA/RAG/handoff/copilot/playground, schema IA
- Parte III: relatório de auditoria (§45), aderência 94%
- Estrutura de índices temáticos: `architecture.md`, `ai.md`, `rag.md`, etc.
- `.cursor/rules/documentation-rules.mdc` — rule permanente (`alwaysApply: true`)
- `docs/.documentation-rules.md` — spec completa de documentação

### Corrigido (auditoria v1.0 → v1.1)

- Debounce IA (`AI_QUEUE_DEBOUNCE_MS` padrão 0)
- Gateways de pagamento (Efi + Owen, não Mercado Pago no OSS)
- Ordem IA vs chatbot no fluxo WhatsApp
- Crons Bull (ScheduleMonitor 5s, invoice cada minuto)
- Visibilidade menu admin vs atendente
- To-Do List (localStorage only)

---

## [1.0.0] — 2026-07-18

### Adicionado

- Primeira versão do manual (`docs/MANUAL_PLATAFORMA.md`) — 24 seções

---

## Como registrar alterações

Ao concluir tarefa estrutural, adicionar entrada no topo:

```markdown
## [X.Y.Z] — AAAA-MM-DD

### Adicionado / Alterado / Corrigido / Removido

- Descrição — seções §N afetadas
```

Incrementar versão no cabeçalho de `MANUAL_PLATAFORMA.md`.
