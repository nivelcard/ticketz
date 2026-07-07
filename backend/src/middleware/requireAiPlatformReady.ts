import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import {
  getMigrationsPending,
  isAiFeaturesEnabled
} from "../services/AiServices/AiPlatformState";

export const requireAiPlatformReady = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const pending = getMigrationsPending();
  if (pending.length) {
    throw new AppError(
      `Database migrations pending (${pending.length}). Update the database before using AI features.`,
      503
    );
  }

  if (!isAiFeaturesEnabled()) {
    throw new AppError(
      "AI platform is not ready. Check Administration → IA → Diagnóstico.",
      503
    );
  }

  next();
};
