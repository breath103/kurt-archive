import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { loadConfig } from "shared/config";

const config = loadConfig();

export const E2E_STATUS_FILE = path.join(process.cwd(), ".e2e-status.json");
export const TMP_DIR = path.join(process.cwd(), ".tmp");
export const CDP_PORT = 9223;
export const edgeUrl = `http://localhost:${config.edge.devPort}`;

export interface E2eStatus {
  cdpEndpoint: string;
  pid: number;
}

export function readE2eStatus(): E2eStatus | null {
  try {
    return JSON.parse(fs.readFileSync(E2E_STATUS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function writeE2eStatus(s: E2eStatus) {
  fs.writeFileSync(E2E_STATUS_FILE, JSON.stringify(s, null, 2) + "\n");
}

export function deleteE2eStatus() {
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

export async function withPage<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T> {
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

export async function waitForCdp(port: number, timeoutMs = 10_000): Promise<string> {
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
