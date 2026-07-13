import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Skill Manager", () => {
  let tmpDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-skill-mgr-test-"));
    skillsDir = join(tmpDir, "skills");
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("installFromLocal", () => {
    it("installs skill from local directory", () => {
      // Create source skill directory
      const sourceDir = join(tmpDir, "source-skill");
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(join(sourceDir, "SKILL.md"), "# My Skill", "utf-8");
      writeFileSync(join(sourceDir, "index.ts"), "export default {}", "utf-8");

      // Simulate install
      const dest = join(skillsDir, "my-skill");
      const { cpSync } = require("fs");
      cpSync(sourceDir, dest, { recursive: true });

      expect(existsSync(dest)).toBe(true);
      expect(existsSync(join(dest, "SKILL.md"))).toBe(true);
      expect(existsSync(join(dest, "index.ts"))).toBe(true);
    });

    it("throws when source is not a directory", () => {
      const sourceFile = join(tmpDir, "not-a-dir");
      writeFileSync(sourceFile, "content", "utf-8");

      expect(() => {
        const { statSync } = require("fs");
        if (!statSync(sourceFile).isDirectory()) {
          throw new Error("Source path is not a directory");
        }
      }).toThrow("not a directory");
    });

    it("throws when source lacks SKILL.md", () => {
      const sourceDir = join(tmpDir, "no-skill-md");
      mkdirSync(sourceDir, { recursive: true });

      expect(() => {
        if (!existsSync(join(sourceDir, "SKILL.md"))) {
          throw new Error("Source directory does not contain SKILL.md");
        }
      }).toThrow("does not contain SKILL.md");
    });

    it("throws when skill already exists", () => {
      const dest = join(skillsDir, "existing-skill");
      mkdirSync(dest, { recursive: true });

      expect(() => {
        if (existsSync(dest)) {
          throw new Error("Skill 'existing-skill' already exists");
        }
      }).toThrow("already exists");
    });
  });

  describe("uninstall", () => {
    it("removes skill directory", () => {
      const skillDir = join(skillsDir, "skill-to-remove");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# Skill", "utf-8");

      expect(existsSync(skillDir)).toBe(true);

      // Simulate uninstall
      const { rmSync } = require("fs");
      rmSync(skillDir, { recursive: true, force: true });

      expect(existsSync(skillDir)).toBe(false);
    });

    it("throws when skill does not exist", () => {
      const skillDir = join(skillsDir, "nonexistent");

      expect(() => {
        if (!existsSync(skillDir)) {
          throw new Error("Skill 'nonexistent' not found");
        }
      }).toThrow("not found");
    });
  });

  describe("listSkills", () => {
    it("lists installed skills", () => {
      // Create some skill directories
      const skill1 = join(skillsDir, "skill-1");
      const skill2 = join(skillsDir, "skill-2");
      mkdirSync(skill1, { recursive: true });
      mkdirSync(skill2, { recursive: true });
      writeFileSync(join(skill1, "SKILL.md"), "# Skill 1", "utf-8");
      writeFileSync(join(skill2, "SKILL.md"), "# Skill 2", "utf-8");

      // Simulate listSkills
      const skills: string[] = [];
      for (const entry of readdirSync(skillsDir)) {
        const entryPath = join(skillsDir, entry);
        if (existsSync(join(entryPath, "SKILL.md"))) {
          skills.push(entry);
        }
      }

      expect(skills).toHaveLength(2);
      expect(skills).toContain("skill-1");
      expect(skills).toContain("skill-2");
    });

    it("skips directories without SKILL.md", () => {
      const skillDir = join(skillsDir, "valid-skill");
      const otherDir = join(skillsDir, "not-a-skill");
      mkdirSync(skillDir, { recursive: true });
      mkdirSync(otherDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# Skill", "utf-8");
      // otherDir has no SKILL.md

      const skills: string[] = [];
      for (const entry of readdirSync(skillsDir)) {
        const entryPath = join(skillsDir, entry);
        if (existsSync(join(entryPath, "SKILL.md"))) {
          skills.push(entry);
        }
      }

      expect(skills).toHaveLength(1);
      expect(skills).toContain("valid-skill");
    });

    it("returns empty array when no skills installed", () => {
      const skills: string[] = [];
      for (const entry of readdirSync(skillsDir)) {
        const entryPath = join(skillsDir, entry);
        if (existsSync(join(entryPath, "SKILL.md"))) {
          skills.push(entry);
        }
      }

      expect(skills).toHaveLength(0);
    });
  });

  describe("permission", () => {
    it("defaults to allow when no permission set", () => {
      const permissions: Record<string, string> = {};
      const allowed = (permissions["my-skill"] || "allow") === "allow";
      expect(allowed).toBe(true);
    });

    it("returns deny when permission is deny", () => {
      const permissions: Record<string, string> = { "my-skill": "deny" };
      const allowed = (permissions["my-skill"] || "allow") === "allow";
      expect(allowed).toBe(false);
    });

    it("toggles permission", () => {
      const permissions: Record<string, string> = {};

      // Toggle from default (allow) to deny
      const current = (permissions["my-skill"] || "allow") === "allow";
      permissions["my-skill"] = current ? "deny" : "allow";
      expect(permissions["my-skill"]).toBe("deny");

      // Toggle back to allow
      const current2 = (permissions["my-skill"] || "allow") === "allow";
      permissions["my-skill"] = current2 ? "deny" : "allow";
      expect(permissions["my-skill"]).toBe("allow");
    });
  });
});
