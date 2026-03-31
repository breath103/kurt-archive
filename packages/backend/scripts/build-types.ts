#!/usr/bin/env -S node --import tsx
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
execSync("rm -rf dist && npx tsc --emitDeclarationOnly", { cwd: ROOT, stdio: "inherit" });
