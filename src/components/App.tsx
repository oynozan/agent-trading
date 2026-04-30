import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Box, useApp, useInput, useWindowSize } from "ink";
import chalk from "chalk";

import { StatusBar, type AgentStats, type NodeStatus } from "./StatusBar.js";
import { OutputPane } from "./OutputPane.js";
import { InputPrompt } from "./InputPrompt.js";
import { Editor } from "./Editor.js";
import { SettingsScreen } from "./SettingsScreen.js";
import { parseInput } from "../cli/parser.js";
import { getCommand, getCommandNames, isInteractiveResult, type PendingPrompt } from "../commands/index.js";
import { listAgents } from "../services/agent.service.js";
import {
  loadCliConfig,
  fetchNodeConfig,
  setCachedNodeConfig,
  type NodeConfig,
} from "../services/config.service.js";
import { log } from "../utils/logger.js";
import { getAgentsRoot } from "../utils/fs.js";
import { CommandHistory } from "../utils/history.js";
import { getRandomTip } from "../utils/tips.js";

interface EditorFile {
  path: string;
  name: string;
}

export function App() {
  const { exit } = useApp();
  const { rows, columns } = useWindowSize();

  const welcomeLines = useMemo(
    () => [
      "",
      chalk.dim('  Type "help" to get started.'),
      "  " + chalk.yellow.bold("Tip:") + " " + chalk.cyan(getRandomTip()),
      "",
    ],
    [],
  );

  const [lines, setLines] = useState<string[]>(welcomeLines);
  const [stats, setStats] = useState<AgentStats>({ total: 0, active: 0, idle: 0 });
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [editorFile, setEditorFile] = useState<EditorFile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nodeUrl, setNodeUrl] = useState<string>("");
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>("loading");
  const [nodeRoomCount, setNodeRoomCount] = useState<number>(0);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await loadCliConfig();
      if (cancelled) return;
      setNodeUrl(cfg.nodeUrl);

      let nodeOk = false;
      let nodeDetail = "";

      try {
        const fetched: NodeConfig = await fetchNodeConfig(cfg.nodeUrl);
        if (cancelled) return;
        setCachedNodeConfig(fetched);
        setNodeRoomCount(fetched.rooms.length);
        setNodeStatus("online");
        nodeOk = true;
        nodeDetail = `${cfg.nodeUrl} | ${fetched.rooms.length} room${fetched.rooms.length === 1 ? "" : "s"}`;
      } catch {
        if (cancelled) return;
        setCachedNodeConfig(null);
        setNodeRoomCount(0);
        setNodeStatus("offline");
        nodeDetail = `Run "node set <url>" to connect (was ${cfg.nodeUrl}).`;
      }

      if (cancelled) return;

      const labelCol = (s: string) => chalk.cyan.bold(s.padEnd(10));
      const statusCol = (s: string, color: "green" | "yellow" | "red") =>
        chalk[color](s.padEnd(10));

      const apiOk = !!cfg.apiKey;
      const apiRow =
        "    " +
        labelCol("API Key") +
        (apiOk
          ? statusCol("set", "green")
          : statusCol("not set", "yellow") + chalk.dim('Run "settings" to add one.'));

      const nodeRow =
        "    " +
        labelCol("Node") +
        (nodeOk
          ? statusCol("online", "green") + chalk.dim(nodeDetail)
          : statusCol("offline", "red") + chalk.dim(nodeDetail));

      setLines((prev) => [
        ...prev,
        chalk.cyanBright.bold("  Status"),
        apiRow,
        nodeRow,
        "",
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    { isActive: !editorFile && !settingsOpen }
  );

  const handleSubmit = useCallback(
    async (input: string) => {
      if (pendingPrompt) {
        const { lines: resultLines, nextPrompt } = await pendingPrompt.onResponse(input);
        if (resultLines.length > 0) appendLines(...resultLines);
        setPendingPrompt(nextPrompt ?? null);
        if (!nextPrompt) await refreshStats();
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

        if (isInteractiveResult(result)) {
          appendLines(...result.lines);
          if (result.prompt) {
            setPendingPrompt(result.prompt);
          }
          if (result.openEditor) {
            setEditorFile({ path: result.openEditor.filePath, name: result.openEditor.fileName });
          }
          if (result.openSettings) {
            setSettingsOpen(true);
          }
          return;
        }

        appendLines(...result);
      } catch (err) {
        appendLines(log.error((err as Error).message));
      }

      await refreshStats();
    },
    [pendingPrompt, appendLines, refreshStats, exit]
  );

  const termHeight = rows || process.stdout.rows || 24;
  const termWidth = columns || process.stdout.columns || 80;
  const statusBarHeight = 4;
  const inputHeight = 1;
  const outputHeight = Math.max(1, termHeight - statusBarHeight - inputHeight);

  if (editorFile) {
    return (
      <Box flexDirection="column" height={termHeight} width={termWidth}>
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

  if (settingsOpen) {
    return (
      <Box flexDirection="column" height={termHeight} width={termWidth}>
        <SettingsScreen
          height={termHeight}
          width={termWidth}
          onClose={() => {
            setSettingsOpen(false);
            appendLines(log.dim("  Settings closed."));
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={termHeight} width={termWidth}>
      <StatusBar
        stats={stats}
        nodeStatus={nodeStatus}
        nodeUrl={nodeUrl}
        nodeRoomCount={nodeRoomCount}
      />
      <OutputPane lines={lines} height={outputHeight} scrollOffset={scrollOffset} />
      <InputPrompt
        onSubmit={handleSubmit}
        confirmPrompt={pendingPrompt?.prompt ?? null}
        history={historyRef.current}
        suggestions={suggestions}
      />
    </Box>
  );
}
