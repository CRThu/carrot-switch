import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { readJsonc, writeJsonc } from "../jsonc.js";

let _configPathOverride: string | null = null;

export function _setConfigPathForTesting(path: string | null) {
  _configPathOverride = path;
}

function getConfigPath(): string {
  if (_configPathOverride) return _configPathOverride;
  return join(homedir(), ".claude.json");
}

function getSkillsDirPath(): string {
  return join(homedir(), ".claude", "skills");
}

export function get_config_path(): string {
  return getConfigPath();
}

export function get_skills_dir(): string {
  return getSkillsDirPath();
}

export function is_available(): boolean {
  return existsSync(getConfigPath());
}

function normalizeFromClaude(server: Record<string, any>): Record<string, any> {
  const result = { ...server };

  if (!result.type) result.type = "local";

  if (typeof result.command === "string") {
    const cmd = result.command;
    const args = result.args || [];
    result.command = [cmd, ...args];
    delete result.args;
  }

  if (result.env) {
    result.environment = result.env;
    delete result.env;
  }

  if (result.type === "http") result.type = "remote";

  if (result.enabled === undefined) result.enabled = true;

  return result;
}

function toClaudeFormat(server: Record<string, any>): Record<string, any> {
  const result = { ...server };

  const cmdList = result.command || [];
  delete result.command;
  if (cmdList.length > 0) {
    result.command = cmdList[0];
    if (cmdList.length > 1) {
      result.args = cmdList.slice(1);
    }
  }

  if (result.environment) {
    result.env = result.environment;
    delete result.environment;
  }

  if (result.type === "remote") result.type = "http";

  delete result.enabled;

  return result;
}

export function get_mcp_servers(): Record<string, any> {
  const cfg = readJsonc(getConfigPath());
  const rawServers = cfg.mcpServers || {};
  const normalized: Record<string, any> = {};
  for (const [name, server] of Object.entries(rawServers)) {
    normalized[name] = normalizeFromClaude(server as Record<string, any>);
  }
  return normalized;
}

export function add_mcp_server(name: string, server: Record<string, any>): void {
  const configPath = getConfigPath();
  const cfg = readJsonc(configPath);
  if (!cfg.mcpServers) cfg.mcpServers = {};
  cfg.mcpServers[name] = toClaudeFormat(server);
  writeJsonc(configPath, cfg);
}

export function update_mcp_server(name: string, server: Record<string, any>): void {
  const configPath = getConfigPath();
  const cfg = readJsonc(configPath);
  if (!cfg.mcpServers || !(name in cfg.mcpServers)) {
    throw new Error(`MCP server '${name}' not found`);
  }
  cfg.mcpServers[name] = toClaudeFormat(server);
  writeJsonc(configPath, cfg);
}

export function delete_mcp_server(name: string): void {
  const configPath = getConfigPath();
  const cfg = readJsonc(configPath);
  const servers = cfg.mcpServers || {};
  if (!(name in servers)) {
    throw new Error(`MCP server '${name}' not found`);
  }
  delete servers[name];
  writeJsonc(configPath, cfg);
}

export function get_skills_permission(): Record<string, string> {
  return {};
}

export function set_skill_permission(_name: string, _allowed: boolean): void {
  // Claude doesn't have a permission system for skills
}
