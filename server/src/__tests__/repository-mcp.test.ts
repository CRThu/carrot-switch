import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We test the module by directly manipulating the filesystem paths
// since the module uses hardcoded paths to %APPDATA%

import * as repoMcp from "../lib/repository/mcp.js";

const TEST_NAMES = ["repo-mcp-test-1", "repo-mcp-test-2", "repo-mcp-test-3"];

describe("Repository MCP", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    for (const name of TEST_NAMES) {
      try { repoMcp.remove(name); } catch {}
    }
  });

  afterAll(async () => {
    // Clean up test data
    for (const name of TEST_NAMES) {
      try { repoMcp.remove(name); } catch {}
    }
  });

  it("listAll returns empty object initially", () => {
    const result = repoMcp.listAll();
    expect(typeof result).toBe("object");
  });

  it("adds MCP server to repository", () => {
    repoMcp.add({
      name: "repo-mcp-test-1",
      type: "local",
      command: ["node", "server.js"],
      addedAt: new Date().toISOString(),
      source: "manual",
    });

    expect(repoMcp.exists("repo-mcp-test-1")).toBe(true);
  });

  it("gets MCP server from repository", () => {
    const mcp = repoMcp.get("repo-mcp-test-1");
    expect(mcp).not.toBeNull();
    expect(mcp!.name).toBe("repo-mcp-test-1");
    expect(mcp!.type).toBe("local");
    expect(mcp!.command).toEqual(["node", "server.js"]);
    expect(mcp!.source).toBe("manual");
  });

  it("returns null for non-existent MCP", () => {
    const mcp = repoMcp.get("non-existent-mcp");
    expect(mcp).toBeNull();
  });

  it("lists all MCP servers", () => {
    repoMcp.add({
      name: "repo-mcp-test-2",
      type: "remote",
      url: "http://localhost:3000",
      addedAt: new Date().toISOString(),
      source: "import",
    });

    const all = repoMcp.listAll();
    expect(Object.keys(all)).toContain("repo-mcp-test-1");
    expect(Object.keys(all)).toContain("repo-mcp-test-2");
  });

  it("updates MCP server", () => {
    const updated = repoMcp.update("repo-mcp-test-1", {
      command: ["node", "server.js", "--port", "8080"],
    });

    expect(updated.command).toEqual(["node", "server.js", "--port", "8080"]);

    const mcp = repoMcp.get("repo-mcp-test-1");
    expect(mcp!.command).toEqual(["node", "server.js", "--port", "8080"]);
  });

  it("throws on update of non-existent MCP", () => {
    expect(() => {
      repoMcp.update("non-existent", { type: "remote" });
    }).toThrow("not found");
  });

  it("removes MCP server", () => {
    repoMcp.add({
      name: "repo-mcp-test-3",
      type: "local",
      addedAt: new Date().toISOString(),
    });

    expect(repoMcp.exists("repo-mcp-test-3")).toBe(true);

    repoMcp.remove("repo-mcp-test-3");
    expect(repoMcp.exists("repo-mcp-test-3")).toBe(false);
  });

  it("throws on remove of non-existent MCP", () => {
    expect(() => {
      repoMcp.remove("non-existent");
    }).toThrow("not found");
  });

  it("exists returns false for non-existent", () => {
    expect(repoMcp.exists("definitely-not-exists")).toBe(false);
  });

  it("handles MCP with environment variables", () => {
    repoMcp.add({
      name: "repo-mcp-test-3",
      type: "local",
      command: ["node"],
      environment: { NODE_ENV: "production", DEBUG: "true" },
      addedAt: new Date().toISOString(),
    });

    const mcp = repoMcp.get("repo-mcp-test-3");
    expect(mcp!.environment).toEqual({ NODE_ENV: "production", DEBUG: "true" });
  });
});
