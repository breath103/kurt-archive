#!/usr/bin/env -S node --import tsx
process.title = "dev:types";

import { execSync } from "node:child_process";

execSync("npx tsc --watch --preserveWatchOutput --emitDeclarationOnly", { stdio: "inherit" });
