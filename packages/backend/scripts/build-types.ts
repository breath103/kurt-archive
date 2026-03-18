#!/usr/bin/env -S npx tsx
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
execSync("rm -rf dist && tsc --emitDeclarationOnly", { cwd: ROOT, stdio: "inherit" });
