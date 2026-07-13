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
    it("returns correct path for opencode", () => {
      const expected = join(homedir(), ".codex", "skills", ".system");
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("opencode")).toBe(expected);
    });

    it("returns correct path for mimocode", () => {
      const expected = join(homedir(), ".local", "share", "mimocode", "builtin_skills");
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("mimocode")).toBe(expected);
    });

    it("returns correct path for claude", () => {
      const expected = join(homedir(), ".claude", "skills", ".system");
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(getBuiltinSkillsDir("claude")).toBe(expected);
    });

    it("throws for unknown agent", () => {
      const { getBuiltinSkillsDir } = require("../lib/skill/paths.js");
      expect(() => getBuiltinSkillsDir("unknown")).toThrow("Unknown agent");
    });
  });
});
