import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";

const api = createApi();
let server: any;
let port: number;

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;
});

afterAll(() => {
  server.stop();
});

describe("GET /api/agents", () => {
  it("returns agents list", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.agents).toBeDefined();
    expect(Array.isArray(data.agents)).toBe(true);
    expect(data.agents.length).toBe(3);
  });

  it("each agent has required fields", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
    const data = await res.json();
    for (const agent of data.agents) {
      expect(agent.name).toBeDefined();
      expect(typeof agent.available).toBe("boolean");
      expect(agent.configPath).toBeDefined();
    }
  });
});

describe("GET /api/repository/mcp", () => {
  it("returns MCP servers from repository", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.servers).toBeDefined();
    expect(typeof data.servers).toBe("object");
  });
});

describe("GET /api/repository/skills", () => {
  it("returns skills from repository", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.skills).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
  });
});

describe("GET /api/agents/:agent/mcp", () => {
  it("returns enabled MCP list for agent", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.enabled).toBeDefined();
    expect(Array.isArray(data.enabled)).toBe(true);
  });

  it("returns 404 for unknown agent", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/mcp`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/agents/:agent/builtin-skills", () => {
  it("returns builtin skills", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/builtin-skills`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.skills).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
  });
});
