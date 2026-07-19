import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";
import {
  StartWhatsAppSession,
  isWhatsAppSessionStarting
} from "./StartWhatsAppSession";

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await Whatsapp.findAll({ where: { companyId } });
    if (whatsapps.length > 0) {
      whatsapps.forEach(whatsapp => {
        if (whatsapp.channel !== "whatsapp") {
          return;
        }

        if (whatsapp.status === "qrcode" && whatsapp.qrcode) {
          return;
        }

        if (isWhatsAppSessionStarting(whatsapp.id)) {
          return;
        }

        try {
          getWbot(whatsapp.id);
          return;
        } catch {
          // not in memory — start below
        }

        StartWhatsAppSession(whatsapp, companyId);
      });
    }
  } catch (e) {
    logger.error(
      { message: e.message, stack: e.stack },
      "Error starting WhatsApp sessions"
    );
  }
};
