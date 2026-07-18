import { GetCompanySetting } from "../../../helpers/CheckSettings";

export const isGlobalToolsEnabled = (): boolean =>
  ["true", "1", "yes", "enabled"].includes(
    String(process.env.AI_TOOLS_ENABLED || "")
      .trim()
      .toLowerCase()
  );

export const isToolsEnabledForCompany = async (
  companyId: number
): Promise<boolean> => {
  if (!isGlobalToolsEnabled()) {
    return false;
  }

  const companyFlag = await GetCompanySetting(
    companyId,
    "aiToolsEnabled",
    "disabled"
  );

  return String(companyFlag).trim().toLowerCase() === "enabled";
};

export const getToolsStatus = async (
  companyId: number
): Promise<{ global: boolean; company: boolean; active: boolean }> => {
  const global = isGlobalToolsEnabled();
  const company = global
    ? (await GetCompanySetting(companyId, "aiToolsEnabled", "disabled")) ===
      "enabled"
    : false;

  return { global, company, active: global && company };
};
