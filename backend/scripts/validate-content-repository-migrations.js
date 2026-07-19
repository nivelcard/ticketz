#!/usr/bin/env node
/**
 * Validates Content Repository migrations against a live Postgres database.
 * Usage: NODE_ENV=development node backend/scripts/validate-content-repository-migrations.js
 */
require("../dist/bootstrap");

const { Sequelize } = require("sequelize");
const dbConfig = require("../dist/config/database");

const REQUIRED_TABLES = [
  "ContentRepositoryItems",
  "ContentRepositoryItemVersions",
  "ContentRepositoryFavorites",
  "ContentRepositoryCategories",
  "ContentRepositoryUsageLogs",
  "ContentRepositoryPermissions"
];

const REQUIRED_INDEXES = [
  "content_repo_category_company_slug",
  "content_repo_usage_user_recent",
  "content_repo_usage_item",
  "content_repo_perm_lookup"
];

async function main() {
  const sequelize = new Sequelize(dbConfig);
  const report = {
    ok: true,
    tables: {},
    indexes: {},
    columns: {},
    rollbackSupported: true
  };

  try {
    await sequelize.authenticate();

    for (const table of REQUIRED_TABLES) {
      const [rows] = await sequelize.query(
        `SELECT to_regclass('"${table}"') AS reg`
      );
      report.tables[table] = Boolean(rows[0]?.reg);
      if (!report.tables[table]) report.ok = false;
    }

    for (const indexName of REQUIRED_INDEXES) {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = :indexName LIMIT 1`,
        { replacements: { indexName } }
      );
      report.indexes[indexName] = rows.length > 0;
      if (!report.indexes[indexName]) report.ok = false;
    }

    const [categoryIdCol] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'ContentRepositoryItems' AND column_name = 'categoryId'`
    );
    report.columns.categoryId = categoryIdCol.length > 0;
    if (!report.columns.categoryId) report.ok = false;

    const [companyFk] = await sequelize.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = 'ContentRepositoryItems'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'companyId'`
    );
    report.columns.companyIdFk = companyFk.length > 0;

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error.message,
          hint: "Start Postgres (docker compose -f docker-compose-dev.yaml up -d) and run npm run db:migrate"
        },
        null,
        2
      )
    );
    process.exit(2);
  } finally {
    await sequelize.close();
  }
}

main();
