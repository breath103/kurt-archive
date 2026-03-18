import { spawn } from "node:child_process";
import path from "node:path";

import { chromium } from "playwright";
import { z } from "zod";

import { Command } from "../command.js";
import { TMP_DIR } from "../helpers.js";
import * as status from "../status.js";

export const start = new Command("Start headless Chrome (stores CDP endpoint)", z.tuple([]), async () => {
  const existing = status.read();
  if (existing) {
    try {
      process.kill(existing.pid, 0);
      console.log(`already running | pid:${existing.pid} | ${existing.cdpEndpoint}`);
      return;
    } catch {
      status.remove();
    }
  }

  const chrome = spawn(chromium.executablePath(), [
    "--headless=new",
    `--remote-debugging-port=${status.CDP_PORT}`,
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

  const endpoint = await status.waitForCdp(status.CDP_PORT);
  status.write({ cdpEndpoint: endpoint, pid: chrome.pid });
  console.log(`started | pid:${chrome.pid} | ${endpoint}`);
});

export const stop = new Command("Stop headless Chrome", z.tuple([]), async () => {
  const s = status.read();
  if (!s) {
    console.log("not running");
    return;
  }
  try { process.kill(s.pid, "SIGTERM"); } catch { /* already dead */ }
  status.remove();
  console.log("stopped");
});
