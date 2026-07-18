import { GetCompanySetting } from "../../../helpers/CheckSettings";

export const isGlobalKbCmsEnabled = (): boolean =>
  ["true", "1", "yes", "enabled"].includes(
    String(process.env.AI_KB_CMS_ENABLED || "")
      .trim()
      .toLowerCase()
  );

export const isKbCmsEnabledForCompany = async (
  companyId: number
): Promise<boolean> => {
  if (!isGlobalKbCmsEnabled()) {
    return false;
  }

  const companyFlag = await GetCompanySetting(
    companyId,
    "aiKbCmsEnabled",
    "disabled"
  );

  return String(companyFlag).trim().toLowerCase() === "enabled";
};
