#!/usr/bin/env node
/**
 * Verifica presença de settings B2 e uso de storage nas conversas.
 * Não imprime valores de secrets — apenas CONFIGURED / EMPTY.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env-backend-supabase");

const parseEnv = (content) => {
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
};

const env = parseEnv(fs.readFileSync(envPath, "utf8"));

const client = new pg.Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  ssl:
    env.DB_SSL === "true"
      ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED === "true" }
      : false
});

const STORAGE_KEYS = [
  "storageProvider",
  "b2ApplicationKeyId",
  "b2ApplicationKey",
  "b2Bucket",
  "b2Endpoint",
  "b2PublicUrl",
  "B2_APPLICATION_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
  "B2_PUBLIC_URL",
  "B2_KEY_ID"
];

const statusOf = (value) =>
  value && String(value).trim() ? "CONFIGURED" : "EMPTY";

try {
  await client.connect();
  await client.query(`SET search_path TO ${env.DB_SCHEMA || "ticketz"}`);

  const settings = await client.query(
    `SELECT key, value FROM "Settings" WHERE "companyId" = 1 ORDER BY key`
  );

  const byKey = Object.fromEntries(
    settings.rows.map((row) => [row.key, row.value])
  );

  console.log("=== B2 / Storage (companyId=1) ===");
  for (const key of STORAGE_KEYS) {
    if (key in byKey) {
      console.log(`${key}: ${statusOf(byKey[key])}`);
    }
  }

  const related = settings.rows.filter((row) =>
    /b2|blaze|bucket|storage|s3/i.test(row.key)
  );
  if (related.length) {
    console.log("\n=== Chaves relacionadas encontradas ===");
    for (const row of related) {
      console.log(`${row.key}: ${statusOf(row.value)}`);
    }
  } else {
    console.log("\nNenhuma chave B2/storage encontrada em Settings.");
  }

  const required = [
    "b2ApplicationKeyId",
    "b2ApplicationKey",
    "b2Bucket",
    "b2Endpoint"
  ];
  const aliases = {
    b2ApplicationKeyId: [
      "b2ApplicationKeyId",
      "B2_APPLICATION_KEY_ID",
      "B2_KEY_ID"
    ],
    b2ApplicationKey: ["b2ApplicationKey", "B2_APPLICATION_KEY"],
    b2Bucket: ["b2Bucket", "B2_BUCKET", "B2_BUCKET_NAME"],
    b2Endpoint: ["b2Endpoint", "B2_ENDPOINT"],
    b2PublicUrl: ["b2PublicUrl", "B2_PUBLIC_URL"]
  };

  const resolved = {};
  for (const [canonical, keys] of Object.entries(aliases)) {
    resolved[canonical] = keys.some((k) => statusOf(byKey[k]) === "CONFIGURED")
      ? "CONFIGURED"
      : "EMPTY";
  }

  console.log("\n=== Resolução (aliases) ===");
  for (const [k, v] of Object.entries(resolved)) {
    console.log(`${k}: ${v}`);
  }

  const b2Ready =
    resolved.b2ApplicationKeyId === "CONFIGURED" &&
    resolved.b2ApplicationKey === "CONFIGURED" &&
    resolved.b2Bucket === "CONFIGURED" &&
    resolved.b2Endpoint === "CONFIGURED";

  console.log(`\nB2 pronto para uso: ${b2Ready ? "SIM" : "NAO"}`);

  const mediaFiles = await client.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE "storageProvider" = 'backblaze')::int AS backblaze,
           COUNT(*) FILTER (WHERE "storageProvider" = 'local')::int AS local
    FROM "MessageMediaFiles"
  `).catch(() => ({ rows: [{ total: null, backblaze: null, local: null, error: "tabela ausente" }] }));

  console.log("\n=== MessageMediaFiles (IA) ===");
  console.log(JSON.stringify(mediaFiles.rows[0], null, 2));

  const messagesWithMedia = await client.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE "mediaUrl" LIKE 'suporte/%')::int AS suporte_prefix,
           COUNT(*) FILTER (WHERE "mediaUrl" LIKE 'media/%')::int AS local_media_prefix
    FROM "Messages"
    WHERE "mediaUrl" IS NOT NULL AND "mediaUrl" != ''
  `);

  console.log("\n=== Messages com mídia (conversas WhatsApp) ===");
  console.log(JSON.stringify(messagesWithMedia.rows[0], null, 2));

  const sample = await client.query(`
    SELECT id, "mediaType", LEFT("mediaUrl", 80) AS media_url_preview, "createdAt"
    FROM "Messages"
    WHERE "mediaUrl" IS NOT NULL AND "mediaUrl" != ''
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  console.log("\n=== Últimas 5 mídias em Messages ===");
  for (const row of sample.rows) {
    console.log(
      `#${row.id} ${row.mediaType || "?"} | ${row.media_url_preview} | ${row.createdAt}`
    );
  }
} catch (error) {
  console.error("Erro:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
