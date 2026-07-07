import { loadJSON } from "../helpers/loadJSON";

// If config.json is not found and the hostname is localhost or 127.0.0 load config-dev.json
let config = loadJSON("/config.json");

if (!config && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  config = loadJSON("/config-dev.json");
  if (!config) {
    config = {
      BACKEND_PROTOCOL: "http",
      BACKEND_HOST: "localhost",
      BACKEND_PORT: "8080",
      LOG_LEVEL: "debug"
    };
  }
}

if (!config) {
  throw new Error("Config not found");
}

export function getBackendURL() {
  if (config.REACT_APP_BACKEND_URL) {
    return config.REACT_APP_BACKEND_URL.replace(/\/$/, "");
  }

  const protocol = config.BACKEND_PROTOCOL ?? "https";
  const host = config.BACKEND_HOST;
  const port = config.BACKEND_PORT ? `:${config.BACKEND_PORT}` : "";
  const path = config.BACKEND_PATH ?? "";

  return `${protocol}://${host}${port}${path}`;
}

export function getBackendSocketURL() {
  if (config.REACT_APP_BACKEND_URL) {
    return config.REACT_APP_BACKEND_URL.replace(/\/$/, "");
  }

  const protocol = config.BACKEND_PROTOCOL ?? "https";
  const host = config.BACKEND_HOST;
  const port = config.BACKEND_PORT ? `:${config.BACKEND_PORT}` : "";

  return `${protocol}://${host}${port}`;
}

export default config;
