#!/usr/bin/env tsx
process.title = "dev:types";

import { execSync } from "node:child_process";

execSync("npx tsc --watch --preserveWatchOutput --emitDeclarationOnly", { stdio: "inherit" });
