import { createApi } from "./lib/api.js";
import { migrateIfNeeded } from "./lib/migration.js";
import { join } from "path";
import { exec } from "child_process";

const args = process.argv.slice(2);
const noBrowser = args.includes("--no-browser");

// Run migration before starting server
migrateIfNeeded();

const api = createApi();

// Find a free port
const staticDir = join(import.meta.dir, "..", "..", "frontend", "dist");

const server = Bun.serve({
  port: 0,
  fetch: (req) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api")) {
      return api.fetch(req);
    }

    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(staticDir, path);

    try {
      const file = Bun.file(filePath);
      if (file.size > 0) {
        return new Response(file);
      }
    } catch {}

    // SPA fallback
    try {
      const indexFile = Bun.file(join(staticDir, "index.html"));
      if (indexFile.size > 0) {
        return new Response(indexFile);
      }
    } catch {}

    return new Response("Not Found", { status: 404 });
  },
});

const port = server.port;
const url = `http://127.0.0.1:${port}`;

console.log(`Carrot Switch server running at ${url}`);

// Try to open browser (Windows/macOS/Linux)
function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "win32") {
    exec(`start ${url}`);
  } else if (platform === "darwin") {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
}

// Open browser after a short delay to let server start (unless --no-browser)
if (!noBrowser) {
  setTimeout(() => openBrowser(url), 500);
}

console.log("Press Ctrl+C to stop.");
