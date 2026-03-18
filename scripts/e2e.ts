#!/usr/bin/env -S npx tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

import { loadConfig } from "shared/config";

const config = loadConfig();
const E2E_STATUS_FILE = path.join(process.cwd(), ".e2e-status.json");
const TMP_DIR = path.join(process.cwd(), ".tmp");
const CDP_PORT = 9223;
const edgeUrl = `http://localhost:${config.edge.devPort}`;

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const commandName = positionals[0];

  if (!commandName || commandName === "help") {
    console.log(`
Usage: npm run e2e <command> [options]

Commands:
  start                      Start headless Chrome (stores CDP endpoint)
  stop                       Stop headless Chrome
  navigate <path>            Navigate to path (relative to edge proxy)
  screenshot [--out <path>]  Take screenshot (default: .tmp/screenshot-<ts>.png)
  run-js <expression>        Execute JS in page, print result
  click <selector>           Click element
  type <selector> <text>     Type into element
  wait <selector>            Wait for element to appear
  set-viewport <w> <h>       Set viewport size (e.g. 1280 720)
  page-text                  Print page text content
`);
    return;
  }

  const commands: Record<string, (args: string[]) => Promise<void>> = {
    start: cmdStart,
    stop: cmdStop,
    navigate: cmdNavigate,
    screenshot: cmdScreenshot,
    "run-js": cmdRunJs,
    click: cmdClick,
    type: cmdType,
    wait: cmdWait,
    "set-viewport": cmdSetViewport,
    "page-text": cmdPageText,
  };

  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    process.exit(1);
  }

  await command(args.slice(1));
}

void main();

// --- Commands ---

async function cmdStart() {
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
}

async function cmdStop() {
  const s = readE2eStatus();
  if (!s) {
    console.log("not running");
    return;
  }
  try { process.kill(s.pid, "SIGTERM"); } catch { /* already dead */ }
  deleteE2eStatus();
  console.log("stopped");
}

async function cmdNavigate(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const target = positionals[0];
  if (!target) {
    console.error("Usage: npm run e2e navigate <path>");
    process.exit(1);
  }
  await withPage(async (page) => {
    const url = target.startsWith("http") ? target : `${edgeUrl}${target}`;
    await page.goto(url, { waitUntil: "networkidle" });
    console.log(`navigated to ${page.url()}`);
  });
}

async function cmdScreenshot(args: string[]) {
  const { values } = parseArgs({ args, options: { out: { type: "string" } }, strict: false });
  await withPage(async (page) => {
    const out = String(values.out ?? path.join(TMP_DIR, `screenshot-${Date.now()}.png`));
    await page.screenshot({ path: out, fullPage: true });
    console.log(out);
  });
}

async function cmdRunJs(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const expr = positionals.join(" ");
  if (!expr) {
    console.error("Usage: npm run e2e run-js <expression>");
    process.exit(1);
  }
  await withPage(async (page) => {
    const result = await page.evaluate(expr);
    console.log(JSON.stringify(result, null, 2));
  });
}

async function cmdClick(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const selector = positionals[0];
  if (!selector) {
    console.error("Usage: npm run e2e click <selector>");
    process.exit(1);
  }
  await withPage(async (page) => {
    await page.click(selector);
    console.log(`clicked ${selector}`);
  });
}

async function cmdType(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const selector = positionals[0];
  const text = positionals.slice(1).join(" ");
  if (!selector || !text) {
    console.error("Usage: npm run e2e type <selector> <text>");
    process.exit(1);
  }
  await withPage(async (page) => {
    await page.fill(selector, text);
    console.log(`typed into ${selector}`);
  });
}

async function cmdWait(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const selector = positionals[0];
  if (!selector) {
    console.error("Usage: npm run e2e wait <selector>");
    process.exit(1);
  }
  await withPage(async (page) => {
    await page.waitForSelector(selector, { timeout: 30_000 });
    console.log(`found ${selector}`);
  });
}

async function cmdSetViewport(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: false });
  const w = Number(positionals[0]);
  const h = Number(positionals[1]);
  if (!w || !h) {
    console.error("Usage: npm run e2e set-viewport <width> <height>");
    process.exit(1);
  }
  await withPage(async (page) => {
    await page.setViewportSize({ width: w, height: h });
    console.log(`viewport set to ${w}x${h}`);
  });
}

async function cmdPageText() {
  await withPage(async (page) => {
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text);
  });
}

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
