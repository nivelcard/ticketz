/**
 * Cloudflare Pages Middleware — Ticketz Fortmax
 *
 * Mesmo padrão Nível Cashback / WebG3:
 * - SPA React servida pelo Pages
 * - /backend/* → proxy para BACKEND_ORIGIN (com rewrite, igual nginx)
 * - /socket.io/* → proxy WebSocket para BACKEND_ORIGIN
 */

const PROXY_PREFIXES = ["/backend", "/socket.io"];

function shouldProxy(pathname: string): boolean {
  return PROXY_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function safeUrl(request: Request): URL | null {
  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

function buildBackendTarget(url: URL, backendOrigin: string): URL {
  const origin = backendOrigin.replace(/\/$/, "");
  let path = url.pathname;

  if (path.startsWith("/backend/")) {
    path = `/${path.slice("/backend/".length)}`;
  } else if (path === "/backend") {
    path = "/";
  }

  return new URL(`${path}${url.search}`, origin);
}

/** SPA fallback devolve index.html para /static/* ausente — quebra assets. */
function guardStaleAssetResponse(url: URL, response: Response): Response {
  const path = url.pathname || "";
  if (!path.startsWith("/static/")) return response;
  const ct = response.headers.get("content-type") || "";
  if (response.status === 200 && ct.includes("text/html")) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
  return response;
}

async function proxyToBackend(
  request: Request,
  url: URL,
  backendOrigin: string
): Promise<Response> {
  const target = buildBackendTarget(url, backendOrigin);
  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

  if (url.pathname.startsWith("/socket.io")) {
    headers.set("Connection", "Upgrade");
  }

  return fetch(
    new Request(target.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual"
    })
  );
}

export const onRequest: PagesFunction<{ BACKEND_ORIGIN: string }> = async context => {
  try {
    const url = safeUrl(context.request);
    if (!url) return context.next();

    if (shouldProxy(url.pathname)) {
      const backendOrigin = context.env.BACKEND_ORIGIN;
      if (!backendOrigin) {
        return new Response("Backend origin not configured", { status: 503 });
      }
      return proxyToBackend(context.request, url, backendOrigin);
    }

    const response = await context.next();
    return guardStaleAssetResponse(url, response);
  } catch {
    try {
      return context.next();
    } catch {
      return new Response("Service temporarily unavailable", { status: 503 });
    }
  }
};
