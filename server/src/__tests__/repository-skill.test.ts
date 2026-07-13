import { describe, it, expect, beforeAll, afterAll } from "bun:test";

import * as repoSkill from "../lib/repository/skill.js";

const TEST_NAMES = ["repo-skill-test-1", "repo-skill-test-2"];

describe("Repository Skill", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    for (const name of TEST_NAMES) {
      try { repoSkill.remove(name); } catch {}
    }
  });

  afterAll(async () => {
    // Clean up test data
    for (const name of TEST_NAMES) {
      try { repoSkill.remove(name); } catch {}
    }
  });

  it("listAll returns array", () => {
    const result = repoSkill.listAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("adds skill metadata", () => {
    const meta = repoSkill.add("repo-skill-test-1", "https://github.com/test/repo", "github");
    expect(meta.name).toBe("repo-skill-test-1");
    expect(meta.source).toBe("https://github.com/test/repo");
    expect(meta.sourceType).toBe("github");
    expect(meta.installedAt).toBeDefined();
  });

  it("gets skill metadata", () => {
    const meta = repoSkill.get("repo-skill-test-1");
    expect(meta).not.toBeNull();
    expect(meta!.name).toBe("repo-skill-test-1");
    expect(meta!.sourceType).toBe("github");
  });

  it("returns null for non-existent skill", () => {
    const meta = repoSkill.get("non-existent-skill");
    expect(meta).toBeNull();
  });

  it("lists all skills", () => {
    repoSkill.add("repo-skill-test-2", "/local/path", "local", "A test skill");

    const all = repoSkill.listAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    const names = all.map(s => s.name);
    expect(names).toContain("repo-skill-test-1");
    expect(names).toContain("repo-skill-test-2");
  });

  it("skill has description", () => {
    const meta = repoSkill.get("repo-skill-test-2");
    expect(meta!.description).toBe("A test skill");
  });

  it("exists returns true for existing skill", () => {
    expect(repoSkill.exists("repo-skill-test-1")).toBe(true);
  });

  it("exists returns false for non-existent skill", () => {
    expect(repoSkill.exists("definitely-not-exists")).toBe(false);
  });

  it("removes skill metadata", () => {
    repoSkill.add("repo-skill-test-temp", "/tmp/path", "local");
    expect(repoSkill.exists("repo-skill-test-temp")).toBe(true);

    repoSkill.remove("repo-skill-test-temp");
    expect(repoSkill.exists("repo-skill-test-temp")).toBe(false);
  });

  it("throws on remove of non-existent skill", () => {
    expect(() => {
      repoSkill.remove("non-existent");
    }).toThrow("not found");
  });

  it("getSkillPath returns correct path", () => {
    const path = repoSkill.getSkillPath("any-skill");
    expect(path).toContain("skills");
    expect(path).toContain("any-skill");
  });

  it("ensureSkillDir creates directory", () => {
    repoSkill.ensureSkillDir();
    const path = repoSkill.getSkillPath("test");
    const dir = path.substring(0, path.lastIndexOf("\\") !== -1 ? path.lastIndexOf("\\") : path.lastIndexOf("/"));
    const { existsSync } = require("fs");
    expect(existsSync(dir)).toBe(true);
  });
});
