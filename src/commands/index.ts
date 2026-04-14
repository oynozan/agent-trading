import { createCommand } from "./create.js";
import { listCommand } from "./list.js";
import { infoCommand } from "./info.js";
import { editCommand, type EditResult } from "./edit.js";
import { deleteCommand, type DeleteResult } from "./delete.js";
import { helpCommand } from "./help.js";

export type SimpleResult = string[];
export type CommandResult = SimpleResult | DeleteResult | EditResult;

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

export function isDeleteResult(result: CommandResult): result is DeleteResult {
  return typeof result === "object" && !Array.isArray(result) && "needsConfirmation" in result;
}

export function isEditResult(result: CommandResult): result is EditResult {
  return typeof result === "object" && !Array.isArray(result) && "openEditor" in result;
}
