import React from "react";
import { Box, Text } from "ink";

interface OutputPaneProps {
  lines: string[];
  height: number;
  scrollOffset?: number;
}

export function OutputPane({ lines, height, scrollOffset = 0 }: OutputPaneProps) {
  const visibleHeight = Math.max(1, height);
  const maxOffset = Math.max(0, lines.length - visibleHeight);
  const clampedOffset = Math.min(scrollOffset, maxOffset);
  const start = Math.max(0, lines.length - visibleHeight - clampedOffset);
  const visible = lines.slice(start, start + visibleHeight);

  const linesAbove = start;
  const linesBelow = Math.max(0, lines.length - start - visibleHeight);

  return (
    <Box flexDirection="column" height={visibleHeight} overflow="hidden">
      {linesAbove > 0 && (
        <Text dimColor>{`  -- ${linesAbove} more line${linesAbove === 1 ? "" : "s"} above --`}</Text>
      )}
      {visible.map((line, i) => (
        <Text key={`line-${start + i}`}>{line || " "}</Text>
      ))}
      {linesBelow > 0 && clampedOffset > 0 && (
        <Text dimColor>{`  -- ${linesBelow} more line${linesBelow === 1 ? "" : "s"} below --`}</Text>
      )}
    </Box>
  );
}
