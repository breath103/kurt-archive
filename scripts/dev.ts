#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { merge } from "rxjs";
import { loadConfig } from "shared/config";

import { DevProcess } from "./dev/dev-process.js";

// Detect parent death (e.g. terminal closed without SIGHUP).
// When parent dies, OS reparents us → ppid changes → kill our process group.
const parentPid = process.ppid;
setInterval(() => {
  if (process.ppid !== parentPid) {
    try { process.kill(0, "SIGTERM"); } catch {}
    process.exit(1);
  }
}, 500);

async function main() {
  process.title = "dev:main";
  console.log(`dev:main pid=${process.pid}`);
  const config = loadConfig();
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e", default: "development" },
      open: { type: "boolean", short: "o", default: false },
    },
    strict: false,
  });

  const envFlag = [`--env=${values.env}`];

  const backend = new DevProcess("Backend", "packages/backend/scripts/dev.ts", envFlag, { color: "\x1b[34m" });
  const frontend = new DevProcess("Frontend", "packages/frontend/scripts/dev.ts", envFlag, { color: "\x1b[32m" });
  const edge = new DevProcess("Edge", "packages/edge/scripts/dev.ts", [], { color: "\x1b[35m" });
  const types = new DevProcess("Types", "packages/backend/scripts/dev-types.ts", [], { color: "\x1b[33m" });

  const critical = [backend, frontend, edge];
  const all = [backend, frontend, edge, types];

  const shutdown = () => {
    console.log("\x1b[33mShutting down...\x1b[0m");
    for (const p of all) p.kill();
    try { process.kill(0, "SIGTERM"); } catch {}
    process.exit(1);
  };

  // Any critical process crash → shutdown everything
  merge(...critical.map((p) => p.$crashed)).subscribe(() => shutdown());

  // Manual termination signals → shutdown everything
  for (const sig of ["SIGINT", "SIGTERM", "SIGTSTP"] as const) {
    process.on(sig, () => shutdown());
  }

  // --- Now await readiness ---

  try {
    await Promise.all([
      backend.waitForStdout({ pattern: "Backend running on", timeout: 1000 * 5 }),
      frontend.waitForStdout({ pattern: "Local:", timeout: 1000 * 5 }),
      edge.waitForStdout({ pattern: "Edge proxy running on", timeout: 1000 * 5 }),
    ]);
  } catch (error) {
    console.error(`\x1b[31m${error instanceof Error ? error.message : error}\x1b[0m`);
    shutdown();
  }

  console.log("\x1b[36m✓ All services ready\x1b[0m");

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
  }
}

void main();
