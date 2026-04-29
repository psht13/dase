import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

async function readJsonFile<T>(fileName: string): Promise<T> {
  const contents = await readFile(path.join(root, fileName), "utf8");

  return JSON.parse(contents) as T;
}

type RailwayConfig = {
  build?: {
    builder?: string;
    buildCommand?: string;
  };
  deploy?: {
    startCommand?: string;
    preDeployCommand?: string;
    healthcheckPath?: string;
  };
};

describe("Railway deployment config", () => {
  it("keeps the web service commands aligned with the deployment plan", async () => {
    const config = await readJsonFile<RailwayConfig>("railway.json");
    const packageJson = await readJsonFile<{
      scripts: Record<string, string>;
    }>("package.json");

    expect(config.build?.builder).toBe("RAILPACK");
    expect(config.build?.buildCommand).toBe("pnpm build");
    expect(config.deploy?.startCommand).toBe("pnpm start");
    expect(config.deploy?.preDeployCommand).toBe("pnpm db:migrate");
    expect(config.deploy?.healthcheckPath).toBe("/api/health");
    expect(packageJson.scripts.start).toBe("next start");
  });

  it("keeps the worker service start command separate from the web process", async () => {
    const config = await readJsonFile<RailwayConfig>("railway.worker.json");

    expect(config.build?.builder).toBe("RAILPACK");
    expect(config.build?.buildCommand).toBe("pnpm build");
    expect(config.deploy?.startCommand).toBe("pnpm worker:start");
    expect(config.deploy?.preDeployCommand).toBeUndefined();
    expect(config.deploy?.healthcheckPath).toBeUndefined();
  });
});
