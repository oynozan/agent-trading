import chalk from "chalk";
import { deleteAgent, getAgent } from "../services/agent.service.js";
import { log } from "../utils/logger.js";

export interface DeleteResult {
  lines: string[];
  needsConfirmation?: {
    prompt: string;
    onConfirm: () => Promise<string[]>;
    onCancel: () => string[];
  };
}

export async function deleteCommand(args: string[]): Promise<DeleteResult> {
  const name = args[0];
  if (!name) {
    return { lines: [log.error("Usage: delete <name>")] };
  }

  try {
    await getAgent(name);
  } catch (err) {
    return { lines: [log.error((err as Error).message)] };
  }

  const prompt = `${chalk.yellow("[!]")} Delete agent ${chalk.red.bold(name)}? This cannot be undone. (y/N)`;

  return {
    lines: [],
    needsConfirmation: {
      prompt,
      onConfirm: async () => {
        try {
          await deleteAgent(name);
          return [log.success(`Agent ${chalk.cyanBright(name)} deleted.`)];
        } catch (err) {
          return [log.error((err as Error).message)];
        }
      },
      onCancel: () => [log.dim("  Cancelled.")],
    },
  };
}
