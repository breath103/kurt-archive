#!/usr/bin/env -S node --import tsx
process.title = "dev:frontend";

import { execSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import { config as dotenvConfig } from "dotenv";

const { values } = parseArgs({
  options: { env: { type: "string", short: "e", default: "development" } },
  strict: false,
});

const ROOT = path.resolve(import.meta.dirname, "..");
const envFile = `.env.${values.env}`;
dotenvConfig({ path: path.join(ROOT, envFile), override: true });
console.log(`Loaded environment from ${envFile}`);

execSync("npx vite", { cwd: ROOT, stdio: "inherit" });
