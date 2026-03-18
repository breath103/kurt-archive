#!/usr/bin/env -S npx tsx
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const { positionals } = parseArgs({ allowPositionals: true });
const rootPid = Number(positionals[0]);

if (!rootPid) {
  console.error("Usage: ./scripts/dev/status.ts <pid>");
  process.exit(1);
}

const ps = execSync("ps -eo pid,ppid,command", { encoding: "utf-8" });
const lines = ps.trim().split("\n").slice(1);

interface Proc {
  pid: number;
  ppid: number;
  command: string;
  children: Proc[];
}

const procs = new Map<number, Proc>();
for (const line of lines) {
  const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
  if (!match) continue;
  procs.set(Number(match[1]), {
    pid: Number(match[1]),
    ppid: Number(match[2]),
    command: match[3],
    children: [],
  });
}

for (const proc of procs.values()) {
  procs.get(proc.ppid)?.children.push(proc);
}

const root = procs.get(rootPid);
if (!root) {
  console.error(`Process ${rootPid} not found.`);
  process.exit(1);
}

function printTree(proc: Proc, prefix = "", isLast = true) {
  const connector = prefix === "" ? "" : isLast ? "└─ " : "├─ ";
  console.log(`${prefix}${connector}\x1b[2mpid=${proc.pid}\x1b[0m ${proc.command}`);
  const childPrefix = prefix === "" ? "" : prefix + (isLast ? "   " : "│  ");
  for (let i = 0; i < proc.children.length; i++) {
    printTree(proc.children[i], childPrefix, i === proc.children.length - 1);
  }
}

function countAll(proc: Proc): number {
  return 1 + proc.children.reduce((sum, c) => sum + countAll(c), 0);
}

console.log();
printTree(root);
console.log(`\n\x1b[2mTotal: ${countAll(root)} processes\x1b[0m`);
