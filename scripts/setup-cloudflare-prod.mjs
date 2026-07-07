#!/usr/bin/env node
/**
 * Provisiona Cloudflare Pages para Ticketz Fortmax via API oficial.
 * Padrão Nível Cashback / WebG3 / Cortex.
 *
 * Uso:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
 *   CLOUDFLARE_ZONE_ID=... BACKEND_ORIGIN=https://api.fortmax.com.br \
 *   node scripts/setup-cloudflare-prod.mjs
 */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "https://api.fortmax.com.br";
const PROJECT = process.env.CF_PROJECT_NAME || "fortmax-ticketz-prod";
const DOMAIN = process.env.FRONTEND_HOST || "suporte.fortmax.com.br";
const PROD_BRANCH = process.env.CF_BRANCH || "main";

const missing = [];
if (!CF_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
if (!ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`;

async function cf(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function ensureProject() {
  const list = await cf("/pages/projects");
  if (!list.data?.success) throw new Error(`list projects failed: ${JSON.stringify(list.data)}`);

  const exists = (list.data.result || []).some(p => p.name === PROJECT);
  if (exists) {
    console.log(`✅ Projeto Pages já existe: ${PROJECT}`);
    return;
  }

  const created = await cf("/pages/projects", {
    method: "POST",
    body: JSON.stringify({
      name: PROJECT,
      production_branch: PROD_BRANCH,
      build_config: { build_command: "", destination_dir: "", root_dir: "" }
    })
  });

  if (!created.data?.success) {
    throw new Error(`create project failed: ${JSON.stringify(created.data)}`);
  }
  console.log(`✅ Projeto Pages criado: ${PROJECT}`);
}

async function ensureEnvVars() {
  const detail = await cf(`/pages/projects/${PROJECT}`);
  if (!detail.data?.success) throw new Error(`get project failed: ${JSON.stringify(detail.data)}`);

  const current = detail.data.result?.deployment_configs || {};
  const envVar = (value) => ({ value, type: "plain_text" });

  const deployment_configs = {
    production: {
      ...(current.production || {}),
      env_vars: {
        ...((current.production || {}).env_vars || {}),
        BACKEND_ORIGIN: envVar(BACKEND_ORIGIN)
      },
      compatibility_date: "2024-11-01",
      compatibility_flags: []
    },
    preview: {
      ...(current.preview || {}),
      env_vars: {
        ...((current.preview || {}).env_vars || {}),
        BACKEND_ORIGIN: envVar(BACKEND_ORIGIN)
      },
      compatibility_date: "2024-11-01",
      compatibility_flags: []
    }
  };

  const updated = await cf(`/pages/projects/${PROJECT}`, {
    method: "PATCH",
    body: JSON.stringify({ deployment_configs })
  });

  if (!updated.data?.success) {
    throw new Error(`set env vars failed: ${JSON.stringify(updated.data)}`);
  }
  console.log(`✅ BACKEND_ORIGIN configurado: ${BACKEND_ORIGIN}`);
}

async function ensureDomain() {
  const domains = await cf(`/pages/projects/${PROJECT}/domains`);
  if (!domains.data?.success) throw new Error(`list domains failed: ${JSON.stringify(domains.data)}`);

  const exists = (domains.data.result || []).some(d => d.name === DOMAIN);
  if (exists) {
    console.log(`✅ Domínio já configurado: ${DOMAIN}`);
    return;
  }

  const added = await cf(`/pages/projects/${PROJECT}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: DOMAIN })
  });

  if (!added.data?.success) {
    throw new Error(`add domain failed: ${JSON.stringify(added.data)}`);
  }
  console.log(`✅ Domínio adicionado: ${DOMAIN}`);
}

async function purgeZoneCache() {
  if (!ZONE_ID) {
    console.log("⚠️  CLOUDFLARE_ZONE_ID ausente — purge ignorado.");
    return;
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ purge_everything: true })
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(`purge failed: ${JSON.stringify(data)}`);
  console.log("✅ Cache da zona purgado");
}

async function main() {
  console.log("→ Provisionando Cloudflare Pages (Ticketz Fortmax)...");
  await ensureProject();
  await ensureEnvVars();
  await ensureDomain();
  await purgeZoneCache();
  console.log(`\n🎯 Infra pronta: https://${DOMAIN}`);
  console.log(`   Projeto: ${PROJECT}`);
  console.log(`   Proxy: ${BACKEND_ORIGIN}`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
