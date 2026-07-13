import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function createTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "carrot-test-"));
}

export function cleanupTmpDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function createConfigDir(baseDir: string, agent: string): string {
  let configDir: string;
  let configFile: string;

  switch (agent) {
    case "opencode":
      configDir = join(baseDir, ".config", "opencode");
      configFile = join(configDir, "opencode.jsonc");
      break;
    case "mimocode":
      configDir = join(baseDir, ".config", "mimocode");
      configFile = join(configDir, "mimocode.jsonc");
      break;
    case "claude":
      configDir = baseDir;
      configFile = join(baseDir, ".claude.json");
      break;
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }

  mkdirSync(configDir, { recursive: true });
  writeFileSync(configFile, "{}", "utf-8");
  return configFile;
}

export function writeJsonFile(path: string, data: Record<string, any>): void {
  const dir = path.substring(0, path.lastIndexOf("\\") !== -1 ? path.lastIndexOf("\\") : path.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}
