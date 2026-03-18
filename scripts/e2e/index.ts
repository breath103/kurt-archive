#!/usr/bin/env -S npx tsx
import { spawn } from "node:child_process";
import path from "node:path";

import { chromium } from "playwright";
import { z } from "zod";

import { Command } from "./command.js";
import {
  CDP_PORT, TMP_DIR, edgeUrl,
  readE2eStatus, writeE2eStatus, deleteE2eStatus,
  withPage, waitForCdp,
} from "./helpers.js";

// --- Commands ---

const commands: Record<string, Command> = {
  start: new Command("Start headless Chrome (stores CDP endpoint)", z.tuple([]), async () => {
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
  }),

  stop: new Command("Stop headless Chrome", z.tuple([]), async () => {
    const s = readE2eStatus();
    if (!s) {
      console.log("not running");
      return;
    }
    try { process.kill(s.pid, "SIGTERM"); } catch { /* already dead */ }
    deleteE2eStatus();
    console.log("stopped");
  }),

  navigate: new Command("Navigate to path (relative to edge proxy)",
    z.tuple([z.string().describe("path")]),
    (target) => withPage(async (page) => {
      const url = target.startsWith("http") ? target : `${edgeUrl}${target}`;
      await page.goto(url, { waitUntil: "networkidle" });
      console.log(`navigated to ${page.url()}`);
    }),
  ),

  screenshot: new Command("Take screenshot",
    z.tuple([z.string().describe("out-path").optional()]),
    (outPath) => withPage(async (page) => {
      const out = outPath ?? path.join(TMP_DIR, `screenshot-${Date.now()}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(out);
    }),
  ),

  "run-js": new Command("Execute JS in page, print result",
    z.tuple([z.string().describe("expression")]),
    (expr) => withPage(async (page) => {
      const result = await page.evaluate(expr);
      console.log(JSON.stringify(result, null, 2));
    }),
  ),

  click: new Command("Click element",
    z.tuple([z.string().describe("selector")]),
    (selector) => withPage(async (page) => {
      await page.click(selector);
      console.log(`clicked ${selector}`);
    }),
  ),

  type: new Command("Type into element",
    z.tuple([z.string().describe("selector"), z.string().describe("text")]),
    (selector, text) => withPage(async (page) => {
      await page.fill(selector, text);
      console.log(`typed into ${selector}`);
    }),
  ),

  wait: new Command("Wait for element to appear",
    z.tuple([z.string().describe("selector")]),
    (selector) => withPage(async (page) => {
      await page.waitForSelector(selector, { timeout: 30_000 });
      console.log(`found ${selector}`);
    }),
  ),

  "set-viewport": new Command("Set viewport size",
    z.tuple([z.coerce.number().describe("width"), z.coerce.number().describe("height")]),
    (w, h) => withPage(async (page) => {
      await page.setViewportSize({ width: w, height: h });
      console.log(`viewport set to ${w}x${h}`);
    }),
  ),

  "page-text": new Command("Print page text content", z.tuple([]),
    () => withPage(async (page) => {
      const text = await page.evaluate(() => document.body.innerText);
      console.log(text);
    }),
  ),
};

// --- Main ---

async function main() {
  const [commandName, ...rest] = process.argv.slice(2);

  if (!commandName || commandName === "help") {
    const lines = Object.entries(commands).map(([name, cmd]) =>
      `  ${(name + cmd.usage).padEnd(30)} ${cmd.description}`
    );
    console.log(`\nUsage: npm run e2e <command> [args]\n\nCommands:\n${lines.join("\n")}\n`);
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    process.exit(1);
  }

  await command.run(commandName, rest);
}

void main();
