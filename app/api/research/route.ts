import { env } from "cloudflare:workers";
import { runResearch, ResearchError } from "@/lib/research-engine";
const limits = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const now = Date.now();
  const item = limits.get(ip);
  if (item && item.until > now && item.count >= 15)
    return Response.json(
      { error: "演示调用较频繁，请一分钟后再试。" },
      { status: 429 },
    );
  limits.set(ip, {
    count: item && item.until > now ? item.count + 1 : 1,
    until: item && item.until > now ? item.until : now + 60000,
  });
  if (limits.size > 1000)
    for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  if (Number(request.headers.get("content-length") || 0) > 24000)
    return Response.json({ error: "请求内容过长。" }, { status: 413 });
  try {
    const bodyText = await request.text();
    if (bodyText.length > 24000)
      return Response.json({ error: "请求内容过长。" }, { status: 413 });
    const body = JSON.parse(bodyText);
    const vars = env as unknown as Record<string, string>;
    const result = await runResearch(body, {
      key: vars.MODEL_API_KEY,
      baseUrl: vars.MODEL_BASE_URL,
      model: vars.MODEL_NAME,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ResearchError
            ? error.message
            : "本次研究未完成，请重试。",
        at: new Date().toISOString(),
      },
      {
        status: error instanceof ResearchError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
