import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { logger } from "../../utils/logger";

const ACTIVE_STATUSES = ["CONNECTED", "PENDING", "OPENING", "qrcode"];

export const runWhatsAppSessionWatchdog = async (): Promise<void> => {
  const whatsapps = await Whatsapp.findAll({
    where: {
      status: {
        [Op.in]: ACTIVE_STATUSES
      }
    }
  });

  await Promise.all(
    whatsapps.map(async whatsapp => {
      try {
        getWbot(whatsapp.id);
      } catch {
        logger.warn(
          { whatsappId: whatsapp.id, status: whatsapp.status },
          "WhatsApp session missing in memory — restarting"
        );

        try {
          await StartWhatsAppSession(whatsapp, whatsapp.companyId, true);
        } catch (error) {
          logger.error(
            { error, whatsappId: whatsapp.id },
            "WhatsApp watchdog failed to restart session"
          );
        }
      }
    })
  );
};
