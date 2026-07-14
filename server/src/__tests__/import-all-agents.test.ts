import { describe, it, expect, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { importAllAgents } from "../lib/migration.js";
import * as repoMcp from "../lib/repository/mcp.js";
import * as repoSkill from "../lib/repository/skill.js";
import * as agentMcp from "../lib/agent/mcp.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";
import { readJsonc, writeJsonc } from "../lib/jsonc.js";
import { homedir } from "os";

const TEST_MCP = "import-test-mcp";
const TEST_SKILL = "import-test-skill";
const TEST_AGENT = "opencode";

function addMcpToConfig(name: string, server: Record<string, any>) {
  const configPath = join(homedir(), ".config", "opencode", "opencode.jsonc");
  const cfg = readJsonc(configPath);
  if (!cfg.mcp) cfg.mcp = {};
  cfg.mcp[name] = server;
  writeJsonc(configPath, cfg);
}

function removeMcpFromConfig(name: string) {
  const configPath = join(homedir(), ".config", "opencode", "opencode.jsonc");
  const cfg = readJsonc(configPath);
  if (cfg.mcp && cfg.mcp[name]) {
    delete cfg.mcp[name];
    writeJsonc(configPath, cfg);
  }
}

afterAll(() => {
  try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
  try { agentSkill.disable(TEST_AGENT, TEST_SKILL); } catch {}
  try { repoMcp.remove(TEST_MCP); } catch {}
  try { repoSkill.remove(TEST_SKILL); } catch {}
  try {
    const skillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL);
    if (existsSync(skillDir)) rmSync(skillDir, { recursive: true, force: true });
  } catch {}
  removeMcpFromConfig(TEST_MCP);
});

describe("importAllAgents", () => {
  it("imports MCP from agent config to repository", () => {
    // Ensure clean state
    try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
    if (repoMcp.exists(TEST_MCP)) repoMcp.remove(TEST_MCP);

    // Write directly to config file
    addMcpToConfig(TEST_MCP, { type: "local", command: ["node", "test.js"] });

    // Verify the file was written
    const configPath = join(homedir(), ".config", "opencode", "opencode.jsonc");
    const check = readJsonc(configPath);
    expect(check.mcp).toBeDefined();
    expect(check.mcp[TEST_MCP]).toBeDefined();

    importAllAgents();

    expect(repoMcp.exists(TEST_MCP)).toBe(true);
    const mcp = repoMcp.get(TEST_MCP);
    expect(mcp).not.toBeNull();
    expect(mcp!.type).toBe("local");
    expect(mcp!.source).toBe("import");
  });

  it("enables imported MCP for the agent", () => {
    try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
    if (repoMcp.exists(TEST_MCP)) repoMcp.remove(TEST_MCP);
    addMcpToConfig(TEST_MCP, { type: "local", command: ["node", "test.js"] });

    importAllAgents();

    expect(agentMcp.isEnabled(TEST_AGENT, TEST_MCP)).toBe(true);
  });

  it("imports skills from agent skills directory to repository", () => {
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL); } catch {}
    if (repoSkill.exists(TEST_SKILL)) repoSkill.remove(TEST_SKILL);

    const skillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }
    writeFileSync(join(skillDir, "SKILL.md"), "# Test Skill\n\nImport test.", "utf-8");

    importAllAgents();

    expect(repoSkill.exists(TEST_SKILL)).toBe(true);
    const skill = repoSkill.get(TEST_SKILL);
    expect(skill).not.toBeNull();
    expect(skill!.sourceType).toBe("local");
  });

  it("enables imported skills for the agent", () => {
    try { agentSkill.disable(TEST_AGENT, TEST_SKILL); } catch {}
    if (repoSkill.exists(TEST_SKILL)) repoSkill.remove(TEST_SKILL);

    const skillDir = join(getUserSkillsDir(TEST_AGENT), TEST_SKILL);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }
    writeFileSync(join(skillDir, "SKILL.md"), "# Test Skill\n\nImport test.", "utf-8");

    importAllAgents();

    expect(agentSkill.isEnabled(TEST_AGENT, TEST_SKILL)).toBe(true);
  });

  it("is idempotent - running twice does not duplicate", () => {
    try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
    if (repoMcp.exists(TEST_MCP)) repoMcp.remove(TEST_MCP);
    addMcpToConfig(TEST_MCP, { type: "local", command: ["node", "test.js"] });

    importAllAgents();
    importAllAgents();

    const enabled = agentMcp.getEnabled(TEST_AGENT);
    const mcpCount = enabled.filter(n => n === TEST_MCP).length;
    expect(mcpCount).toBe(1);

    const skillEnabled = agentSkill.getEnabled(TEST_AGENT);
    const skillCount = skillEnabled.filter(n => n === TEST_SKILL).length;
    expect(skillCount).toBe(1);
  });

  it("does not overwrite existing repository MCP", () => {
    try { agentMcp.disable(TEST_AGENT, TEST_MCP); } catch {}
    if (repoMcp.exists(TEST_MCP)) repoMcp.remove(TEST_MCP);
    addMcpToConfig(TEST_MCP, { type: "local", command: ["node", "test.js"] });

    importAllAgents();

    repoMcp.update(TEST_MCP, { source: "manual" as any });
    importAllAgents();

    const mcp = repoMcp.get(TEST_MCP);
    expect(mcp!.source).toBe("manual");
  });
});
