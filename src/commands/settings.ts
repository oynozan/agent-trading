import type { InteractiveResult } from "./index.js";

export async function settingsCommand(): Promise<InteractiveResult> {
  return {
    lines: [],
    openSettings: true,
  };
}
