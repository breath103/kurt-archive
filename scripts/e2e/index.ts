#!/usr/bin/env -S npx tsx
import { type Command } from "./command.js";
import { start, stop } from "./commands/lifecycle.js";
import { navigate, screenshot, runJs, click, type, wait, setViewport, pageText } from "./commands/browser.js";

// --- Commands ---

const commands: Record<string, Command> = {
  start,
  stop,
  navigate,
  screenshot,
  "run-js": runJs,
  click,
  type,
  wait,
  "set-viewport": setViewport,
  "page-text": pageText,
};

// --- Main ---

async function main() {
  const [commandName, ...rest] = process.argv.slice(2);

  if (!commandName || commandName === "help") {
    const lines = Object.entries(commands).map(([name, cmd]) =>
      `  ${(name + cmd.usage).padEnd(30)} ${cmd.description}`
    );
    console.log(`\nUsage: npm run e2e <command> [args]\n\nCommands:\n${lines.join("\n")}\n`);
    return;
  }

  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    process.exit(1);
  }

  await command.run(commandName, rest);
}

void main();
