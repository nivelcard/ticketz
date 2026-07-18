# Deploy e ambientes

Índice temático. **Conteúdo completo:** [`MANUAL_PLATAFORMA.md`](MANUAL_PLATAFORMA.md)

## Seções do manual

| Tópico | Seção |
|--------|-------|
| Docker Compose | [§20 — Opções de deploy](MANUAL_PLATAFORMA.md#20-opções-de-deploy-e-ambientes) |
| Dev local | [§21 — Desenvolvimento local](MANUAL_PLATAFORMA.md#21-desenvolvimento-local) |
| Referência rápida | [§23 — Referência técnica](MANUAL_PLATAFORMA.md#23-referência-técnica-rápida) |
| Env vars IA/storage | [§38](MANUAL_PLATAFORMA.md#38-variáveis-de-ambiente--ia-e-storage) |

## Arquivos Docker Compose

| Arquivo | Uso |
|---------|-----|
| `docker-compose-local.yaml` | Stack completa local |
| `docker-compose-dev.yaml` | Postgres + Redis + pgAdmin |
| `docker-compose-acme.yaml` | Produção com Let's Encrypt |
| `docker-compose-cloudflare.yaml` | Cloudflare tunnel |
| `docker-compose-supabase.yaml` | Postgres externo |
| `docker-compose-vps.yaml` | VPS + Supabase |

## CI/CD

- `.github/workflows/build-docker.yml`
- Imagens: `ghcr.io/ticketz-oss/ticketz-backend`, `ticketz-frontend`

## Documentos complementares

- [`Local Development.pt.md`](Local%20Development.pt.md)
- [`Deploy Cloudflare.md`](Deploy%20Cloudflare.md)
- [`README.pt.md`](../README.pt.md)

## Regra de atualização

Alterações em deploy/CI → §20, §21, §23, §38. Ver [`/.documentation-rules.md`](.documentation-rules.md).
