import { createApi } from "./lib/api.js";
import { migrateIfNeeded, importAllAgents } from "./lib/migration.js";
import { exec } from "child_process";
import { serve } from "bun";
import index from "../../frontend/dist/index.html";

const args = process.argv.slice(2);
const noBrowser = args.includes("--no-browser");

function getArg(flags: string[]): string | undefined {
  for (const flag of flags) {
    const idx = args.indexOf(flag);
    if (idx !== -1) return args[idx + 1];
  }
  return undefined;
}

const portArg = getArg(["-p", "--port"]);
const port = portArg ? Number(portArg) : 0;

migrateIfNeeded();
importAllAgents();

const api = createApi();

const server = serve({
  port,
  routes: {
    "/": index,
  },
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api")) {
      return api.fetch(req);
    }
    return new Response("Not Found", { status: 404 });
  },
});

const url = `http://127.0.0.1:${server.port}`;
console.log(`Carrot Switch server running at ${url}`);

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "win32") exec(`start ${url}`);
  else if (platform === "darwin") exec(`open ${url}`);
  else exec(`xdg-open ${url}`);
}

if (!noBrowser) {
  setTimeout(() => openBrowser(url), 500);
}

console.log("Press Ctrl+C to stop.");
