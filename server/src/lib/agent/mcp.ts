import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as repository from "../repository/mcp.js";
import * as oc from "../config/opencode.js";
import * as mc from "../config/mimocode.js";
import * as cl from "../config/claude.js";

const AGENTS_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch", "agents");

const AGENTS: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };

function enableListPath(agent: string): string {
  return join(AGENTS_ROOT, agent, "mcp-enabled.json");
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

function readEnableList(agent: string): string[] {
  const path = enableListPath(agent);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as string[];
  } catch {
    return [];
  }
}

function writeEnableList(agent: string, list: string[]): void {
  const path = enableListPath(agent);
  ensureDir(path);
  writeFileSync(path, JSON.stringify(list, null, 2), "utf-8");
}

function getConfig(agent: string) {
  const cfg = AGENTS[agent];
  if (!cfg) throw new Error(`Unknown agent: ${agent}`);
  return cfg;
}

function checkAvailable(agent: string) {
  const cfg = getConfig(agent);
  if (!cfg.is_available()) throw new Error(`${agent} is not installed`);
}

export function getEnabled(agent: string): string[] {
  return readEnableList(agent);
}

export function isEnabled(agent: string, name: string): boolean {
  return readEnableList(agent).includes(name);
}

export function enable(agent: string, name: string): void {
  checkAvailable(agent);
  const repoMcp = repository.get(name);
  if (!repoMcp) {
    throw new Error(`MCP server '${name}' not found in repository`);
  }

  const list = readEnableList(agent);
  if (!list.includes(name)) {
    list.push(name);
    writeEnableList(agent, list);
  }

  // Sync to agent config
  const cfg = getConfig(agent);
  const agentServer: Record<string, any> = { type: repoMcp.type };
  if (repoMcp.command) agentServer.command = repoMcp.command;
  if (repoMcp.url) agentServer.url = repoMcp.url;
  if (repoMcp.environment) agentServer.environment = repoMcp.environment;

  try {
    cfg.update_mcp_server(name, agentServer);
  } catch {
    cfg.add_mcp_server(name, agentServer);
  }
}

export function disable(agent: string, name: string): void {
  checkAvailable(agent);

  const list = readEnableList(agent);
  const idx = list.indexOf(name);
  if (idx !== -1) {
    list.splice(idx, 1);
    writeEnableList(agent, list);
  }

  // Remove from agent config
  const cfg = getConfig(agent);
  try {
    cfg.delete_mcp_server(name);
  } catch {
    // Server may not exist in agent config; ignore
  }
}

export function toggle(agent: string, name: string): boolean {
  if (isEnabled(agent, name)) {
    disable(agent, name);
    return false;
  } else {
    enable(agent, name);
    return true;
  }
}

export function syncAll(agent: string): void {
  checkAvailable(agent);
  const list = readEnableList(agent);
  const cfg = getConfig(agent);

  // Enable all listed servers
  for (const name of list) {
    const repoMcp = repository.get(name);
    if (!repoMcp) continue;

    const agentServer: Record<string, any> = { type: repoMcp.type };
    if (repoMcp.command) agentServer.command = repoMcp.command;
    if (repoMcp.url) agentServer.url = repoMcp.url;
    if (repoMcp.environment) agentServer.environment = repoMcp.environment;

    try {
      cfg.update_mcp_server(name, agentServer);
    } catch {
      cfg.add_mcp_server(name, agentServer);
    }
  }
}

export function toggleAll(agent: string, enabled: boolean): void {
  checkAvailable(agent);
  const repoMcps = repository.listAll();
  const names = Object.keys(repoMcps);

  for (const name of names) {
    if (enabled) {
      enable(agent, name);
    } else {
      disable(agent, name);
    }
  }
}
