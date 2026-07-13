import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as opencode from "../lib/config/opencode.js";
import { writeJsonc, readJsonc } from "../lib/jsonc.js";
import { mkdtempSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";

let tmpDir: string;
let originalHome: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "carrot-test-"));
  originalHome = homedir();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Note: These tests use the actual home directory config path
// In a real test environment, you'd mock the path resolution

describe("opencode config", () => {
  it("has config path", () => {
    const path = opencode.get_config_path();
    expect(path).toContain("opencode");
    expect(path).toContain("opencode.jsonc");
  });

  it("can read MCP servers", () => {
    const servers = opencode.get_mcp_servers();
    expect(typeof servers).toBe("object");
  });

  it("can get skills permission", () => {
    const perms = opencode.get_skills_permission();
    expect(typeof perms).toBe("object");
  });
});
