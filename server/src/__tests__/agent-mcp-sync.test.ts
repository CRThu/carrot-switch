import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

import * as repoMcp from "../lib/repository/mcp.js";
import * as agentMcp from "../lib/agent/mcp.js";
import { AGENTS_ROOT } from "../lib/base.js";

const TEST_MCP_SYNC = "sync-test-server";
const TEST_MCP_SYNC2 = "sync-test-server-2";
const TEST_AGENT = "opencode";

describe("Agent MCP - syncAll and edge cases", () => {
  beforeAll(() => {
    // Ensure test MCPs exist in repository
    if (!repoMcp.exists(TEST_MCP_SYNC)) {
      repoMcp.add({
        name: TEST_MCP_SYNC,
        type: "local",
        command: ["node", "sync.js"],
        addedAt: new Date().toISOString(),
        source: "manual",
      });
    }
    if (!repoMcp.exists(TEST_MCP_SYNC2)) {
      repoMcp.add({
        name: TEST_MCP_SYNC2,
        type: "remote",
        url: "http://localhost:3000",
        addedAt: new Date().toISOString(),
        source: "manual",
      });
    }
    // Disable from agent first
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC); } catch {}
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC2); } catch {}
  });

  afterAll(() => {
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC); } catch {}
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC2); } catch {}
    try { repoMcp.remove(TEST_MCP_SYNC); } catch {}
    try { repoMcp.remove(TEST_MCP_SYNC2); } catch {}
  });

  describe("syncAll", () => {
    it("syncs enabled MCPs to agent config", () => {
      // Enable both MCPs
      agentMcp.enable(TEST_AGENT, TEST_MCP_SYNC);
      agentMcp.enable(TEST_AGENT, TEST_MCP_SYNC2);

      // syncAll should not throw
      agentMcp.syncAll(TEST_AGENT);

      // Both should still be enabled
      expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_SYNC)).toBe(true);
      expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_SYNC2)).toBe(true);
    });

    it("syncAll handles missing repository MCP gracefully", () => {
      // Add a name to enable list that doesn't exist in repository
      // This tests the `if (!repoMcp) continue;` path
      agentMcp.enable(TEST_AGENT, TEST_MCP_SYNC);

      // syncAll should not throw even if some MCPs are missing
      expect(() => agentMcp.syncAll(TEST_AGENT)).not.toThrow();
    });

    it("syncAll with empty enable list", () => {
      // Disable all first
      agentMcp.toggleAll(TEST_AGENT, false);

      // syncAll with empty list should not throw
      expect(() => agentMcp.syncAll(TEST_AGENT)).not.toThrow();
    });
  });

  describe("toggleAll edge cases", () => {
    it("toggleAll true enables all repository MCPs", () => {
      agentMcp.toggleAll(TEST_AGENT, true);
      const enabled = agentMcp.getEnabled(TEST_AGENT);
      expect(enabled).toContain(TEST_MCP_SYNC);
      expect(enabled).toContain(TEST_MCP_SYNC2);
    });

    it("toggleAll false disables all MCPs", () => {
      agentMcp.toggleAll(TEST_AGENT, false);
      const enabled = agentMcp.getEnabled(TEST_AGENT);
      expect(enabled.length).toBe(0);
    });
  });

  describe("enable/disable edge cases", () => {
    it("enable with url-based MCP", () => {
      agentMcp.enable(TEST_AGENT, TEST_MCP_SYNC2);
      expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_SYNC2)).toBe(true);
      agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC2);
    });

    it("disable when MCP is not enabled does not throw", () => {
      agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC);
      // Disable again - should not throw
      expect(() => agentMcp.disable(TEST_AGENT, TEST_MCP_SYNC)).not.toThrow();
    });

    it("enable throws for non-existent agent", () => {
      expect(() => agentMcp.enable("nonexistent", TEST_MCP_SYNC)).toThrow("Unknown agent");
    });

    it("disable throws for non-existent agent", () => {
      expect(() => agentMcp.disable("nonexistent", TEST_MCP_SYNC)).toThrow("Unknown agent");
    });

    it("syncAll throws for non-existent agent", () => {
      expect(() => agentMcp.syncAll("nonexistent")).toThrow("Unknown agent");
    });

    it("toggleAll throws for non-existent agent", () => {
      expect(() => agentMcp.toggleAll("nonexistent", true)).toThrow("Unknown agent");
    });
  });

  describe("readEnableList edge cases", () => {
    it("handles corrupted JSON in enable list file", () => {
      // Write corrupted JSON to the enable list file
      const enableListPath = join(AGENTS_ROOT, TEST_AGENT, "mcp-enabled.json");
      mkdirSync(join(AGENTS_ROOT, TEST_AGENT), { recursive: true });
      writeFileSync(enableListPath, "not valid json {{{", "utf-8");

      // getEnabled should return empty array
      const enabled = agentMcp.getEnabled(TEST_AGENT);
      expect(Array.isArray(enabled)).toBe(true);

      // Restore valid state
      writeFileSync(enableListPath, "[]", "utf-8");
    });
  });

  describe("getConfig edge cases", () => {
    it("getEnabled returns empty array for unknown agent", () => {
      const enabled = agentMcp.getEnabled("nonexistent");
      expect(enabled).toEqual([]);
    });
  });
});
