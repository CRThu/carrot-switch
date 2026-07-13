import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "fs";
import * as repository from "../repository/skill.js";
import { getUserSkillsDir } from "../skill/paths.js";
import * as oc from "../config/opencode.js";
import * as mc from "../config/mimocode.js";
import * as cl from "../config/claude.js";
import { AGENTS_ROOT } from "../base.js";

const AGENTS: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };

function enableListPath(agent: string): string {
  return join(AGENTS_ROOT, agent, "skill-enabled.json");
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
  const repoMeta = repository.get(name);
  if (!repoMeta) {
    throw new Error(`Skill '${name}' not found in repository`);
  }

  const list = readEnableList(agent);
  if (!list.includes(name)) {
    list.push(name);
    writeEnableList(agent, list);
  }

  // Copy skill directory to agent's skills dir
  const srcDir = repository.getSkillPath(name);
  const destDir = join(getUserSkillsDir(agent), name);

  if (!existsSync(srcDir)) {
    throw new Error(`Skill directory not found: ${srcDir}`);
  }

  if (!existsSync(destDir)) {
    ensureDir(destDir);
    cpSync(srcDir, destDir, { recursive: true });
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

  // Remove skill directory from agent's skills dir
  const destDir = join(getUserSkillsDir(agent), name);
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
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

  for (const name of list) {
    const repoMeta = repository.get(name);
    if (!repoMeta) continue;

    const srcDir = repository.getSkillPath(name);
    const destDir = join(getUserSkillsDir(agent), name);

    if (!existsSync(srcDir)) continue;

    if (!existsSync(destDir)) {
      ensureDir(destDir);
      cpSync(srcDir, destDir, { recursive: true });
    }
  }
}

export function toggleAll(agent: string, enabled: boolean): void {
  checkAvailable(agent);
  const repoSkills = repository.listAll();
  const names = repoSkills.map(s => s.name);

  for (const name of names) {
    if (enabled) {
      enable(agent, name);
    } else {
      disable(agent, name);
    }
  }
}
