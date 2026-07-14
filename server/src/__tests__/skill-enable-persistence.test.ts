import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as repoSkill from "../lib/repository/skill.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";

const api = createApi();
let server: any;
let port: number;

const TEST_AGENT = "opencode";
const TEST_SKILL = "enable-persist-test";

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;

  if (!repoSkill.exists(TEST_SKILL)) {
    const skillDir = repoSkill.getSkillPath(TEST_SKILL);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# Enable Persist Test", "utf-8");
    repoSkill.add(TEST_SKILL, "test", "local");
  }
  try { agentSkill.disable(TEST_AGENT, TEST_SKILL); } catch {}
});

afterAll(() => {
  server.stop();
  try { agentSkill.disable(TEST_AGENT, TEST_SKILL); } catch {}
  try { repoSkill.remove(TEST_SKILL); } catch {}
});

describe("Skill enable/disable persists to enable list", () => {
  it("enable adds to enabled list", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/${TEST_SKILL}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills`);
    const data = await listRes.json();
    expect(data.enabled).toContain(TEST_SKILL);
  });

  it("enable copies skill directory to agent", async () => {
    const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL);
    expect(existsSync(agentSkillDir)).toBe(true);
    expect(existsSync(join(agentSkillDir, "SKILL.md"))).toBe(true);
  });

  it("disable removes from enabled list", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/${TEST_SKILL}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills`);
    const data = await listRes.json();
    expect(data.enabled).not.toContain(TEST_SKILL);
  });

  it("disable removes skill directory from agent", async () => {
    const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL);
    expect(existsSync(agentSkillDir)).toBe(false);
  });

  it("toggle-all enables all skills", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/toggle-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills`);
    const data = await listRes.json();
    expect(data.enabled).toContain(TEST_SKILL);
  });

  it("toggle-all disables all skills", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/toggle-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills`);
    const data = await listRes.json();
    expect(data.enabled.length).toBe(0);
  });
});

describe("MCP enable/disable persists to enable list", () => {
  const TEST_MCP = "mcp-enable-persist-test";

  beforeAll(async () => {
    const repoMcp = require("../lib/repository/mcp.js");
    const agentMcp = require("../lib/agent/mcp.js");
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
    const repoMcp = require("../lib/repository/mcp.js");
    const agentMcp = require("../lib/agent/mcp.js");
    try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
    try { repoMcp.remove(TEST_MCP); } catch {}
  });

  it("enable adds to enabled list and syncs to agent config", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp`);
    const data = await listRes.json();
    expect(data.enabled).toContain(TEST_MCP);

    // Verify synced to agent config
    const oc = require("../lib/config/opencode.js");
    const servers = oc.get_mcp_servers();
    expect(servers[TEST_MCP]).toBeDefined();
  });

  it("disable removes from enabled list and agent config", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp/${TEST_MCP}/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.ok).toBe(true);

    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/mcp`);
    const data = await listRes.json();
    expect(data.enabled).not.toContain(TEST_MCP);

    const oc = require("../lib/config/opencode.js");
    const servers = oc.get_mcp_servers();
    expect(servers[TEST_MCP]).toBeUndefined();
  });
});
