import { ALL_REPORTS } from "@/lib/research-scenarios";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  const results = await Promise.all(
    ALL_REPORTS.map(async (r) => {
      const started = Date.now();
      try {
        const res = await fetch(r.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(10000),
        });
        return {
          year: r.year,
          company: r.company,
          url: r.url,
          status: res.ok ? "reachable" : "failed",
          httpStatus: res.status,
          durationMs: Date.now() - started,
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          year: r.year,
          company: r.company,
          url: r.url,
          status: "failed",
          durationMs: Date.now() - started,
          checkedAt: new Date().toISOString(),
        };
      }
    }),
  );
  return Response.json(
    {
      results,
      note: "仅检查案例原文可访问性，不代表重新解析原文或搜索了最新披露。",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
