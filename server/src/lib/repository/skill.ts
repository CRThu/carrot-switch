import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import type { SkillMeta, SkillSourceType } from "@carrot-switch/shared";

const REPO_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch", "repository");
const SKILL_DIR = join(REPO_ROOT, "skills");
const META_FILE = join(REPO_ROOT, "skill-meta.json");

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readMetaFile(): { skills: Record<string, SkillMeta> } {
  if (!existsSync(META_FILE)) {
    return { skills: {} };
  }
  try {
    return JSON.parse(readFileSync(META_FILE, "utf-8"));
  } catch {
    return { skills: {} };
  }
}

function writeMetaFile(data: { skills: Record<string, SkillMeta> }): void {
  ensureDir(META_FILE.substring(0, META_FILE.lastIndexOf("\\") !== -1 ? META_FILE.lastIndexOf("\\") : META_FILE.lastIndexOf("/")));
  writeFileSync(META_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function listAll(): SkillMeta[] {
  const meta = readMetaFile();
  return Object.values(meta.skills);
}

export function get(name: string): SkillMeta | null {
  const meta = readMetaFile();
  return meta.skills[name] || null;
}

export function add(name: string, source: string, sourceType: SkillSourceType, description?: string): SkillMeta {
  const meta = readMetaFile();
  const skillMeta: SkillMeta = {
    name,
    source,
    sourceType,
    installedAt: nowIso(),
    description,
  };
  meta.skills[name] = skillMeta;
  writeMetaFile(meta);
  return skillMeta;
}

export function remove(name: string): void {
  const meta = readMetaFile();
  if (!meta.skills[name]) {
    throw new Error(`Skill '${name}' not found in repository`);
  }
  delete meta.skills[name];
  writeMetaFile(meta);

  // Remove skill directory
  const skillDir = join(SKILL_DIR, name);
  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true, force: true });
  }
}

export function exists(name: string): boolean {
  return !!get(name);
}

export function getSkillPath(name: string): string {
  return join(SKILL_DIR, name);
}

export function ensureSkillDir(): void {
  ensureDir(SKILL_DIR);
}
