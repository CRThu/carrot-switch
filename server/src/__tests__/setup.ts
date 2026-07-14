import { beforeAll } from "bun:test";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const HOME = homedir();

const dirs = [
  join(HOME, ".config", "opencode"),
  join(HOME, ".config", "mimocode"),
  join(HOME, ".claude"),
];

const files: [string, string][] = [
  [join(HOME, ".config", "opencode", "opencode.jsonc"), "{}"],
  [join(HOME, ".config", "mimocode", "mimocode.jsonc"), "{}"],
  [join(HOME, ".claude.json"), "{}"],
];

beforeAll(() => {
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  for (const [file, content] of files) {
    if (!existsSync(file)) {
      writeFileSync(file, content, "utf-8");
    }
  }
});
