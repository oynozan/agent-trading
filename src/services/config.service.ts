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

export interface Provider {
  id: string;
  label?: string;
  models: string[];
}

export interface Platform {
  id: string;
  label?: string;
}

export interface NodeDefaults {
  provider?: string;
  model?: string;
  platform?: string;
}

export interface CliConfig {
  nodeUrl: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  platform?: string;
}

export interface NodeConfig {
  version: string;
  rooms: Room[];
  providers: Provider[];
  platforms: Platform[];
  defaults: NodeDefaults;
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

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function loadCliConfig(): Promise<CliConfig> {
  const path = getCliConfigPath();
  if (!(await fileExists(path))) {
    return { nodeUrl: DEFAULT_NODE_URL };
  }
  try {
    const raw = await readJson<Partial<CliConfig>>(path);
    const cfg: CliConfig = {
      nodeUrl:
        typeof raw.nodeUrl === "string" && raw.nodeUrl.length > 0
          ? raw.nodeUrl
          : DEFAULT_NODE_URL,
    };
    const provider = pickString(raw.provider);
    if (provider) cfg.provider = provider;
    const model = pickString(raw.model);
    if (model) cfg.model = model;
    const apiKey = pickString(raw.apiKey);
    if (apiKey) cfg.apiKey = apiKey;
    const platform = pickString(raw.platform);
    if (platform) cfg.platform = platform;
    return cfg;
  } catch {
    return { nodeUrl: DEFAULT_NODE_URL };
  }
}

export async function saveCliConfig(config: CliConfig): Promise<void> {
  await ensureDir(getAgentsRoot());
  await writeJson(getCliConfigPath(), config);
}

export async function updateCliConfig(patch: Partial<CliConfig>): Promise<CliConfig> {
  const current = await loadCliConfig();
  const next: CliConfig = { ...current };

  for (const key of Object.keys(patch) as (keyof CliConfig)[]) {
    const value = patch[key];
    if (value === undefined) {
      delete next[key];
    } else {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }

  if (!next.nodeUrl) {
    next.nodeUrl = DEFAULT_NODE_URL;
  }

  await saveCliConfig(next);
  return next;
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
  return updateCliConfig({ nodeUrl: normalizeNodeUrl(url) });
}

function parseRooms(value: unknown): Room[] {
  if (!Array.isArray(value)) return [];
  const rooms: Room[] = [];
  for (const entry of value) {
    if (entry && typeof entry === "object" && typeof (entry as Room).id === "string") {
      const room: Room = { id: (entry as Room).id };
      const name = (entry as Room).name;
      if (typeof name === "string" && name.length > 0) room.name = name;
      rooms.push(room);
    }
  }
  return rooms;
}

function parseProviders(value: unknown): Provider[] {
  if (!Array.isArray(value)) return [];
  const providers: Provider[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as Provider).id;
    const models = (entry as Provider).models;
    if (typeof id !== "string" || id.length === 0 || !Array.isArray(models)) continue;
    const cleanModels: string[] = [];
    for (const m of models) {
      if (typeof m === "string" && m.length > 0) cleanModels.push(m);
    }
    if (cleanModels.length === 0) continue;
    const provider: Provider = { id, models: cleanModels };
    const label = (entry as Provider).label;
    if (typeof label === "string" && label.length > 0) provider.label = label;
    providers.push(provider);
  }
  return providers;
}

function parsePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  const platforms: Platform[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as Platform).id;
    if (typeof id !== "string" || id.length === 0) continue;
    const platform: Platform = { id };
    const label = (entry as Platform).label;
    if (typeof label === "string" && label.length > 0) platform.label = label;
    platforms.push(platform);
  }
  return platforms;
}

function parseDefaults(value: unknown): NodeDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const result: NodeDefaults = {};
  const provider = pickString(obj.provider);
  if (provider) result.provider = provider;
  const model = pickString(obj.model);
  if (model) result.model = model;
  const platform = pickString(obj.platform);
  if (platform) result.platform = platform;
  return result;
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

  return {
    version: cfg.version,
    rooms: parseRooms(cfg.rooms),
    providers: parseProviders(cfg.providers),
    platforms: parsePlatforms(cfg.platforms),
    defaults: parseDefaults(cfg.defaults),
  };
}

export interface EffectiveSelection {
  provider?: string;
  model?: string;
  platform?: string;
}

export function getEffectiveSelection(
  config: CliConfig,
  defaults: NodeDefaults | undefined,
): EffectiveSelection {
  return {
    provider: config.provider ?? defaults?.provider,
    model: config.model ?? defaults?.model,
    platform: config.platform ?? defaults?.platform,
  };
}
