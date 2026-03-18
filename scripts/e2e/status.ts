import fs from "node:fs";
import path from "node:path";

const E2E_STATUS_FILE = path.join(process.cwd(), ".e2e-status.json");

export const CDP_PORT = 9223;

export interface E2eStatus {
  cdpEndpoint: string;
  pid: number;
}

export function read(): E2eStatus | null {
  try {
    return JSON.parse(fs.readFileSync(E2E_STATUS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function write(s: E2eStatus) {
  fs.writeFileSync(E2E_STATUS_FILE, JSON.stringify(s, null, 2) + "\n");
}

export function remove() {
  try { fs.unlinkSync(E2E_STATUS_FILE); } catch { /* already gone */ }
}

export function requireRunning(): E2eStatus {
  const s = read();
  if (!s) {
    console.error("Headless Chrome is not running. Start it first: npm run e2e start");
    process.exit(1);
  }
  try { process.kill(s.pid, 0); } catch {
    console.error("Headless Chrome process is dead. Restart: npm run e2e start");
    remove();
    process.exit(1);
  }
  return s;
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
