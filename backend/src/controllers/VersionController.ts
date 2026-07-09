import { Request, Response } from "express";
import GetPublicSettingService from "../services/SettingServices/GetPublicSettingService";
import { getBuildInfo } from "../helpers/buildInfo";

export const versionPublic = (_req: Request, res: Response): Response => {
  return res.status(200).json({
    name: "Ticketz - Chat Based Ticket System",
    ...getBuildInfo()
  });
};

export const version = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const appName = await GetPublicSettingService({ key: "appName" });

  const data = {
    name: appName || "Ticketz - Chat Based Ticket System",
    ...getBuildInfo()
  };

  return res.status(200).json(data);
};
