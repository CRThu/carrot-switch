import { existsSync } from "fs";
import { dirname } from "path";
import { readJsonc, writeJsonc } from "../jsonc.js";

export class BaseConfig {
  constructor(private _configPath: string) {}

  get configPath(): string {
    return this._configPath;
  }

  isAvailable(): boolean {
    return existsSync(dirname(this._configPath));
  }

  getMcpServers(): Record<string, any> {
    const cfg = readJsonc(this._configPath);
    return cfg.mcp || {};
  }

  addMcpServer(name: string, server: Record<string, any>): void {
    const cfg = readJsonc(this._configPath);
    if (!cfg.mcp) cfg.mcp = {};
    cfg.mcp[name] = server;
    writeJsonc(this._configPath, cfg);
  }

  updateMcpServer(name: string, server: Record<string, any>): void {
    const cfg = readJsonc(this._configPath);
    if (!cfg.mcp || !(name in cfg.mcp)) {
      throw new Error(`MCP server '${name}' not found`);
    }
    cfg.mcp[name] = server;
    writeJsonc(this._configPath, cfg);
  }

  deleteMcpServer(name: string): void {
    const cfg = readJsonc(this._configPath);
    const servers = cfg.mcp || {};
    if (!(name in servers)) {
      throw new Error(`MCP server '${name}' not found`);
    }
    delete servers[name];
    writeJsonc(this._configPath, cfg);
  }

  toggleMcpServer(name: string): boolean {
    const cfg = readJsonc(this._configPath);
    const servers = cfg.mcp || {};
    if (!(name in servers)) {
      throw new Error(`MCP server '${name}' not found`);
    }
    const current = servers[name].enabled !== false;
    servers[name].enabled = !current;
    writeJsonc(this._configPath, cfg);
    return !current;
  }

  getSkillsPermission(): Record<string, string> {
    const cfg = readJsonc(this._configPath);
    return cfg.permission?.skill || {};
  }

  setSkillPermission(name: string, allowed: boolean): void {
    const cfg = readJsonc(this._configPath);
    if (!cfg.permission) cfg.permission = {};
    if (!cfg.permission.skill) cfg.permission.skill = {};
    cfg.permission.skill[name] = allowed ? "allow" : "deny";
    writeJsonc(this._configPath, cfg);
  }
}
