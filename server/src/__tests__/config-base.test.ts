import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { BaseConfig } from "../lib/config/base.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;
let configPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "carrot-test-"));
  const configDir = join(tmpDir, ".config", "opencode");
  mkdirSync(configDir, { recursive: true });
  configPath = join(configDir, "opencode.jsonc");
  writeFileSync(configPath, "{}", "utf-8");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("BaseConfig", () => {
  describe("isAvailable", () => {
    it("returns true when config directory exists", () => {
      const config = new BaseConfig(configPath);
      expect(config.isAvailable()).toBe(true);
    });

    it("returns false when config directory does not exist", () => {
      const config = new BaseConfig("/nonexistent/path/config.jsonc");
      expect(config.isAvailable()).toBe(false);
    });
  });

  describe("getMcpServers", () => {
    it("returns empty object when no mcp section", () => {
      const config = new BaseConfig(configPath);
      const servers = config.getMcpServers();
      expect(servers).toEqual({});
    });

    it("returns mcp servers from config", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: {
          server1: { type: "local", command: ["node"] },
          server2: { type: "remote", url: "http://localhost:3000" },
        },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      const servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(2);
      expect(servers.server1.type).toBe("local");
      expect(servers.server2.type).toBe("remote");
    });
  });

  describe("addMcpServer", () => {
    it("adds a new MCP server", () => {
      const config = new BaseConfig(configPath);
      config.addMcpServer("test-server", { type: "local", command: ["node"] });

      const servers = config.getMcpServers();
      expect(servers["test-server"]).toBeDefined();
      expect(servers["test-server"].type).toBe("local");
    });

    it("adds server to existing config", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { existing: { type: "local" } },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      config.addMcpServer("new-server", { type: "remote" });

      const servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(2);
      expect(servers.existing).toBeDefined();
      expect(servers["new-server"]).toBeDefined();
    });

    it("creates mcp section if not present", () => {
      const config = new BaseConfig(configPath);
      config.addMcpServer("test", { type: "local" });

      // Verify file was written correctly
      const { readJsonc } = require("../lib/jsonc.js");
      const data = readJsonc(configPath);
      expect(data.mcp).toBeDefined();
      expect(data.mcp.test).toBeDefined();
    });
  });

  describe("updateMcpServer", () => {
    it("updates existing server", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { server1: { type: "old" } },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      config.updateMcpServer("server1", { type: "new" });

      const servers = config.getMcpServers();
      expect(servers.server1.type).toBe("new");
    });

    it("throws for nonexistent server", () => {
      const config = new BaseConfig(configPath);
      expect(() => config.updateMcpServer("ghost", { type: "x" })).toThrow("not found");
    });
  });

  describe("deleteMcpServer", () => {
    it("deletes existing server", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { server1: {}, server2: {} },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      config.deleteMcpServer("server1");

      const servers = config.getMcpServers();
      expect(servers.server1).toBeUndefined();
      expect(servers.server2).toBeDefined();
    });

    it("throws for nonexistent server", () => {
      const config = new BaseConfig(configPath);
      expect(() => config.deleteMcpServer("ghost")).toThrow("not found");
    });
  });

  describe("toggleMcpServer", () => {
    it("toggles enabled to disabled", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { server1: { enabled: true } },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      const result = config.toggleMcpServer("server1");

      expect(result).toBe(false);
      const servers = config.getMcpServers();
      expect(servers.server1.enabled).toBe(false);
    });

    it("toggles disabled to enabled", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { server1: { enabled: false } },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      const result = config.toggleMcpServer("server1");

      expect(result).toBe(true);
    });

    it("treats missing enabled as true", () => {
      writeFileSync(configPath, JSON.stringify({
        mcp: { server1: {} },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      const result = config.toggleMcpServer("server1");

      expect(result).toBe(false);
    });

    it("throws for nonexistent server", () => {
      const config = new BaseConfig(configPath);
      expect(() => config.toggleMcpServer("ghost")).toThrow("not found");
    });
  });

  describe("getSkillsPermission", () => {
    it("returns empty object when no permission section", () => {
      const config = new BaseConfig(configPath);
      const perms = config.getSkillsPermission();
      expect(perms).toEqual({});
    });

    it("returns skill permissions", () => {
      writeFileSync(configPath, JSON.stringify({
        permission: {
          skill: { "my-skill": "allow", "other-skill": "deny" },
        },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");
      expect(perms["other-skill"]).toBe("deny");
    });
  });

  describe("setSkillPermission", () => {
    it("sets skill permission to allow", () => {
      const config = new BaseConfig(configPath);
      config.setSkillPermission("my-skill", true);

      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");
    });

    it("sets skill permission to deny", () => {
      const config = new BaseConfig(configPath);
      config.setSkillPermission("my-skill", false);

      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("deny");
    });

    it("creates permission section if not present", () => {
      const config = new BaseConfig(configPath);
      config.setSkillPermission("test", true);

      const { readJsonc } = require("../lib/jsonc.js");
      const data = readJsonc(configPath);
      expect(data.permission).toBeDefined();
      expect(data.permission.skill).toBeDefined();
      expect(data.permission.skill.test).toBe("allow");
    });

    it("overwrites existing permission", () => {
      writeFileSync(configPath, JSON.stringify({
        permission: { skill: { "my-skill": "deny" } },
      }), "utf-8");

      const config = new BaseConfig(configPath);
      config.setSkillPermission("my-skill", true);

      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");
    });
  });
});
