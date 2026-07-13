import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { _setConfigPathForTesting } from "../lib/config/claude.js";

let tmpDir: string;
let configPath: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "carrot-claude-test-"));
  configPath = join(tmpDir, ".claude.json");
});

afterAll(() => {
  _setConfigPathForTesting(null);
  rmSync(tmpDir, { recursive: true, force: true });
});

function loadClaude() {
  // Force re-evaluation by clearing module cache
  const mod = require("../lib/config/claude.js");
  return mod;
}

describe("Claude config module", () => {
  describe("get_config_path / get_skills_dir", () => {
    it("returns path ending with .claude.json", () => {
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(claude.get_config_path()).toBe(configPath);
    });

    it("returns skills dir path", () => {
      _setConfigPathForTesting(null);
      const claude = loadClaude();
      expect(claude.get_skills_dir()).toContain(".claude");
      expect(claude.get_skills_dir()).toContain("skills");
    });
  });

  describe("is_available", () => {
    it("returns true when config file exists", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(claude.is_available()).toBe(true);
    });

    it("returns false when config file missing", () => {
      _setConfigPathForTesting(join(tmpDir, "nonexistent.json"));
      const claude = loadClaude();
      expect(claude.is_available()).toBe(false);
    });
  });

  describe("get_mcp_servers", () => {
    it("returns empty object for empty config", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      const servers = claude.get_mcp_servers();
      expect(Object.keys(servers)).toHaveLength(0);
    });

    it("normalizes Claude format servers", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: {
          "test-server": {
            command: "npx",
            args: ["-y", "server"],
            env: { KEY: "value" },
            type: "http",
          },
        },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      const servers = claude.get_mcp_servers();
      expect(servers["test-server"]).toBeDefined();
      expect(servers["test-server"].command).toEqual(["npx", "-y", "server"]);
      expect(servers["test-server"].environment).toEqual({ KEY: "value" });
      expect(servers["test-server"].type).toBe("remote");
      expect(servers["test-server"].enabled).toBe(true);
    });

    it("handles server with no type", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: { simple: { command: "node" } },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      const servers = claude.get_mcp_servers();
      expect(servers["simple"].type).toBe("local");
    });

    it("handles server with existing command array", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: { "arr": { command: ["python", "-m", "server"], type: "local" } },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      const servers = claude.get_mcp_servers();
      expect(servers["arr"].command).toEqual(["python", "-m", "server"]);
    });

    it("preserves existing enabled field", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: { "off": { command: "node", enabled: false } },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      const servers = claude.get_mcp_servers();
      expect(servers["off"].enabled).toBe(false);
    });
  });

  describe("add_mcp_server", () => {
    it("adds server to empty config", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("new-server", {
        command: ["npx", "-y", "server"],
        environment: { KEY: "value" },
        type: "local",
      });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["new-server"]).toBeDefined();
      expect(data.mcpServers["new-server"].command).toBe("npx");
      expect(data.mcpServers["new-server"].args).toEqual(["-y", "server"]);
      expect(data.mcpServers["new-server"].env).toEqual({ KEY: "value" });
    });

    it("adds server to config with existing servers", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: { "existing": { command: "node", type: "local" } },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("second", { command: ["python"], type: "local" });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(Object.keys(data.mcpServers)).toHaveLength(2);
    });

    it("adds remote server with url", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("remote", { type: "remote", url: "http://localhost:3000" });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["remote"].type).toBe("http");
      expect(data.mcpServers["remote"].url).toBe("http://localhost:3000");
    });

    it("converts environment to env on write", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("with-env", {
        command: ["node"],
        environment: { FOO: "bar" },
        type: "local",
      });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["with-env"].env).toEqual({ FOO: "bar" });
      expect(data.mcpServers["with-env"].environment).toBeUndefined();
    });

    it("converts remote type to http on write", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("remote2", { type: "remote", url: "http://x" });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["remote2"].type).toBe("http");
    });

    it("strips enabled field on write", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("no-enabled", { command: ["node"], type: "local", enabled: true });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["no-enabled"].enabled).toBeUndefined();
    });

    it("handles no mcpServers key initially", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.add_mcp_server("first", { command: ["node"], type: "local" });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["first"]).toBeDefined();
    });
  });

  describe("update_mcp_server", () => {
    it("updates existing server", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: { "my-server": { command: "old", type: "local" } },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.update_mcp_server("my-server", { command: ["new"], type: "local" });
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["my-server"].command).toBe("new");
    });

    it("throws for non-existent server", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(() => claude.update_mcp_server("nonexistent", { type: "local" })).toThrow("not found");
    });

    it("throws when mcpServers key is missing", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(() => claude.update_mcp_server("anything", { type: "local" })).toThrow("not found");
    });
  });

  describe("delete_mcp_server", () => {
    it("deletes existing server", () => {
      writeFileSync(configPath, JSON.stringify({
        mcpServers: {
          "to-delete": { command: "node", type: "local" },
          "to-keep": { command: "python", type: "local" },
        },
      }), "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      claude.delete_mcp_server("to-delete");
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(data.mcpServers["to-delete"]).toBeUndefined();
      expect(data.mcpServers["to-keep"]).toBeDefined();
    });

    it("throws for non-existent server", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(() => claude.delete_mcp_server("nonexistent")).toThrow("not found");
    });

    it("throws when mcpServers key is missing", () => {
      writeFileSync(configPath, "{}", "utf-8");
      _setConfigPathForTesting(configPath);
      const claude = loadClaude();
      expect(() => claude.delete_mcp_server("anything")).toThrow("not found");
    });
  });

  describe("get_skills_permission", () => {
    it("returns empty object", () => {
      const claude = loadClaude();
      expect(claude.get_skills_permission()).toEqual({});
    });
  });

  describe("set_skill_permission", () => {
    it("is a no-op", () => {
      const claude = loadClaude();
      expect(() => claude.set_skill_permission("test", true)).not.toThrow();
      expect(() => claude.set_skill_permission("test", false)).not.toThrow();
    });
  });
});
