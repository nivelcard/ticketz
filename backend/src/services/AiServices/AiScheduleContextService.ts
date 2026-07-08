import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";
import { GetCompanySetting } from "../../helpers/CheckSettings";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";

export type AiScheduleContext = {
  scheduleEnabled: boolean;
  inBusinessHours: boolean;
  officialNotice: string | null;
};

export const getAiScheduleContext = async (
  ticket: Ticket
): Promise<AiScheduleContext> => {
  const scheduleType = await GetCompanySetting(
    ticket.companyId,
    "scheduleType",
    "disabled"
  );

  if (!scheduleType || scheduleType === "disabled") {
    return {
      scheduleEnabled: false,
      inBusinessHours: true,
      officialNotice: null
    };
  }

  let inBusinessHours = true;
  let officialNotice: string | null = null;

  if (scheduleType === "company") {
    const schedule = await VerifyCurrentSchedule(ticket.companyId);
    inBusinessHours = Boolean(schedule?.inActivity);

    const whatsapp =
      ticket.whatsapp ||
      (ticket.whatsappId
        ? await Whatsapp.findByPk(ticket.whatsappId, {
            attributes: ["outOfHoursMessage"]
          })
        : null);

    officialNotice = whatsapp?.outOfHoursMessage?.trim() || null;
  } else if (scheduleType === "queue") {
    if (ticket.queueId) {
      const schedule = await VerifyCurrentSchedule(
        ticket.companyId,
        ticket.queueId
      );
      inBusinessHours = Boolean(schedule?.inActivity);

      const queue =
        ticket.queue ||
        (await Queue.findByPk(ticket.queueId, {
          attributes: ["outOfHoursMessage"]
        }));

      officialNotice = queue?.outOfHoursMessage?.trim() || null;
    } else {
      const schedule = await VerifyCurrentSchedule(ticket.companyId);
      inBusinessHours = Boolean(schedule?.inActivity);

      const whatsapp =
        ticket.whatsapp ||
        (ticket.whatsappId
          ? await Whatsapp.findByPk(ticket.whatsappId, {
              attributes: ["outOfHoursMessage"]
            })
          : null);

      officialNotice = whatsapp?.outOfHoursMessage?.trim() || null;
    }
  }

  return {
    scheduleEnabled: true,
    inBusinessHours,
    officialNotice
  };
};

export const buildAiSchedulePromptBlock = (
  context: AiScheduleContext
): string => {
  if (!context.scheduleEnabled) {
    return "";
  }

  const lines = ["Informações de horário de atendimento humano:"];

  if (context.officialNotice) {
    lines.push(
      `Mensagem oficial configurada no sistema: "${context.officialNotice}"`
    );
  }

  lines.push(
    context.inBusinessHours
      ? "Situação atual: dentro do horário de atendimento humano."
      : "Situação atual: FORA do horário de atendimento humano."
  );

  if (!context.inBusinessHours) {
    lines.push(
      "Mesmo fora do horário, tente ajudar o cliente com orientações objetivas.",
      "Sempre reforce educadamente o horário oficial usando a mensagem configurada acima (pode adaptar a redação, mas não invente outro horário).",
      "Não envie apenas a mensagem automática; responda de forma natural e útil ao que o cliente perguntou."
    );
  }

  return lines.join("\n");
};
