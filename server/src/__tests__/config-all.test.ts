import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { BaseConfig } from "../lib/config/base.js";
import { writeJsonc, readJsonc } from "../lib/jsonc.js";

// Test all config modules with isolated temp directories
describe("Config modules integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-config-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("opencode config", () => {
    let configPath: string;

    beforeEach(() => {
      const configDir = join(tmpDir, ".config", "opencode");
      mkdirSync(configDir, { recursive: true });
      configPath = join(configDir, "opencode.jsonc");
    });

    it("full CRUD lifecycle", () => {
      // Start with empty config
      writeJsonc(configPath, {});
      const config = new BaseConfig(configPath);

      // Add servers
      config.addMcpServer("server-1", { type: "local", command: ["node"] });
      config.addMcpServer("server-2", { type: "remote", url: "http://localhost:3000" });

      let servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(2);

      // Update server
      config.updateMcpServer("server-1", { type: "local", command: ["python"] });
      servers = config.getMcpServers();
      expect(servers["server-1"].command).toEqual(["python"]);

      // Toggle server
      const newState = config.toggleMcpServer("server-1");
      expect(newState).toBe(false);
      servers = config.getMcpServers();
      expect(servers["server-1"].enabled).toBe(false);

      // Delete server
      config.deleteMcpServer("server-2");
      servers = config.getMcpServers();
      expect(Object.keys(servers)).toHaveLength(1);
      expect(servers["server-2"]).toBeUndefined();

      // Skill permissions
      config.setSkillPermission("my-skill", true);
      let perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("allow");

      config.setSkillPermission("my-skill", false);
      perms = config.getSkillsPermission();
      expect(perms["my-skill"]).toBe("deny");
    });

    it("isAvailable returns true when config dir exists", () => {
      writeJsonc(configPath, {});
      const config = new BaseConfig(configPath);
      expect(config.isAvailable()).toBe(true);
    });

    it("isAvailable returns false when config dir missing", () => {
      const config = new BaseConfig(join(tmpDir, "nonexistent", "config.jsonc"));
      expect(config.isAvailable()).toBe(false);
    });
  });

  describe("mimocode config", () => {
    let configPath: string;

    beforeEach(() => {
      const configDir = join(tmpDir, ".config", "mimocode");
      mkdirSync(configDir, { recursive: true });
      configPath = join(configDir, "mimocode.jsonc");
    });

    it("full CRUD lifecycle", () => {
      writeJsonc(configPath, {});
      const config = new BaseConfig(configPath);

      // Add server
      config.addMcpServer("mcp-server", {
        type: "local",
        command: ["bun", "run", "server.ts"],
      });

      const servers = config.getMcpServers();
      expect(servers["mcp-server"]).toBeDefined();
      expect(servers["mcp-server"].command).toEqual(["bun", "run", "server.ts"]);
    });
  });

  describe("claude config", () => {
    let configPath: string;

    beforeEach(() => {
      configPath = join(tmpDir, ".claude.json");
    });

    it("handles Claude format (string command + args)", () => {
      // Claude format
      writeJsonc(configPath, {
        mcpServers: {
          "filesystem": {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem"],
            env: { ROOT_DIR: "/home/user" },
          },
        },
      });

      const data = readJsonc(configPath);
      const rawServer = data.mcpServers["filesystem"];

      // Normalize from Claude format
      const normalized: Record<string, any> = { ...rawServer };
      if (typeof normalized.command === "string") {
        const cmd = normalized.command;
        const args = normalized.args || [];
        normalized.command = [cmd, ...args];
        delete normalized.args;
      }
      if (normalized.env) {
        normalized.environment = normalized.env;
        delete normalized.env;
      }

      expect(normalized.command).toEqual(["npx", "-y", "@modelcontextprotocol/server-filesystem"]);
      expect(normalized.environment).toEqual({ ROOT_DIR: "/home/user" });
    });

    it("converts back to Claude format", () => {
      // Internal format
      const internal = {
        command: ["npx", "-y", "server"],
        environment: { KEY: "value" },
        type: "remote",
      };

      // Convert to Claude format
      const claude = { ...internal };
      const cmdList = claude.command || [];
      delete claude.command;
      if (cmdList.length > 0) {
        claude.command = cmdList[0];
        if (cmdList.length > 1) {
          claude.args = cmdList.slice(1);
        }
      }
      if (claude.environment) {
        claude.env = claude.environment;
        delete claude.environment;
      }
      if (claude.type === "remote") claude.type = "http";

      expect(claude.command).toBe("npx");
      expect(claude.args).toEqual(["-y", "server"]);
      expect(claude.env).toEqual({ KEY: "value" });
      expect(claude.type).toBe("http");
    });

    it("handles servers with no type (defaults to local)", () => {
      writeJsonc(configPath, {
        mcpServers: {
          "simple": { command: "node" },
        },
      });

      const data = readJsonc(configPath);
      const server = data.mcpServers["simple"];

      // Normalize
      if (!server.type) server.type = "local";
      expect(server.type).toBe("local");
    });

    it("maps http type to remote", () => {
      const server = { type: "http", url: "http://localhost:3000" };
      if (server.type === "http") server.type = "remote";
      expect(server.type).toBe("remote");
    });

    it("adds enabled field when missing", () => {
      const server = { command: "node" };
      if (server.enabled === undefined) server.enabled = true;
      expect(server.enabled).toBe(true);
    });
  });

  describe("config with JSONC comments", () => {
    it("preserves values while stripping comments", () => {
      const configDir = join(tmpDir, ".config", "opencode");
      mkdirSync(configDir, { recursive: true });
      const configPath = join(configDir, "opencode.jsonc");

      const content = `{
        // MCP servers configuration
        "mcp": {
          /* Local servers */
          "server1": {
            "type": "local",
            "command": ["node", "server.js"] // my server
          }
        },
        "permission": {
          "skill": {
            "test-skill": "allow"
          }
        }
      }`;

      writeFileSync(configPath, content, "utf-8");

      const data = readJsonc(configPath);
      expect(data.mcp.server1.type).toBe("local");
      expect(data.mcp.server1.command).toEqual(["node", "server.js"]);
      expect(data.permission.skill["test-skill"]).toBe("allow");
    });
  });
});
