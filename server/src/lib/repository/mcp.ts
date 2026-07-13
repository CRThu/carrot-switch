import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import type { RepositoryMcp, McpType } from "@carrot-switch/shared";

const REPO_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch", "repository");
const MCP_DIR = join(REPO_ROOT, "mcps");

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath: string): any {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: any): void {
  ensureDir(filePath.substring(0, filePath.lastIndexOf("\\") !== -1 ? filePath.lastIndexOf("\\") : filePath.lastIndexOf("/")));
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function mcpPath(name: string): string {
  return join(MCP_DIR, `${name}.json`);
}

export function listAll(): Record<string, RepositoryMcp> {
  ensureDir(MCP_DIR);
  const result: Record<string, RepositoryMcp> = {};
  const files = readdirSync(MCP_DIR);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const name = file.replace(/\.json$/, "");
    const data = readJson(join(MCP_DIR, file));
    if (data && data.name) {
      result[name] = data as RepositoryMcp;
    }
  }
  return result;
}

export function get(name: string): RepositoryMcp | null {
  const path = mcpPath(name);
  if (!existsSync(path)) return null;
  return readJson(path) as RepositoryMcp | null;
}

export function add(mcp: RepositoryMcp): void {
  ensureDir(MCP_DIR);
  writeJson(mcpPath(mcp.name), mcp);
}

export function update(name: string, patch: Partial<RepositoryMcp>): RepositoryMcp {
  const existing = get(name);
  if (!existing) {
    throw new Error(`MCP server '${name}' not found in repository`);
  }
  const updated: RepositoryMcp = { ...existing, ...patch, name };
  writeJson(mcpPath(name), updated);
  return updated;
}

export function remove(name: string): void {
  const path = mcpPath(name);
  if (!existsSync(path)) {
    throw new Error(`MCP server '${name}' not found in repository`);
  }
  unlinkSync(path);
}

export function exists(name: string): boolean {
  return existsSync(mcpPath(name));
}
