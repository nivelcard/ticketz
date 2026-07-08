#!/usr/bin/env node
/** Disable Cloudflare Worker cron/container to stop WhatsApp conflict. */

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const WORKER = process.env.CF_WORKER_NAME || "fortmax-ticketz-api";

if (!CF_TOKEN || !ACCOUNT_ID) {
  console.error("Need CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

async function cf(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  return res.json();
}

async function main() {
  const sched = await cf(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/schedules`
  );
  const schedules = sched.result?.schedules || sched.result || [];
  if (sched.success && schedules.length) {
    for (const s of schedules) {
      const cron = encodeURIComponent(s.cron || s.id);
      const del = await cf(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/schedules/${cron}`,
        { method: "DELETE" }
      );
      console.log("cron removed:", s.cron, del.success);
    }
  } else {
    console.log("no cron schedules", sched);
  }

  const settings = await cf(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER}/settings`,
    { method: "PATCH", body: JSON.stringify({ logpush: false }) }
  );
  console.log("worker settings patch:", settings.success);

  console.log("Done — worker route already removed; cron cleared if present");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
