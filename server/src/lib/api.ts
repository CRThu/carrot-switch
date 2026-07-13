import { Hono } from "hono";
import { z } from "zod";
import { existsSync, statSync } from "fs";
import * as oc from "./config/opencode.js";
import * as mc from "./config/mimocode.js";
import * as cl from "./config/claude.js";
import * as mcpStore from "./store/mcp.js";
import * as skillManager from "./skill/manager.js";
import * as builtinSkills from "./skill/builtin.js";
import { backupConfig } from "./backup.js";
import type { AddMcpPayload, InstallSkillPayload } from "@carrot-switch/shared";

const AddMcpSchema = z.object({
  name: z.string(),
  type: z.string().default("local") as z.ZodType<AddMcpPayload["type"]>,
  command: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  url: z.string().nullable().optional(),
  environment: z.record(z.string()).nullable().optional(),
});

const InstallSkillSchema = z.object({
  source: z.string(),
  sourceType: z.string().default("github") as z.ZodType<InstallSkillPayload["sourceType"]>,
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
    // Handle Zod validation errors
    if (err.name === "ZodError") {
      return c.json({ detail: err.message }, 400 as any);
    }
    // Handle store errors (e.g., "not found")
    if (err.message?.includes("not found")) {
      return c.json({ detail: err.message }, 404 as any);
    }
    console.error(err);
    return c.json({ detail: "Internal server error" }, 500);
  });

  // Agents
  app.get("/api/agents", (c) => {
    return c.json({
      agents: Object.entries(AGENTS).map(([name, cfg]) => ({
        name,
        available: cfg.is_available(),
        configPath: cfg.get_config_path(),
      })),
    });
  });

  // MCP - list
  app.get("/api/mcp/:agent", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    return c.json(mcpStore.load(agent));
  });

  // MCP - add
  app.post("/api/mcp/:agent", async (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const cfg = getConfig(agent);
    const body = await c.req.json();
    const parsed = AddMcpSchema.parse(body);

    backupConfig(agent, cfg.get_config_path());

    let command = parsed.command;
    if (typeof command === "string") {
      command = command.split(/\s+/);
    }

    const server: Record<string, any> = { type: parsed.type };
    if (command && command.length > 0) server.command = command;
    if (parsed.url) server.url = parsed.url;
    if (parsed.environment) server.environment = parsed.environment;

    mcpStore.addServer(agent, parsed.name, server);
    mcpStore.syncToAgent(agent);
    return c.json({ ok: true });
  });

  // MCP - update
  app.put("/api/mcp/:agent/:name", async (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const cfg = getConfig(agent);
    const body = await c.req.json();
    const parsed = AddMcpSchema.parse(body);

    backupConfig(agent, cfg.get_config_path());

    let command = parsed.command;
    if (typeof command === "string") {
      command = command.split(/\s+/);
    }

    const server: Record<string, any> = { type: parsed.type };
    if (command && command.length > 0) server.command = command;
    if (parsed.url) server.url = parsed.url;
    if (parsed.environment) server.environment = parsed.environment;

    mcpStore.updateServer(agent, name, server);
    mcpStore.syncToAgent(agent);
    return c.json({ ok: true });
  });

  // MCP - delete
  app.delete("/api/mcp/:agent/:name", (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const cfg = getConfig(agent);

    backupConfig(agent, cfg.get_config_path());
    mcpStore.deleteServer(agent, name);
    mcpStore.syncToAgent(agent);
    return c.json({ ok: true });
  });

  // MCP - toggle
  app.patch("/api/mcp/:agent/:name/toggle", (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const enabled = mcpStore.toggleServer(agent, name);
    return c.json({ enabled });
  });

  // Skills - list
  app.get("/api/skills/:agent", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const skills = skillManager.listInstalled(agent);
    return c.json({ skills });
  });

  // Skills - install
  app.post("/api/skills/:agent/install", async (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const body = await c.req.json();
    const parsed = InstallSkillSchema.parse(body);

    try {
      if (parsed.sourceType === "local") {
        skillManager.installFromLocal(agent, parsed.source);
      } else if (parsed.sourceType === "zip") {
        await skillManager.installFromZip(agent, parsed.source);
      } else if (parsed.sourceType === "url") {
        await skillManager.installFromUrl(agent, parsed.source);
      } else {
        await skillManager.installFromGithub(agent, parsed.source);
      }
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        throw new HttpException(400, e.message);
      }
      if (e.message?.includes("not found") || e.message?.includes("not a directory")) {
        throw new HttpException(400, e.message);
      }
      throw e;
    }

    return c.json({ ok: true });
  });

  // Skills - uninstall
  app.delete("/api/skills/:agent/:name", (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);

    try {
      skillManager.uninstall(agent, name);
    } catch (e: any) {
      if (e.message?.includes("not found")) {
        throw new HttpException(404, e.message);
      }
      throw e;
    }

    return c.json({ ok: true });
  });

  // Skills - toggle permission
  app.patch("/api/skills/:agent/:name/permission", (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const allowed = skillManager.togglePermission(agent, name);
    return c.json({ allowed });
  });

  // ── Builtin Skills (read-only, permission toggle only) ──────────────────────

  // Builtin Skills - list
  app.get("/api/builtin-skills/:agent", (c) => {
    const agent = c.req.param("agent");
    checkAvailable(agent);
    const skills = builtinSkills.listBuiltinSkills(agent);
    return c.json({ skills });
  });

  // Builtin Skills - toggle permission (no install/uninstall)
  app.patch("/api/builtin-skills/:agent/:name/permission", (c) => {
    const agent = c.req.param("agent");
    const name = c.req.param("name");
    checkAvailable(agent);
    const allowed = builtinSkills.toggleBuiltinSkillPermission(agent, name);
    return c.json({ allowed });
  });

  return app;
}
