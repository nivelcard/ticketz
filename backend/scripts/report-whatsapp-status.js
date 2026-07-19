"use strict";
require("../dist/bootstrap");
require("../dist/database");

const Whatsapp = require("../dist/models/Whatsapp").default;
const BaileysKeys = require("../dist/models/BaileysKeys").default;

const run = async () => {
  const whatsapps = await Whatsapp.findAll();
  const rows = [];

  for (const whatsapp of whatsapps) {
    const keyCount = await BaileysKeys.count({
      where: { whatsappId: whatsapp.id }
    });
    rows.push({
      id: whatsapp.id,
      name: whatsapp.name,
      status: whatsapp.status,
      hasQr: Boolean(whatsapp.qrcode),
      keyCount
    });
  }

  console.log(JSON.stringify({ ok: true, whatsapps: rows }));
  process.exit(0);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
