import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, useApp, useInput, useWindowSize } from "ink";
import chalk from "chalk";

import { StatusBar, type AgentStats } from "./StatusBar.js";
import { OutputPane } from "./OutputPane.js";
import { InputPrompt } from "./InputPrompt.js";
import { Editor } from "./Editor.js";
import { parseInput } from "../cli/parser.js";
import { getCommand, getCommandNames, isDeleteResult, isEditResult } from "../commands/index.js";
import { listAgents } from "../services/agent.service.js";
import { log } from "../utils/logger.js";
import { getAgentsRoot } from "../utils/fs.js";
import { CommandHistory } from "../utils/history.js";

const WELCOME_LINES = [
  "",
  chalk.dim('  Type "help" to get started.'),
  "",
];

interface PendingConfirm {
  prompt: string;
  onConfirm: () => Promise<string[]>;
  onCancel: () => string[];
}

interface EditorFile {
  path: string;
  name: string;
}

export function App() {
  const { exit } = useApp();
  const { rows } = useWindowSize();
  const [lines, setLines] = useState<string[]>(WELCOME_LINES);
  const [stats, setStats] = useState<AgentStats>({ total: 0, active: 0, idle: 0 });
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [editorFile, setEditorFile] = useState<EditorFile | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const historyRef = useRef(new CommandHistory());

  const refreshStats = useCallback(async () => {
    try {
      const agents = await listAgents();
      setStats({
        total: agents.length,
        active: agents.filter((a) => a.status === "active").length,
        idle: agents.filter((a) => a.status === "idle").length,
      });

      const commandNames = getCommandNames();
      const agentNames = agents.map((a) => a.name);
      setSuggestions([
        ...commandNames,
        ...agentNames.flatMap((name) =>
          ["info", "edit", "delete"].map((cmd) => `${cmd} ${name}`)
        ),
      ]);
    } catch {
      // ignore errors reading stats
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const appendLines = useCallback((...newLines: string[]) => {
    setLines((prev) => [...prev, ...newLines]);
    setScrollOffset(0);
  }, []);

  useInput(
    (input, key) => {
      if (key.ctrl && input === "l") {
        setLines([]);
        setScrollOffset(0);
      }
      if (key.ctrl && input === "c") {
        exit();
      }
      if (key.pageUp) {
        setScrollOffset((prev) => prev + 5);
      }
      if (key.pageDown) {
        setScrollOffset((prev) => Math.max(prev - 5, 0));
      }
    },
    { isActive: !editorFile }
  );

  const handleSubmit = useCallback(
    async (input: string) => {
      if (pendingConfirm) {
        const isYes = input.trim().toLowerCase() === "y";
        if (isYes) {
          const result = await pendingConfirm.onConfirm();
          appendLines(...result);
        } else {
          const result = pendingConfirm.onCancel();
          appendLines(...result);
        }
        setPendingConfirm(null);
        await refreshStats();
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) return;

      appendLines(chalk.cyan("agent") + chalk.bold(" > ") + trimmed);

      const lower = trimmed.toLowerCase();

      if (lower === "exit" || lower === "quit") {
        appendLines("", chalk.dim("  Goodbye! [o_o]/"), "");
        setTimeout(() => exit(), 100);
        return;
      }

      if (lower === "clear") {
        setLines([]);
        setScrollOffset(0);
        return;
      }

      if (lower === "dir") {
        appendLines(log.info(`Directory: ${getAgentsRoot()}`), "");
        return;
      }

      const parsed = parseInput(trimmed);
      if (!parsed) return;

      const handler = getCommand(parsed.command);
      if (!handler) {
        appendLines(
          log.error(`Unknown command: "${parsed.command}"`),
          log.dim('  Type "help" to see available commands.'),
          ""
        );
        return;
      }

      try {
        const result = await handler(parsed.args);

        if (isDeleteResult(result)) {
          appendLines(...result.lines);
          if (result.needsConfirmation) {
            setPendingConfirm(result.needsConfirmation);
          }
          return;
        }

        if (isEditResult(result)) {
          appendLines(...result.lines);
          if (result.openEditor) {
            setEditorFile({ path: result.openEditor.filePath, name: result.openEditor.fileName });
          }
          return;
        }

        appendLines(...result);
      } catch (err) {
        appendLines(log.error((err as Error).message));
      }

      await refreshStats();
    },
    [pendingConfirm, appendLines, refreshStats, exit]
  );

  const termHeight = rows || process.stdout.rows || 24;
  const statusBarHeight = 4;
  const inputHeight = 1;
  const outputHeight = Math.max(1, termHeight - statusBarHeight - inputHeight);

  if (editorFile) {
    return (
      <Box flexDirection="column" height={termHeight}>
        <Editor
          filePath={editorFile.path}
          fileName={editorFile.name}
          height={termHeight}
          onSave={() => {
            setEditorFile(null);
            appendLines(log.success("File saved."));
          }}
          onCancel={() => {
            setEditorFile(null);
            appendLines(log.dim("  Edit cancelled."));
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={termHeight}>
      <StatusBar stats={stats} />
      <OutputPane lines={lines} height={outputHeight} scrollOffset={scrollOffset} />
      <InputPrompt
        onSubmit={handleSubmit}
        confirmPrompt={pendingConfirm?.prompt ?? null}
        history={historyRef.current}
        suggestions={suggestions}
      />
    </Box>
  );
}
