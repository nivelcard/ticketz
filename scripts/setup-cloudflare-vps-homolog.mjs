#!/usr/bin/env node
/**
 * DNS de homologação Ticketz na VPS Contabo.
 * Cria api-homolog.fortmax.com.br → IP da VPS (proxied).
 * NÃO altera api.fortmax.com.br.
 *
 * Uso:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... \
 *   VPS_IP=31.220.103.226 \
 *   node scripts/setup-cloudflare-vps-homolog.mjs
 */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "fortmax.com.br";
const VPS_IP = process.env.VPS_IP || "31.220.103.226";
const API_HOST = process.env.API_HOMOLOG_HOST || "api-homolog.fortmax.com.br";
const API_SUBDOMAIN = API_HOST.split(".")[0];

if (!CF_TOKEN) {
  console.error("❌ CLOUDFLARE_API_TOKEN é obrigatório.");
  process.exit(1);
}

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

async function resolveZoneId() {
  if (ZONE_ID) return ZONE_ID;
  const res = await cf(`https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}`);
  if (!res.data?.success || !res.data.result?.length) {
    throw new Error(`zone not found: ${ZONE_NAME} — ${JSON.stringify(res.data)}`);
  }
  const id = res.data.result[0].id;
  console.log(`✅ Zone: ${ZONE_NAME} (${id})`);
  return id;
}

async function ensureDnsRecord(zoneId) {
  const zoneApi = `https://api.cloudflare.com/client/v4/zones/${zoneId}`;
  const list = await cf(`${zoneApi}/dns_records?name=${API_HOST}`);
  if (!list.data?.success) {
    throw new Error(`list dns failed: ${JSON.stringify(list.data)}`);
  }

  const existing = (list.data.result || []).find(r => r.name === API_HOST);
  const desired = {
    type: "A",
    name: API_SUBDOMAIN,
    content: VPS_IP,
    proxied: true,
    comment: "Ticketz homolog VPS Contabo (IIS proxy 443)"
  };

  if (existing) {
    const updated = await cf(`${zoneApi}/dns_records/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(desired)
    });
    if (!updated.data?.success) {
      throw new Error(`update dns failed: ${JSON.stringify(updated.data)}`);
    }
    console.log(`✅ DNS atualizado: ${API_HOST} → ${VPS_IP} (proxied)`);
    return;
  }

  const created = await cf(`${zoneApi}/dns_records`, {
    method: "POST",
    body: JSON.stringify(desired)
  });
  if (!created.data?.success) {
    throw new Error(`create dns failed: ${JSON.stringify(created.data)}`);
  }
  console.log(`✅ DNS criado: ${API_HOST} → ${VPS_IP} (proxied)`);
}

async function ensureSslMode(zoneId) {
  const zoneApi = `https://api.cloudflare.com/client/v4/zones/${zoneId}`;
  const res = await cf(`${zoneApi}/settings/ssl`, {
    method: "PATCH",
    body: JSON.stringify({ value: "full" })
  });
  if (res.data?.success) {
    console.log("✅ SSL mode: Full (origem IIS :443)");
  } else {
    console.warn(
      "⚠️  SSL mode não alterado — defina Full manualmente no painel CF:",
      JSON.stringify(res.data)
    );
  }
}

async function main() {
  const zoneId = await resolveZoneId();
  console.log(`Provisionando homologação Ticketz: ${API_HOST} → ${VPS_IP}:443 (IIS proxy)`);
  await ensureDnsRecord(zoneId);
  await ensureSslMode(zoneId);
  console.log("\n✅ Homologação DNS pronta. Origem via IIS :443 (não expor :8080).");
  console.log(`   Teste: curl -fsS https://${API_HOST}/health`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
