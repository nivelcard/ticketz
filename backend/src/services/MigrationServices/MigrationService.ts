import fs from "fs";
import path from "path";
import { Sequelize } from "sequelize";
import sequelize from "../../database";
import { logger } from "../../utils/logger";

const getMigrationsDir = (): string => {
  const candidates = [
    path.join(__dirname, "../../database/migrations"),
    path.join(__dirname, "../../../src/database/migrations")
  ];

  const found = candidates.find(dir => fs.existsSync(dir));
  if (!found) {
    throw new Error("Migrations directory not found");
  }

  return found;
};

const getSchema = (): string => process.env.DB_SCHEMA || "ticketz";

const listMigrationFiles = (): string[] => {
  const dir = getMigrationsDir();
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith(".js") || file.endsWith(".ts"))
    .sort();
};

const normalizeMigrationName = (name: string): string =>
  name.replace(/\.(js|ts)$/, "");

const getExecutedMigrations = async (): Promise<Set<string>> => {
  const schema = getSchema();

  try {
    const [rows] = await sequelize.query(
      `SELECT name FROM "${schema}"."SequelizeMeta" ORDER BY name`
    );

    return new Set(
      (rows as { name: string }[]).map(row => normalizeMigrationName(row.name))
    );
  } catch (error) {
    logger.warn(
      { error },
      "SequelizeMeta table not found — treating all migrations as pending"
    );
    return new Set();
  }
};

export const getPendingMigrations = async (): Promise<string[]> => {
  const executed = await getExecutedMigrations();
  return listMigrationFiles()
    .map(file => normalizeMigrationName(file))
    .filter(name => !executed.has(name));
};

export const runPendingMigrations = async (): Promise<string[]> => {
  const dir = getMigrationsDir();
  const schema = getSchema();
  const pending = await getPendingMigrations();
  const applied: string[] = [];

  if (!pending.length) {
    return applied;
  }

  const queryInterface = sequelize.getQueryInterface();

  for (let i = 0; i < pending.length; i += 1) {
    const name = pending[i];
    const jsFile = `${name}.js`;
    const tsFile = `${name}.ts`;
    const filePath = fs.existsSync(path.join(dir, jsFile))
      ? path.join(dir, jsFile)
      : path.join(dir, tsFile);
    const storageName = path.basename(filePath);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const migration = require(filePath);
    const runUp = migration.default?.up || migration.up;

    if (typeof runUp !== "function") {
      throw new Error(`Migration ${name} does not export an up() function`);
    }

    await runUp(queryInterface, Sequelize);
    await sequelize.query(
      `INSERT INTO "${schema}"."SequelizeMeta" (name) VALUES (:name)`,
      {
        replacements: { name: storageName }
      }
    );

    applied.push(name);
    logger.info({ migration: name }, "Migration applied");
  }

  return applied;
};

export const initializeMigrations = async (): Promise<{
  pending: string[];
  applied: string[];
  autoMigrateEnabled: boolean;
}> => {
  const autoMigrateEnabled = process.env.AUTO_MIGRATE === "true";
  let pending = await getPendingMigrations();
  let applied: string[] = [];

  if (pending.length && autoMigrateEnabled) {
    logger.warn(
      { count: pending.length },
      "AUTO_MIGRATE=true — applying pending migrations"
    );
    applied = await runPendingMigrations();
    pending = await getPendingMigrations();
  } else if (pending.length) {
    logger.error(
      { pending },
      "Pending database migrations detected — AI features disabled until migrations run. Set AUTO_MIGRATE=true to apply automatically on startup."
    );
  }

  return { pending, applied, autoMigrateEnabled };
};
