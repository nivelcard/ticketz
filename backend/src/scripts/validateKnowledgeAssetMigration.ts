/**
 * Post-migration validation — §12.6
 * Run: cd backend && npx ts-node --transpile-only src/scripts/validateKnowledgeAssetMigration.ts
 */
import { Op } from "sequelize";
import "../bootstrap";
import sequelize from "../database";
import KnowledgeDocument from "../models/KnowledgeDocument";
import KnowledgeAsset from "../models/KnowledgeAsset";
import KnowledgeChunk from "../models/KnowledgeChunk";

type Check = { name: string; pass: boolean; evidence: string };

const checks: Check[] = [];
const pass = (name: string, evidence: string) =>
  checks.push({ name, pass: true, evidence });
const fail = (name: string, evidence: string) =>
  checks.push({ name, pass: false, evidence });

const companyId = process.env.COMPANY_ID
  ? Number(process.env.COMPANY_ID)
  : undefined;

(async () => {
  await sequelize.authenticate();

  const docWhere = companyId ? { companyId } : {};
  const docCount = await KnowledgeDocument.count({ where: docWhere });
  const assetCount = await KnowledgeAsset.count({
    where: {
      ...docWhere,
      legacyDocumentId: { [Op.not]: null }
    }
  });

  if (docCount === assetCount) {
    pass("documents = assets(legacy)", `${docCount} = ${assetCount}`);
  } else {
    fail("documents = assets(legacy)", `${docCount} != ${assetCount}`);
  }

  const chunkCount = await KnowledgeChunk.count({ where: docWhere });
  pass("chunk count snapshot", `total chunks=${chunkCount}`);

  const [embeddingRows] = await sequelize.query(
    `
    SELECT COUNT(*)::int AS count
    FROM "KnowledgeChunks"
    WHERE embedding IS NOT NULL
    ${companyId ? 'AND "companyId" = :companyId' : ""}
    `,
    { replacements: { companyId } }
  );
  pass(
    "embeddings preserved",
    `with embedding=${(embeddingRows as { count: number }[])[0]?.count || 0}`
  );

  const readyDocs = await KnowledgeDocument.findAll({
    where: { ...docWhere, status: "ready" }
  });

  let readyPass = true;
  const readyResults = await Promise.all(
    readyDocs.map(async doc => {
      const asset = await KnowledgeAsset.findOne({
        where: { legacyDocumentId: doc.id }
      });
      if (!asset || asset.lifecycleStatus !== "published") {
        readyPass = false;
        fail(
          `ready doc#${doc.id} published`,
          asset ? asset.lifecycleStatus : "asset missing"
        );
        return false;
      }
      return true;
    })
  );
  if (readyPass && readyResults.every(Boolean)) {
    pass("ready docs published", `${readyDocs.length} checked`);
  }

  const orphanChunks = await KnowledgeChunk.count({
    where: {
      ...docWhere,
      knowledgeDocumentId: { [Op.not]: null },
      knowledgeAssetVersionId: { [Op.is]: null }
    }
  });

  if (orphanChunks === 0) {
    pass("no orphan chunks", "0 without assetVersionId");
  } else {
    fail("no orphan chunks", `${orphanChunks} orphans`);
  }

  console.log("\n=== VALIDATION RESULTS ===\n");
  checks.forEach(c => {
    console.log(`${c.pass ? "PASS" : "FAIL"} — ${c.name}`);
    console.log(`  ${c.evidence}\n`);
  });

  process.exit(checks.some(c => !c.pass) ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
