import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput } from "@inkjs/ui";
import type { CommandHistory } from "../utils/history.js";

interface InputPromptProps {
  onSubmit: (value: string) => void;
  confirmPrompt?: string | null;
  isDisabled?: boolean;
  history: CommandHistory;
  suggestions?: string[];
}

export function InputPrompt({
  onSubmit,
  confirmPrompt,
  isDisabled,
  history,
  suggestions,
}: InputPromptProps) {
  const [inputKey, setInputKey] = useState(0);
  const [defaultVal, setDefaultVal] = useState("");

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        const prev = history.prev();
        if (prev !== undefined) {
          setDefaultVal(prev);
          setInputKey((k) => k + 1);
        }
      }
      if (key.downArrow) {
        const next = history.next();
        if (next !== undefined) {
          setDefaultVal(next);
          setInputKey((k) => k + 1);
        }
      }
    },
    { isActive: !isDisabled && !confirmPrompt }
  );

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      history.push(value.trim());
    }
    history.reset();
    onSubmit(value);
    setDefaultVal("");
    setInputKey((k) => k + 1);
  };

  return (
    <Box>
      <Text color="cyan">{confirmPrompt ? confirmPrompt + " " : "agent "}</Text>
      {!confirmPrompt && <Text bold>{"> "}</Text>}
      <TextInput
        key={inputKey}
        defaultValue={defaultVal}
        onSubmit={handleSubmit}
        placeholder=""
        isDisabled={isDisabled}
        suggestions={confirmPrompt ? undefined : suggestions}
      />
    </Box>
  );
}
