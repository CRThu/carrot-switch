import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const api = createApi();
let server: any;
let port: number;
let tmpSkillDir: string;

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;

  // Create temp skill directory with SKILL.md for local install tests
  tmpSkillDir = join(tmpdir(), `carrot-test-skill-${Date.now()}`);
  mkdirSync(tmpSkillDir, { recursive: true });
  writeFileSync(join(tmpSkillDir, "SKILL.md"), "# Test Skill\n\nTest skill for API tests.");
});

afterAll(() => {
  server.stop();
  if (existsSync(tmpSkillDir)) {
    rmSync(tmpSkillDir, { recursive: true, force: true });
  }
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

  describe("Repository MCP CRUD", () => {
    // Clean up test data before tests
    const testNames = ["test-server-crud", "test-server-str", "test-remote-crud", "dup-test", "update-test-crud", "delete-test-crud", "enable-test"];

    beforeAll(async () => {
      for (const name of testNames) {
        await fetch(`http://127.0.0.1:${port}/api/repository/mcp/${name}`, { method: "DELETE" });
      }
    });

    it("lists repository MCP servers", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.servers).toBeDefined();
      expect(typeof data.servers).toBe("object");
    });

    it("adds MCP server to repository", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-server-crud",
          type: "local",
          command: ["python", "-m", "server"],
        }),
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("adds MCP server with string command", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-server-str",
          type: "local",
          command: "python -m server",
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("adds remote MCP server with url", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "test-remote-crud",
          type: "remote",
          url: "http://localhost:3000",
        }),
      });
      expect(res.ok).toBe(true);
    });

    it("returns 400 for duplicate name", async () => {
      // Add first
      await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dup-test", type: "local" }),
      });
      // Add duplicate
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dup-test", type: "local" }),
      });
      expect(res.status).toBe(400);
    });

    it("updates MCP server in repository", async () => {
      // Add first
      await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "update-test-crud", type: "local", command: ["old"] }),
      });

      // Update
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/update-test-crud`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: ["new"] }),
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown server update", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: ["new"] }),
      });
      expect(res.status).toBe(404);
    });

    it("deletes MCP server from repository", async () => {
      // Add first
      await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "delete-test-crud", type: "local" }),
      });

      // Delete
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/delete-test-crud`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown server delete", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/nonexistent`, {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Agent MCP enable/disable", () => {
    it("lists enabled MCP for agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.enabled).toBeDefined();
      expect(Array.isArray(data.enabled)).toBe(true);
    });

    it("enables MCP for agent", async () => {
      // Add to repo first
      await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "enable-test", type: "local", command: ["node"] }),
      });

      // Enable for agent
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/enable-test/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.ok).toBe(true);
    });

    it("disables MCP for agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/enable-test/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      expect(res.ok).toBe(true);
    });

    it("toggle-all enables all MCP", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/toggle-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.ok).toBe(true);
    });

    it("toggle-all disables all MCP", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/toggle-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/mcp`);
      expect(res.status).toBe(404);
    });
  });

  describe("Repository Skills", () => {
    it("lists repository skills", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
    });

    it("installs skill from local directory", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: tmpSkillDir,
          sourceType: "local",
        }),
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("returns 400 for duplicate skill install", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: tmpSkillDir,
          sourceType: "local",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("installed skill appears in list", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
      const data = await res.json();
      const names = data.skills.map((s: any) => s.name);
      // Name is derived from last path segment of source
      const expectedName = tmpSkillDir.split(/[\\/]/).pop()!;
      expect(names).toContain(expectedName);
    });

    it("deletes installed skill from repository", async () => {
      const skillName = tmpSkillDir.split(/[\\/]/).pop()!;
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/${skillName}`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);
    });

    it("returns 404 for unknown skill delete", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/nonexistent-skill`, {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });

    it("deleted skill no longer appears in list", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
      const data = await res.json();
      const names = data.skills.map((s: any) => s.name);
      const deletedName = tmpSkillDir.split(/[\\/]/).pop()!;
      expect(names).not.toContain(deletedName);
    });
  });

  describe("Agent Skills enable/disable", () => {
    it("lists enabled skills for agent", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.enabled).toBeDefined();
      expect(Array.isArray(data.enabled)).toBe(true);
    });

    it("returns 404 for unknown agent on skills", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/skills`);
      expect(res.status).toBe(404);
    });

    it("toggle-all skills enables all", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills/toggle-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.ok).toBe(true);
    });

    it("toggle-all skills disables all", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills/toggle-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      expect(res.ok).toBe(true);
    });
  });

  describe("Import from agent", () => {
    it("imports MCP from agent to repository", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/import/opencode`, {
        method: "POST",
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("returns 404 for unknown agent on import", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/import/unknown`, {
        method: "POST",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Builtin Skills", () => {
    it("lists builtin skills", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/builtin-skills`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.skills).toBeDefined();
      expect(Array.isArray(data.skills)).toBe(true);
    });

    it("toggles builtin skill permission", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/builtin-skills/test/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(typeof data.allowed).toBe("boolean");
    });

    it("returns 404 for unknown agent on builtin-skills", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/builtin-skills`);
      expect(res.status).toBe(404);
    });
  });

  describe("Delete cascade", () => {
    it("deleting repository skill removes it from agent enable list", async () => {
      // Name is derived from last path segment of source
      const skillName = tmpSkillDir.split(/[\\/]/).pop()!;

      // Install skill to repository
      await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: tmpSkillDir, sourceType: "local" }),
      });

      // Enable for agent
      await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills/${skillName}/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      // Verify enabled
      let res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills`);
      let data = await res.json();
      expect(data.enabled).toContain(skillName);

      // Delete from repository
      res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/${skillName}`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);

      // Verify removed from agent enable list
      res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/skills`);
      data = await res.json();
      expect(data.enabled).not.toContain(skillName);
    });

    it("deleting repository MCP removes it from agent enable list", async () => {
      const name = "cascade-delete-test";

      // Add to repository
      await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "local", command: ["node"] }),
      });

      // Enable for agent
      await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/${name}/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      // Verify enabled
      let res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp`);
      let data = await res.json();
      expect(data.enabled).toContain(name);

      // Delete from repository
      res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/${name}`, {
        method: "DELETE",
      });
      expect(res.ok).toBe(true);

      // Verify removed from agent enable list
      res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp`);
      data = await res.json();
      expect(data.enabled).not.toContain(name);
    });
  });

  describe("Error handling", () => {
    it("returns 404 for unknown agent on MCP", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/unknown/mcp`);
      expect(res.status).toBe(404);
    });

    it("validates request body for add MCP", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "local" }), // missing name
      });
      expect(res.status).toBe(400);
    });

    it("validates enable body", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/mcp/test/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // missing enabled
      });
      expect(res.status).toBe(400);
    });
  });
});
