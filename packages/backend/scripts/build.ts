#!/usr/bin/env -S tsx --tsconfig scripts/tsconfig.json
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function main() {
  execSync("./scripts/pack-build.ts", { cwd: ROOT, stdio: "inherit" });
  execSync("./scripts/pack-install.ts", { cwd: ROOT, stdio: "inherit" });
  console.log("Build complete");
}

main();
