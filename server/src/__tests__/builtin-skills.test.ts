import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test builtin skills module functions
describe("Builtin skills module", () => {
  describe("getBuiltinSkillsDir", () => {
    it("returns null for opencode (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("opencode");
      expect(path).toBeNull();
    });

    it("returns correct path for mimocode", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("mimocode");
      expect(path).toContain("mimocode");
      expect(path).toContain("builtin_skills");
    });

    it("returns null for claude (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      const path = getBuiltinSkillsDir("claude");
      expect(path).toBeNull();
    });

    it("returns null for unknown agent", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/builtin.js");
      expect(getBuiltinSkillsDir("unknown")).toBeNull();
    });
  });

  describe("listBuiltinSkills", () => {
    it("returns empty array for opencode (no builtin skills)", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("opencode");
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBe(0);
    });

    it("each skill has required fields", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("mimocode");
      for (const skill of skills) {
        expect(skill.name).toBeDefined();
        expect(typeof skill.name).toBe("string");
        expect(skill.path).toBeDefined();
        expect(typeof skill.path).toBe("string");
        expect(typeof skill.allowed).toBe("boolean");
      }
    });

    it("returns empty array for claude (no builtin skills)", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("claude");
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBe(0);
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
      const result = toggleBuiltinSkillPermission("mimocode", "test-skill-perm");
      expect(typeof result).toBe("boolean");
    });

    it("toggles back to original state", () => {
      const { toggleBuiltinSkillPermission } = require("../lib/skill/builtin.js");
      const result1 = toggleBuiltinSkillPermission("mimocode", "test-skill-toggle");
      const result2 = toggleBuiltinSkillPermission("mimocode", "test-skill-toggle");
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

  describe("Agents without builtin skills", () => {
    it("opencode returns empty array", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("opencode");
      expect(skills).toEqual([]);
    });

    it("claude returns empty array", () => {
      const { listBuiltinSkills } = require("../lib/skill/builtin.js");
      const skills = listBuiltinSkills("claude");
      expect(skills).toEqual([]);
    });
  });
});
