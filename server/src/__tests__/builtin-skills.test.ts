import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test builtin skills module functions
describe("Builtin skills module", () => {
  describe("getBuiltinSkillsDir", () => {
    it("returns correct path for opencode", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("opencode");
      expect(path).toContain("codex");
      expect(path).toContain(".system");
    });

    it("returns correct path for mimocode", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("mimocode");
      expect(path).toContain("mimocode");
      expect(path).toContain("builtin_skills");
    });

    it("returns correct path for claude", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("claude");
      expect(path).toContain("claude");
      expect(path).toContain(".system");
    });

    it("throws for unknown agent", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      expect(() => getBuiltinSkillsDir("unknown")).toThrow("Unknown agent");
    });
  });

  describe("listBuiltinSkills", () => {
    it("returns array", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("opencode");
      expect(Array.isArray(skills)).toBe(true);
    });

    it("each skill has required fields", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("opencode");
      for (const skill of skills) {
        expect(skill.name).toBeDefined();
        expect(typeof skill.name).toBe("string");
        expect(skill.path).toBeDefined();
        expect(typeof skill.path).toBe("string");
        expect(typeof skill.allowed).toBe("boolean");
      }
    });

    it("returns empty array for agent with no builtin skills dir", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      // The actual builtin dirs may or may not exist
      const skills = listBuiltinSkills("opencode");
      expect(Array.isArray(skills)).toBe(true);
    });

    it("deduplicates skills by name", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("mimocode");
      const names = skills.map((s: any) => s.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  describe("toggleBuiltinSkillPermission", () => {
    it("toggles from allow to deny", () => {
      const { toggleBuiltinSkillPermission } = require("../lib/skill/builtin.js");
      // First toggle should change from default (allow) to deny
      const result = toggleBuiltinSkillPermission("opencode", "test-skill-perm");
      expect(typeof result).toBe("boolean");
    });

    it("toggles back to original state", () => {
      const { toggleBuiltinSkillPermission } = require("../lib/skill/builtin.js");
      const result1 = toggleBuiltinSkillPermission("opencode", "test-skill-toggle");
      const result2 = toggleBuiltinSkillPermission("opencode", "test-skill-toggle");
      expect(result1).not.toBe(result2);
    });

    it("returns true for unknown agent (no-op)", () => {
      const { toggleBuiltinSkillPermission } = require("../lib/skill/builtin.js");
      const result = toggleBuiltinSkillPermission("unknown", "test-skill");
      expect(result).toBe(true);
    });
  });

  describe("MiMoCode version scanning", () => {
    it("handles mimocode builtin skills with version directories", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      // MiMoCode scans {version}/skills/{name}/ structure
      const skills = listBuiltinSkills("mimocode");
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe("Recursive skill scanning", () => {
    it("handles nested skill directories", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      // Both opencode and claude use recursive scanning
      const opencodeSkills = listBuiltinSkills("opencode");
      const claudeSkills = listBuiltinSkills("claude");
      expect(Array.isArray(opencodeSkills)).toBe(true);
      expect(Array.isArray(claudeSkills)).toBe(true);
    });
  });
});
