# Deploy Ticketz — Cloudflare Pages (padrão Fortmax)

Mesma arquitetura WebG3 / Nível Cashback / Cortex:

- **GitHub** (`nivelcard/ticketz`) — repositório principal
- **GitHub Actions** — deploy automático a cada `push` em `main`
- **Cloudflare Pages** — projeto `fortmax-ticketz-prod`
- **`functions/_middleware.ts`** — proxy `/backend/*` e `/socket.io/*`

Não utiliza Cloudflare Tunnel.

---

## Secrets obrigatórios no GitHub

Cadastre em **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Descrição | Onde obter |
|--------|-----------|------------|
| `CLOUDFLARE_API_TOKEN` | Token com permissão **Cloudflare Pages → Edit** | Supabase Fortmax → Edge Functions → Secrets (mesmo valor usado no WebG3/Nível) |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare Fortmax | Painel Cloudflare → Overview → Account ID |
| `BACKEND_ORIGIN` | URL base do backend Node (ex.: `https://api-interna.fortmax.com.br`) | Servidor onde o Ticketz backend está rodando |
| `CLOUDFLARE_ZONE_ID` | Zone ID de `fortmax.com.br` | Cloudflare → fortmax.com.br → Overview → Zone ID |

> `BACKEND_ORIGIN` é usado pelo middleware para proxy de `/backend` e `/socket.io`.
> O frontend usa `suporte.fortmax.com.br/backend` via `config-prod.json`.

---

## Configuração única no Cloudflare (painel)

1. **Criar projeto Pages** (se ainda não existir):
   ```bash
   npx wrangler pages project create fortmax-ticketz-prod --production-branch main
   ```

2. **Custom domain** no projeto `fortmax-ticketz-prod`:
   - `suporte.fortmax.com.br`

3. **GitHub Environment** (opcional, recomendado):
   - Settings → Environments → criar `production` com required reviewer

---

## Fluxo automático

```
push main → GitHub Actions → npm build → wrangler pages deploy → purge cache
```

Arquivos monitorados:
- `frontend/**`
- `functions/**`
- `.github/workflows/deploy-spa-prod.yml`

---

## config.json de produção

```json
{
  "BACKEND_PROTOCOL": "https",
  "BACKEND_HOST": "suporte.fortmax.com.br",
  "BACKEND_PATH": "/backend"
}
```

---

## Deploy local (opcional)

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
export BACKEND_ORIGIN="https://..."
export CLOUDFLARE_ZONE_ID="..."   # opcional

./scripts/deploy-cloudflare.sh
```
