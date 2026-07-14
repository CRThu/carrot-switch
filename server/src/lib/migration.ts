import { join } from "path";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync, cpSync } from "fs";
import * as repository from "./repository/mcp.js";
import * as repoSkill from "./repository/skill.js";
import * as agentMcp from "./agent/mcp.js";
import * as agentSkill from "./agent/skill.js";
import type { RepositoryMcp, McpType } from "@carrot-switch/shared";
import { info, warn } from "./logger.js";
import { CARROT_ROOT } from "./base.js";
import { getUserSkillsDir } from "./skill/paths.js";
import * as oc from "./config/opencode.js";
import * as mc from "./config/mimocode.js";
import * as cl from "./config/claude.js";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readJsonSafe(filePath: string): any {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function migrateIfNeeded(): void {
  const oldMcpDir = join(CARROT_ROOT, "mcps");
  const oldSkillDir = join(CARROT_ROOT, "skills");

  if (!existsSync(oldMcpDir) && !existsSync(oldSkillDir)) {
    return; // No old data to migrate
  }

  info("Starting migration from old store format...");

  if (existsSync(oldMcpDir)) {
    migrateMcpData(oldMcpDir);
  }

  if (existsSync(oldSkillDir)) {
    migrateSkillData(oldSkillDir);
  }

  // Rename old directories to .bak
  try {
    if (existsSync(oldMcpDir)) {
      renameSync(oldMcpDir, oldMcpDir + ".bak");
      info("Backed up old MCP store to mcps.bak/");
    }
  } catch (e) {
    warn(`Failed to rename old MCP store: ${(e as Error).message}`);
  }

  try {
    if (existsSync(oldSkillDir)) {
      renameSync(oldSkillDir, oldSkillDir + ".bak");
      info("Backed up old skill store to skills.bak/");
    }
  } catch (e) {
    warn(`Failed to rename old skill store: ${(e as Error).message}`);
  }

  info("Migration complete");
}

const AGENTS: Record<string, any> = { opencode: oc, mimocode: mc, claude: cl };

export function importAllAgents(): void {
  info("Importing agents to repository...");

  for (const [agent, cfg] of Object.entries(AGENTS)) {
    if (!cfg.is_available()) continue;

    info(`Importing from agent: ${agent}`);

    // Import MCP servers
    try {
      const agentServers = cfg.get_mcp_servers();
      for (const [name, server] of Object.entries(agentServers)) {
        const s = server as Record<string, any>;

        if (!repository.exists(name)) {
          const mcp: RepositoryMcp = {
            name,
            type: (s.type || "local") as McpType,
            addedAt: nowIso(),
            source: "import",
          };
          if (s.command) mcp.command = s.command;
          if (s.url) mcp.url = s.url;
          if (s.environment) mcp.environment = s.environment;
          repository.add(mcp);
          info(`Imported MCP '${name}' from ${agent}`);
        }

        if (!agentMcp.isEnabled(agent, name)) {
          try {
            agentMcp.enable(agent, name);
          } catch (e) {
            warn(`Failed to enable MCP '${name}' for ${agent}: ${(e as Error).message}`);
          }
        }
      }
    } catch (e) {
      warn(`Failed to import MCP from ${agent}: ${(e as Error).message}`);
    }

    // Import skills from agent's user skills directory
    try {
      const userSkillsDir = getUserSkillsDir(agent);
      if (existsSync(userSkillsDir)) {
        for (const entry of readdirSync(userSkillsDir)) {
          const entryPath = join(userSkillsDir, entry);
          try {
            if (!statSync(entryPath).isDirectory()) continue;
            if (!existsSync(join(entryPath, "SKILL.md"))) continue;

            const name = entry;

            if (!repoSkill.exists(name)) {
              const repoSkillDir = repoSkill.getSkillPath(name);
              repoSkill.ensureSkillDir();
              mkdirSync(repoSkillDir, { recursive: true });
              cpSync(entryPath, repoSkillDir, { recursive: true });
              repoSkill.add(name, `imported from ${agent}`, "local");
              info(`Imported skill '${name}' from ${agent}`);
            }

            if (!agentSkill.isEnabled(agent, name)) {
              try {
                agentSkill.enable(agent, name);
              } catch (e) {
                warn(`Failed to enable skill '${name}' for ${agent}: ${(e as Error).message}`);
              }
            }
          } catch {
            // skip unreadable entries
          }
        }
      }
    } catch (e) {
      warn(`Failed to import skills from ${agent}: ${(e as Error).message}`);
    }
  }

  info("Agent import complete");
}

function migrateMcpData(oldDir: string): void {
  const files = readdirSync(oldDir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const agent = file.replace(/\.json$/, "");
    const data = readJsonSafe(join(oldDir, file));
    if (!data?.servers) continue;

    info(`Migrating MCP data for agent: ${agent}`);

    for (const [name, server] of Object.entries(data.servers)) {
      const s = server as Record<string, any>;

      // Add to repository if not already there
      if (!repository.exists(name)) {
        const mcp: RepositoryMcp = {
          name,
          type: (s.type || "local") as McpType,
          addedAt: s.createdAt || nowIso(),
          source: "import",
        };
        if (s.command) mcp.command = s.command;
        if (s.url) mcp.url = s.url;
        if (s.environment) mcp.environment = s.environment;
        repository.add(mcp);
        info(`Imported MCP '${name}' to repository`);
      }

      // Enable for this agent if it was enabled
      if (s.enabled !== false) {
        try {
          agentMcp.enable(agent, name);
          info(`Enabled MCP '${name}' for agent '${agent}'`);
        } catch (e) {
          warn(`Failed to enable MCP '${name}' for agent '${agent}': ${(e as Error).message}`);
        }
      }
    }
  }
}

function migrateSkillData(oldDir: string): void {
  const files = readdirSync(oldDir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const agent = file.replace(/\.json$/, "");
    const data = readJsonSafe(join(oldDir, file));
    if (!data?.skills) continue;

    info(`Migrating skill data for agent: ${agent}`);

    for (const [name, meta] of Object.entries(data.skills)) {
      const m = meta as Record<string, any>;

      // Add to repository metadata if not already there
      if (!repoSkill.exists(name)) {
        repoSkill.add(
          name,
          m.source || "unknown",
          (m.sourceType || "local") as any,
        );
        info(`Imported skill '${name}' to repository metadata`);
      }

      // Enable for this agent
      try {
        agentSkill.enable(agent, name);
        info(`Enabled skill '${name}' for agent '${agent}'`);
      } catch (e) {
        warn(`Failed to enable skill '${name}' for agent '${agent}': ${(e as Error).message}`);
      }
    }
  }
}
