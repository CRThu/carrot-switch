import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import * as repoSkill from "../lib/repository/skill.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";

const TEST_SKILL_NAME = "agent-skill-test";
const TEST_AGENT = "opencode";

describe("Agent Skill enable/disable", () => {
  beforeAll(async () => {
    // Ensure test skill metadata exists in repository
    if (!repoSkill.exists(TEST_SKILL_NAME)) {
      repoSkill.add(TEST_SKILL_NAME, "https://github.com/test/repo", "github");
    }

    // Ensure skill directory exists in repository
    const repoSkillDir = repoSkill.getSkillPath(TEST_SKILL_NAME);
    if (!existsSync(repoSkillDir)) {
      mkdirSync(repoSkillDir, { recursive: true });
      writeFileSync(join(repoSkillDir, "SKILL.md"), "# Test Skill\n\nThis is a test.", "utf-8");
    }

    // Disable from agent first
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_NAME); } catch {}
  });

  afterAll(async () => {
    // Clean up
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL_NAME); } catch {}
    try { repoSkill.remove(TEST_SKILL_NAME); } catch {}
  });

  it("getEnabled returns array", () => {
    const enabled = agentSkill.getEnabled(TEST_AGENT);
    expect(Array.isArray(enabled)).toBe(true);
  });

  it("isEnabled returns false initially", () => {
    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_NAME)).toBe(false);
  });

  it("enable copies skill to agent directory", () => {
    agentSkill.enable(TEST_AGENT, TEST_SKILL_NAME);
    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_NAME)).toBe(true);

    const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL_NAME);
    expect(existsSync(agentSkillDir)).toBe(true);
    expect(existsSync(join(agentSkillDir, "SKILL.md"))).toBe(true);
  });

  it("disable removes skill from agent directory", () => {
    agentSkill.disable(TEST_AGENT, TEST_SKILL_NAME);
    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_NAME)).toBe(false);

    const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL_NAME);
    expect(existsSync(agentSkillDir)).toBe(false);
  });

  it("toggle switches state", () => {
    // Ensure OFF first
    agentSkill.disable(TEST_AGENT, TEST_SKILL_NAME);

    const result = agentSkill.toggle(TEST_AGENT, TEST_SKILL_NAME);
    expect(result).toBe(true);
    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_NAME)).toBe(true);

    const result2 = agentSkill.toggle(TEST_AGENT, TEST_SKILL_NAME);
    expect(result2).toBe(false);
    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL_NAME)).toBe(false);
  });

  it("enable throws for non-existent repository skill", () => {
    expect(() => {
      agentSkill.enable(TEST_AGENT, "non-existent-skill");
    }).toThrow("not found");
  });

  it("enable is idempotent", () => {
    agentSkill.enable(TEST_AGENT, TEST_SKILL_NAME);
    agentSkill.enable(TEST_AGENT, TEST_SKILL_NAME); // Should not throw

    const enabled = agentSkill.getEnabled(TEST_AGENT);
    const count = enabled.filter(n => n === TEST_SKILL_NAME).length;
    expect(count).toBe(1);

    // Cleanup
    agentSkill.disable(TEST_AGENT, TEST_SKILL_NAME);
  });

  it("toggleAll enables all repository skills", () => {
    agentSkill.toggleAll(TEST_AGENT, true);
    const enabled = agentSkill.getEnabled(TEST_AGENT);
    expect(enabled).toContain(TEST_SKILL_NAME);
  });

  it("toggleAll disables all skills", () => {
    agentSkill.toggleAll(TEST_AGENT, false);
    const enabled = agentSkill.getEnabled(TEST_AGENT);
    expect(enabled.length).toBe(0);
  });
});
