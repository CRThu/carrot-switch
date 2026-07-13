import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test backup logic by simulating the backup operations
describe("Backup operations", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-backup-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("config backup", () => {
    it("copies config file to backup location", () => {
      const configPath = join(tmpDir, "config.jsonc");
      const backupDir = join(tmpDir, "backups");
      const backupPath = join(backupDir, "config_20240101_120000.jsonc");

      // Create config file
      writeFileSync(configPath, '{"mcp": {"server1": {"type": "local"}}}', "utf-8");

      // Simulate backup operation
      mkdirSync(backupDir, { recursive: true });
      const { copyFileSync } = require("fs");
      copyFileSync(configPath, backupPath);

      expect(existsSync(backupPath)).toBe(true);
      const content = readFileSync(backupPath, "utf-8");
      expect(content).toContain("server1");
    });

    it("handles missing config file gracefully", () => {
      const configPath = join(tmpDir, "nonexistent.jsonc");
      const backupDir = join(tmpDir, "backups");
      const backupPath = join(backupDir, "config_20240101_120000.jsonc");

      mkdirSync(backupDir, { recursive: true });

      // Should not throw when config doesn't exist
      if (existsSync(configPath)) {
        const { copyFileSync } = require("fs");
        copyFileSync(configPath, backupPath);
      }

      expect(existsSync(backupPath)).toBe(false);
    });
  });

  describe("skill backup", () => {
    it("copies skill directory to backup location", () => {
      const skillDir = join(tmpDir, "skills", "my-skill");
      const backupDir = join(tmpDir, "backups");
      const backupPath = join(backupDir, "my-skill_20240101_120000");

      // Create skill directory with SKILL.md
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# My Skill", "utf-8");
      writeFileSync(join(skillDir, "index.ts"), "export default {}", "utf-8");

      // Simulate backup operation
      mkdirSync(backupDir, { recursive: true });
      const { cpSync } = require("fs");
      cpSync(skillDir, backupPath, { recursive: true });

      expect(existsSync(backupPath)).toBe(true);
      expect(existsSync(join(backupPath, "SKILL.md"))).toBe(true);
      expect(existsSync(join(backupPath, "index.ts"))).toBe(true);
    });

    it("handles missing skill directory", () => {
      const skillDir = join(tmpDir, "nonexistent-skill");
      const backupDir = join(tmpDir, "backups");

      mkdirSync(backupDir, { recursive: true });

      if (existsSync(skillDir)) {
        const { cpSync } = require("fs");
        cpSync(skillDir, join(backupDir, "backup"), { recursive: true });
      }

      expect(existsSync(join(backupDir, "backup"))).toBe(false);
    });
  });

  describe("backup directory structure", () => {
    it("creates proper backup directory hierarchy", () => {
      const backupRoot = join(tmpDir, ".carrotswitch");

      // Simulate creating backup directories for different agents
      const agents = ["opencode", "mimocode", "claude"];
      for (const agent of agents) {
        mkdirSync(join(backupRoot, "mcp", agent), { recursive: true });
        mkdirSync(join(backupRoot, "skill", agent), { recursive: true });
      }

      for (const agent of agents) {
        expect(existsSync(join(backupRoot, "mcp", agent))).toBe(true);
        expect(existsSync(join(backupRoot, "skill", agent))).toBe(true);
      }
    });

    it("generates timestamp-based backup filenames", () => {
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

      const backupPath = join(tmpDir, `config_${ts}.jsonc`);

      // Verify timestamp format
      expect(ts).toMatch(/^\d{8}_\d{6}$/);
      expect(backupPath).toContain(ts);
    });
  });
});
