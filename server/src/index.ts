import { join } from "path";
import { existsSync } from "fs";
import { createApi } from "./lib/api.js";
import { exec } from "child_process";

const api = createApi();

// Static file directory (frontend build output)
const staticDir = join(import.meta.dir, "web", "static");

// Find a free port
const server = Bun.serve({
  port: 0,
  fetch: (req) => {
    // Try API routes first
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api")) {
      return api.fetch(req);
    }

    // Serve static files
    let filePath = join(staticDir, url.pathname === "/" ? "index.html" : url.pathname);

    // SPA fallback: if file doesn't exist, serve index.html
    if (!existsSync(filePath)) {
      filePath = join(staticDir, "index.html");
    }

    if (existsSync(filePath)) {
      return new Response(Bun.file(filePath));
    }

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

// Open browser after a short delay to let server start
setTimeout(() => openBrowser(url), 500);

console.log("Press Ctrl+C to stop.");
