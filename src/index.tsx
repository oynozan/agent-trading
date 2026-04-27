#!/usr/bin/env node

import React from "react";
import { withFullScreen } from "fullscreen-ink";
import { App } from "./components/App.js";

const ink = withFullScreen(<App />, { exitOnCtrlC: false });
await ink.start();
await ink.waitUntilExit();
