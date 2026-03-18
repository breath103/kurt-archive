#!/usr/bin/env -S npx tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import { z } from "zod";

import { loadConfig } from "shared/config";

const config = loadConfig();
const E2E_STATUS_FILE = path.join(process.cwd(), ".e2e-status.json");
const TMP_DIR = path.join(process.cwd(), ".tmp");
const CDP_PORT = 9223;
const edgeUrl = `http://localhost:${config.edge.devPort}`;

// --- Command framework ---

type Command =
  | { description: string; args: z.ZodTuple; run: (...args: string[]) => Promise<void> }
  | { description: string; args?: undefined; run: () => Promise<void> };

function defineCommand<T extends z.ZodTuple>(def: { description: string; args: T; run: (...args: z.infer<T>) => Promise<void> }): Command;
function defineCommand(def: { description: string; run: () => Promise<void> }): Command;
function defineCommand(def: Command): Command { return def; }

function usageFromSchema(name: string, schema?: z.ZodTuple): string {
  if (!schema) return name;
  const items = schema._zod.def.items as z.ZodTypeAny[];
  const labels = items.map((item) => {
    const isOptional = item._zod.def.type === "optional";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = item.description ?? (item._zod.def as any).innerType?.description ?? "arg";
    return isOptional ? `[${label}]` : `<${label}>`;
  });
  return `${name} ${labels.join(" ")}`;
}

// --- Commands ---

const commands: Record<string, Command> = {
  start: defineCommand({
    description: "Start headless Chrome (stores CDP endpoint)",
    run: async () => {
      const existing = readE2eStatus();
      if (existing) {
        try {
          process.kill(existing.pid, 0);
          console.log(`already running | pid:${existing.pid} | ${existing.cdpEndpoint}`);
          return;
        } catch {
          deleteE2eStatus();
        }
      }

      const chrome = spawn(chromium.executablePath(), [
        "--headless=new",
        `--remote-debugging-port=${CDP_PORT}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--window-size=1280,800",
        `--user-data-dir=${path.join(TMP_DIR, "e2e-chrome-profile")}`,
      ], { stdio: "ignore", detached: true });
      chrome.unref();

      if (!chrome.pid) {
        console.error("Failed to start Chrome");
        process.exit(1);
      }

      const endpoint = await waitForCdp(CDP_PORT);
      writeE2eStatus({ cdpEndpoint: endpoint, pid: chrome.pid });
      console.log(`started | pid:${chrome.pid} | ${endpoint}`);
    },
  }),

  stop: defineCommand({
    description: "Stop headless Chrome",
    run: async () => {
      const s = readE2eStatus();
      if (!s) {
        console.log("not running");
        return;
      }
      try { process.kill(s.pid, "SIGTERM"); } catch { /* already dead */ }
      deleteE2eStatus();
      console.log("stopped");
    },
  }),

  navigate: defineCommand({
    description: "Navigate to path (relative to edge proxy)",
    args: z.tuple([z.string().describe("path")]),
    run: (target) => withPage(async (page) => {
      const url = target.startsWith("http") ? target : `${edgeUrl}${target}`;
      await page.goto(url, { waitUntil: "networkidle" });
      console.log(`navigated to ${page.url()}`);
    }),
  }),

  screenshot: defineCommand({
    description: "Take screenshot",
    args: z.tuple([z.string().describe("out-path").optional()]),
    run: (outPath) => withPage(async (page) => {
      const out = outPath ?? path.join(TMP_DIR, `screenshot-${Date.now()}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(out);
    }),
  }),

  "run-js": defineCommand({
    description: "Execute JS in page, print result",
    args: z.tuple([z.string().describe("expression")]),
    run: (expr) => withPage(async (page) => {
      const result = await page.evaluate(expr);
      console.log(JSON.stringify(result, null, 2));
    }),
  }),

  click: defineCommand({
    description: "Click element",
    args: z.tuple([z.string().describe("selector")]),
    run: (selector) => withPage(async (page) => {
      await page.click(selector);
      console.log(`clicked ${selector}`);
    }),
  }),

  type: defineCommand({
    description: "Type into element",
    args: z.tuple([z.string().describe("selector"), z.string().describe("text")]),
    run: (selector, text) => withPage(async (page) => {
      await page.fill(selector, text);
      console.log(`typed into ${selector}`);
    }),
  }),

  wait: defineCommand({
    description: "Wait for element to appear",
    args: z.tuple([z.string().describe("selector")]),
    run: (selector) => withPage(async (page) => {
      await page.waitForSelector(selector, { timeout: 30_000 });
      console.log(`found ${selector}`);
    }),
  }),

  "set-viewport": defineCommand({
    description: "Set viewport size",
    args: z.tuple([z.coerce.number().describe("width"), z.coerce.number().describe("height")]),
    run: (w, h) => withPage(async (page) => {
      await page.setViewportSize({ width: w, height: h });
      console.log(`viewport set to ${w}x${h}`);
    }),
  }),

  "page-text": defineCommand({
    description: "Print page text content",
    run: () => withPage(async (page) => {
      const text = await page.evaluate(() => document.body.innerText);
      console.log(text);
    }),
  }),
};

// --- Main ---

async function main() {
  const [commandName, ...rest] = process.argv.slice(2);

  if (!commandName || commandName === "help") {
    const lines = Object.entries(commands).map(([name, cmd]) =>
      `  ${usageFromSchema(name, cmd.args).padEnd(30)} ${cmd.description}`
    );
    console.log(`\nUsage: npm run e2e <command> [args]\n\nCommands:\n${lines.join("\n")}\n`);
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    process.exit(1);
  }

  if (command.args) {
    const parsed = command.args.safeParse(rest);
    if (!parsed.success) {
      console.error(`Usage: npm run e2e ${usageFromSchema(commandName, command.args)}`);
      process.exit(1);
    }
    await command.run(...(parsed.data as string[]));
  } else {
    await command.run();
  }
}

void main();

// --- Helpers ---

interface E2eStatus {
  cdpEndpoint: string;
  pid: number;
}

function readE2eStatus(): E2eStatus | null {
  try {
    return JSON.parse(fs.readFileSync(E2E_STATUS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeE2eStatus(s: E2eStatus) {
  fs.writeFileSync(E2E_STATUS_FILE, JSON.stringify(s, null, 2) + "\n");
}

function deleteE2eStatus() {
  try { fs.unlinkSync(E2E_STATUS_FILE); } catch { /* already gone */ }
}

function requireE2e(): E2eStatus {
  const s = readE2eStatus();
  if (!s) {
    console.error("Headless Chrome is not running. Start it first: npm run e2e start");
    process.exit(1);
  }
  try { process.kill(s.pid, 0); } catch {
    console.error("Headless Chrome process is dead. Restart: npm run e2e start");
    deleteE2eStatus();
    process.exit(1);
  }
  return s;
}

async function withPage<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T> {
  const e2e = requireE2e();
  const browser = await chromium.connectOverCDP(e2e.cdpEndpoint);
  try {
    const contexts = browser.contexts();
    const context = contexts[0] ?? await browser.newContext();
    const pages = context.pages();
    const page = pages[0] ?? await context.newPage();
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function waitForCdp(port: number, timeoutMs = 10_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json() as { webSocketDebuggerUrl: string };
      return data.webSocketDebuggerUrl;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Timed out waiting for CDP on port ${port}`);
}
