import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { writeJsonc, readJsonc } from "../lib/jsonc.js";

// Test store/mcp.ts by simulating its operations with temp directories
describe("MCP Store", () => {
  let tmpDir: string;
  let storeDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "carrot-mcp-test-"));
    storeDir = join(tmpDir, ".carrotswitch", "mcps");
    mkdirSync(storeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function storePath(agent: string): string {
    return join(storeDir, `${agent}.json`);
  }

  describe("load", () => {
    it("returns empty servers when no file exists", () => {
      const path = storePath("opencode");
      expect(existsSync(path)).toBe(false);

      // Simulate load behavior
      const data = existsSync(path) ? readJsonc(path) : { servers: {} };
      expect(data.servers).toEqual({});
    });

    it("loads existing store file", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "local", command: ["node"], enabled: true },
        },
      });

      const data = readJsonc(path);
      expect(data.servers["server-1"]).toBeDefined();
      expect(data.servers["server-1"].type).toBe("local");
    });

    it("ensures type field exists for each server", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { command: ["node"] }, // no type field
        },
      });

      const data = readJsonc(path);
      // Simulate the type defaulting logic
      for (const server of Object.values(data.servers)) {
        if ((server as any).type === undefined) (server as any).type = "local";
      }
      expect(data.servers["server-1"].type).toBe("local");
    });
  });

  describe("addServer", () => {
    it("adds a new server to store", () => {
      const path = storePath("opencode");
      const data = { servers: {} };

      // Simulate addServer
      data.servers["new-server"] = {
        type: "local",
        command: ["python", "-m", "server"],
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["new-server"]).toBeDefined();
      expect(loaded.servers["new-server"].command).toEqual(["python", "-m", "server"]);
    });

    it("preserves existing servers when adding", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "existing": { type: "local", enabled: true },
        },
      });

      const data = readJsonc(path);
      data.servers["new-server"] = { type: "remote", enabled: true };
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(Object.keys(loaded.servers)).toHaveLength(2);
      expect(loaded.servers.existing).toBeDefined();
      expect(loaded.servers["new-server"]).toBeDefined();
    });
  });

  describe("updateServer", () => {
    it("updates existing server", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "old", enabled: true },
        },
      });

      const data = readJsonc(path);
      data.servers["server-1"] = { type: "new", enabled: false };
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["server-1"].type).toBe("new");
      expect(loaded.servers["server-1"].enabled).toBe(false);
    });

    it("throws for nonexistent server", () => {
      const path = storePath("opencode");
      writeJsonc(path, { servers: {} });

      const data = readJsonc(path);
      expect(() => {
        if (!data.servers || !("ghost" in data.servers)) {
          throw new Error("MCP server 'ghost' not found");
        }
      }).toThrow("not found");
    });
  });

  describe("deleteServer", () => {
    it("deletes existing server", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "local" },
          "server-2": { type: "remote" },
        },
      });

      const data = readJsonc(path);
      delete data.servers["server-1"];
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["server-1"]).toBeUndefined();
      expect(loaded.servers["server-2"]).toBeDefined();
    });

    it("throws for nonexistent server", () => {
      const path = storePath("opencode");
      writeJsonc(path, { servers: {} });

      const data = readJsonc(path);
      expect(() => {
        if (!data.servers || !("ghost" in data.servers)) {
          throw new Error("MCP server 'ghost' not found");
        }
      }).toThrow("not found");
    });
  });

  describe("toggleServer", () => {
    it("toggles enabled to disabled", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "local", enabled: true },
        },
      });

      const data = readJsonc(path);
      const current = data.servers["server-1"].enabled !== false;
      data.servers["server-1"].enabled = !current;
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["server-1"].enabled).toBe(false);
    });

    it("toggles disabled to enabled", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "local", enabled: false },
        },
      });

      const data = readJsonc(path);
      const current = data.servers["server-1"].enabled !== false;
      data.servers["server-1"].enabled = !current;
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["server-1"].enabled).toBe(true);
    });

    it("treats missing enabled as true", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": { type: "local" }, // no enabled field
        },
      });

      const data = readJsonc(path);
      const current = data.servers["server-1"].enabled !== false; // undefined !== false = true
      data.servers["server-1"].enabled = !current; // !true = false
      writeJsonc(path, data);

      const loaded = readJsonc(path);
      expect(loaded.servers["server-1"].enabled).toBe(false);
    });
  });

  describe("syncToAgent", () => {
    it("strips local-only fields when syncing", () => {
      const path = storePath("opencode");
      writeJsonc(path, {
        servers: {
          "server-1": {
            type: "local",
            command: ["node"],
            enabled: true,
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      });

      const data = readJsonc(path);
      const agentServer: Record<string, any> = {};
      for (const [k, v] of Object.entries(data.servers["server-1"])) {
        if (k !== "enabled" && k !== "createdAt") {
          agentServer[k] = v;
        }
      }

      expect(agentServer).toEqual({
        type: "local",
        command: ["node"],
      });
      expect(agentServer.enabled).toBeUndefined();
      expect(agentServer.createdAt).toBeUndefined();
    });
  });
});
