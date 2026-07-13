import { join } from "path";
import { homedir } from "os";
import { existsSync, readdirSync, statSync } from "fs";
import * as oc from "../config/opencode.js";
import * as mc from "../config/mimocode.js";
import * as cl from "../config/claude.js";

const HOME = homedir();

// Builtin skills are read-only, shipped with the agent
// Structure: builtin_skills/{version}/skills/{name}/SKILL.md
const BUILTIN_SKILLS_BASE: Record<string, string> = {
  opencode: join(HOME, ".codex", "skills", ".system"),
  mimocode: join(HOME, ".local", "share", "mimocode", "builtin_skills"),
  claude: join(HOME, ".claude", "skills", ".system"),
};

const AGENT_CONFIGS: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };

export function getBuiltinSkillsDir(agent: string): string {
  const dir = BUILTIN_SKILLS_BASE[agent];
  if (!dir) throw new Error(`Unknown agent: ${agent}`);
  return dir;
}

export interface BuiltinSkill {
  name: string;
  path: string;
  allowed: boolean;
  version?: string;
}

// Recursively find all SKILL.md files in a directory
function findSkillsRecursive(dir: string, baseDir: string): Array<{ name: string; path: string }> {
  const skills: Array<{ name: string; path: string }> = [];
  if (!existsSync(dir)) return skills;

  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    try {
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        // Check if this directory has SKILL.md
        if (existsSync(join(entryPath, "SKILL.md"))) {
          skills.push({ name: entry, path: entryPath });
        } else {
          // Recurse into subdirectory
          skills.push(...findSkillsRecursive(entryPath, baseDir));
        }
      }
    } catch {
      // skip
    }
  }
  return skills;
}

export function listBuiltinSkills(agent: string): BuiltinSkill[] {
  const base = BUILTIN_SKILLS_BASE[agent];
  if (!base || !existsSync(base)) return [];

  const config = AGENT_CONFIGS[agent];
  const permissions = config?.get_skills_permission() || {};

  // For MiMoCode, skills are in {version}/skills/{name}/
  // For others, skills are directly in the directory
  let skillDirs: Array<{ name: string; path: string }> = [];

  if (agent === "mimocode") {
    // Scan version directories
    for (const versionEntry of readdirSync(base)) {
      const versionPath = join(base, versionEntry);
      try {
        if (statSync(versionPath).isDirectory()) {
          const skillsPath = join(versionPath, "skills");
          if (existsSync(skillsPath)) {
            const versionSkills = findSkillsRecursive(skillsPath, base);
            skillDirs.push(...versionSkills);
          }
        }
      } catch {
        // skip
      }
    }
  } else {
    // Direct scan for opencode/claude
    skillDirs = findSkillsRecursive(base, base);
  }

  // Deduplicate by name (keep the first occurrence)
  const seen = new Set<string>();
  const skills: BuiltinSkill[] = [];

  for (const skill of skillDirs) {
    if (seen.has(skill.name)) continue;
    seen.add(skill.name);

    const perm = permissions[skill.name] || "allow";
    skills.push({
      name: skill.name,
      path: skill.path,
      allowed: perm === "allow",
    });
  }

  return skills;
}

export function toggleBuiltinSkillPermission(agent: string, name: string): boolean {
  const config = AGENT_CONFIGS[agent];
  if (!config) return true;

  const permissions = config.get_skills_permission();
  const current = (permissions[name] || "allow") === "allow";
  config.set_skill_permission(name, !current);
  return !current;
}
