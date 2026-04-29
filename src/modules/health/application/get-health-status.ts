export type HealthStatus = {
  checkedAt: string;
  service: "dase";
  status: "ok";
};

export function getHealthStatus(now = new Date()): HealthStatus {
  return {
    checkedAt: now.toISOString(),
    service: "dase",
    status: "ok",
  };
}
