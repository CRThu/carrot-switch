import { join } from "path";
import { homedir } from "os";
import { existsSync, copyFileSync, cpSync, mkdirSync } from "fs";
import { getUserSkillsDir } from "./skill/paths.js";

const BACKUP_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch");

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}${s}`;
}

export function backupConfig(agent: string, configPath: string): string {
  const ts = timestamp();
  const destDir = join(BACKUP_ROOT, "mcp", agent);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `config_${ts}.jsonc`);
  if (existsSync(configPath)) {
    copyFileSync(configPath, dest);
  }
  return dest;
}

export function backupSkill(agent: string, skillName: string): string | null {
  const skillDir = join(getUserSkillsDir(agent), skillName);
  if (!existsSync(skillDir)) return null;

  const ts = timestamp();
  const destDir = join(BACKUP_ROOT, "skill", agent);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${skillName}_${ts}`);
  cpSync(skillDir, dest, { recursive: true });
  return dest;
}
