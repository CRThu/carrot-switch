import { join } from "path";
import { homedir } from "os";
import { existsSync, readdirSync, statSync } from "fs";

const HOME = homedir();

function getUserSkills(agent: string): string {
  switch (agent) {
    case "opencode": return join(HOME, ".config", "opencode", "skills");
    case "mimocode": return join(HOME, ".config", "mimocode", "skills");
    case "claude": return join(HOME, ".claude", "skills");
    default: throw new Error(`Unknown agent: ${agent}`);
  }
}

function getBuiltinSkills(agent: string): string | null {
  switch (agent) {
    case "mimocode": return join(HOME, ".local", "share", "mimocode", "builtin_skills");
    default: return null; // Only MiMoCode has builtin skills
  }
}

export function getUserSkillsDir(agent: string): string {
  return getUserSkills(agent);
}

export function getBuiltinSkillsDir(agent: string): string {
  return getBuiltinSkills(agent);
}

export function listSkills(agent: string): Array<{ name: string; path: string; builtin: boolean }> {
  const skills: Array<{ name: string; path: string; builtin: boolean }> = [];

  // User skills
  const userBase = getUserSkills(agent);
  if (existsSync(userBase)) {
    for (const entry of readdirSync(userBase)) {
      const entryPath = join(userBase, entry);
      try {
        if (statSync(entryPath).isDirectory() && existsSync(join(entryPath, "SKILL.md"))) {
          skills.push({ name: entry, path: entryPath, builtin: false });
        }
      } catch {
        // skip entries we can't stat
      }
    }
  }

  // Builtin skills (only for agents that have them)
  const builtinBase = getBuiltinSkills(agent);
  if (builtinBase && existsSync(builtinBase)) {
    for (const entry of readdirSync(builtinBase)) {
      const entryPath = join(builtinBase, entry);
      try {
        if (statSync(entryPath).isDirectory() && existsSync(join(entryPath, "SKILL.md"))) {
          skills.push({ name: entry, path: entryPath, builtin: true });
        }
      } catch {
        // skip entries we can't stat
      }
    }
  }

  return skills;
}
