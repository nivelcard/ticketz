import { Container } from "@cloudflare/containers";

function buildContainerEnv(env) {
  const vars = {
    PORT: "3000",
    HOST: "0.0.0.0",
    NODE_ENV: "production",
    FRONTEND_URL: env.FRONTEND_URL,
    BACKEND_URL: env.BACKEND_URL,
    DB_DIALECT: env.DB_DIALECT,
    DB_HOST: env.DB_HOST,
    DB_PORT: env.DB_PORT,
    DB_USER: env.DB_USER,
    DB_PASS: env.DB_PASS,
    DB_NAME: env.DB_NAME,
    DB_SCHEMA: env.DB_SCHEMA,
    DB_SSL: env.DB_SSL,
    DB_SSL_REJECT_UNAUTHORIZED: env.DB_SSL_REJECT_UNAUTHORIZED,
    DB_TIMEZONE: env.DB_TIMEZONE,
    DB_MAX_CONNECTIONS: env.DB_MAX_CONNECTIONS,
    DB_MIN_CONNECTIONS: env.DB_MIN_CONNECTIONS,
    REDIS_URI: env.REDIS_URI,
    VERIFY_TOKEN: env.VERIFY_TOKEN,
    SOCKET_ADMIN: env.SOCKET_ADMIN,
    TZ: env.TZ,
    USER_LIMIT: env.USER_LIMIT,
    CONNECTIONS_LIMIT: env.CONNECTIONS_LIMIT,
    CLOSED_SEND_BY_ME: env.CLOSED_SEND_BY_ME
  };

  return Object.fromEntries(
    Object.entries(vars).filter(([, value]) => value != null && value !== "")
  );
}

export class TicketzBackend extends Container {
  defaultPort = 3000;
  sleepAfter = "30m";
  enableInternet = true;
  requiredPorts = [3000];

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = buildContainerEnv(env);
  }

  onError(error) {
    console.error("Ticketz container error:", error);
    throw error;
  }
}

export default {
  async fetch(request, env) {
    try {
      const id = env.TICKETZ_BACKEND.idFromName("prod");
      const stub = env.TICKETZ_BACKEND.get(id);
      return await stub.fetch(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Ticketz API worker error:", message);
      return new Response(`API worker error: ${message}`, { status: 500 });
    }
  }
};
