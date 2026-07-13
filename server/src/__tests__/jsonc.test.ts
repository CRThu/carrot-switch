import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { stripComments, readJsonc, writeJsonc } from "../lib/jsonc.js";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "carrot-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("stripComments", () => {
  it("strips line comments", () => {
    const text = '{"key": "value" // comment\n}';
    expect(stripComments(text)).toBe('{"key": "value" \n}');
  });

  it("strips block comments", () => {
    const text = '{"key": /* block */ "value"}';
    expect(stripComments(text)).toBe('{"key":  "value"}');
  });

  it("preserves // in strings", () => {
    const text = '{"url": "http://example.com/foo//bar"}';
    expect(stripComments(text)).toBe('{"url": "http://example.com/foo//bar"}');
  });

  it("preserves /* */ in strings", () => {
    const text = '{"key": "value /* not a comment */"}';
    expect(stripComments(text)).toBe('{"key": "value /* not a comment */"}');
  });

  it("handles multiple comments", () => {
    const text = '// line comment\n{\n  /* block */\n  "a": 1 // another\n}';
    const result = stripComments(text);
    expect(result).not.toContain("//");
    expect(result).not.toContain("/*");
    expect(result).toContain('"a": 1');
  });

  it("handles escaped quotes in strings", () => {
    const text = '{"key": "value\\" // not a comment"}';
    const result = stripComments(text);
    expect(result).toContain('"value\\" // not a comment"');
  });

  it("handles empty string", () => {
    expect(stripComments("")).toBe("");
  });

  it("preserves text without comments", () => {
    const text = '{"a": 1, "b": [2, 3]}';
    expect(stripComments(text)).toBe(text);
  });
});

describe("readJsonc", () => {
  it("reads valid JSONC file", () => {
    const content = '// comment\n{"mcp": {"server1": {"type": "local"}}}';
    const path = join(tmpDir, "test.jsonc");
    writeFileSync(path, content, "utf-8");

    const data = readJsonc(path);
    expect(data.mcp).toBeDefined();
    expect(data.mcp.server1.type).toBe("local");
  });

  it("returns empty object for nonexistent file", () => {
    const data = readJsonc("/nonexistent/file.jsonc");
    expect(data).toEqual({});
  });

  it("returns empty object for empty file", () => {
    const path = join(tmpDir, "empty.jsonc");
    writeFileSync(path, "", "utf-8");
    expect(readJsonc(path)).toEqual({});
  });

  it("returns empty object for whitespace-only file", () => {
    const path = join(tmpDir, "ws.jsonc");
    writeFileSync(path, "   \n\n  ", "utf-8");
    expect(readJsonc(path)).toEqual({});
  });
});

describe("writeJsonc", () => {
  it("creates file with content", () => {
    const path = join(tmpDir, "new.jsonc");
    writeJsonc(path, { key: "value" });
    const data = readJsonc(path);
    expect(data.key).toBe("value");
  });

  it("creates parent directories", () => {
    const path = join(tmpDir, "sub", "dir", "file.jsonc");
    writeJsonc(path, { nested: true });
    const data = readJsonc(path);
    expect(data.nested).toBe(true);
  });

  it("overwrites existing file", () => {
    const path = join(tmpDir, "overwrite.jsonc");
    writeJsonc(path, { old: true });
    writeJsonc(path, { new: true });
    const data = readJsonc(path);
    expect(data.new).toBe(true);
    expect(data.old).toBeUndefined();
  });
});
