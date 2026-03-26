#!/usr/bin/env -S node --import tsx
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).join(" ");

execSync(`npx eslint src scripts ${args}`, {
  stdio: "inherit",
  cwd: ROOT,
});
