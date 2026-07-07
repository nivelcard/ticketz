#!/usr/bin/env node
/**
 * Provisiona DNS + custom domain do Worker API Ticketz Fortmax.
 * Padrão Nível Cashback / WebG3 / Cortex (api.*.fortmax.com.br).
 *
 * Uso:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
 *   CLOUDFLARE_ZONE_ID=... API_HOST=api.fortmax.com.br \
 *   WORKER_NAME=fortmax-ticketz-api \
 *   node scripts/setup-cloudflare-api.mjs
 */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_HOST = process.env.API_HOST || "api.fortmax.com.br";
const WORKER_NAME = process.env.WORKER_NAME || "fortmax-ticketz-api";
const API_SUBDOMAIN = API_HOST.split(".")[0];

const missing = [];
if (!CF_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
if (!ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

const ACCOUNT_API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`;
const ZONE_API = ZONE_ID
  ? `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}`
  : null;

async function cf(url, init = {}) {
  const res = await fetch(url, {
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

async function ensureDnsRecord() {
  if (!ZONE_API) {
    console.log("⚠️  CLOUDFLARE_ZONE_ID ausente — DNS manual necessário.");
    return;
  }

  const list = await cf(`${ZONE_API}/dns_records?name=${API_HOST}`);
  if (!list.data?.success) throw new Error(`list dns failed: ${JSON.stringify(list.data)}`);

  const existing = (list.data.result || []).find(r => r.name === API_HOST);
  const desired = {
    type: "AAAA",
    name: API_SUBDOMAIN,
    content: "100::",
    proxied: true,
    comment: "Ticketz Fortmax API (Cloudflare Worker)"
  };

  if (existing) {
    if (existing.type === "AAAA" && existing.content === "100::" && existing.proxied) {
      console.log(`✅ DNS já configurado: ${API_HOST}`);
      return;
    }

    const updated = await cf(`${ZONE_API}/dns_records/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(desired)
    });
    if (!updated.data?.success) throw new Error(`update dns failed: ${JSON.stringify(updated.data)}`);
    console.log(`✅ DNS atualizado: ${API_HOST} → 100:: (proxied)`);
    return;
  }

  const created = await cf(`${ZONE_API}/dns_records`, {
    method: "POST",
    body: JSON.stringify(desired)
  });
  if (!created.data?.success) throw new Error(`create dns failed: ${JSON.stringify(created.data)}`);
  console.log(`✅ DNS criado: ${API_HOST} → 100:: (proxied)`);
}

async function ensureWorkerCustomDomain() {
  const list = await cf(`${ACCOUNT_API}/workers/domains`);
  if (!list.data?.success) {
    console.log(`⚠️  workers/domains list failed (${list.status}) — rota via wrangler.toml`);
    return;
  }

  const exists = (list.data.result || []).some(
    d => d.hostname === API_HOST && d.service === WORKER_NAME
  );
  if (exists) {
    console.log(`✅ Custom domain Worker já configurado: ${API_HOST}`);
    return;
  }

  const created = await cf(`${ACCOUNT_API}/workers/domains`, {
    method: "POST",
    body: JSON.stringify({
      hostname: API_HOST,
      service: WORKER_NAME,
      environment: "production"
    })
  });

  if (!created.data?.success) {
    const msg = JSON.stringify(created.data);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log(`✅ Custom domain Worker já existe: ${API_HOST}`);
      return;
    }
    console.log(`⚠️  custom domain create failed: ${msg}`);
    console.log("   O deploy wrangler com routes no wrangler.toml deve registrar a rota.");
    return;
  }

  console.log(`✅ Custom domain Worker criado: ${API_HOST} → ${WORKER_NAME}`);
}

async function main() {
  console.log("→ Provisionando Cloudflare Worker API (Ticketz Fortmax)...");
  await ensureDnsRecord();
  await ensureWorkerCustomDomain();
  console.log(`\n🎯 API pronta: https://${API_HOST}`);
  console.log(`   Worker: ${WORKER_NAME}`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
