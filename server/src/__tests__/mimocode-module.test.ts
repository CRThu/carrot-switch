import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { writeJsonc, readJsonc } from "../lib/jsonc.js";
import { BaseConfig } from "../lib/config/base.js";

// Test mimocode module functions through BaseConfig
describe("Mimocode config module", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-mimocode-test-"));
    const configDir = join(tmpDir, ".config", "mimocode");
    mkdirSync(configDir, { recursive: true });
    configPath = join(configDir, "mimocode.jsonc");
    writeJsonc(configPath, {});
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function createConfig(): BaseConfig {
    return new BaseConfig(configPath);
  }

  describe("get_config_path", () => {
    it("returns the config file path", () => {
      const config = createConfig();
      expect(config.configPath).toBe(configPath);
    });
  });

  describe("is_available", () => {
    it("returns true when config dir exists", () => {
      const config = createConfig();
      expect(config.isAvailable()).toBe(true);
    });

    it("returns false when config dir missing", () => {
      const config = new BaseConfig(join(tmpDir, "nonexistent", "config.jsonc"));
      expect(config.isAvailable()).toBe(false);
    });
  });

  describe("get_mcp_servers", () => {
    it("returns empty object for new config", () => {
      const config = createConfig();
      const servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(0);
    });

    it("returns servers from config", () => {
      const config = createConfig();
      config.addMcpServer("server-1", { type: "local", command: ["node"] });
      const servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(1);
      expect(servers["server-1"]).toBeDefined();
    });
  });

  describe("add_mcp_server", () => {
    it("adds a new server", () => {
      const config = createConfig();
      config.addMcpServer("new-server", { type: "local", command: ["python"] });
      const servers = config.getMcpServers();
      expect(servers["new-server"]).toBeDefined();
      expect(servers["new-server"].command).toEqual(["python"]);
    });

    it("adds multiple servers", () => {
      const config = createConfig();
      config.addMcpServer("server-1", { type: "local", command: ["node"] });
      config.addMcpServer("server-2", { type: "remote", url: "http://localhost:3000" });
      const servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(2);
    });
  });

  describe("update_mcp_server", () => {
    it("updates an existing server", () => {
      const config = createConfig();
      config.addMcpServer("server-1", { type: "local", command: ["old"] });
      config.updateMcpServer("server-1", { type: "local", command: ["new"] });
      const servers = config.getMcpServers();
      expect(servers["server-1"].command).toEqual(["new"]);
    });

    it("throws for non-existent server", () => {
      const config = createConfig();
      expect(() => config.updateMcpServer("nonexistent", { type: "local" })).toThrow("not found");
    });
  });

  describe("delete_mcp_server", () => {
    it("deletes an existing server", () => {
      const config = createConfig();
      config.addMcpServer("server-1", { type: "local", command: ["node"] });
      config.deleteMcpServer("server-1");
      const servers = config.getMcpServers();
      expect(servers["server-1"]).toBeUndefined();
    });

    it("throws for non-existent server", () => {
      const config = createConfig();
      expect(() => config.deleteMcpServer("nonexistent")).toThrow("not found");
    });
  });

  describe("toggle_mcp_server", () => {
    it("toggles server enabled state", () => {
      const config = createConfig();
      config.addMcpServer("server-1", { type: "local", command: ["node"] });

      // Toggle off
      const newState = config.toggleMcpServer("server-1");
      expect(newState).toBe(false);
      let servers = config.getMcpServers();
      expect(servers["server-1"].enabled).toBe(false);

      // Toggle on
      const newState2 = config.toggleMcpServer("server-1");
      expect(newState2).toBe(true);
      servers = config.getMcpServers();
      expect(servers["server-1"].enabled).toBe(true);
    });
  });

  describe("get_skills_permission", () => {
    it("returns empty object for new config", () => {
      const config = createConfig();
      const perms = config.getSkillsPermission();
      expect(Object.keys(perms)).toHaveLength(0);
    });

    it("returns permissions from config", () => {
      const config = createConfig();
      config.setSkillPermission("my-skill", true);
      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");
    });
  });

  describe("set_skill_permission", () => {
    it("sets skill permission to allow", () => {
      const config = createConfig();
      config.setSkillPermission("my-skill", true);
      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");
    });

    it("sets skill permission to deny", () => {
      const config = createConfig();
      config.setSkillPermission("my-skill", false);
      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("deny");
    });

    it("overwrites existing permission", () => {
      const config = createConfig();
      config.setSkillPermission("my-skill", true);
      config.setSkillPermission("my-skill", false);
      const perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("deny");
    });
  });
});
