import React, { useState, useCallback } from "react";
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
  const [currentValue, setCurrentValue] = useState("");

  const remount = useCallback((val: string) => {
    setDefaultVal(val);
    setCurrentValue(val);
    setInputKey((k) => k + 1);
  }, []);

  useInput(
    (_input, key) => {
      if (key.upArrow) {
        const prev = history.prev(currentValue);
        if (prev !== undefined) remount(prev);
      }
      if (key.downArrow) {
        const next = history.next();
        if (next !== undefined) remount(next);
      }
      if (key.tab && !key.shift && suggestions && currentValue.length > 0) {
        const match = suggestions.find((s) => s.startsWith(currentValue));
        if (match && match !== currentValue) {
          remount(match);
        }
      }
    },
    { isActive: !isDisabled && !confirmPrompt }
  );

  const handleChange = useCallback((value: string) => {
    setCurrentValue(value);
  }, []);

  const handleSubmit = (value: string) => {
    if (!confirmPrompt && value.trim()) {
      history.push(value.trim());
    }
    history.reset();
    onSubmit(value);
    remount("");
  };

  return (
    <Box>
      <Text color="cyan">{confirmPrompt ? confirmPrompt + " " : "agent "}</Text>
      {!confirmPrompt && <Text bold>{"> "}</Text>}
      <TextInput
        key={inputKey}
        defaultValue={defaultVal}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder=""
        isDisabled={isDisabled}
        suggestions={confirmPrompt ? undefined : suggestions}
      />
    </Box>
  );
}
