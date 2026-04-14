import chalk from "chalk";

export const log = {
  info(msg: string): string {
    return chalk.blue("(i)") + " " + msg;
  },

  success(msg: string): string {
    return chalk.green("[ok]") + " " + msg;
  },

  warn(msg: string): string {
    return chalk.yellow("[!]") + " " + chalk.yellow(msg);
  },

  error(msg: string): string {
    return chalk.red("[x]") + " " + chalk.red(msg);
  },

  dim(msg: string): string {
    return chalk.dim(msg);
  },

  heading(msg: string): string {
    return chalk.cyanBright.bold(msg);
  },

  raw(msg: string): string {
    return msg;
  },

  blank(): string {
    return "";
  },
};
