#!/usr/bin/env -S npx tsx
import { type ChildProcess as NodeChildProcess, spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { merge, ReplaySubject } from "rxjs";
import { loadConfig } from "shared/config";

const config = loadConfig();

class DevProcess {
  readonly name: string;
  readonly $crashed = new ReplaySubject<void>(1);

  private readonly child: NodeChildProcess;
  private readonly color: string;
  private _killed = false;
  private _exited = false;

  constructor(name: string, command: string, args: string[], options: { color: string }) {
    this.name = name;
    this.color = options.color;

    // detached: true makes the child its own process group leader.
    // This lets us kill the entire subtree (npm → tsx → server) with kill(-pid).
    this.child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });

    this.child.stdout?.on("data", (d: Buffer) => this.pipe(d, process.stdout));
    this.child.stderr?.on("data", (d: Buffer) => this.pipe(d, process.stderr));

    this.child.on("exit", (code, signal) => {
      this._exited = true;
      if (!this._killed) {
        console.log(`\x1b[31m[${this.name}] crashed (code=${code}, signal=${signal})\x1b[0m`);
        this.$crashed.next();
        this.$crashed.complete();
      }
    });
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  waitForStdout(opts: { pattern: string; timeout: number }): Promise<void> {
    if (this._exited) return Promise.reject(new Error(`[${this.name}] already exited`));

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.child.stdout?.off("data", onData);
        fn();
      };

      const timer = setTimeout(() => {
        settle(() => reject(new Error(`[${this.name}] timed out waiting for "${opts.pattern}" (${opts.timeout}ms)`)));
      }, opts.timeout);

      const onData = (d: Buffer) => {
        if (d.toString().includes(opts.pattern)) {
          settle(() => resolve());
        }
      };
      this.child.stdout?.on("data", onData);

      this.child.on("exit", () => {
        settle(() => reject(new Error(`[${this.name}] exited before "${opts.pattern}" was found`)));
      });
    });
  }

  kill(): Promise<void> {
    this._killed = true;
    if (this._exited) return Promise.resolve();
    return new Promise((resolve) => {
      this.child.on("exit", () => resolve());
      // Kill the entire process group (npm → tsx → server) with negative PID
      if (this.child.pid) {
        try { process.kill(-this.child.pid, "SIGTERM"); } catch { /* already dead */ }
      }
    });
  }

  private pipe(data: Buffer, stream: NodeJS.WriteStream) {
    for (const line of data.toString().split("\n")) {
      if (line) stream.write(`${this.color}[${this.name}]\x1b[0m ${line}\n`);
    }
  }
}

async function main() {
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
