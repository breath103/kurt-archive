#!/usr/bin/env -S node --import tsx
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
  cwd: string;
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
    cwd: "",
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

// Resolve cwd for all processes in the tree
function collectPids(proc: Proc): number[] {
  return [proc.pid, ...proc.children.flatMap(collectPids)];
}
const pids = collectPids(root);
try {
  const lsofOut = execSync(`lsof -a -d cwd -p ${pids.join(",")} 2>/dev/null`, { encoding: "utf-8" });
  for (const line of lsofOut.split("\n")) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 9) continue;
    const pid = Number(cols[1]);
    const cwd = cols.slice(8).join(" ");
    const proc = procs.get(pid);
    if (proc) proc.cwd = cwd;
  }
} catch { /* lsof may fail for some pids */ }

function printNode(proc: Proc, prefix: string, childrenPrefix: string) {
  const cwdLabel = proc.cwd ? ` \x1b[33mcwd=${proc.cwd}\x1b[0m` : "";
  console.log(`${prefix}\x1b[2mpid=${proc.pid}\x1b[0m ${proc.command}${cwdLabel}`);
  for (let i = 0; i < proc.children.length; i++) {
    const isLast = i === proc.children.length - 1;
    printNode(
      proc.children[i],
      childrenPrefix + (isLast ? "└── " : "├── "),
      childrenPrefix + (isLast ? "    " : "│   "),
    );
  }
}

function countAll(proc: Proc): number {
  return 1 + proc.children.reduce((sum, c) => sum + countAll(c), 0);
}

console.log();
printNode(root, "", "");
console.log(`\n\x1b[2mTotal: ${countAll(root)} processes\x1b[0m`);
