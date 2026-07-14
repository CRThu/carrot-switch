import { describe, it, expect } from "bun:test";
import { API } from "@carrot-switch/shared";

// Verify that shared API paths are well-formed and consistent
describe("Shared API paths - single source of truth", () => {
  it("version path is valid", () => {
    expect(API.version).toBe("/api/version");
  });

  it("agents path is valid", () => {
    expect(API.agents).toBe("/api/agents");
  });

  it("repository MCP paths are valid", () => {
    expect(API.repositoryMcp).toBe("/api/repository/mcp");
    expect(API.repositoryMcpItem("test")).toBe("/api/repository/mcp/test");
  });

  it("repository skill paths are valid", () => {
    expect(API.repositorySkills).toBe("/api/repository/skills");
    expect(API.repositorySkillItem("test")).toBe("/api/repository/skills/test");
  });

  it("repository import path is valid", () => {
    expect(API.repositoryImport("opencode")).toBe("/api/repository/import/opencode");
  });

  it("agent MCP paths follow pattern", () => {
    const agent = "opencode";
    const name = "test-server";

    expect(API.agentMcp(agent)).toBe(`/api/agents/${agent}/mcp`);
    expect(API.agentMcpEnable(agent, name)).toBe(`/api/agents/${agent}/mcp/${name}/enable`);
    expect(API.agentMcpToggle(agent, name)).toBe(`/api/agents/${agent}/mcp/${name}/toggle`);
    expect(API.agentMcpToggleAll(agent)).toBe(`/api/agents/${agent}/mcp/toggle-all`);
  });

  it("agent skill paths follow pattern", () => {
    const agent = "opencode";
    const name = "test-skill";

    expect(API.agentSkills(agent)).toBe(`/api/agents/${agent}/skills`);
    expect(API.agentSkillEnable(agent, name)).toBe(`/api/agents/${agent}/skills/${name}/enable`);
    expect(API.agentSkillToggleAll(agent)).toBe(`/api/agents/${agent}/skills/toggle-all`);
  });

  it("builtin skill paths follow pattern", () => {
    const agent = "mimocode";
    const name = "arxiv";

    expect(API.builtinSkills(agent)).toBe(`/api/agents/${agent}/builtin-skills`);
    expect(API.builtinSkillToggle(agent, name)).toBe(`/api/agents/${agent}/builtin-skills/${name}/toggle`);
  });

  it("all path functions return strings starting with /api", () => {
    const agent = "opencode";
    const name = "test";

    const paths = [
      API.version,
      API.agents,
      API.repositoryMcp,
      API.repositoryMcpItem(name),
      API.repositorySkills,
      API.repositorySkillItem(name),
      API.repositoryImport(agent),
      API.agentMcp(agent),
      API.agentMcpEnable(agent, name),
      API.agentMcpToggle(agent, name),
      API.agentMcpToggleAll(agent),
      API.agentSkills(agent),
      API.agentSkillEnable(agent, name),
      API.agentSkillToggleAll(agent),
      API.builtinSkills(agent),
      API.builtinSkillToggle(agent, name),
    ];

    for (const path of paths) {
      expect(path.startsWith("/api/")).toBe(true);
    }
  });

  it("no duplicate path patterns", () => {
    const agent = "opencode";
    const name = "test";

    const paths = [
      API.version,
      API.agents,
      API.repositoryMcp,
      API.repositoryMcpItem(name),
      API.repositorySkills,
      API.repositorySkillItem(name),
      API.repositoryImport(agent),
      API.agentMcp(agent),
      API.agentMcpEnable(agent, name),
      API.agentMcpToggle(agent, name),
      API.agentMcpToggleAll(agent),
      API.agentSkills(agent),
      API.agentSkillEnable(agent, name),
      API.agentSkillToggleAll(agent),
      API.builtinSkills(agent),
      API.builtinSkillToggle(agent, name),
    ];

    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});
