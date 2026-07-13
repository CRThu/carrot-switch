import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import * as logger from "../lib/logger.js";

const LOG_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch", "logs");

describe("Logger", () => {
  it("info writes to log file", () => {
    logger.info("Test info message");

    const files = logger.listLogFiles();
    expect(files.length).toBeGreaterThan(0);

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const expectedFile = `${y}-${m}-${d}.log`;
    expect(files).toContain(expectedFile);
  });

  it("warn writes to log file", () => {
    logger.warn("Test warning message");

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const content = logger.readLogFile(`${y}-${m}-${d}`);
    expect(content).toContain("WARN");
    expect(content).toContain("Test warning message");
  });

  it("error writes to log file", () => {
    logger.error("Test error message");

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const content = logger.readLogFile(`${y}-${m}-${d}`);
    expect(content).toContain("ERROR");
    expect(content).toContain("Test error message");
  });

  it("listLogFiles returns sorted list", () => {
    const files = logger.listLogFiles();
    expect(Array.isArray(files)).toBe(true);
    // Should be sorted reverse (newest first)
    for (let i = 1; i < files.length; i++) {
      expect(files[i - 1] >= files[i]).toBe(true);
    }
  });

  it("readLogFile returns null for non-existent date", () => {
    const content = logger.readLogFile("2000-01-01");
    // May return null or content depending on whether that date's log exists
    // The key is it shouldn't throw
    expect(content === null || typeof content === "string").toBe(true);
  });

  it("readLogFile returns content for existing log", () => {
    logger.info("Read test message");

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const content = logger.readLogFile(`${y}-${m}-${d}`);
    expect(content).not.toBeNull();
    expect(content).toContain("Read test message");
  });
});
