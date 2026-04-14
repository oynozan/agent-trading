import chalk from "chalk";
import { validateAgentName, createAgent } from "../services/agent.service.js";
import { log } from "../utils/logger.js";

export async function createCommand(args: string[]): Promise<string[]> {
  const name = args[0];
  const validationError = validateAgentName(name);
  if (validationError) {
    return [log.error(validationError)];
  }

  try {
    const config = await createAgent(name);
    return [
      log.blank(),
      log.success(`Agent ${chalk.cyanBright.bold(config.name)} created successfully.`),
      log.dim(`   Status:  ${config.status}`),
      log.dim(`   Created: ${config.createdAt.split("T")[0]}`),
      log.blank(),
    ];
  } catch (err) {
    return [log.error((err as Error).message)];
  }
}
