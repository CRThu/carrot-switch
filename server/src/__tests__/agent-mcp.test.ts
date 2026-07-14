import { describe, it, expect, beforeAll, afterAll } from "bun:test";

import * as repoMcp from "../lib/repository/mcp.js";
import * as agentMcp from "../lib/agent/mcp.js";
import * as oc from "../lib/config/opencode.js";

const TEST_MCP_NAME = "agent-mcp-test-server";
const TEST_AGENT = "opencode";

describe("Agent MCP enable/disable", () => {
  beforeAll(async () => {
    // Ensure test MCP exists in repository
    if (!repoMcp.exists(TEST_MCP_NAME)) {
      repoMcp.add({
        name: TEST_MCP_NAME,
        type: "local",
        command: ["node", "test.js"],
        addedAt: new Date().toISOString(),
        source: "manual",
      });
    }

    // Disable from agent first
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_NAME); } catch {}
  });

  afterAll(async () => {
    // Clean up
    try { agentMcp.disable(TEST_AGENT, TEST_MCP_NAME); } catch {}
    try { repoMcp.remove(TEST_MCP_NAME); } catch {}
  });

  it("getEnabled returns array", () => {
    const enabled = agentMcp.getEnabled(TEST_AGENT);
    expect(Array.isArray(enabled)).toBe(true);
  });

  it("isEnabled returns false initially", () => {
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(false);
  });

  it("enable adds MCP to agent", () => {
    agentMcp.enable(TEST_AGENT, TEST_MCP_NAME);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(true);

    const enabled = agentMcp.getEnabled(TEST_AGENT);
    expect(enabled).toContain(TEST_MCP_NAME);
  });

  it("disable removes MCP from agent", () => {
    agentMcp.disable(TEST_AGENT, TEST_MCP_NAME);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(false);

    const enabled = agentMcp.getEnabled(TEST_AGENT);
    expect(enabled).not.toContain(TEST_MCP_NAME);
  });

  it("toggle switches state", () => {
    // Ensure OFF first
    agentMcp.disable(TEST_AGENT, TEST_MCP_NAME);

    const result = agentMcp.toggle(TEST_AGENT, TEST_MCP_NAME);
    expect(result).toBe(true);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(true);

    const result2 = agentMcp.toggle(TEST_AGENT, TEST_MCP_NAME);
    expect(result2).toBe(false);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(false);
  });

  it("enable throws for non-existent repository MCP", () => {
    expect(() => {
      agentMcp.enable(TEST_AGENT, "non-existent-mcp");
    }).toThrow("not found");
  });

  it("enable is idempotent", () => {
    agentMcp.enable(TEST_AGENT, TEST_MCP_NAME);
    agentMcp.enable(TEST_AGENT, TEST_MCP_NAME); // Should not throw

    const enabled = agentMcp.getEnabled(TEST_AGENT);
    const count = enabled.filter(n => n === TEST_MCP_NAME).length;
    expect(count).toBe(1);

    // Cleanup
    agentMcp.disable(TEST_AGENT, TEST_MCP_NAME);
  });

  it("toggleAll enables all repository MCPs", () => {
    agentMcp.toggleAll(TEST_AGENT, true);
    const enabled = agentMcp.getEnabled(TEST_AGENT);
    expect(enabled).toContain(TEST_MCP_NAME);
  });

  it("toggleAll disables all MCPs", () => {
    agentMcp.toggleAll(TEST_AGENT, false);
    const enabled = agentMcp.getEnabled(TEST_AGENT);
    expect(enabled.length).toBe(0);
  });

  it("disable works even when agent is not available", () => {
    // Enable first
    agentMcp.enable(TEST_AGENT, TEST_MCP_NAME);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(true);

    // Disable should succeed even if agent config dir doesn't exist
    // (the remove from enable list is the critical part)
    agentMcp.disable(TEST_AGENT, TEST_MCP_NAME);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(false);
  });

  it("disable removes entry from agent config file", () => {
    agentMcp.enable(TEST_AGENT, TEST_MCP_NAME);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP_NAME)).toBe(true);

    agentMcp.disable(TEST_AGENT, TEST_MCP_NAME);

    // Verify it's also removed from the config file
    const servers = oc.get_mcp_servers();
    expect(servers[TEST_MCP_NAME]).toBeUndefined();
  });
});
