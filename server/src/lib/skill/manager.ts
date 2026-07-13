import { join } from "path";
import { homedir, tmpdir } from "os";
import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync, mkdtempSync } from "fs";
import { getUserSkillsDir } from "./paths.js";
import { backupSkill } from "../backup.js";
import * as skillStore from "../store/skill.js";
import * as oc from "../config/opencode.js";
import * as mc from "../config/mimocode.js";
import * as cl from "../config/claude.js";

const AGENT_CONFIGS: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };

function findSkillMd(dir: string): string | null {
  if (existsSync(join(dir, "SKILL.md"))) return dir;
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    try {
      if (statSync(entryPath).isDirectory()) {
        const found = findSkillMd(entryPath);
        if (found) return found;
      }
    } catch {
      // skip
    }
  }
  return null;
}

export function installFromLocal(agent: string, sourcePath: string, skillName?: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source path is not a directory: ${sourcePath}`);
  }
  if (!existsSync(join(sourcePath, "SKILL.md"))) {
    throw new Error(`Source directory does not contain SKILL.md: ${sourcePath}`);
  }

  const name = skillName || sourcePath.split(/[\\/]/).pop() || "unknown";
  const dest = join(getUserSkillsDir(agent), name);
  if (existsSync(dest)) {
    throw new Error(`Skill '${name}' already exists`);
  }

  backupSkill(agent, name);
  cpSync(sourcePath, dest, { recursive: true });

  skillStore.recordInstall(agent, name, sourcePath, "local", dest);
  return name;
}

export async function installFromGithub(agent: string, repoUrl: string, skillName?: string): Promise<string> {
  if (!repoUrl.startsWith("http")) {
    repoUrl = `https://github.com/${repoUrl}.git`;
  }

  const name = skillName || repoUrl.split("/").pop()?.replace(".git", "") || "unknown";
  const dest = join(getUserSkillsDir(agent), name);
  if (existsSync(dest)) {
    throw new Error(`Skill '${name}' already exists`);
  }

  mkdirSync(dest, { recursive: true });
  backupSkill(agent, name);

  const proc = Bun.spawn(["git", "clone", repoUrl, dest]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`git clone failed with exit code ${proc.exitCode}`);
  }

  skillStore.recordInstall(agent, name, repoUrl, "github", dest);
  return name;
}

export async function installFromZip(agent: string, source: string, skillName?: string): Promise<string> {
  const tmpDir = mkdtempSync(join(tmpdir(), "carrot-"));
  try {
    let zipPath: string;

    if (source.startsWith("http")) {
      zipPath = join(tmpDir, "skill.zip");
      const res = await fetch(source);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      await Bun.write(zipPath, buffer);
    } else {
      zipPath = source;
      if (!existsSync(zipPath)) {
        throw new Error(`ZIP file not found: ${source}`);
      }
    }

    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip(zipPath);
    const extractDir = join(tmpDir, "extracted");
    zip.extractAllTo(extractDir, true);

    const skillDir = findSkillMd(extractDir);
    if (!skillDir) {
      throw new Error("ZIP does not contain a directory with SKILL.md");
    }

    const name = skillName || skillDir.split(/[\\/]/).pop() || "unknown";
    const dest = join(getUserSkillsDir(agent), name);
    if (existsSync(dest)) {
      throw new Error(`Skill '${name}' already exists`);
    }

    backupSkill(agent, name);
    cpSync(skillDir, dest, { recursive: true });

    skillStore.recordInstall(agent, name, source, "zip", dest);
    return name;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function installFromUrl(agent: string, url: string, skillName?: string): Promise<string> {
  let ext = ".zip";
  if (url.includes(".tar.gz") || url.includes(".tgz")) ext = ".tar.gz";
  else if (url.includes(".tar")) ext = ".tar";

  const tmpDir = mkdtempSync(join(tmpdir(), "carrot-"));
  try {
    const archivePath = join(tmpDir, `skill${ext}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await Bun.write(archivePath, buffer);

    const extractDir = join(tmpDir, "extracted");
    mkdirSync(extractDir);

    if (ext === ".zip") {
      const { default: AdmZip } = await import("adm-zip");
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(extractDir, true);
    } else {
      const tar = await import("tar");
      await tar.extract({ file: archivePath, cwd: extractDir });
    }

    const skillDir = findSkillMd(extractDir);
    if (!skillDir) {
      throw new Error("Downloaded archive does not contain a directory with SKILL.md");
    }

    const name = skillName || skillDir.split(/[\\/]/).pop() || "unknown";
    const dest = join(getUserSkillsDir(agent), name);
    if (existsSync(dest)) {
      throw new Error(`Skill '${name}' already exists`);
    }

    backupSkill(agent, name);
    cpSync(skillDir, dest, { recursive: true });

    skillStore.recordInstall(agent, name, url, "url", dest);
    return name;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function uninstall(agent: string, name: string): void {
  const skillDir = join(getUserSkillsDir(agent), name);
  if (!existsSync(skillDir)) {
    throw new Error(`Skill '${name}' not found`);
  }
  backupSkill(agent, name);
  rmSync(skillDir, { recursive: true, force: true });
  skillStore.recordUninstall(agent, name);
}

// List only user-installed skills (not builtin)
function listUserSkills(agent: string): Array<{ name: string; path: string }> {
  const base = getUserSkillsDir(agent);
  if (!existsSync(base)) return [];

  const skills: Array<{ name: string; path: string }> = [];
  for (const entry of readdirSync(base)) {
    const entryPath = join(base, entry);
    try {
      if (statSync(entryPath).isDirectory() && existsSync(join(entryPath, "SKILL.md"))) {
        skills.push({ name: entry, path: entryPath });
      }
    } catch {
      // skip
    }
  }
  return skills;
}

export function listInstalled(agent: string): Array<Record<string, any>> {
  const config = AGENT_CONFIGS[agent];
  if (!config) return [];

  const permissions = config.get_skills_permission();
  const localMeta = skillStore.load(agent).skills || {};

  const skills = listUserSkills(agent);
  for (const skill of skills) {
    const perm = permissions[skill.name] || "allow";
    (skill as any).allowed = perm === "allow";

    const meta = localMeta[skill.name] || {};
    (skill as any).source = meta.source || "";
    (skill as any).sourceType = meta.sourceType || "";
    (skill as any).installedAt = meta.installedAt || "";
  }

  return skills as Array<Record<string, any>>;
}

export function togglePermission(agent: string, name: string): boolean {
  const config = AGENT_CONFIGS[agent];
  if (!config) return true;

  const permissions = config.get_skills_permission();
  const current = (permissions[name] || "allow") === "allow";
  config.set_skill_permission(name, !current);
  return !current;
}
