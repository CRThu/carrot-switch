import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";
import * as repoMcp from "../lib/repository/mcp.js";
import * as agentMcp from "../lib/agent/mcp.js";
import * as oc from "../lib/config/opencode.js";

const api = createApi();
let server: any;
let port: number;

const TEST_AGENT = "opencode";
const TEST_MCP = "toggle-endpoint-test";

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;

  if (!repoMcp.exists(TEST_MCP)) {
    repoMcp.add({
      name: TEST_MCP,
      type: "local",
      command: ["node", "test.js"],
      addedAt: new Date().toISOString(),
      source: "manual",
    });
  }
  try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
});

afterAll(() => {
  server.stop();
  try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
  try { repoMcp.remove(TEST_MCP); } catch {}
});

describe("POST /api/agents/:agent/mcp/:name/toggle", () => {
  it("toggles from OFF to ON", async () => {
    agentMcp.disable(TEST_AGENT, TEST_MCP);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP)).toBe(false);

    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.enabled).toBe(true);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP)).toBe(true);
  });

  it("toggles from ON to OFF", async () => {
    agentMcp.enable(TEST_AGENT, TEST_MCP);

    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.enabled).toBe(false);
    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP)).toBe(false);
  });

  it("toggle syncs to agent config JSON", async () => {
    agentMcp.disable(TEST_AGENT, TEST_MCP);

    // Toggle ON
    await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(oc.get_mcp_servers()[TEST_MCP]).toBeDefined();

    // Toggle OFF
    await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(oc.get_mcp_servers()[TEST_MCP]).toBeUndefined();
  });

  it("returns 404 for unknown agent", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/mcp/${TEST_MCP}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});
