# Arquitetura

Índice temático. **Conteúdo completo:** [`MANUAL_PLATAFORMA.md`](MANUAL_PLATAFORMA.md)

## Seções do manual

| Tópico | Seção |
|--------|-------|
| Stack e startup "fast shell" | [§2 — Visão geral da arquitetura](MANUAL_PLATAFORMA.md#2-visão-geral-da-arquitetura) |
| Diagrama Mermaid | [§25 — Diagrama de arquitetura](MANUAL_PLATAFORMA.md#25-diagrama-de-arquitetura) |
| Filas Bull/Redis | [§17 — Filas de processamento](MANUAL_PLATAFORMA.md#17-filas-de-processamento-bullredis) |
| WebSocket | [§16 — Tempo real](MANUAL_PLATAFORMA.md#16-tempo-real-websocket) |
| Gargalos | [§42 — Gargalos de desempenho](MANUAL_PLATAFORMA.md#42-gargalos-de-desempenho) |
| Riscos | [§43 — Riscos arquitetônicos](MANUAL_PLATAFORMA.md#43-riscos-arquitetônicos) |

## Arquivos-chave no código

- `backend/src/server.ts` — entrypoint
- `backend/src/appFast.ts` — fast shell
- `backend/src/routes/heavyRoutes.ts` — rotas de negócio
- `backend/src/queues.ts` — workers Bull
- `backend/src/libs/socket.ts` — Socket.io

## Regra de atualização

Alterações em arquitetura exigem atualização de §2, §25, §17 e possivelmente §42–§43. Ver [`/.documentation-rules.md`](.documentation-rules.md).
