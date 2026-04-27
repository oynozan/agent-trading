import {
  getAgentsRoot,
  getCliConfigPath,
  ensureDir,
  fileExists,
  readJson,
  writeJson,
} from "../utils/fs.js";

export interface Room {
  id: string;
  name?: string;
}

export interface CliConfig {
  nodeUrl: string;
}

export interface NodeConfig {
  version: string;
  rooms: Room[];
}

export const DEFAULT_NODE_URL = "http://localhost:3000";

const FETCH_TIMEOUT_MS = 5000;

let cachedNodeConfig: NodeConfig | null = null;

export function getCachedNodeConfig(): NodeConfig | null {
  return cachedNodeConfig;
}

export function setCachedNodeConfig(config: NodeConfig | null): void {
  cachedNodeConfig = config;
}

function normalizeNodeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function loadCliConfig(): Promise<CliConfig> {
  const path = getCliConfigPath();
  if (!(await fileExists(path))) {
    return { nodeUrl: DEFAULT_NODE_URL };
  }
  try {
    const raw = await readJson<Partial<CliConfig>>(path);
    return {
      nodeUrl:
        typeof raw.nodeUrl === "string" && raw.nodeUrl.length > 0
          ? raw.nodeUrl
          : DEFAULT_NODE_URL,
    };
  } catch {
    return { nodeUrl: DEFAULT_NODE_URL };
  }
}

export async function saveCliConfig(config: CliConfig): Promise<void> {
  await ensureDir(getAgentsRoot());
  await writeJson(getCliConfigPath(), config);
}

export async function setNodeUrl(url: string): Promise<CliConfig> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Node URL must use http or https (got "${parsed.protocol}").`);
  }
  const next: CliConfig = { nodeUrl: normalizeNodeUrl(url) };
  await saveCliConfig(next);
  return next;
}

export async function fetchNodeConfig(url: string): Promise<NodeConfig> {
  const base = normalizeNodeUrl(url);
  const target = `${base}/config`;

  let response: Response;
  try {
    response = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = (err as Error).message || "network error";
    throw new Error(`Could not reach node at ${base} (${reason}).`);
  }

  if (!response.ok) {
    throw new Error(`Node returned HTTP ${response.status} for /config.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Node response at ${target} was not valid JSON.`);
  }

  const cfg = body as Partial<NodeConfig> | null;
  if (
    !cfg ||
    typeof cfg.version !== "string" ||
    !Array.isArray(cfg.rooms)
  ) {
    throw new Error(`Node config at ${target} is malformed.`);
  }

  const rooms: Room[] = [];
  for (const entry of cfg.rooms) {
    if (entry && typeof entry === "object" && typeof (entry as Room).id === "string") {
      const room: Room = { id: (entry as Room).id };
      const name = (entry as Room).name;
      if (typeof name === "string" && name.length > 0) room.name = name;
      rooms.push(room);
    }
  }

  return { version: cfg.version, rooms };
}
