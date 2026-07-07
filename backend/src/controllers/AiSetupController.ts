import { Request, Response } from "express";
import {
  createDemoEnvironment,
  getSetupStatus
} from "../services/AiServices/AiSetupService";

export const status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const setup = await getSetupStatus(companyId);
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
