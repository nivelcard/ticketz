"use strict";
/**
 * Garante que conexões WhatsApp com credenciais salvas sejam reabertas após restart.
 * NÃO apaga BaileysKeys (diferente de reset-whatsapp-session.js).
 */
require("../dist/bootstrap");
require("../dist/database");

const Whatsapp = require("../dist/models/Whatsapp").default;
const BaileysKeys = require("../dist/models/BaileysKeys").default;

const run = async () => {
  const whatsapps = await Whatsapp.findAll();
  const report = [];

  for (const whatsapp of whatsapps) {
    const keyCount = await BaileysKeys.count({
      where: { whatsappId: whatsapp.id }
    });

    const entry = {
      id: whatsapp.id,
      name: whatsapp.name,
      status: whatsapp.status,
      keyCount,
      action: "none"
    };

    if (keyCount === 0) {
      if (whatsapp.status === "CONNECTED") {
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        entry.action = "marked_disconnected_no_keys";
        entry.status = "DISCONNECTED";
      }
      report.push(entry);
      continue;
    }

    if (whatsapp.status === "qrcode" && whatsapp.qrcode) {
      entry.action = "awaiting_qr_scan";
      report.push(entry);
      continue;
    }

    if (!["CONNECTED", "OPENING", "PENDING"].includes(whatsapp.status)) {
      await whatsapp.update({ status: "OPENING", qrcode: "" });
      entry.action = "marked_opening";
      entry.status = "OPENING";
    } else {
      entry.action = "already_active_or_opening";
    }

    report.push(entry);
  }

  console.log(JSON.stringify({ ok: true, whatsapps: report }));
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
