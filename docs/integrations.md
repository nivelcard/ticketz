# Integrações

Índice temático. **Conteúdo completo:** [`MANUAL_PLATAFORMA.md`](MANUAL_PLATAFORMA.md)

## Seções do manual

| Tópico | Seção |
|--------|-------|
| WhatsApp | [§7 — Módulo WhatsApp](MANUAL_PLATAFORMA.md#7-módulo-whatsapp-e-conexões) |
| API externa | [§15 — API externa](MANUAL_PLATAFORMA.md#15-api-externa-e-integrações) |
| WebSocket | [§16 — Tempo real](MANUAL_PLATAFORMA.md#16-tempo-real-websocket) |
| Dependências externas | [§39](MANUAL_PLATAFORMA.md#39-dependências-externas) |
| Storage / B2 | [§18 — Armazenamento](MANUAL_PLATAFORMA.md#18-armazenamento-de-mídia) |
| Financeiro | [§14 — SaaS](MANUAL_PLATAFORMA.md#14-financeiro-planos-e-saas) |

## Integrações verificadas no código

| Integração | Implementação |
|------------|---------------|
| WhatsApp | `libzapitu-rf` — `libs/wbot.ts`, `WbotServices/` |
| OpenAI / Groq | `AiServices/providers/` — API compatible |
| Backblaze B2 / S3 | `StorageService/` |
| Redis | Bull queues — `REDIS_URI` |
| PostgreSQL + pgvector | Sequelize |
| Cloudflare Turnstile | Login — env + Settings |
| Efi | `PaymentGatewayServices/EfiServices.ts` |
| Owen (pixTicketz) | `PaymentGatewayServices/OwenServices.ts` |
| Wavoip | `WavoipController`, model `Wavoip` |
| Sentry | `app.ts` (DSN opcional) |

## Fluxo WhatsApp

[§26 — Fluxo WhatsApp](MANUAL_PLATAFORMA.md#26-fluxo-whatsapp-mensagens)

## Regra de atualização

Nova integração → §15, §39, seção de domínio. Ver [`/.documentation-rules.md`](.documentation-rules.md).
