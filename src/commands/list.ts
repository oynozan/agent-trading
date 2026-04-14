import chalk from "chalk";
import { listAgents } from "../services/agent.service.js";
import { log } from "../utils/logger.js";

export async function listCommand(): Promise<string[]> {
  const agents = await listAgents();

  if (agents.length === 0) {
    return [
      log.blank(),
      log.dim('  No agents found. Use "create <name>" to create one.'),
      log.blank(),
    ];
  }

  const nameCol = 20;
  const statusCol = 12;
  const dateCol = 12;

  const lines: string[] = [log.blank()];

  lines.push(
    log.raw(
      "  " +
        chalk.cyan.bold("Name".padEnd(nameCol)) +
        chalk.cyan.bold("Status".padEnd(statusCol)) +
        chalk.cyan.bold("Created")
    )
  );
  lines.push(log.raw("  " + chalk.dim("-".repeat(nameCol + statusCol + dateCol))));

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const statusBadge =
      a.status === "idle" ? chalk.green(a.status) : chalk.yellow(a.status);
    const date = a.createdAt.split("T")[0];
    const line =
      "  " +
      chalk.white(a.name.padEnd(nameCol)) +
      statusBadge.padEnd(statusCol + 10) +
      chalk.dim(date);

    lines.push(log.raw(i % 2 === 1 ? chalk.dim(line) : line));
  }

  lines.push(log.blank());
  lines.push(log.dim(`  ${agents.length} agent${agents.length === 1 ? "" : "s"} total`));
  lines.push(log.blank());

  return lines;
}
