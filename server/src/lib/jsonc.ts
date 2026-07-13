import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

export function stripComments(text: string): string {
  const result: string[] = [];
  let i = 0;
  const n = text.length;
  let inString = false;
  let escape = false;

  while (i < n) {
    const c = text[i];

    if (escape) {
      result.push(c);
      escape = false;
      i++;
      continue;
    }

    if (c === "\\" && inString) {
      result.push(c);
      escape = true;
      i++;
      continue;
    }

    if (c === '"' && !escape) {
      inString = !inString;
      result.push(c);
      i++;
      continue;
    }

    if (inString) {
      result.push(c);
      i++;
      continue;
    }

    if (c === "/" && i + 1 < n) {
      const next = text[i + 1];
      if (next === "/") {
        while (i < n && text[i] !== "\n") i++;
        continue;
      }
      if (next === "*") {
        i += 2;
        while (i + 1 < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
    }

    result.push(c);
    i++;
  }

  return result.join("");
}

export function readJsonc(path: string): Record<string, any> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf-8");
  const cleaned = stripComments(text);
  if (!cleaned.trim()) return {};
  return JSON.parse(cleaned);
}

export function writeJsonc(path: string, data: Record<string, any>): void {
  const dir = path.substring(0, path.lastIndexOf("/")) || path.substring(0, path.lastIndexOf("\\"));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
