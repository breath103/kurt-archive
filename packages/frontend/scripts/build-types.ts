#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "inherit" });
