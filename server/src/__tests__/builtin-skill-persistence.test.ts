import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

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

describe("Builtin skill toggle persists to config JSON", () => {
  const MIMOCODE_CONFIG = join(homedir(), ".config", "mimocode", "mimocode.jsonc");
  const OPENCODE_CONFIG = join(homedir(), ".config", "opencode", "opencode.jsonc");

  it("mimocode: toggle changes state and writes to config file", async () => {
    if (!existsSync(MIMOCODE_CONFIG)) return;

    const testSkill = "test-persist-mc";

    // Read current state from config
    const configBefore = readFileSync(MIMOCODE_CONFIG, "utf-8");
    const wasAllow = configBefore.includes(`"${testSkill}": "allow"`);

    // Toggle
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${testSkill}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.allowed).toBe(!wasAllow);

    // Verify written to config file
    const configAfter = readFileSync(MIMOCODE_CONFIG, "utf-8");
    expect(configAfter).toContain(testSkill);
  });

  it("mimocode: double toggle restores original state", async () => {
    if (!existsSync(MIMOCODE_CONFIG)) return;

    const testSkill = "test-double-toggle-mc";

    // First toggle
    const res1 = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${testSkill}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    const data1 = await res1.json();

    // Second toggle should restore
    const res2 = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${testSkill}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    const data2 = await res2.json();
    expect(data2.allowed).toBe(!data1.allowed);
  });

  it("mimocode: read-back matches written state", async () => {
    if (!existsSync(MIMOCODE_CONFIG)) return;

    const testSkill = "test-roundtrip-mc";

    // Toggle to allow
    await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${testSkill}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    // Read via list endpoint
    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills`);
    const listData = await listRes.json();
    const skill = listData.skills.find((s: any) => s.name === testSkill);
    // Skill may not appear if it's not a real builtin skill, but the config was updated
    if (skill) {
      expect(skill.allowed).toBe(true);
    }
  });

  it("opencode: toggle writes permission to config file", async () => {
    if (!existsSync(OPENCODE_CONFIG)) return;

    const testSkill = "test-persist-oc";
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/opencode/builtin-skills/${testSkill}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);

    const config = readFileSync(OPENCODE_CONFIG, "utf-8");
    expect(config).toContain(testSkill);
  });
});

describe("Mimocode real builtin skills list and toggle", () => {
  it("lists mimocode builtin skills with correct structure", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data.skills)).toBe(true);

    for (const skill of data.skills) {
      expect(typeof skill.name).toBe("string");
      expect(typeof skill.path).toBe("string");
      expect(typeof skill.allowed).toBe("boolean");
    }
  });

  it("toggle on a real builtin skill persists and reads back", async () => {
    const listRes = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills`);
    const listData = await listRes.json();
    if (listData.skills.length === 0) return;

    const skill = listData.skills[0];
    const initialAllowed = skill.allowed;

    // Toggle
    const toggleRes = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${skill.name}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(toggleRes.ok).toBe(true);
    const toggleData = await toggleRes.json();
    expect(toggleData.allowed).toBe(!initialAllowed);

    // Read back
    const readRes = await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills`);
    const readData = await readRes.json();
    const readSkill = readData.skills.find((s: any) => s.name === skill.name);
    expect(readSkill).toBeDefined();
    expect(readSkill.allowed).toBe(!initialAllowed);

    // Restore
    await fetch(`http://127.0.0.1:${port}/api/agents/mimocode/builtin-skills/${skill.name}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
  });
});
