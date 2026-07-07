import { initializeMigrations } from "../MigrationServices/MigrationService";
import {
  runGlobalDiagnostics,
  logDiagnosticsSummary
} from "./AiDiagnosticsService";
import {
  setPlatformBootstrap,
  updateAiFeaturesEnabled,
  updateMigrationsPending
} from "./AiPlatformState";
import { logger } from "../../utils/logger";

export const bootstrapAiPlatform = async (): Promise<void> => {
  try {
    const migrationState = await initializeMigrations();
    const globalDiagnostics = await runGlobalDiagnostics();

    const aiFeaturesEnabled =
      migrationState.pending.length === 0 &&
      globalDiagnostics.items.find(item => item.key === "ai_tables")?.status ===
        "ok" &&
      globalDiagnostics.items.find(item => item.key === "database")?.status ===
        "ok";

    setPlatformBootstrap({
      migrationsPending: migrationState.pending,
      autoMigrateEnabled: migrationState.autoMigrateEnabled,
      aiFeaturesEnabled,
      globalDiagnostics
    });

    updateMigrationsPending(migrationState.pending);
    updateAiFeaturesEnabled(aiFeaturesEnabled);

    logDiagnosticsSummary(globalDiagnostics);

    if (migrationState.applied.length) {
      logger.info(
        { applied: migrationState.applied },
        "Database migrations applied on startup"
      );
    }
  } catch (error) {
    logger.error({ error }, "AI platform bootstrap failed");
    updateAiFeaturesEnabled(false);
  }
};
