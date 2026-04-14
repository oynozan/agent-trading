import chalk from "chalk";
import { getAgent } from "../services/agent.service.js";
import { log } from "../utils/logger.js";

export async function infoCommand(args: string[]): Promise<string[]> {
  const name = args[0];
  if (!name) {
    return [log.error("Usage: info <name>")];
  }

  try {
    const config = await getAgent(name);
    const statusColor = config.status === "idle" ? chalk.green : chalk.yellow;

    return [
      log.blank(),
      log.raw(`  ${chalk.cyan("[o_o]")}  ${chalk.cyanBright.bold(config.name)}`),
      log.blank(),
      log.raw(`  ${chalk.dim("Status")}   ${statusColor(config.status)}`),
      log.raw(`  ${chalk.dim("Created")}  ${chalk.white(config.createdAt.split("T")[0])}`),
      log.raw(`  ${chalk.dim("Full TS")}  ${chalk.dim(config.createdAt)}`),
      log.blank(),
    ];
  } catch (err) {
    return [log.error((err as Error).message)];
  }
}
