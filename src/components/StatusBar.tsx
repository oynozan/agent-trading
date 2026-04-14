import React from "react";
import { Box, Text } from "ink";

const VERSION = "0.1.0";

export interface AgentStats {
  total: number;
  active: number;
  idle: number;
}

interface StatusBarProps {
  stats: AgentStats;
}

export function StatusBar({ stats }: StatusBarProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      <Box>
        <Box width={8}>
          <Text color="cyan" bold>
            {"[o_o]"}
          </Text>
        </Box>
        <Text color="cyanBright" bold>
          AGENTS CLI
        </Text>
        <Text dimColor>{" "}v{VERSION}{"   "}</Text>
        <Box flexGrow={1} />
        <Text>
          <Text color="cyan" bold>Agents:</Text>
          <Text> {stats.total}  </Text>
          <Text dimColor>|</Text>
          <Text color="green"> Active:</Text>
          <Text> {stats.active}  </Text>
          <Text dimColor>|</Text>
          <Text color="yellow"> Idle:</Text>
          <Text> {stats.idle}</Text>
        </Text>
      </Box>
      <Box>
        <Box width={8}>
          <Text color="cyan">{"/|#|\\"}</Text>
        </Box>
        <Text color="yellow">Autonomous Trading Agent Manager</Text>
      </Box>
    </Box>
  );
}
