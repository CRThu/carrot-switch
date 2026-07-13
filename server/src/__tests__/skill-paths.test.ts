import { describe, it, expect } from "bun:test";
import { homedir } from "os";
import { join } from "path";

// Test skill path configuration
describe("Skill paths", () => {
  describe("getUserSkillsDir", () => {
    it("returns correct path for opencode", () => {
      const expected = join(homedir(), ".config", "opencode", "skills");
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      expect(getUserSkillsDir("opencode")).toBe(expected);
    });

    it("returns correct path for mimocode", () => {
      const expected = join(homedir(), ".config", "mimocode", "skills");
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      expect(getUserSkillsDir("mimocode")).toBe(expected);
    });

    it("returns correct path for claude", () => {
      const expected = join(homedir(), ".claude", "skills");
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      expect(getUserSkillsDir("claude")).toBe(expected);
    });

    it("throws for unknown agent", () => {
      const { getUserSkillsDir } = require("../lib/skill/paths.js");
      expect(() => getUserSkillsDir("unknown")).toThrow("Unknown agent");
    });
  });

  describe("getBuiltinSkillsDir", () => {
    it("returns null for opencode (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("opencode")).toBeNull();
    });

    it("returns correct path for mimocode", () => {
      const expected = join(homedir(), ".local", "share", "mimocode", "builtin_skills");
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("mimocode")).toBe(expected);
    });

    it("returns null for claude (no builtin skills)", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("claude")).toBeNull();
    });

    it("returns null for unknown agent", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("unknown")).toBeNull();
    });
  });
});
