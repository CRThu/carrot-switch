import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync, appendFileSync, readdirSync, readFileSync } from "fs";

const LOG_ROOT = join(homedir(), "AppData", "Roaming", ".carrotswitch", "logs");

type LogLevel = "INFO" | "WARN" | "ERROR";

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getLogFilePath(date?: string): string {
  ensureDir(LOG_ROOT);
  if (!date) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    date = `${y}-${m}-${d}`;
  }
  return join(LOG_ROOT, `${date}.log`);
}

function formatTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function log(level: LogLevel, message: string): void {
  const ts = formatTimestamp();
  const line = `[${ts}] ${level.padEnd(5)} ${message}\n`;
  const filePath = getLogFilePath();
  appendFileSync(filePath, line, "utf-8");
}

export function info(message: string): void {
  log("INFO", message);
}

export function warn(message: string): void {
  log("WARN", message);
}

export function error(message: string): void {
  log("ERROR", message);
}

export function listLogFiles(): string[] {
  if (!existsSync(LOG_ROOT)) return [];
  return readdirSync(LOG_ROOT)
    .filter(f => f.endsWith(".log"))
    .sort()
    .reverse();
}

export function readLogFile(date: string): string | null {
  const filePath = getLogFilePath(date);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}
