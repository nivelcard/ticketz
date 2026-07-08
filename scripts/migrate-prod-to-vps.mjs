#!/usr/bin/env node
/**
 * Migra api.fortmax.com.br (produção) para VPS Contabo.
 * Remove rota Worker e aponta DNS A → VPS.
 */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "fortmax.com.br";
const VPS_IP = process.env.VPS_IP || "31.220.103.226";
const API_HOST = "api.fortmax.com.br";

if (!CF_TOKEN) {
  console.error("❌ CLOUDFLARE_API_TOKEN obrigatório");
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

async function getZoneId() {
  const res = await cf(
    `https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}`
  );
  if (!res.data?.success || !res.data.result?.length) {
    throw new Error(`Zone não encontrada: ${ZONE_NAME}`);
  }
  return res.data.result[0].id;
}

async function removeWorkerRoutes(zoneId) {
  const res = await cf(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`
  );
  if (!res.data?.success) {
    console.warn("⚠️  Não foi possível listar rotas Worker:", res.data);
    return;
  }
  const routes = (res.data.result || []).filter(
    r => r.pattern?.includes("api.fortmax.com.br")
  );
  for (const route of routes) {
    const del = await cf(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes/${route.id}`,
      { method: "DELETE" }
    );
    if (del.data?.success) {
      console.log(`✅ Rota Worker removida: ${route.pattern}`);
    } else {
      console.warn(`⚠️  Falha ao remover ${route.pattern}:`, del.data);
    }
  }
  if (!routes.length) console.log("ℹ️  Nenhuma rota Worker api.fortmax encontrada");
}

async function ensureProdDns(zoneId) {
  const list = await cf(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${API_HOST}`
  );
  if (!list.data?.success) throw new Error(JSON.stringify(list.data));

  const desired = {
    type: "A",
    name: "api",
    content: VPS_IP,
    proxied: true,
    comment: "Ticketz produção VPS Contabo"
  };

  const existing = (list.data.result || []).find(r => r.name === API_HOST);
  if (existing) {
    const updated = await cf(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existing.id}`,
      { method: "PATCH", body: JSON.stringify(desired) }
    );
    if (!updated.data?.success) throw new Error(JSON.stringify(updated.data));
    console.log(`✅ DNS atualizado: ${API_HOST} → ${VPS_IP}`);
    return;
  }

  const created = await cf(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    { method: "POST", body: JSON.stringify(desired) }
  );
  if (!created.data?.success) throw new Error(JSON.stringify(created.data));
  console.log(`✅ DNS criado: ${API_HOST} → ${VPS_IP}`);
}

async function ensureSslFull(zoneId) {
  const res = await cf(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/ssl`,
    { method: "PATCH", body: JSON.stringify({ value: "full" }) }
  );
  if (res.data?.success) console.log("✅ SSL mode: Full");
}

async function purgeCache(zoneId) {
  await cf(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ purge_everything: true })
  });
  console.log("✅ Cache purgado");
}

async function main() {
  const zoneId = await getZoneId();
  console.log(`Zone ${ZONE_NAME}: ${zoneId}`);
  await removeWorkerRoutes(zoneId);
  await ensureProdDns(zoneId);
  await ensureSslFull(zoneId);
  await purgeCache(zoneId);
  console.log(`\n🎯 Produção apontada para VPS: https://${API_HOST}/health`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
