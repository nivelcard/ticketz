#!/usr/bin/env node
"use strict";

const http = require("http");

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || 3000);
const APP_PORT = Number(process.env.APP_PORT || 3001);
const APP_HOST = process.env.APP_HOST || "127.0.0.1";
const APP_PROBE_INTERVAL_MS = 250;

let appReady = false;

const probeApp = () =>
  new Promise(resolve => {
    const req = http.request(
      {
        host: APP_HOST,
        port: APP_PORT,
        path: "/health",
        method: "GET",
        timeout: 1500
      },
      res => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end();
  });

const probeLoop = async () => {
  while (!appReady) {
    // eslint-disable-next-line no-await-in-loop
    appReady = await probeApp();
    if (!appReady) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, APP_PROBE_INTERVAL_MS));
    }
  }

  console.log(`[gateway] App ready on ${APP_HOST}:${APP_PORT}`);
};

const sendWarmingResponse = (req, res) => {
  const path = (req.url || "").split("?")[0];

  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, warming: true, gateway: true }));
    return true;
  }

  res.writeHead(503, {
    "Content-Type": "application/json",
    "Retry-After": "2"
  });
  res.end(JSON.stringify({ ok: false, error: "ERR_API_WARMING_UP" }));
  return true;
};

const proxyToApp = (req, res) => {
  const upstream = http.request(
    {
      host: APP_HOST,
      port: APP_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
      timeout: 120000
    },
    upstreamRes => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("timeout", () => {
    upstream.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "ERR_UPSTREAM_TIMEOUT" }));
    }
  });

  upstream.on("error", error => {
    console.error("[gateway] Upstream error:", error.message);
    if (!res.headersSent) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: "ERR_API_WARMING_UP",
          message: error.message
        })
      );
    }
  });

  req.pipe(upstream);
};

const server = http.createServer((req, res) => {
  if (!appReady) {
    sendWarmingResponse(req, res);
    return;
  }

  proxyToApp(req, res);
});

server.listen(GATEWAY_PORT, "0.0.0.0", () => {
  console.log(`[gateway] Listening on 0.0.0.0:${GATEWAY_PORT}`);
  probeLoop().catch(error => {
    console.error("[gateway] Probe loop failed:", error);
  });
});
