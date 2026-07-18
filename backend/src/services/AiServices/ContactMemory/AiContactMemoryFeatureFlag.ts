import { GetCompanySetting } from "../../../helpers/CheckSettings";

export const isGlobalContactMemoryEnabled = (): boolean =>
  ["true", "1", "yes", "enabled"].includes(
    String(process.env.AI_CONTACT_MEMORY_ENABLED || "")
      .trim()
      .toLowerCase()
  );

export const isContactMemoryEnabledForCompany = async (
  companyId: number
): Promise<boolean> => {
  if (!isGlobalContactMemoryEnabled()) {
    return false;
  }

  const companyFlag = await GetCompanySetting(
    companyId,
    "aiContactMemoryEnabled",
    "disabled"
  );

  return String(companyFlag).trim().toLowerCase() === "enabled";
};

export const getContactMemoryStatus = async (
  companyId: number
): Promise<{ global: boolean; company: boolean; active: boolean }> => {
  const global = isGlobalContactMemoryEnabled();
  const company = global
    ? (await GetCompanySetting(
        companyId,
        "aiContactMemoryEnabled",
        "disabled"
      )) === "enabled"
    : false;

  return { global, company, active: global && company };
};
