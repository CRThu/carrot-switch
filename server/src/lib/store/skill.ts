import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";
import { readJsonc, writeJsonc } from "../jsonc.js";

const STORE_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch");

function storePath(agent: string): string {
  return join(STORE_ROOT, "skills", `${agent}.json`);
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

export function load(agent: string): Record<string, any> {
  const path = storePath(agent);
  if (!existsSync(path)) return { skills: {} };
  return readJsonc(path);
}

export function save(agent: string, data: Record<string, any>): void {
  const path = storePath(agent);
  ensureDir(path);
  writeJsonc(path, data);
}

export function recordInstall(
  agent: string,
  name: string,
  source: string,
  sourceType: string,
  skillPath: string
): void {
  const data = load(agent);
  if (!data.skills) data.skills = {};
  data.skills[name] = {
    source,
    sourceType,
    installedAt: nowIso(),
    path: skillPath,
  };
  save(agent, data);
}

export function recordUninstall(agent: string, name: string): void {
  const data = load(agent);
  if (data.skills) {
    delete data.skills[name];
  }
  save(agent, data);
}

export function getSkillMeta(agent: string, name: string): Record<string, any> | null {
  const data = load(agent);
  return data.skills?.[name] || null;
}
