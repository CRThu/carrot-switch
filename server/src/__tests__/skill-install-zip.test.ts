import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createApi } from "../lib/api.js";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as repoSkill from "../lib/repository/skill.js";
import * as agentSkill from "../lib/agent/skill.js";
import { getUserSkillsDir } from "../lib/skill/paths.js";

const api = createApi();
let server: any;
let port: number;

const TEST_AGENT = "opencode";
let tmpZipPath: string;
let tmpZipContentDir: string;

beforeAll(async () => {
  server = Bun.serve({ port: 0, fetch: api.fetch });
  port = server.port;

  // Create skill content and zip it
  tmpZipContentDir = join(tmpdir(), `carrot-zip-content-${Date.now()}`);
  const skillDir = join(tmpZipContentDir, "my-zip-skill");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), "# Zip Skill\n\nInstalled from zip.", "utf-8");

  const { default: AdmZip } = await import("adm-zip");
  const zip = new AdmZip();
  zip.addLocalFolder(tmpZipContentDir);
  tmpZipPath = join(tmpdir(), `carrot-zip-test-${Date.now()}.zip`);
  zip.writeZip(tmpZipPath);
});

afterAll(() => {
  server.stop();
  if (existsSync(tmpZipContentDir)) rmSync(tmpZipContentDir, { recursive: true, force: true });
  if (existsSync(tmpZipPath)) rmSync(tmpZipPath);
  try { agentSkill.disable(TEST_AGENT, "my-zip-skill"); } catch {}
  try { repoSkill.remove("my-zip-skill"); } catch {}
});

describe("Skill install from zip file", () => {
  it("installs skill and uses inner directory name (not zip filename)", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: tmpZipPath, sourceType: "zip" }),
    });
    expect(res.ok).toBe(true);

    // Verify name is "my-zip-skill", not the zip filename
    const listRes = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
    const data = await listRes.json();
    const names = data.skills.map((s: any) => s.name);
    expect(names).toContain("my-zip-skill");
  });

  it("skill has correct sourceType metadata", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills`);
    const data = await res.json();
    const skill = data.skills.find((s: any) => s.name === "my-zip-skill");
    expect(skill).toBeDefined();
    expect(skill.sourceType).toBe("zip");
  });

  it("skill can be enabled for agent and files exist", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/my-zip-skill/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.ok).toBe(true);

    const agentSkillDir = join(getUserSkillsDir(TEST_AGENT), "my-zip-skill");
    expect(existsSync(agentSkillDir)).toBe(true);
    expect(existsSync(join(agentSkillDir, "SKILL.md"))).toBe(true);
  });

  it("skill can be disabled for agent", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/agents/${TEST_AGENT}/skills/my-zip-skill/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.ok).toBe(true);
    expect(agentSkill.isEnabled(TEST_AGENT, "my-zip-skill")).toBe(false);
  });

  it("returns 400 for zip without SKILL.md", async () => {
    // Create a zip without SKILL.md
    const badContentDir = join(tmpdir(), `carrot-bad-zip-${Date.now()}`);
    mkdirSync(badContentDir, { recursive: true });
    writeFileSync(join(badContentDir, "readme.txt"), "no skill here", "utf-8");

    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip();
    zip.addLocalFolder(badContentDir);
    const badZipPath = join(tmpdir(), `carrot-bad-${Date.now()}.zip`);
    zip.writeZip(badZipPath);

    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: badZipPath, sourceType: "zip" }),
    });
    expect(res.status).toBe(400);

    rmSync(badContentDir, { recursive: true, force: true });
    rmSync(badZipPath);
  });

  it("returns 400 for duplicate skill name", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: tmpZipPath, sourceType: "zip" }),
    });
    expect(res.status).toBe(400);
  });

  it("cleanup: delete skill", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/repository/skills/my-zip-skill`, {
      method: "DELETE",
    });
    expect(res.ok).toBe(true);
  });
});
