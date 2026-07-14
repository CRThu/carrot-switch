import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

import * as repoSkill from "../lib/repository/skill.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";
import { AGENTS_ROOT } from "../lib/base.js";

const TEST_SKILL_SYNC = "sync-test-skill";
const TEST_SKILL_SYNC2 = "sync-test-skill-2";
const TEST_AGENT = "opencode";

describe("Agent Skill - syncAll and edge cases", () => {
  beforeAll(() => {
    // Ensure test skills exist in repository
    if (!repoSkill.exists(TEST_SKILL_SYNC)) {
      repoSkill.add(TEST_SKILL_SYNC, "https://github.com/test/repo1", "github");
    }
    if (!repoSkill.exists(TEST_SKILL_SYNC2)) {
      repoSkill.add(TEST_SKILL_SYNC2, "https://github.com/test/repo2", "github");
    }

    // Ensure skill directories exist in repository
    for (const name of [TEST_SKILL_SYNC, TEST_SKILL_SYNC2]) {
      const skillDir = repoSkill.getSkillPath(name);
      if (!existsSync(skillDir)) {
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, "SKILL.md"), `# ${name}\n\nTest skill.`, "utf-8");
      }
    }

    // Disable from agent first
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC); } catch {}
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC2); } catch {}
  });

  afterAll(() => {
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC); } catch {}
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC2); } catch {}
    try { repoSkill.remove(TEST_SKILL_SYNC); } catch {}
    try { repoSkill.remove(TEST_SKILL_SYNC2); } catch {}
  });

  describe("syncAll", () => {
    it("syncs enabled skills to agent directory", () => {
      agentSkill.enable(TEST_AGENT, TEST_SKILL_SYNC);
      agentSkill.enable(TEST_AGENT, TEST_SKILL_SYNC2);

      // syncAll should not throw
      agentSkill.syncAll(TEST_AGENT);

      // Both should still be enabled
      expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_SYNC)).toBe(true);
      expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_SYNC2)).toBe(true);

      // Skill directories should exist in agent dir
      expect(existsSync(join(getUserSkillsDir(TEST_AGENT), TEST_SKILL_SYNC))).toBe(true);
      expect(existsSync(join(getUserSkillsDir(TEST_AGENT), TEST_SKILL_SYNC2))).toBe(true);
    });

    it("syncAll handles missing repository skill gracefully", () => {
      agentSkill.enable(TEST_AGENT, TEST_SKILL_SYNC);

      // syncAll should not throw even if some skills are missing from repository
      expect(() => agentSkill.syncAll(TEST_AGENT)).not.toThrow();
    });

    it("syncAll with empty enable list", () => {
      agentSkill.toggleAll(TEST_AGENT, false);

      // syncAll with empty list should not throw
      expect(() => agentSkill.syncAll(TEST_AGENT)).not.toThrow();
    });

    it("syncAll does not overwrite existing skill directories", () => {
      // Enable a skill
      agentSkill.enable(TEST_AGENT, TEST_SKILL_SYNC);

      // Modify the agent's copy
      const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL_SYNC);
      writeFileSync(join(agentSkillDir, "custom-file.txt"), "custom", "utf-8");

      // syncAll should not overwrite
      agentSkill.syncAll(TEST_AGENT);

      // Custom file should still exist
      expect(existsSync(join(agentSkillDir, "custom-file.txt"))).toBe(true);
    });
  });

  describe("toggleAll edge cases", () => {
    it("toggleAll true enables all repository skills", () => {
      agentSkill.toggleAll(TEST_AGENT, true);
      const enabled = agentSkill.getEnabled(TEST_AGENT);
      expect(enabled).toContain(TEST_SKILL_SYNC);
      expect(enabled).toContain(TEST_SKILL_SYNC2);
    });

    it("toggleAll false disables all skills", () => {
      agentSkill.toggleAll(TEST_AGENT, false);
      const enabled = agentSkill.getEnabled(TEST_AGENT);
      expect(enabled.length).toBe(0);
    });
  });

  describe("enable/disable edge cases", () => {
    it("disable when skill is not enabled does not throw", () => {
      agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC);
      expect(() => agentSkill.disable(TEST_AGENT, TEST_SKILL_SYNC)).not.toThrow();
    });

    it("enable throws for non-existent agent", () => {
      expect(() => agentSkill.enable("nonexistent", TEST_SKILL_SYNC)).toThrow("Unknown agent");
    });

    it("disable throws for non-existent agent", () => {
      expect(() => agentSkill.disable("nonexistent", TEST_SKILL_SYNC)).toThrow("Unknown agent");
    });

    it("syncAll throws for non-existent agent", () => {
      expect(() => agentSkill.syncAll("nonexistent")).toThrow("Unknown agent");
    });

    it("toggleAll throws for non-existent agent", () => {
      expect(() => agentSkill.toggleAll("nonexistent", true)).toThrow("Unknown agent");
    });

    it("enable throws for non-existent repository skill", () => {
      expect(() => agentSkill.enable(TEST_AGENT, "nonexistent-skill")).toThrow("not found");
    });
  });

  describe("readEnableList edge cases", () => {
    it("handles corrupted JSON in enable list file", () => {
      const enableListPath = join(AGENTS_ROOT, TEST_AGENT, "skill-enabled.json");
      mkdirSync(join(AGENTS_ROOT, TEST_AGENT), { recursive: true });
      writeFileSync(enableListPath, "not valid json {{{", "utf-8");

      const enabled = agentSkill.getEnabled(TEST_AGENT);
      expect(Array.isArray(enabled)).toBe(true);

      // Restore valid state
      writeFileSync(enableListPath, "[]", "utf-8");
    });
  });
});
