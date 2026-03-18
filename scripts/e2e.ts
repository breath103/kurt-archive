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

// --- Status file helpers ---

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
  try {
    fs.unlinkSync(E2E_STATUS_FILE);
  } catch {
    /* already gone */
  }
}

function requireE2e(): E2eStatus {
  const s = readE2eStatus();
  if (!s) {
    console.error("Headless Chrome is not running. Start it first: npm run e2e start");
    process.exit(1);
  }
  // Check if the process is still alive
  try {
    process.kill(s.pid, 0);
  } catch {
    console.error("Headless Chrome process is dead. Restart: npm run e2e start");
    deleteE2eStatus();
    process.exit(1);
  }
  return s;
}

// --- Commands ---

async function cmdStart() {
  // Check if already running
  const existing = readE2eStatus();
  if (existing) {
    try {
      process.kill(existing.pid, 0);
      console.log(`already running | pid:${existing.pid} | ${existing.cdpEndpoint}`);
      return;
    } catch {
      // Dead process, clean up
      deleteE2eStatus();
    }
  }

  // Launch Chrome as a detached process so it persists between CLI invocations
  const executablePath = chromium.executablePath();
  const chrome = spawn(executablePath, [
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
  ], {
    stdio: "ignore",
    detached: true,
  });
  chrome.unref();

  if (!chrome.pid) {
    console.error("Failed to start Chrome");
    process.exit(1);
  }

  // Wait for CDP to be available
  const endpoint = await waitForCdp(CDP_PORT);

  const status = { cdpEndpoint: endpoint, pid: chrome.pid };
  writeE2eStatus(status);
  console.log(`started | pid:${chrome.pid} | ${endpoint}`);
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

async function cmdStop() {
  const s = readE2eStatus();
  if (!s) {
    console.log("not running");
    return;
  }
  try {
    process.kill(s.pid, "SIGTERM");
  } catch {
    /* already dead */
  }
  deleteE2eStatus();
  console.log("stopped");
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
    // Disconnect without closing the browser
    await browser.close();
  }
}

async function cmdLogin() {
  await withPage(async (page) => {
    // Navigate to the edge proxy first to set the correct cookie domain
    await page.goto(edgeUrl);

    // Call dev-login endpoint from the page context so cookies are set on the right domain
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/auth/dev-login", { method: "POST" });
      return { status: res.status, ok: res.ok };
    });

    if (!result.ok) {
      console.error(`Login failed with status ${result.status}`);
      process.exit(1);
    }

    console.log("logged in as dev user");
  });
}

async function cmdNavigate(urlPath: string) {
  await withPage(async (page) => {
    const url = urlPath.startsWith("http") ? urlPath : `${edgeUrl}${urlPath}`;
    await page.goto(url, { waitUntil: "networkidle" });
    console.log(`navigated to ${page.url()}`);
  });
}

async function cmdScreenshot(outputPath?: string) {
  await withPage(async (page) => {
    const out = outputPath ?? path.join(TMP_DIR, `screenshot-${Date.now()}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(out);
  });
}

async function cmdRunJs(expression: string) {
  await withPage(async (page) => {
    const result = await page.evaluate(expression);
    console.log(JSON.stringify(result, null, 2));
  });
}

async function cmdClick(selector: string) {
  await withPage(async (page) => {
    await page.click(selector);
    console.log(`clicked ${selector}`);
  });
}

async function cmdType(selector: string, text: string) {
  await withPage(async (page) => {
    await page.fill(selector, text);
    console.log(`typed into ${selector}`);
  });
}

async function cmdWait(selector: string) {
  await withPage(async (page) => {
    await page.waitForSelector(selector, { timeout: 30_000 });
    console.log(`found ${selector}`);
  });
}

async function cmdSetViewport(width: number, height: number) {
  await withPage(async (page) => {
    await page.setViewportSize({ width, height });
    console.log(`viewport set to ${width}x${height}`);
  });
}

async function cmdPageText() {
  await withPage(async (page) => {
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text);
  });
}

// --- Main ---

async function main() {
  const { positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: false,
  });

  const command = positionals[0];

  if (!command || command === "help") {
    console.log(`
Usage: npm run e2e <command> [options]

Commands:
  start                      Start headless Chrome (stores CDP endpoint)
  stop                       Stop headless Chrome
  login                      Authenticate as dev user
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

  switch (command) {
    case "start":
      await cmdStart();
      break;
    case "stop":
      await cmdStop();
      break;
    case "login":
      await cmdLogin();
      break;
    case "navigate": {
      const target = positionals[1];
      if (!target) {
        console.error("Usage: npm run e2e navigate <path>");
        process.exit(1);
      }
      await cmdNavigate(target);
      break;
    }
    case "screenshot": {
      const { values } = parseArgs({
        args: process.argv.slice(3),
        options: { out: { type: "string" } },
        strict: false,
      });
      await cmdScreenshot(values.out);
      break;
    }
    case "run-js": {
      const expr = positionals.slice(1).join(" ");
      if (!expr) {
        console.error("Usage: npm run e2e run-js <expression>");
        process.exit(1);
      }
      await cmdRunJs(expr);
      break;
    }
    case "click": {
      const sel = positionals[1];
      if (!sel) {
        console.error("Usage: npm run e2e click <selector>");
        process.exit(1);
      }
      await cmdClick(sel);
      break;
    }
    case "type": {
      const sel = positionals[1];
      const text = positionals.slice(2).join(" ");
      if (!sel || !text) {
        console.error("Usage: npm run e2e type <selector> <text>");
        process.exit(1);
      }
      await cmdType(sel, text);
      break;
    }
    case "wait": {
      const sel = positionals[1];
      if (!sel) {
        console.error("Usage: npm run e2e wait <selector>");
        process.exit(1);
      }
      await cmdWait(sel);
      break;
    }
    case "set-viewport": {
      const w = Number(positionals[1]);
      const h = Number(positionals[2]);
      if (!w || !h) {
        console.error("Usage: npm run e2e set-viewport <width> <height>");
        process.exit(1);
      }
      await cmdSetViewport(w, h);
      break;
    }
    case "page-text":
      await cmdPageText();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

void main();
