import { env } from "cloudflare:workers";
export async function GET() {
  const vars = env as unknown as Record<string, string>;
  return Response.json(
    {
      modelConfigured: !!vars.MODEL_API_KEY,
      model: vars.MODEL_NAME || "deepseek-chat",
      dataMode: "verified_historical_disclosures",
      dataPeriods: [2023, 2024],
      liveFinancialApi: false,
      automaticMonitoring: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
