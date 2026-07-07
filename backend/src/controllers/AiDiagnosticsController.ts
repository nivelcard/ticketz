import { Request, Response } from "express";
import {
  runCompanyDiagnostics,
  runGlobalDiagnostics
} from "../services/AiServices/AiDiagnosticsService";
import {
  getCompanyDiagnostics,
  getLastGlobalDiagnostics,
  setCompanyDiagnostics,
  setPlatformBootstrap,
  updateAiFeaturesEnabled,
  updateMigrationsPending
} from "../services/AiServices/AiPlatformState";
import { getPendingMigrations } from "../services/MigrationServices/MigrationService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const cached = getCompanyDiagnostics(companyId);

  if (cached) {
    return res.json(cached);
  }

  const diagnostics = await runCompanyDiagnostics(companyId, { live: false });
  setCompanyDiagnostics(companyId, diagnostics);
  return res.json(diagnostics);
};

export const run = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const globalDiagnostics = await runGlobalDiagnostics();
  const pending = await getPendingMigrations();
  const companyDiagnostics = await runCompanyDiagnostics(companyId, {
    live: true
  });

  const aiFeaturesEnabled =
    pending.length === 0 &&
    globalDiagnostics.items.find(item => item.key === "ai_tables")?.status ===
      "ok";

  setPlatformBootstrap({
    migrationsPending: pending,
    autoMigrateEnabled: process.env.AUTO_MIGRATE === "true",
    aiFeaturesEnabled,
    globalDiagnostics
  });
  setCompanyDiagnostics(companyId, companyDiagnostics);
  updateMigrationsPending(pending);
  updateAiFeaturesEnabled(aiFeaturesEnabled);

  return res.json({
    global: globalDiagnostics,
    company: companyDiagnostics,
    cachedGlobal: getLastGlobalDiagnostics()
  });
};
