import { getTradeLogPath, getAgent } from "../services/agent.service.js";
import { fileExists } from "../utils/fs.js";
import { log } from "../utils/logger.js";

export interface EditResult {
  lines: string[];
  openEditor?: {
    filePath: string;
    fileName: string;
  };
}

export async function editCommand(args: string[]): Promise<EditResult> {
  const name = args[0];
  if (!name) {
    return { lines: [log.error("Usage: edit <name>")] };
  }

  try {
    await getAgent(name);
  } catch (err) {
    return { lines: [log.error((err as Error).message)] };
  }

  const tradePath = getTradeLogPath(name);
  if (!(await fileExists(tradePath))) {
    return { lines: [log.error(`trade.md not found for agent "${name}".`)] };
  }

  return {
    lines: [log.dim(`  Opening trade.md for "${name}"...`)],
    openEditor: { filePath: tradePath, fileName: `${name}/trade.md` },
  };
}
