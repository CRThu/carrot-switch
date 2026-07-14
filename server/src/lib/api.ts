import { Hono } from "hono";
import { z } from "zod";
import { existsSync, statSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import versionData from "../../../version.json" with { type: "json" };
import * as oc from "./config/opencode.js";
import * as mc from "./config/mimocode.js";
import * as cl from "./config/claude.js";
import * as repoMcp from "./repository/mcp.js";
import * as repoSkill from "./repository/skill.js";
import * as agentMcp from "./agent/mcp.js";
import * as agentSkill from "./agent/skill.js";
import * as builtinSkills from "./skill/builtin.js";
import type { RepositoryMcp, McpType, SkillSourceType, UpdateRepositoryMcpPayload, EnablePayload } from "@carrot-switch/shared";

const AddMcpSchema = z.object({
  name: z.string(),
  type: z.string().default("local") as z.ZodType<McpType>,
  command: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  url: z.string().nullable().optional(),
  environment: z.record(z.string()).nullable().optional(),
});

const UpdateMcpSchema = z.object({
  type: z.string().optional() as z.ZodType<McpType | undefined>,
  command: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  url: z.string().nullable().optional(),
  environment: z.record(z.string()).nullable().optional(),
});

const InstallSkillSchema = z.object({
  source: z.string(),
  sourceType: z.string().default("github") as z.ZodType<SkillSourceType>,
});

const EnableSchema = z.object({
  enabled: z.boolean(),
});

const AGENTS: Record<string, any> = {
  opencode: oc,
  mimocode: mc,
  claude: cl,
};

function getConfig(agent: string) {
  const cfg = AGENTS[agent];
  if (!cfg) throw new HttpException(404, `Unknown agent: ${agent}`);
  return cfg;
}

function checkAvailable(agent: string) {
  const cfg = getConfig(agent);
  if (!cfg.is_available()) throw new HttpException(404, `${agent} is not installed`);
}

export class HttpException extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function createApi() {
  const app = new Hono();

  // Error handler
  app.onError((err, c) => {
    if (err instanceof HttpException) {
      return c.json({ detail: err.message }, err.status as any);
    }
    if (err.name === "ZodError") {
      return c.json({ detail: err.message }, 400 as any);
    }
    if (err.message?.includes("not found")) {
      return c.json({ detail: err.message }, 404 as any);
    }
    console.error(err);
    return c.json({ detail: "Internal server error" }, 500);
  });

  // ── Version ──────────────────────────────────────────────────────────────────

  app.get("/api/version", (c) => {
    return c.json({ version: versionData.version, name: versionData.name });
  });

  // ── Agents ──────────────────────────────────────────────────────────────────

  app.get("/api/agents", (c) => {
    return c.json({
      agents: Object.entries(AGENTS).map(([name, cfg]) => ({
        name,
        available: cfg.is_available(),
        configPath: cfg.get_config_path(),
      })),
    });
  });

  // ── Repository MCP ──────────────────────────────────────────────────────────

  app.get("/api/repository/mcp", (c) => {
    return c.json({ servers: repoMcp.listAll() });
  });

  app.post("/api/repository/mcp", async (c) => {
    const body = await c.req.json();
    const parsed = AddMcpSchema.parse(body);

    if (repoMcp.exists(parsed.name)) {
      throw new HttpException(400, `MCP server '${parsed.name}' already exists in repository`);
    }

    let command = parsed.command;
    if (typeof command === "string") {
      command = command.split(/\s+/);
    }

    const mcp: RepositoryMcp = {
      name: parsed.name,
      type: parsed.type,
      addedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      source: "manual",
    };
    if (command && command.length > 0) mcp.command = command;
    if (parsed.url) mcp.url = parsed.url;
    if (parsed.environment) mcp.environment = parsed.environment;

    repoMcp.add(mcp);
    return c.json({ ok: true });
  });

  app.put("/api/repository/mcp/:name", async (c) => {
    const name = c.req.param("name");
    const body = await c.req.json();
    const parsed = UpdateMcpSchema.parse(body);

    let command = parsed.command;
    if (typeof command === "string") {
      command = command.split(/\s+/);
    }

    const patch: Partial<RepositoryMcp> = {};
    if (parsed.type) patch.type = parsed.type;
    if (command != null) patch.command = command;
    if (parsed.url != null) patch.url = parsed.url;
    if (parsed.environment != null) patch.environment = parsed.environment;

    const updated = repoMcp.update(name, patch);

    // Sync to all agents that have this MCP enabled
    for (const agent of Object.keys(AGENTS)) {
      if (agentMcp.isEnabled(agent, name)) {
        try {
          agentMcp.enable(agent, name); // re-enable to sync updated config
        } catch {
          // agent may not be available
        }
      }
    }

    return c.json({ ok: true });
  });

  app.delete("/api/repository/mcp/:name", (c) => {
    const name = c.req.param("name");

    // Disable from all agents first
    for (const agent of Object.keys(AGENTS)) {
      if (agentMcp.isEnabled(agent, name)) {
        try {
          agentMcp.disable(agent, name);
        } catch {
          // agent may not be available
        }
      }
    }

    repoMcp.remove(name);
    return c.json({ ok: true });
  });

  // ── Repository Skills ───────────────────────────────────────────────────────

  app.get("/api/repository/skills", (c) => {
    return c.json({ skills: repoSkill.listAll() });
  });

  app.post("/api/repository/skills/install", async (c) => {
    const body = await c.req.json();
    const parsed = InstallSkillSchema.parse(body);

    const { existsSync, mkdirSync, cpSync, mkdtempSync, rmSync } = await import("fs");
    const { tmpdir } = await import("os");

    let name: string;

    if (parsed.sourceType === "local") {
      name = parsed.source.split(/[\\/]/).pop() || "unknown";
      const sourcePath = parsed.source;
      if (!existsSync(sourcePath)) {
        throw new HttpException(400, `Source path does not exist: ${sourcePath}`);
      }
      if (!existsSync(join(sourcePath, "SKILL.md"))) {
        throw new HttpException(400, `Source directory does not contain SKILL.md: ${sourcePath}`);
      }

      if (repoSkill.exists(name)) {
        throw new HttpException(400, `Skill '${name}' already exists in repository`);
      }
      const repoSkillsDir = repoSkill.getSkillPath(name);
      repoSkill.ensureSkillDir();
      cpSync(sourcePath, repoSkillsDir, { recursive: true });
    } else if (parsed.sourceType === "github") {
      name = parsed.source.split(/[\\/]/).pop()?.replace(".git", "") || "unknown";
      let repoUrl = parsed.source;
      if (!repoUrl.startsWith("http")) {
        repoUrl = `https://github.com/${repoUrl}.git`;
      }

      if (repoSkill.exists(name)) {
        throw new HttpException(400, `Skill '${name}' already exists in repository`);
      }
      const repoSkillsDir = repoSkill.getSkillPath(name);
      repoSkill.ensureSkillDir();
      mkdirSync(repoSkillsDir, { recursive: true });
      const proc = Bun.spawn(["git", "clone", repoUrl, repoSkillsDir]);
      await proc.exited;
      if (proc.exitCode !== 0) {
        throw new HttpException(500, `git clone failed with exit code ${proc.exitCode}`);
      }
    } else if (parsed.sourceType === "zip") {
      const { default: AdmZip } = await import("adm-zip");

      const tmpDir = mkdtempSync(join(tmpdir(), "carrot-"));
      try {
        let zipPath: string;
        if (parsed.source.startsWith("http")) {
          zipPath = join(tmpDir, "skill.zip");
          const res = await fetch(parsed.source);
          if (!res.ok) throw new HttpException(500, `Download failed: ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());
          await Bun.write(zipPath, buffer);
        } else {
          zipPath = parsed.source;
          if (!existsSync(zipPath)) {
            throw new HttpException(400, `ZIP file not found: ${zipPath}`);
          }
        }

        const extractDir = join(tmpDir, "extracted");
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);

        const skillDir = findSkillMd(extractDir);
        if (!skillDir) {
          throw new HttpException(400, "ZIP does not contain a directory with SKILL.md");
        }

        name = skillDir.split(/[\\/]/).pop() || "unknown";
        if (repoSkill.exists(name)) {
          throw new HttpException(400, `Skill '${name}' already exists in repository`);
        }
        const repoSkillsDir = repoSkill.getSkillPath(name);
        repoSkill.ensureSkillDir();
        cpSync(skillDir, repoSkillsDir, { recursive: true });
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    } else if (parsed.sourceType === "url") {
      let ext = ".zip";
      if (parsed.source.includes(".tar.gz") || parsed.source.includes(".tgz")) ext = ".tar.gz";
      else if (parsed.source.includes(".tar")) ext = ".tar";

      const tmpDir = mkdtempSync(join(tmpdir(), "carrot-"));
      try {
        const archivePath = join(tmpDir, `skill${ext}`);
        const res = await fetch(parsed.source);
        if (!res.ok) throw new HttpException(500, `Download failed: ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        await Bun.write(archivePath, buffer);

        const extractDir = join(tmpDir, "extracted");
        mkdirSync(extractDir);

        if (ext === ".zip") {
          const { default: AdmZip } = await import("adm-zip");
          const zip = new AdmZip(archivePath);
          zip.extractAllTo(extractDir, true);
        } else {
          const tar = await import("tar");
          await tar.extract({ file: archivePath, cwd: extractDir });
        }

        const skillDir = findSkillMd(extractDir);
        if (!skillDir) {
          throw new HttpException(400, "Downloaded archive does not contain a directory with SKILL.md");
        }

        name = skillDir.split(/[\\/]/).pop() || "unknown";
        if (repoSkill.exists(name)) {
          throw new HttpException(400, `Skill '${name}' already exists in repository`);
        }
        const repoSkillsDir = repoSkill.getSkillPath(name);
        repoSkill.ensureSkillDir();
        cpSync(skillDir, repoSkillsDir, { recursive: true });
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    } else {
      throw new HttpException(400, `Unknown source type: ${parsed.sourceType}`);
    }

    repoSkill.add(name, parsed.source, parsed.sourceType);
    return c.json({ ok: true });
  });

  app.delete("/api/repository/skills/:name", (c) => {
    const name = c.req.param("name");

    // Disable from all agents first
    for (const agent of Object.keys(AGENTS)) {
      if (agentSkill.isEnabled(agent, name)) {
        try {
          agentSkill.disable(agent, name);
        } catch {
          // agent may not be available
        }
      }
    }

    repoSkill.remove(name);
    return c.json({ ok: true });
  });

  // ── Import from agent ───────────────────────────────────────────────────────

  app.post("/api/repository/import/:agent", async (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const cfg = getConfig(agent);

    // Import MCP servers
    const agentServers = cfg.get_mcp_servers();
    for (const [name, server] of Object.entries(agentServers)) {
      if (!repoMcp.exists(name)) {
        const s = server as Record<string, any>;
        const mcp: RepositoryMcp = {
          name,
          type: s.type || "local",
          addedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
          source: "import",
        };
        if (s.command) mcp.command = s.command;
        if (s.url) mcp.url = s.url;
        if (s.environment) mcp.environment = s.environment;
        repoMcp.add(mcp);
      }

      // Enable for this agent
      if (!agentMcp.isEnabled(agent, name)) {
        try {
          agentMcp.enable(agent, name);
        } catch {
          // ignore sync errors
        }
      }
    }

    // Import skills from agent's user skills directory
    const { getUserSkillsDir } = await import("./skill/paths.js");
    const { existsSync, readdirSync, statSync, mkdirSync, cpSync } = await import("fs");
    const { join } = await import("path");

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
            }

            if (!agentSkill.isEnabled(agent, name)) {
              try {
                agentSkill.enable(agent, name);
              } catch {
                // ignore sync errors
              }
            }
          } catch {
            // skip unreadable entries
          }
        }
      }
    } catch {
      // skills import may fail if dir doesn't exist
    }

    return c.json({ ok: true });
  });

  // ── Agent MCP enable/disable ────────────────────────────────────────────────

  app.get("/api/agents/:agent/mcp", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const enabled = agentMcp.getEnabled(agent);
    return c.json({ enabled });
  });

  app.post("/api/agents/:agent/mcp/:name/enable", async (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    const body = await c.req.json();
    const parsed = EnableSchema.parse(body);

    if (parsed.enabled) {
      agentMcp.enable(agent, name);
    } else {
      agentMcp.disable(agent, name);
    }

    return c.json({ ok: true });
  });

  app.post("/api/agents/:agent/mcp/:name/toggle", async (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const enabled = agentMcp.toggle(agent, name);
    return c.json({ enabled });
  });

  app.post("/api/agents/:agent/mcp/toggle-all", async (c) => {
    const agent = c.req.param("agent");
    const body = await c.req.json();
    const parsed = EnableSchema.parse(body);

    agentMcp.toggleAll(agent, parsed.enabled);
    return c.json({ ok: true });
  });

  // ── Agent Skills enable/disable ─────────────────────────────────────────────

  app.get("/api/agents/:agent/skills", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const enabled = agentSkill.getEnabled(agent);
    return c.json({ enabled });
  });

  app.post("/api/agents/:agent/skills/:name/enable", async (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    const body = await c.req.json();
    const parsed = EnableSchema.parse(body);

    if (parsed.enabled) {
      agentSkill.enable(agent, name);
    } else {
      agentSkill.disable(agent, name);
    }

    return c.json({ ok: true });
  });

  app.post("/api/agents/:agent/skills/toggle-all", async (c) => {
    const agent = c.req.param("agent");
    const body = await c.req.json();
    const parsed = EnableSchema.parse(body);

    agentSkill.toggleAll(agent, parsed.enabled);
    return c.json({ ok: true });
  });

  // ── Builtin Skills (read-only, permission toggle) ───────────────────────────

  app.get("/api/agents/:agent/builtin-skills", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const skills = builtinSkills.listBuiltinSkills(agent);
    return c.json({ skills });
  });

  app.post("/api/agents/:agent/builtin-skills/:name/toggle", async (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const allowed = builtinSkills.toggleBuiltinSkillPermission(agent, name);
    return c.json({ allowed });
  });

  return app;
}

function findSkillMd(dir: string): string | null {
  if (existsSync(join(dir, "SKILL.md"))) return dir;
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    try {
      if (statSync(entryPath).isDirectory()) {
        const found = findSkillMd(entryPath);
        if (found) return found;
      }
    } catch {
      // skip
    }
  }
  return null;
}
