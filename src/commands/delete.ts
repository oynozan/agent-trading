import chalk from "chalk";
import { deleteAgent, getAgent } from "../services/agent.service.js";
import { walletExists } from "../services/wallet.service.js";
import { log } from "../utils/logger.js";
import type { InteractiveResult } from "./index.js";

export async function deleteCommand(args: string[]): Promise<InteractiveResult> {
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
    prompt: {
      prompt,
      onResponse: async (input: string) => {
        if (input.trim().toLowerCase() !== "y") {
          return { lines: [log.dim("  Cancelled.")] };
        }
        try {
          await deleteAgent(name);
          const hasWallet = await walletExists(name);
          const lines = [log.success(`Agent ${chalk.cyanBright(name)} deleted.`)];
          if (hasWallet) {
            lines.push(log.dim("  Wallet data preserved."));
          }
          return { lines };
        } catch (err) {
          return { lines: [log.error((err as Error).message)] };
        }
      },
    },
  };
}
