# Roadmap e evolução

Índice temático. **Conteúdo completo:** [`MANUAL_PLATAFORMA.md`](MANUAL_PLATAFORMA.md)

## Seções do manual

| Tópico | Seção |
|--------|-------|
| Pronto vs evolução | [§22 — O que está pronto](MANUAL_PLATAFORMA.md#22-o-que-está-pronto-vs-em-evolução) |
| Melhorias pré-Fase 2 | [§44 — Melhorias recomendadas](MANUAL_PLATAFORMA.md#44-melhorias-recomendadas-antes-da-fase-2) |
| Dívidas técnicas | [§41 — Dívidas técnicas](MANUAL_PLATAFORMA.md#41-dívidas-técnicas) |
| Riscos | [§43 — Riscos arquitetônicos](MANUAL_PLATAFORMA.md#43-riscos-arquitetônicos) |
| Pontos de extensão | [§40 — Extensão](MANUAL_PLATAFORMA.md#40-pontos-de-extensão-existentes) |

## Documentos de planejamento

- [`AI_ARCHITECTURE_PLAN.md`](AI_ARCHITECTURE_PLAN.md) — Fase 0–2 IA
- [`AI_SETUP.md`](AI_SETUP.md) — setup operacional

## Estado atual (v1.1 manual)

### Operacional

Atendimento WA, tickets, chatbot, IA (RAG/handoff/copilot), SaaS, deploy Docker.

### Parcial / Fase 2

- Orquestrador multi-agente (flag dupla env + Setting)
- ToolRegistry (vazio)
- Versionamento KB
- Métricas custo dashboard IA
- Providers gemini/anthropic (501)

### Melhorias prioritárias (§44)

1. Expandir `AI_MIGRATION_NAMES`
2. Unificar debounce default IA
3. Remover branding hardcoded nos prompts
4. Playground paridade RAG com inbound
5. Implementar tools piloto

## Regra de atualização

Conclusão de feature ou dívida resolvida → §22, §41, §44 e este arquivo. Ver [`/.documentation-rules.md`](.documentation-rules.md).
