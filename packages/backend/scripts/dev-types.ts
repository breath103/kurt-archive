#!/usr/bin/env -S npx tsx --tsconfig scripts/tsconfig.json
process.title = "dev:types";

import { execSync } from "node:child_process";

execSync("npx tsc --watch --preserveWatchOutput --emitDeclarationOnly", { stdio: "inherit" });
