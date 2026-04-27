import chalk from "chalk";
import { log } from "../utils/logger.js";
import { getCachedNodeConfig } from "../services/config.service.js";

export async function roomsCommand(): Promise<string[]> {
  const cached = getCachedNodeConfig();

  if (!cached) {
    return [
      log.blank(),
      log.warn("Not connected to a node."),
      log.dim('  Run "node set <url>" first.'),
      log.blank(),
    ];
  }

  if (cached.rooms.length === 0) {
    return [log.blank(), log.dim("  Node has no rooms configured."), log.blank()];
  }

  const idCol = 14;

  const lines: string[] = [log.blank(), log.heading("  Rooms")];
  lines.push(log.blank());
  lines.push(
    log.raw(
      "  " +
        chalk.cyan.bold("ID".padEnd(idCol)) +
        chalk.cyan.bold("Name")
    )
  );
  lines.push(log.raw("  " + chalk.dim("-".repeat(idCol + 24))));

  for (const room of cached.rooms) {
    const line =
      "  " +
      chalk.green(room.id.padEnd(idCol)) +
      chalk.white(room.name ?? "");
    lines.push(log.raw(line));
  }

  lines.push(log.blank());
  lines.push(log.dim(`  ${cached.rooms.length} room${cached.rooms.length === 1 ? "" : "s"} total`));
  lines.push(log.blank());

  return lines;
}
