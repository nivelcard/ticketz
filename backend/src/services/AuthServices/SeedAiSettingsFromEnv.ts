import Company from "../../models/Company";
import Setting from "../../models/Setting";
import { logger } from "../../utils/logger";

const upsertSetting = async (
  companyId: number,
  key: string,
  value: string
): Promise<void> => {
  const [setting] = await Setting.findOrCreate({
    where: { key, companyId },
    defaults: { key, value, companyId }
  });

  if (setting.value !== value) {
    await setting.update({ value });
  }
};

export const seedAiSettingsFromEnv = async (): Promise<void> => {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.openAiKey;

  if (!apiKey?.trim()) {
    logger.warn(
      "OPENAI_API_KEY not set — AI transcription and chat require the key in Settings or env"
    );
    return;
  }

  const provider = (process.env.AI_PROVIDER || "openai").trim();
  const baseUrl = (process.env.AI_BASE_URL || "").trim();
  const companies = await Company.findAll({ attributes: ["id"] });

  await Promise.all(
    companies.map(async company => {
      await upsertSetting(company.id, "openAiKey", apiKey.trim());
      await upsertSetting(company.id, "aiProvider", provider);
      await upsertSetting(company.id, "audioTranscriptions", "enabled");

      if (baseUrl) {
        await upsertSetting(company.id, "aiBaseUrl", baseUrl);
      }
    })
  );

  logger.info(
    { companies: companies.length, provider },
    "OpenAI settings synced from environment for all companies"
  );
};
