import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readFile, writeFile } from "node:fs/promises";
import chalk from "chalk";

interface EditorProps {
  filePath: string;
  fileName: string;
  height: number;
  onSave: () => void;
  onCancel: () => void;
}

export function Editor({ filePath, fileName, height, onSave, onCancel }: EditorProps) {
  const [lines, setLines] = useState<string[]>([""]);
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [modified, setModified] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const headerHeight = 1;
  const footerHeight = 1;
  const viewportHeight = Math.max(1, height - headerHeight - footerHeight - 4);

  useEffect(() => {
    readFile(filePath, "utf-8")
      .then((content) => {
        const fileLines = content.split("\n");
        if (fileLines.length > 0 && fileLines[fileLines.length - 1] === "") {
          fileLines.pop();
        }
        setLines(fileLines.length === 0 ? [""] : fileLines);
        setLoaded(true);
      })
      .catch(() => {
        setLines([""]);
        setLoaded(true);
      });
  }, [filePath]);

  const ensureCursorVisible = (row: number, currentScrollTop: number): number => {
    if (row < currentScrollTop) return row;
    if (row >= currentScrollTop + viewportHeight) return row - viewportHeight + 1;
    return currentScrollTop;
  };

  useInput((input, key) => {
    if (!loaded) return;

    if (key.ctrl && input === "s") {
      const content = lines.join("\n") + "\n";
      writeFile(filePath, content, "utf-8").then(() => onSave());
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      setLines((prev) => {
        const newLines = [...prev];
        const currentLine = newLines[cursorRow] ?? "";
        const before = currentLine.slice(0, cursorCol);
        const after = currentLine.slice(cursorCol);
        newLines.splice(cursorRow, 1, before, after);
        return newLines;
      });
      const newRow = cursorRow + 1;
      setCursorRow(newRow);
      setCursorCol(0);
      setScrollTop((st) => ensureCursorVisible(newRow, st));
      setModified(true);
      return;
    }

    if (key.backspace || key.delete) {
      if (key.backspace) {
        if (cursorCol > 0) {
          setLines((prev) => {
            const newLines = [...prev];
            const line = newLines[cursorRow] ?? "";
            newLines[cursorRow] = line.slice(0, cursorCol - 1) + line.slice(cursorCol);
            return newLines;
          });
          setCursorCol((c) => c - 1);
          setModified(true);
        } else if (cursorRow > 0) {
          setLines((prev) => {
            const newLines = [...prev];
            const prevLine = newLines[cursorRow - 1] ?? "";
            const curLine = newLines[cursorRow] ?? "";
            const newCol = prevLine.length;
            newLines.splice(cursorRow - 1, 2, prevLine + curLine);
            setCursorCol(newCol);
            return newLines;
          });
          const newRow = cursorRow - 1;
          setCursorRow(newRow);
          setScrollTop((st) => ensureCursorVisible(newRow, st));
          setModified(true);
        }
        return;
      }

      if (key.delete) {
        if (cursorCol < (lines[cursorRow]?.length ?? 0)) {
          setLines((prev) => {
            const newLines = [...prev];
            const line = newLines[cursorRow] ?? "";
            newLines[cursorRow] = line.slice(0, cursorCol) + line.slice(cursorCol + 1);
            return newLines;
          });
          setModified(true);
        } else if (cursorRow < lines.length - 1) {
          setLines((prev) => {
            const newLines = [...prev];
            const curLine = newLines[cursorRow] ?? "";
            const nextLine = newLines[cursorRow + 1] ?? "";
            newLines.splice(cursorRow, 2, curLine + nextLine);
            return newLines;
          });
          setModified(true);
        }
        return;
      }
    }

    if (key.upArrow) {
      if (cursorRow > 0) {
        const newRow = cursorRow - 1;
        setCursorRow(newRow);
        setCursorCol((c) => Math.min(c, lines[newRow]?.length ?? 0));
        setScrollTop((st) => ensureCursorVisible(newRow, st));
      }
      return;
    }

    if (key.downArrow) {
      if (cursorRow < lines.length - 1) {
        const newRow = cursorRow + 1;
        setCursorRow(newRow);
        setCursorCol((c) => Math.min(c, lines[newRow]?.length ?? 0));
        setScrollTop((st) => ensureCursorVisible(newRow, st));
      }
      return;
    }

    if (key.leftArrow) {
      if (cursorCol > 0) {
        setCursorCol((c) => c - 1);
      } else if (cursorRow > 0) {
        const newRow = cursorRow - 1;
        setCursorRow(newRow);
        setCursorCol(lines[newRow]?.length ?? 0);
        setScrollTop((st) => ensureCursorVisible(newRow, st));
      }
      return;
    }

    if (key.rightArrow) {
      const lineLen = lines[cursorRow]?.length ?? 0;
      if (cursorCol < lineLen) {
        setCursorCol((c) => c + 1);
      } else if (cursorRow < lines.length - 1) {
        const newRow = cursorRow + 1;
        setCursorRow(newRow);
        setCursorCol(0);
        setScrollTop((st) => ensureCursorVisible(newRow, st));
      }
      return;
    }

    if (key.pageUp) {
      const newRow = Math.max(0, cursorRow - viewportHeight);
      setCursorRow(newRow);
      setCursorCol((c) => Math.min(c, lines[newRow]?.length ?? 0));
      setScrollTop((st) => ensureCursorVisible(newRow, Math.max(0, st - viewportHeight)));
      return;
    }

    if (key.pageDown) {
      const newRow = Math.min(lines.length - 1, cursorRow + viewportHeight);
      setCursorRow(newRow);
      setCursorCol((c) => Math.min(c, lines[newRow]?.length ?? 0));
      setScrollTop((st) => ensureCursorVisible(newRow, st + viewportHeight));
      return;
    }

    if (key.home) {
      setCursorCol(0);
      return;
    }

    if (key.end) {
      setCursorCol(lines[cursorRow]?.length ?? 0);
      return;
    }

    if (key.tab) {
      setLines((prev) => {
        const newLines = [...prev];
        const line = newLines[cursorRow] ?? "";
        newLines[cursorRow] = line.slice(0, cursorCol) + "  " + line.slice(cursorCol);
        return newLines;
      });
      setCursorCol((c) => c + 2);
      setModified(true);
      return;
    }

    if (!key.ctrl && !key.meta && input && input.length === 1) {
      setLines((prev) => {
        const newLines = [...prev];
        const line = newLines[cursorRow] ?? "";
        newLines[cursorRow] = line.slice(0, cursorCol) + input + line.slice(cursorCol);
        return newLines;
      });
      setCursorCol((c) => c + 1);
      setModified(true);
    }
  });

  if (!loaded) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  const visibleLines = lines.slice(scrollTop, scrollTop + viewportHeight);

  const renderLine = (line: string, lineIdx: number) => {
    const absoluteRow = scrollTop + lineIdx;
    const lineNum = String(absoluteRow + 1).padStart(3, " ");

    if (absoluteRow === cursorRow) {
      const col = Math.min(cursorCol, line.length);
      const before = line.slice(0, col);
      const cursorChar = col < line.length ? line[col] : " ";
      const after = col < line.length ? line.slice(col + 1) : "";

      return (
        <Text key={`ln-${absoluteRow}`}>
          <Text dimColor>{lineNum} </Text>
          <Text>{before}</Text>
          <Text inverse>{cursorChar}</Text>
          <Text>{after}</Text>
        </Text>
      );
    }

    return (
      <Text key={`ln-${absoluteRow}`}>
        <Text dimColor>{lineNum} </Text>
        <Text>{line}</Text>
      </Text>
    );
  };

  const emptyCount = viewportHeight - visibleLines.length;
  const emptyRows = Array.from({ length: Math.max(0, emptyCount) }, (_, i) => (
    <Text key={`empty-${i}`}>
      <Text dimColor>{"    ~"}</Text>
    </Text>
  ));

  const modFlag = modified ? " [*]" : "";

  return (
    <Box flexDirection="column" height={height}>
      <Box borderStyle="single" borderColor="yellow" paddingX={1} flexShrink={0}>
        <Text color="yellow" bold>
          EDIT: {fileName}{modFlag}
        </Text>
        <Box flexGrow={1} />
        <Text dimColor>Ctrl+S save | Esc cancel</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleLines.map(renderLine)}
        {emptyRows}
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1} flexShrink={0}>
        <Text dimColor>
          Ln {cursorRow + 1}, Col {cursorCol + 1}
        </Text>
        <Box flexGrow={1} />
        <Text dimColor>
          {lines.length} line{lines.length !== 1 ? "s" : ""}
        </Text>
      </Box>
    </Box>
  );
}
