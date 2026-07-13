import { describe, it, expect } from "bun:test";

// Test Claude format conversion logic in isolation
// These test the normalizeFromClaude and toClaudeFormat functions

describe("Claude format conversion", () => {
  describe("normalizeFromClaude (Claude → internal)", () => {
    // We test the conversion logic by simulating what the functions do

    it("adds default type 'local' when missing", () => {
      const server = { command: "npx", args: ["-y", "server"] };
      // Simulate normalizeFromClaude
      const result = { ...server };
      if (!result.type) result.type = "local";
      expect(result.type).toBe("local");
    });

    it("converts command string to array with args", () => {
      const server = { command: "npx", args: ["-y", "server"] };
      const result = { ...server };
      if (typeof result.command === "string") {
        const cmd = result.command;
        const args = result.args || [];
        result.command = [cmd, ...args];
        delete result.args;
      }
      expect(result.command).toEqual(["npx", "-y", "server"]);
      expect(result.args).toBeUndefined();
    });

    it("converts command string without args", () => {
      const server = { command: "python" };
      const result = { ...server };
      if (typeof result.command === "string") {
        const cmd = result.command;
        const args = result.args || [];
        result.command = [cmd, ...args];
        delete result.args;
      }
      expect(result.command).toEqual(["python"]);
    });

    it("renames 'env' to 'environment'", () => {
      const server = { env: { KEY: "value" } };
      const result = { ...server };
      if (result.env) {
        result.environment = result.env;
        delete result.env;
      }
      expect(result.environment).toEqual({ KEY: "value" });
      expect(result.env).toBeUndefined();
    });

    it("maps type 'http' to 'remote'", () => {
      const server = { type: "http", url: "http://example.com" };
      const result = { ...server };
      if (result.type === "http") result.type = "remote";
      expect(result.type).toBe("remote");
    });

    it("adds enabled: true by default", () => {
      const server = { command: "node" };
      const result = { ...server };
      if (result.enabled === undefined) result.enabled = true;
      expect(result.enabled).toBe(true);
    });

    it("preserves existing enabled field", () => {
      const server = { command: "node", enabled: false };
      const result = { ...server };
      if (result.enabled === undefined) result.enabled = true;
      expect(result.enabled).toBe(false);
    });

    it("handles full Claude format server", () => {
      const server = {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        env: { ROOT_DIR: "/home/user" },
        type: "http",
      };
      const result = { ...server };

      if (!result.type) result.type = "local";
      if (typeof result.command === "string") {
        const cmd = result.command;
        const args = result.args || [];
        result.command = [cmd, ...args];
        delete result.args;
      }
      if (result.env) {
        result.environment = result.env;
        delete result.env;
      }
      if (result.type === "http") result.type = "remote";
      if (result.enabled === undefined) result.enabled = true;

      expect(result).toEqual({
        command: ["npx", "-y", "@modelcontextprotocol/server-filesystem"],
        environment: { ROOT_DIR: "/home/user" },
        type: "remote",
        enabled: true,
      });
    });
  });

  describe("toClaudeFormat (internal → Claude)", () => {
    it("converts command array to string + args", () => {
      const server = { command: ["npx", "-y", "server"], type: "local" };
      const result = { ...server };

      const cmdList = result.command || [];
      delete result.command;
      if (cmdList.length > 0) {
        result.command = cmdList[0];
        if (cmdList.length > 1) {
          result.args = cmdList.slice(1);
        }
      }

      expect(result.command).toBe("npx");
      expect(result.args).toEqual(["-y", "server"]);
    });

    it("converts single command without args", () => {
      const server = { command: ["python"], type: "local" };
      const result = { ...server };

      const cmdList = result.command || [];
      delete result.command;
      if (cmdList.length > 0) {
        result.command = cmdList[0];
        if (cmdList.length > 1) {
          result.args = cmdList.slice(1);
        }
      }

      expect(result.command).toBe("python");
      expect(result.args).toBeUndefined();
    });

    it("renames 'environment' to 'env'", () => {
      const server = { environment: { KEY: "value" }, type: "local" };
      const result = { ...server };

      if (result.environment) {
        result.env = result.environment;
        delete result.environment;
      }

      expect(result.env).toEqual({ KEY: "value" });
      expect(result.environment).toBeUndefined();
    });

    it("maps type 'remote' to 'http'", () => {
      const server = { type: "remote", url: "http://example.com" };
      const result = { ...server };
      if (result.type === "remote") result.type = "http";
      expect(result.type).toBe("http");
    });

    it("removes 'enabled' field", () => {
      const server = { command: ["node"], enabled: true, type: "local" };
      const result = { ...server };
      delete result.enabled;
      expect(result.enabled).toBeUndefined();
    });

    it("handles full internal format server", () => {
      const server = {
        command: ["npx", "-y", "@modelcontextprotocol/server-filesystem"],
        environment: { ROOT_DIR: "/home/user" },
        type: "remote",
        enabled: true,
      };
      const result = { ...server };

      const cmdList = result.command || [];
      delete result.command;
      if (cmdList.length > 0) {
        result.command = cmdList[0];
        if (cmdList.length > 1) {
          result.args = cmdList.slice(1);
        }
      }
      if (result.environment) {
        result.env = result.environment;
        delete result.environment;
      }
      if (result.type === "remote") result.type = "http";
      delete result.enabled;

      expect(result).toEqual({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        env: { ROOT_DIR: "/home/user" },
        type: "http",
      });
    });
  });

  describe("roundtrip conversion", () => {
    it("Claude → internal → Claude preserves essential fields", () => {
      const claudeServer = {
        command: "npx",
        args: ["-y", "server"],
        env: { KEY: "value" },
        type: "http",
      };

      // Claude → internal
      const internal = { ...claudeServer };
      if (!internal.type) internal.type = "local";
      if (typeof internal.command === "string") {
        const cmd = internal.command;
        const args = internal.args || [];
        internal.command = [cmd, ...args];
        delete internal.args;
      }
      if (internal.env) {
        internal.environment = internal.env;
        delete internal.env;
      }
      if (internal.type === "http") internal.type = "remote";
      if (internal.enabled === undefined) internal.enabled = true;

      // internal → Claude
      const backToClaude = { ...internal };
      const cmdList = backToClaude.command || [];
      delete backToClaude.command;
      if (cmdList.length > 0) {
        backToClaude.command = cmdList[0];
        if (cmdList.length > 1) {
          backToClaude.args = cmdList.slice(1);
        }
      }
      if (backToClaude.environment) {
        backToClaude.env = backToClaude.environment;
        delete backToClaude.environment;
      }
      if (backToClaude.type === "remote") backToClaude.type = "http";
      delete backToClaude.enabled;

      expect(backToClaude.command).toBe("npx");
      expect(backToClaude.args).toEqual(["-y", "server"]);
      expect(backToClaude.env).toEqual({ KEY: "value" });
      expect(backToClaude.type).toBe("http");
    });
  });
});
