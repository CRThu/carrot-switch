import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createApi } from "../lib/api.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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

describe("API Endpoints", () => {
  describe("GET /api/agents", () => {
    it("returns all agents", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.agents).toHaveLength(3);
    });

    it("returns agent names", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
      const data = await res.json();
      const names = data.agents.map((a: any) => a.name);
      expect(names).toContain("opencode");
      expect(names).toContain("mimocode");
      expect(names).toContain("claude");
    });

    it("each agent has required fields", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents`);
      const data = await res.json();
      for (const agent of data.agents) {
        expect(agent.name).toBeDefined();
        expect(typeof agent.available).toBe("boolean");
        expect(agent.configPath).toBeDefined();
        expect(typeof agent.configPath).toBe("string");
      }
    });
  });

  describe("GET /api/mcp/:agent", () => {
    it("returns MCP servers for available agents", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.servers).toBeDefined();
      expect(typeof data.servers).toBe("object");
    });

    it("returns 404 for unknown agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/unknown`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.detail).toContain("Unknown agent");
    });
  });

  describe("POST /api/mcp/:agent", () => {
    it("adds MCP server with array command", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-server-1",
          type: "local",
          command: ["python", "-m", "server"],
        }),
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("adds MCP server with string command (splits to array)", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-server-2",
          type: "local",
          command: "python -m server",
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("adds MCP server with url", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-remote",
          type: "remote",
          url: "http://localhost:3000",
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("adds MCP server with environment", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-env",
          type: "local",
          command: ["node"],
          environment: { NODE_ENV: "production" },
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("validates request body", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // missing required 'name' field
          type: "local",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/unknown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "test", type: "local" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/mcp/:agent/:name", () => {
    it("updates existing MCP server", async () => {
      // First add a server
      await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "update-test",
          type: "local",
          command: ["old-command"],
        }),
      });

      // Then update it
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/update-test`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "update-test",
          type: "local",
          command: ["new-command"],
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown server", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "nonexistent",
          type: "local",
        }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/mcp/:agent/:name", () => {
    it("deletes existing MCP server", async () => {
      // First add a server
      await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "delete-test",
          type: "local",
        }),
      });

      // Then delete it
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/delete-test`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown server", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/nonexistent`, {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/mcp/:agent/:name/toggle", () => {
    it("toggles MCP server enabled state", async () => {
      // First add a server
      await fetch(`http://127.0.0.1:${port}/api/mcp/opencode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "toggle-test",
          type: "local",
        }),
      });

      // Toggle it
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/toggle-test/toggle`, {
        method: "PATCH",
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(typeof data.enabled).toBe("boolean");
    });

    it("returns 404 for unknown server", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/mcp/opencode/nonexistent/toggle`, {
        method: "PATCH",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/skills/:agent", () => {
    it("returns skills list", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/skills/opencode`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
    });

    it("returns 404 for unknown agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/skills/unknown`);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/skills/:agent/:name/permission", () => {
    it("toggles skill permission", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/skills/opencode/test-skill/permission`, {
        method: "PATCH",
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(typeof data.allowed).toBe("boolean");
    });
  });

  describe("Error handling", () => {
    it("returns 404 for unknown agent on all endpoints", async () => {
      const endpoints = [
        { method: "GET", path: "/api/mcp/unknown" },
        { method: "POST", path: "/api/mcp/unknown" },
        { method: "GET", path: "/api/skills/unknown" },
      ];

      for (const endpoint of endpoints) {
        const res = await fetch(`http://127.0.0.1:${port}${endpoint.path}`, {
          method: endpoint.method,
          headers: endpoint.method === "POST" ? { "Content-Type": "application/json" } : undefined,
          body: endpoint.method === "POST" ? JSON.stringify({ name: "test" }) : undefined,
        });
        expect(res.status).toBe(404);
      }
    });
  });
});
