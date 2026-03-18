import { type ChildProcess as NodeChildProcess, spawn } from "node:child_process";

import { ReplaySubject } from "rxjs";

export class DevProcess {
  readonly name: string;
  readonly $crashed = new ReplaySubject<void>(1);

  private readonly child: NodeChildProcess;
  private readonly color: string;
  private _killed = false;
  private _exited = false;

  constructor(name: string, command: string, args: string[], options: { color: string; cwd?: string }) {
    this.name = name;
    this.color = options.color;

    // detached: true makes the child its own process group leader.
    // This lets us kill the entire subtree (npm → tsx → server) with kill(-pid).
    const cwd = options.cwd ?? ".";
    this.child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], detached: true, cwd });

    console.log(`\x1b[2m[${name}] pid=${this.child.pid} cwd=${cwd} cmd=${command} ${args.join(" ")}\x1b[0m`);

    this.child.stdout?.on("data", (d: Buffer) => this.pipe(d, process.stdout));
    this.child.stderr?.on("data", (d: Buffer) => { if (!this._killed) this.pipe(d, process.stderr); });

    this.child.on("exit", (code, signal) => {
      this._exited = true;
      if (!this._killed) {
        console.log(`\x1b[31m[${this.name}] crashed (code=${code}, signal=${signal})\x1b[0m`);
        this.$crashed.next();
        this.$crashed.complete();
      }
    });
  }

  get pid(): number | undefined {
    return this.child.pid;
  }

  waitForStdout(opts: { pattern: string; timeout: number }): Promise<void> {
    if (this._exited) return Promise.reject(new Error(`[${this.name}] already exited`));

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.child.stdout?.off("data", onData);
        fn();
      };

      const timer = setTimeout(() => {
        settle(() => reject(new Error(`[${this.name}] timed out waiting for "${opts.pattern}" (${opts.timeout}ms)`)));
      }, opts.timeout);

      const onData = (d: Buffer) => {
        if (d.toString().includes(opts.pattern)) {
          settle(() => resolve());
        }
      };
      this.child.stdout?.on("data", onData);

      this.child.on("exit", () => {
        settle(() => reject(new Error(`[${this.name}] exited before "${opts.pattern}" was found`)));
      });
    });
  }

  kill(): Promise<void> {
    this._killed = true;
    if (this._exited) return Promise.resolve();
    return new Promise((resolve) => {
      this.child.on("exit", () => resolve());
      // Kill the entire process group (npm → tsx → server) with negative PID
      if (this.child.pid) {
        try { process.kill(-this.child.pid, "SIGTERM"); } catch { /* already dead */ }
      }
    });
  }

  private pipe(data: Buffer, stream: NodeJS.WriteStream) {
    for (const line of data.toString().split("\n")) {
      if (line) stream.write(`${this.color}[${this.name}]\x1b[0m ${line}\n`);
    }
  }
}
