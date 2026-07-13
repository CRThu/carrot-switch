import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { writeJsonc, readJsonc } from "../lib/jsonc.js";

describe("Skill Store", () => {
  let tmpDir: string;
  let storeDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-skill-store-test-"));
    storeDir = join(tmpDir, ".carrotswitch", "skills");
    mkdirSync(storeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function storePath(agent: string): string {
    return join(storeDir, `${agent}.json`);
  }

  describe("load", () => {
    it("returns empty skills when no file exists", () => {
      const path = storePath("opencode");
      expect(existsSync(path)).toBe(false);

      const data = existsSync(path) ? readJsonc(path) : { skills: {} };
      expect(data.skills).toEqual({});
    });

    it("loads existing store file", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        skills: {
          "my-skill": {
            source: "https://github.com/user/repo",
            sourceType: "github",
            installedAt: "2024-01-01T00:00:00Z",
            path: "/path/to/skill",
          },
        },
      });

      const data = readJsonc(path);
      expect(data.skills["my-skill"]).toBeDefined();
      expect(data.skills["my-skill"].sourceType).toBe("github");
    });
  });

  describe("recordInstall", () => {
    it("records a skill installation", () => {
      const path = storePath("opencode");
      const data = { skills: {} };

      data.skills["new-skill"] = {
        source: "https://github.com/user/repo",
        sourceType: "github",
        installedAt: new Date().toISOString(),
        path: "/path/to/skill",
      };

      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.skills["new-skill"]).toBeDefined();
      expect(loaded.skills["new-skill"].source).toBe("https://github.com/user/repo");
    });

    it("preserves existing skills when recording", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        skills: {
          "existing-skill": { source: "local", sourceType: "local" },
        },
      });

      const data = readJsonc(path);
      data.skills["new-skill"] = {
        source: "https://github.com/user/repo",
        sourceType: "github",
        installedAt: new Date().toISOString(),
        path: "/path/to/skill",
      };
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(Object.keys(loaded.skills)).toHaveLength(2);
      expect(loaded.skills["existing-skill"]).toBeDefined();
      expect(loaded.skills["new-skill"]).toBeDefined();
    });

    it("records different source types", () => {
      const path = storePath("opencode");
      const data = { skills: {} };

      // GitHub
      data.skills["github-skill"] = {
        source: "https://github.com/user/repo",
        sourceType: "github",
        installedAt: new Date().toISOString(),
        path: "/path/to/github-skill",
      };

      // Local
      data.skills["local-skill"] = {
        source: "/local/path",
        sourceType: "local",
        installedAt: new Date().toISOString(),
        path: "/path/to/local-skill",
      };

      // ZIP
      data.skills["zip-skill"] = {
        source: "https://example.com/skill.zip",
        sourceType: "zip",
        installedAt: new Date().toISOString(),
        path: "/path/to/zip-skill",
      };

      // URL
      data.skills["url-skill"] = {
        source: "https://example.com/skill.tar.gz",
        sourceType: "url",
        installedAt: new Date().toISOString(),
        path: "/path/to/url-skill",
      };

      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(Object.keys(loaded.skills)).toHaveLength(4);
      expect(loaded.skills["github-skill"].sourceType).toBe("github");
      expect(loaded.skills["local-skill"].sourceType).toBe("local");
      expect(loaded.skills["zip-skill"].sourceType).toBe("zip");
      expect(loaded.skills["url-skill"].sourceType).toBe("url");
    });
  });

  describe("recordUninstall", () => {
    it("removes skill record", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        skills: {
          "skill-to-remove": { source: "test", sourceType: "local" },
          "skill-to-keep": { source: "test", sourceType: "local" },
        },
      });

      const data = readJsonc(path);
      delete data.skills["skill-to-remove"];
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.skills["skill-to-remove"]).toBeUndefined();
      expect(loaded.skills["skill-to-keep"]).toBeDefined();
    });

    it("handles uninstalling nonexistent skill gracefully", () => {
      const path = storePath("opencode");
      writeJsonc(path, { skills: {} });

      const data = readJsonc(path);
      delete data.skills["nonexistent"]; // no-op
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.skills).toEqual({});
    });
  });

  describe("getSkillMeta", () => {
    it("returns metadata for existing skill", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        skills: {
          "my-skill": {
            source: "https://github.com/user/repo",
            sourceType: "github",
            installedAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const data = readJsonc(path);
      const meta = data.skills["my-skill"];
      expect(meta).toBeDefined();
      expect(meta.source).toBe("https://github.com/user/repo");
    });

    it("returns null for nonexistent skill", () => {
      const path = storePath("opencode");
      writeJsonc(path, { skills: {} });

      const data = readJsonc(path);
      const meta = data.skills?.["nonexistent"] || null;
      expect(meta).toBeNull();
    });
  });
});
