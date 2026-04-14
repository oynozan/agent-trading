import { createCommand } from "./create.js";
import { listCommand } from "./list.js";
import { infoCommand } from "./info.js";
import { editCommand } from "./edit.js";
import { deleteCommand } from "./delete.js";
import { helpCommand } from "./help.js";

export interface PendingPrompt {
  prompt: string;
  onResponse: (input: string) => Promise<{ lines: string[]; nextPrompt?: PendingPrompt }>;
}

export interface InteractiveResult {
  lines: string[];
  prompt?: PendingPrompt;
  openEditor?: { filePath: string; fileName: string };
}

export type SimpleResult = string[];
export type CommandResult = SimpleResult | InteractiveResult;

export type CommandHandler = (args: string[]) => Promise<CommandResult>;

const commands: Record<string, CommandHandler> = {
  create: createCommand,
  list: () => listCommand(),
  info: infoCommand,
  edit: editCommand,
  delete: deleteCommand,
  help: () => helpCommand(),
};

export function getCommand(name: string): CommandHandler | undefined {
  return commands[name];
}

export function getCommandNames(): string[] {
  return Object.keys(commands);
}

export function isInteractiveResult(result: CommandResult): result is InteractiveResult {
  return typeof result === "object" && !Array.isArray(result);
}
