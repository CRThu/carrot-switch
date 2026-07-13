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

function getBuiltinSkills(agent: string): string {
  switch (agent) {
    case "opencode": return join(HOME, ".codex", "skills", ".system");
    case "mimocode": return join(HOME, ".local", "share", "mimocode", "builtin_skills");
    case "claude": return join(HOME, ".claude", "skills", ".system");
    default: throw new Error(`Unknown agent: ${agent}`);
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

  for (const isBuiltin of [false, true]) {
    const base = isBuiltin ? getBuiltinSkills(agent) : getUserSkills(agent);
    if (!existsSync(base)) continue;

    for (const entry of readdirSync(base)) {
      const entryPath = join(base, entry);
      try {
        if (statSync(entryPath).isDirectory() && existsSync(join(entryPath, "SKILL.md"))) {
          skills.push({ name: entry, path: entryPath, builtin: isBuiltin });
        }
      } catch {
        // skip entries we can't stat
      }
    }
  }

  return skills;
}
