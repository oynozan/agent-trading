export interface ParsedInput {
  command: string;
  args: string[];
}

export function parseInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  return { command, args };
}
