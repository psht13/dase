import { getHealthStatus } from "@/modules/health/application/get-health-status";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const health = getHealthStatus();

  return Response.json(health, {
    headers: {
      "Cache-Control": "no-store",
    },
    status: health.status === "ok" ? 200 : 503,
  });
}
