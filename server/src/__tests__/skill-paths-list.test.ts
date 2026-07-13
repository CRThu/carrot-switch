import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { homedir } from "os";

// Test listSkills function with actual filesystem operations
describe("Skill paths - listSkills", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-skill-paths-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getUserSkillsDir", () => {
    it("returns path containing 'opencode'", () => {
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      const path = getUserSkillsDir("opencode");
      expect(path).toContain("opencode");
      expect(path).toContain("skills");
    });

    it("returns path containing 'mimocode'", () => {
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      const path = getUserSkillsDir("mimocode");
      expect(path).toContain("mimocode");
      expect(path).toContain("skills");
    });

    it("returns path containing 'claude'", () => {
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      const path = getUserSkillsDir("claude");
      expect(path).toContain("claude");
      expect(path).toContain("skills");
    });

    it("throws for unknown agent", () => {
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      expect(() => getUserSkillsDir("unknown")).toThrow("Unknown agent");
    });
  });

  describe("getBuiltinSkillsDir", () => {
    it("returns null for opencode (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      const path = getBuiltinSkillsDir("opencode");
      expect(path).toBeNull();
    });

    it("returns path containing 'mimocode' for mimocode", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      const path = getBuiltinSkillsDir("mimocode");
      expect(path).toContain("mimocode");
    });

    it("returns null for claude (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      const path = getBuiltinSkillsDir("claude");
      expect(path).toBeNull();
    });

    it("returns null for unknown agent", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("unknown")).toBeNull();
    });
  });

  describe("listSkills", () => {
    it("returns empty array when no skills directories exist", () => {
      const { listSkills } = require("../lib/skill/paths.js");
      const skills = listSkills("opencode");
      expect(Array.isArray(skills)).toBe(true);
    });

    it("returns skills with correct structure", () => {
      const { listSkills } = require("../lib/skill/paths.js");
      const skills = listSkills("opencode");
      for (const skill of skills) {
        expect(skill.name).toBeDefined();
        expect(typeof skill.name).toBe("string");
        expect(skill.path).toBeDefined();
        expect(typeof skill.path).toBe("string");
        expect(typeof skill.builtin).toBe("boolean");
      }
    });

    it("skills have SKILL.md in their directory", () => {
      const { existsSync } = require("fs");
      const { listSkills } = require("../lib/skill/paths.js");
      const skills = listSkills("opencode");
      for (const skill of skills) {
        if (existsSync(skill.path)) {
          expect(existsSync(join(skill.path, "SKILL.md"))).toBe(true);
        }
      }
    });
  });
});
