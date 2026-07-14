import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";

import * as repoMcp from "../lib/repository/mcp.js";
import * as repoSkill from "../lib/repository/skill.js";
import * as agentMcp from "../lib/agent/mcp.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";
import { readJsonc } from "../lib/jsonc.js";
import { homedir } from "os";
import { createApi } from "../lib/api.js";

const api = createApi();
let server: any;
let port: number;

const TEST_MCP_PREFIX = "crud-all-test-mcp";
const TEST_SKILL_PREFIX = "crud-all-test-skill";
const AGENTS = ["opencode", "mimocode", "claude"] as const;

function getConfigPath(agent: string): string {
  switch (agent) {
    case "opencode": return join(homedir(), ".config", "opencode", "opencode.jsonc");
    case "mimocode": return join(homedir(), ".config", "mimocode", "mimocode.jsonc");
    case "claude": return join(homedir(), ".claude.json");
    default: throw new Error(`Unknown agent: ${agent}`);
  }
}

function getMcpServersFromConfig(agent: string): Record<string, any> {
  const cfg = readJsonc(getConfigPath(agent));
  if (agent === "claude") {
    return cfg.mcpServers || {};
  }
  return cfg.mcp || {};
}

function cleanupMcp(name: string) {
  for (const agent of AGENTS) {
    try { agentMcp.disable(agent, name); } catch {}
  }
  try { repoMcp.remove(name); } catch {}
}

function cleanupSkill(name: string) {
  for (const agent of AGENTS) {
    try { agentSkill.disable(agent, name); } catch {}
    const dir = join(getUserSkillsDir(agent), name);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
  try { repoSkill.remove(name); } catch {}
  const repoDir = join(homedir(), ".carrotswitch", "repository", "skills", name);
  if (existsSync(repoDir)) rmSync(repoDir, { recursive: true, force: true });
}

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;
});

afterAll(() => {
  server.stop();
});

describe("Agent MCP CRUD for all agents", () => {
  for (const agent of AGENTS) {
    describe(`${agent}`, () => {
      const mcpName = `${TEST_MCP_PREFIX}-${agent}`;
      const mcpRemoteName = `${TEST_MCP_PREFIX}-remote-${agent}`;

      afterAll(() => {
        cleanupMcp(mcpName);
        cleanupMcp(mcpRemoteName);
      });

      it("enable adds MCP to agent and writes to config file", () => {
        // Ensure clean state
        cleanupMcp(mcpName);

        // Add to repository
        repoMcp.add({
          name: mcpName,
          type: "local",
          command: ["node", "test.js"],
          addedAt: new Date().toISOString(),
          source: "manual",
        });

        // Enable for agent
        agentMcp.enable(agent, mcpName);
        expect(agentMcp.isEnabled(agent, mcpName)).toBe(true);

        // Verify config file has the MCP
        const servers = getMcpServersFromConfig(agent);
        expect(servers[mcpName]).toBeDefined();

        // Verify format differences
        if (agent === "claude") {
          // Claude: command is string, not array; type is "http" not "remote" for remote
          expect(servers[mcpName].command).toBe("node");
          expect(servers[mcpName].args).toEqual(["test.js"]);
        } else {
          // OpenCode/MiMoCode: command is array
          expect(servers[mcpName].command).toEqual(["node", "test.js"]);
        }
      });

      it("disable removes MCP from agent and config file", () => {
        // Ensure enabled first
        if (!agentMcp.isEnabled(agent, mcpName)) {
          repoMcp.add({
            name: mcpName,
            type: "local",
            command: ["node", "test.js"],
            addedAt: new Date().toISOString(),
            source: "manual",
          });
          agentMcp.enable(agent, mcpName);
        }

        agentMcp.disable(agent, mcpName);
        expect(agentMcp.isEnabled(agent, mcpName)).toBe(false);

        // Verify removed from config file
        const servers = getMcpServersFromConfig(agent);
        expect(servers[mcpName]).toBeUndefined();
      });

      it("enable remote MCP writes correct format to config", () => {
        cleanupMcp(mcpRemoteName);

        repoMcp.add({
          name: mcpRemoteName,
          type: "remote",
          url: "http://localhost:3000",
          addedAt: new Date().toISOString(),
          source: "manual",
        });

        agentMcp.enable(agent, mcpRemoteName);
        expect(agentMcp.isEnabled(agent, mcpRemoteName)).toBe(true);

        const servers = getMcpServersFromConfig(agent);
        expect(servers[mcpRemoteName]).toBeDefined();

        if (agent === "claude") {
          // Claude converts "remote" to "http"
          expect(servers[mcpRemoteName].type).toBe("http");
        } else {
          expect(servers[mcpRemoteName].type).toBe("remote");
        }
      });

      it("disable remote MCP removes from config", () => {
        if (!agentMcp.isEnabled(agent, mcpRemoteName)) {
          repoMcp.add({
            name: mcpRemoteName,
            type: "remote",
            url: "http://localhost:3000",
            addedAt: new Date().toISOString(),
            source: "manual",
          });
          agentMcp.enable(agent, mcpRemoteName);
        }

        agentMcp.disable(agent, mcpRemoteName);
        const servers = getMcpServersFromConfig(agent);
        expect(servers[mcpRemoteName]).toBeUndefined();
      });

      it("toggleAll writes all MCPs to config", () => {
        // Ensure at least one MCP exists in repo
        if (!repoMcp.exists(mcpName)) {
          repoMcp.add({
            name: mcpName,
            type: "local",
            command: ["node", "test.js"],
            addedAt: new Date().toISOString(),
            source: "manual",
          });
        }

        agentMcp.toggleAll(agent, true);
        const enabled = agentMcp.getEnabled(agent);
        const servers = getMcpServersFromConfig(agent);

        // At least our test MCP should be in config
        expect(servers[mcpName]).toBeDefined();

        // Cleanup
        agentMcp.toggleAll(agent, false);
      });

      it("toggleAll false clears all from config", () => {
        agentMcp.toggleAll(agent, false);
        const enabled = agentMcp.getEnabled(agent);
        expect(enabled.length).toBe(0);
      });
    });
  }
});

describe("Agent Skill CRUD for all agents", () => {
  for (const agent of AGENTS) {
    describe(`${agent}`, () => {
      const skillName = `${TEST_SKILL_PREFIX}-${agent}`;

      afterAll(() => {
        cleanupSkill(skillName);
      });

      it("enable copies skill to agent directory", () => {
        cleanupSkill(skillName);

        // Add to repository
        repoSkill.add(skillName, "https://github.com/test/repo", "github");
        const repoSkillDir = repoSkill.getSkillPath(skillName);
        if (!existsSync(repoSkillDir)) {
          mkdirSync(repoSkillDir, { recursive: true });
        }
        writeFileSync(join(repoSkillDir, "SKILL.md"), "# Test Skill\n\nTest.", "utf-8");

        // Enable for agent
        agentSkill.enable(agent, skillName);
        expect(agentSkill.isEnabled(agent, skillName)).toBe(true);

        // Verify skill directory exists in agent's skills dir
        const agentSkillDir = join(getUserSkillsDir(agent), skillName);
        expect(existsSync(agentSkillDir)).toBe(true);
        expect(existsSync(join(agentSkillDir, "SKILL.md"))).toBe(true);
      });

      it("disable removes skill from agent directory", () => {
        agentSkill.disable(agent, skillName);
        expect(agentSkill.isEnabled(agent, skillName)).toBe(false);

        const agentSkillDir = join(getUserSkillsDir(agent), skillName);
        expect(existsSync(agentSkillDir)).toBe(false);
      });

      it("enable is idempotent", () => {
        repoSkill.add(skillName, "https://github.com/test/repo", "github");
        const repoSkillDir = repoSkill.getSkillPath(skillName);
        if (!existsSync(repoSkillDir)) {
          mkdirSync(repoSkillDir, { recursive: true });
        }
        writeFileSync(join(repoSkillDir, "SKILL.md"), "# Test Skill\n\nTest.", "utf-8");

        agentSkill.enable(agent, skillName);
        agentSkill.enable(agent, skillName); // Should not throw

        const enabled = agentSkill.getEnabled(agent);
        const count = enabled.filter(n => n === skillName).length;
        expect(count).toBe(1);

        // Cleanup
        agentSkill.disable(agent, skillName);
      });
    });
  }
});

describe("Delete cascade for all agents", () => {
  for (const agent of AGENTS) {
    describe(`${agent}`, () => {
      const cascadeMcpName = `cascade-test-${agent}`;
      const cascadeSkillName = `cascade-skill-${agent}`;

      afterAll(() => {
        cleanupMcp(cascadeMcpName);
        cleanupSkill(cascadeSkillName);
      });

      it("deleting repository MCP via API removes from agent config", async () => {
        // Add to repository
        repoMcp.add({
          name: cascadeMcpName,
          type: "local",
          command: ["node", "cascade.js"],
          addedAt: new Date().toISOString(),
          source: "manual",
        });

        // Enable for agent
        agentMcp.enable(agent, cascadeMcpName);
        expect(agentMcp.isEnabled(agent, cascadeMcpName)).toBe(true);

        // Verify in config
        const serversBefore = getMcpServersFromConfig(agent);
        expect(serversBefore[cascadeMcpName]).toBeDefined();

        // Delete via API (which cascades to all agents)
        const res = await fetch(`http://127.0.0.1:${port}/api/repository/mcp/${cascadeMcpName}`, {
          method: "DELETE",
        });
        expect(res.ok).toBe(true);

        // Verify removed from agent enable list
        expect(agentMcp.isEnabled(agent, cascadeMcpName)).toBe(false);

        // Verify removed from agent config file
        const serversAfter = getMcpServersFromConfig(agent);
        expect(serversAfter[cascadeMcpName]).toBeUndefined();
      });

      it("deleting repository skill via API removes from agent directory", async () => {
        // Add to repository
        repoSkill.add(cascadeSkillName, "https://github.com/test/cascade", "github");
        const repoSkillDir = repoSkill.getSkillPath(cascadeSkillName);
        if (!existsSync(repoSkillDir)) {
          mkdirSync(repoSkillDir, { recursive: true });
        }
        writeFileSync(join(repoSkillDir, "SKILL.md"), "# Cascade Skill\n\nTest.", "utf-8");

        // Enable for agent
        agentSkill.enable(agent, cascadeSkillName);
        expect(agentSkill.isEnabled(agent, cascadeSkillName)).toBe(true);

        // Verify directory exists
        const agentSkillDir = join(getUserSkillsDir(agent), cascadeSkillName);
        expect(existsSync(agentSkillDir)).toBe(true);

        // Delete via API (which cascades to all agents)
        const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/${cascadeSkillName}`, {
          method: "DELETE",
        });
        expect(res.ok).toBe(true);

        // Verify removed from agent
        expect(agentSkill.isEnabled(agent, cascadeSkillName)).toBe(false);
        expect(existsSync(agentSkillDir)).toBe(false);
      });
    });
  }
});
