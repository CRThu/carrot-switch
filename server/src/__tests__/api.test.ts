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

describe("GET /api/mcp/:agent", () => {
  it("returns MCP servers for opencode", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.servers).toBeDefined();
  });

  it("returns 404 for unknown agent", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/mcp/unknown`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/skills/:agent", () => {
  it("returns skills for opencode", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/skills/opencode`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.skills).toBeDefined();
    expect(Array.isArray(data.skills)).toBe(true);
  });
});
