export class CommandHistory {
  private items: string[] = [];
  private cursor = -1;
  private draft = "";

  push(cmd: string): void {
    if (cmd && cmd !== this.items[this.items.length - 1]) {
      this.items.push(cmd);
    }
    this.cursor = -1;
    this.draft = "";
  }

  prev(currentInput?: string): string | undefined {
    if (this.items.length === 0) return undefined;

    if (this.cursor === -1) {
      this.draft = currentInput ?? "";
      this.cursor = this.items.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    }

    return this.items[this.cursor];
  }

  next(): string | undefined {
    if (this.cursor === -1) return undefined;

    if (this.cursor < this.items.length - 1) {
      this.cursor++;
      return this.items[this.cursor];
    }

    this.cursor = -1;
    return this.draft;
  }

  reset(): void {
    this.cursor = -1;
    this.draft = "";
  }
}
