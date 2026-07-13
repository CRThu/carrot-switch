import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";
import { readJsonc, writeJsonc } from "../jsonc.js";
import * as oc from "../config/opencode.js";
import * as mc from "../config/mimocode.js";
import * as cl from "../config/claude.js";
import type { McpServer, McpType } from "@carrot-switch/shared";

const STORE_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch");

function storePath(agent: string): string {
  return join(STORE_ROOT, "mcps", `${agent}.json`);
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function ensureDir(filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf("\\") !== -1 ? filePath.lastIndexOf("\\") : filePath.lastIndexOf("/"));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getConfig(agent: string) {
  const map: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };
  return map[agent];
}

export interface McpStoreData {
  servers: Record<string, McpServer>;
}

export function load(agent: string): McpStoreData {
  const path = storePath(agent);
  if (!existsSync(path)) {
    return seedFromAgent(agent);
  }
  const data = readJsonc(path) as McpStoreData;
  for (const server of Object.values(data.servers || {})) {
    if (server.type === undefined) server.type = "local";
  }
  return data;
}

function seedFromAgent(agent: string): McpStoreData {
  const config = getConfig(agent);
  if (!config || !config.is_available()) return { servers: {} };

  const agentServers = config.get_mcp_servers();
  const data: McpStoreData = { servers: {} };
  for (const [name, server] of Object.entries(agentServers)) {
    const s = server as Record<string, any>;
    data.servers[name] = {
      name,
      type: (s.type || "local") as McpType,
      command: s.command,
      url: s.url,
      environment: s.environment,
      enabled: s.enabled !== false,
      createdAt: nowIso(),
    };
  }
  save(agent, data);
  return data;
}

export function save(agent: string, data: McpStoreData): void {
  const path = storePath(agent);
  ensureDir(path);
  writeJsonc(path, data);
}

export function addServer(agent: string, name: string, server: Omit<McpServer, "createdAt"> & { createdAt?: string }): void {
  const data = load(agent);
  data.servers[name] = {
    ...server,
    name,
    createdAt: nowIso(),
    enabled: server.enabled !== false,
  };
  save(agent, data);
}

export function updateServer(agent: string, name: string, server: Partial<McpServer>): void {
  const data = load(agent);
  if (!data.servers || !(name in data.servers)) {
    throw new Error(`MCP server '${name}' not found`);
  }
  const existing = data.servers[name];
  data.servers[name] = {
    ...existing,
    ...server,
    name,
    createdAt: existing.createdAt || nowIso(),
    enabled: server.enabled !== undefined ? server.enabled : existing.enabled,
  };
  save(agent, data);
}

export function deleteServer(agent: string, name: string): void {
  const data = load(agent);
  if (!data.servers || !(name in data.servers)) {
    throw new Error(`MCP server '${name}' not found`);
  }
  delete data.servers[name];
  save(agent, data);
}

export function toggleServer(agent: string, name: string): boolean {
  const data = load(agent);
  if (!data.servers || !(name in data.servers)) {
    throw new Error(`MCP server '${name}' not found`);
  }
  const current = data.servers[name].enabled !== false;
  data.servers[name].enabled = !current;
  save(agent, data);
  return !current;
}

export function syncToAgent(agent: string): void {
  const config = getConfig(agent);
  if (!config) return;

  const data = load(agent);
  for (const [name, server] of Object.entries(data.servers || {})) {
    const agentServer: Record<string, any> = {};
    if (server.type) agentServer.type = server.type;
    if (server.command) agentServer.command = server.command;
    if (server.url) agentServer.url = server.url;
    if (server.environment) agentServer.environment = server.environment;
    try {
      config.update_mcp_server(name, agentServer);
    } catch {
      config.add_mcp_server(name, agentServer);
    }
  }
}
