export const MCP_BASE = "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server";
export const CHATGPT_URL = `${MCP_BASE}/chatgpt`;
export const FULL_URL = MCP_BASE;
export const KEY_CHECK_URL = `${MCP_BASE}/debug/key-check`;

export type RpcResult = {
  status: number;
  contentType: string;
  body: any;
  durationMs: number;
  error?: string;
};

export async function rpc(
  url: string,
  method: string,
  params?: any,
  apiKey?: string
): Promise<RpcResult> {
  const t0 = performance.now();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (apiKey) headers["x-api-key"] = apiKey;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now() + Math.floor(Math.random() * 1000),
        method,
        ...(params !== undefined ? { params } : {}),
      }),
    });
    const txt = await res.text();
    let body: any = txt;
    // Strip SSE framing if present
    if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      const dataLine = txt.split("\n").find((l) => l.startsWith("data:"));
      if (dataLine) {
        try {
          body = JSON.parse(dataLine.slice(5).trim());
        } catch {}
      }
    } else {
      try {
        body = JSON.parse(txt);
      } catch {}
    }
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body,
      durationMs: Math.round(performance.now() - t0),
    };
  } catch (e: any) {
    return {
      status: 0,
      contentType: "",
      body: null,
      durationMs: Math.round(performance.now() - t0),
      error: e?.message ?? String(e),
    };
  }
}

export async function checkApiKey(apiKey?: string): Promise<RpcResult> {
  const t0 = performance.now();
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey?.trim()) headers["x-api-key"] = apiKey.trim();

  try {
    const res = await fetch(KEY_CHECK_URL, { method: "GET", headers, cache: "no-store" });
    const txt = await res.text();
    let body: any = txt;
    try {
      body = JSON.parse(txt);
    } catch {}
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body,
      durationMs: Math.round(performance.now() - t0),
    };
  } catch (e: any) {
    return {
      status: 0,
      contentType: "",
      body: null,
      durationMs: Math.round(performance.now() - t0),
      error: e?.message ?? String(e),
    };
  }
}
