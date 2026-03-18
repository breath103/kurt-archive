# Dev Script Rewrite — OOP ChildProcess with RxJS

## Summary

Rewrite `scripts/dev.ts` to use an OOP `DevProcess` class that encapsulates child process management, colored log piping, stdout pattern matching for readiness detection, and RxJS-based crash propagation. The critical design constraint is **event ordering**: crash/signal handlers must be registered BEFORE any processes are spawned, so early failures are never missed.

## Problems with Current Implementation

1. **No readiness detection** — browser opens immediately, before servers are listening
2. **No crash propagation** — if backend dies, frontend and edge keep running as orphans
3. **Cleanup registered late** — signal handlers are set up after `setup()` spawns processes; a crash during startup is missed
4. **Procedural code** — process management scattered across loose functions

## Design

### `DevProcess` class

```typescript
class DevProcess {
  readonly name: string;
  readonly $crashed: Observable<void>;   // emits once if process exits unexpectedly

  constructor(name: string, command: string, args: string[], options?: { color: string });

  waitForStdout(opts: { pattern: string; timeout: number }): Promise<void>;
  kill(): Promise<void>;   // SIGTERM, resolves when process exits
}
```

- Constructor spawns the child immediately, pipes stdout/stderr with colored `[Name]` prefix
- `$crashed` is a ReplaySubject(1) that emits when the child exits with non-zero code or is killed by a signal — but NOT when `kill()` is called intentionally
- `waitForStdout` scans buffered + future stdout lines for a substring match, rejects on timeout
- `kill()` sets an internal `_intentional` flag so the exit doesn't trigger `$crashed`

### Event ordering in `main()`

```
1. Parse args (--env, --open)
2. Create processes (spawns immediately)
3. Subscribe to merged $crashed — on any crash, shutdown all
4. Register SIGINT/SIGTERM/SIGTSTP → shutdown all
5. await Promise.all(waitForStdout) — wait for readiness
6. If --open, launch browser
```

Steps 3-4 happen synchronously after construction, before any async awaits. This means even if a process crashes during the `waitForStdout` phase, the crash handler is already active.

### Shutdown sequence

```typescript
async function shutdown() {
  for (const p of processes) {
    console.log(`Killing: ${p.name}`);
    await p.kill();
  }
  process.kill(0, "SIGTERM");  // kill entire process group (catches orphan grandchildren)
}
```

### Ready patterns

| Process  | Pattern                  | Source                             |
|----------|--------------------------|------------------------------------|
| Backend  | `"Backend running on"`   | `packages/backend/scripts/server.ts` |
| Frontend | `"Local:"`               | Vite dev server stdout             |
| Edge     | `"Edge proxy running on"` | `packages/edge/scripts/dev.ts`     |

### Env flag

Default `--env` to `"development"` so `npm run dev` works without flags. Pass as `-- --env=<value>` to backend and frontend (edge doesn't need it).

### Process list

| Name     | Command                                    |
|----------|--------------------------------------------|
| Backend  | `npm run dev -w backend -- --env=<env>`    |
| Frontend | `npm run dev -w frontend -- --env=<env>`   |
| Edge     | `npm run dev -w edge`                      |
| Types    | `npm run dev:types -w backend`             |

Types watcher has no ready signal — don't await it; just let it run. It also shouldn't trigger full shutdown on crash (it's non-critical).

## Test Scenarios

### Scenario 1: Normal startup + Ctrl+C clean shutdown

**Steps:**
1. Run `npm run dev` — note the process group ID printed at startup
2. Wait for all 3 ready messages (Backend, Frontend, Edge)
3. Run e2e: `npm run e2e navigate /` then `npm run e2e screenshot`
4. Open screenshot to verify the app is working
5. Send SIGINT (Ctrl+C) to the `npm run dev` process
6. After exit, check that NO processes from that process group remain: `ps -g <pgid>` should return nothing

**Expected:**
- All 3 services print ready messages
- Screenshot shows the app running
- After Ctrl+C, all processes in the group are dead — no orphans

### Scenario 2: Startup timeout — process fails to become ready

**Steps:**
1. Temporarily break a dev server so it never prints its ready message (e.g., wrong port, missing env)
2. Run `npm run dev`
3. Wait for the timeout to fire (default 30s, or shorter for testing)

**Expected:**
- `npm run dev` prints a timeout error identifying which process failed to become ready
- All spawned processes are killed — `ps -g <pgid>` returns nothing
- Exit code is non-zero

### Scenario 3: Post-startup crash — one process dies after all are ready

**Steps:**
1. Run `npm run dev`, wait for all ready messages
2. Kill the backend process directly: `kill <backend-pid>` (simulating a crash)
3. Observe the crash handler fire

**Expected:**
- Console prints which process crashed (e.g., "Process [Backend] crashed")
- All remaining processes are killed automatically
- `ps -g <pgid>` returns nothing
- Exit code is non-zero

## Key files

- `scripts/dev.ts` — full rewrite (single file, class + main)
