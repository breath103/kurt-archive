#!/usr/bin/env -S npx tsx
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { merge } from "rxjs";
import { loadConfig } from "shared/config";

import { DevProcess } from "./dev-process.js";

async function main() {
  const config = loadConfig();
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e", default: "development" },
      open: { type: "boolean", short: "o", default: false },
    },
    strict: false,
  });

  console.log(`Process group ID: ${process.pid}`);

  const envFlag = [`--`, `--env=${values.env}`];

  const backend = new DevProcess("Backend", "npm", ["run", "dev", "-w", "backend", ...envFlag], { color: "\x1b[34m" });
  const frontend = new DevProcess("Frontend", "npm", ["run", "dev", "-w", "frontend", ...envFlag], { color: "\x1b[32m" });
  const edge = new DevProcess("Edge", "npm", ["run", "dev", "-w", "edge"], { color: "\x1b[35m" });
  const types = new DevProcess("Types", "npm", ["run", "dev:types", "-w", "backend"], { color: "\x1b[33m" });

  const critical = [backend, frontend, edge];
  const all = [backend, frontend, edge, types];

  // --- Register all handlers BEFORE any await ---

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\x1b[33mShutting down...\x1b[0m");
    for (const p of all) {
      console.log(`  Killing: ${p.name}`);
      await p.kill();
    }
    console.log("\x1b[33mAll processes killed.\x1b[0m");
    process.exit(1);
  };

  // Any critical process crash → shutdown everything
  merge(...critical.map((p) => p.$crashed)).subscribe(() => {
    void shutdown();
  });

  // Manual termination signals → shutdown everything
  for (const sig of ["SIGINT", "SIGTERM", "SIGTSTP"] as const) {
    process.on(sig, () => void shutdown());
  }

  // --- Now await readiness ---

  try {
    await Promise.all([
      backend.waitForStdout({ pattern: "Backend running on", timeout: 30_000 }),
      frontend.waitForStdout({ pattern: "Local:", timeout: 30_000 }),
      edge.waitForStdout({ pattern: "Edge proxy running on", timeout: 30_000 }),
    ]);
  } catch (error) {
    console.error(`\x1b[31m${error instanceof Error ? error.message : error}\x1b[0m`);
    await shutdown();
  }

  console.log("\x1b[36m✓ All services ready\x1b[0m");

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
  }
}

void main();
