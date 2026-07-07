import { Request, Response } from "express";
import {
  createDemoEnvironment,
  getSetupStatus
} from "../services/AiServices/AiSetupService";
import { safeAiQuery } from "../helpers/safeAiQuery";

const emptySetup = {
  showWizard: false,
  offerDemo: false,
  completedSteps: 0,
  totalSteps: 6,
  steps: [],
  demoAvailable: false
};

export const status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const setup = await safeAiQuery(() => getSetupStatus(companyId), emptySetup);
  return res.json(setup);
};

export const createDemo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const result = await createDemoEnvironment(companyId);
  const setup = await getSetupStatus(companyId);
  return res.status(201).json({ ...result, setup });
};
