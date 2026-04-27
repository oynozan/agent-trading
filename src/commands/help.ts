import chalk from "chalk";
import { log } from "../utils/logger.js";

const COMMANDS: [string, string][] = [
  ["create <name>", "Create a new agent"],
  ["list", "List all agents"],
  ["info <name>", "Show agent details"],
  ["edit <name>", "Open trade.md in built-in editor"],
  ["delete <name>", "Delete an agent"],
  ["node", "Show current node URL and status"],
  ["node set <url>", "Point CLI at a node and refresh config"],
  ["rooms", "List rooms delivered by the connected node"],
  ["dir", "Show agents directory path"],
  ["clear", "Clear the output pane"],
  ["help", "Show this help message"],
  ["exit", "Exit the CLI"],
];

const SHORTCUTS: [string, string][] = [
  ["Up / Down", "Browse command history"],
  ["Tab", "Autocomplete command or agent name"],
  ["PageUp / PageDown", "Scroll output"],
  ["Ctrl+L", "Clear output"],
  ["Ctrl+C", "Exit"],
];

export async function helpCommand(): Promise<string[]> {
  const lines: string[] = [
    log.blank(),
    log.heading("  Available Commands"),
    log.blank(),
  ];

  for (const [cmd, desc] of COMMANDS) {
    lines.push(log.raw(`  ${chalk.cyan.bold(cmd.padEnd(20))} ${desc}`));
  }

  lines.push(log.blank());
  
  // lines.push(log.heading("  Keyboard Shortcuts"));
  // lines.push(log.blank());

  // for (const [key, desc] of SHORTCUTS) {
  //   lines.push(log.raw(`  ${chalk.yellow(key.padEnd(20))} ${desc}`));
  // }

  // lines.push(log.blank());
  
  return lines;
}
