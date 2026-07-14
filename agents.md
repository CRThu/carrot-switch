# Carrot Switch - Architecture Overview

## What is this

Carrot Switch is a standalone desktop tool for visually managing MCP servers and Skills configuration across **OpenCode**, **MiMoCode**, and **Claude Code**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Tailwind CSS 4 |
| Build | Vite 8 |
| Backend | Hono + Bun.serve() |
| Package | bun build --compile -> exe |
| Testing | bun test |

## Quick Start

```bash
# Step 1: Install dependencies
bun install

# Step 2: Build frontend
cd frontend && bun run build && cd ..

# Step 3: Run the app
cd server && bun run dev
```

## Project Structure

```
carrot-switch/
├── shared/                      # Shared types & API definitions
│   ├── package.json             # @carrot-switch/shared (workspace)
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── types.ts             # TypeScript interfaces
│       └── api.ts               # API endpoint paths & response types
├── frontend/                    # Vite 8 + Svelte 5 + Tailwind 4
│   ├── package.json             # depends on @carrot-switch/shared
│   ├── vite.config.ts           # @tailwindcss/vite + svelte plugins + shared alias
│   └── src/
│       ├── main.ts              # Svelte 5 mount() + global crash handler
│       ├── App.svelte           # Main layout: Repository tab + Agent tabs
│       ├── app.css              # Tailwind 4 CSS-first config (@theme, @utility)
│       └── lib/
│           ├── api.ts           # Fetch wrapper using shared API paths
│           ├── types.ts         # Re-exports from @carrot-switch/shared
│           └── components/
│               ├── AgentTabs.svelte      # Agent tab selector
│               ├── EnableToggle.svelte   # ON/OFF toggle switch
│               ├── RepositoryTab.svelte  # Repository management UI
│               ├── AddMcpDialog.svelte   # Add MCP dialog
│               └── InstallSkillDialog.svelte
├── server/                      # Bun + TypeScript backend
│   ├── package.json             # hono, zod, adm-zip, tar + @carrot-switch/shared
│   ├── tsconfig.json            # ESNext, bundler resolution + paths alias
│   └── src/
│       ├── index.ts             # Entry: Bun.serve + migration + browser launch
│       └── lib/
│           ├── api.ts           # Hono routes + Zod validation
│           ├── jsonc.ts         # JSONC read/write (strip comments)
│           ├── backup.ts        # Config/skill backup
│           ├── logger.ts        # Log file management
│           ├── migration.ts     # Old store -> repository migration
│           ├── config/
│           │   ├── base.ts      # BaseConfig class
│           │   ├── opencode.ts  # OpenCode config
│           │   ├── mimocode.ts  # MiMoCode config
│           │   └── claude.ts    # Claude Code config + format conversion
│           ├── repository/
│           │   ├── mcp.ts       # Repository MCP CRUD
│           │   └── skill.ts     # Repository skill CRUD + metadata
│           ├── agent/
│           │   ├── mcp.ts       # Agent MCP enable/disable/syncAll
│           │   └── skill.ts     # Agent skill enable/disable/syncAll
│           └── skill/
│               ├── paths.ts     # Skill directory paths + listSkills
│               ├── manager.ts   # Skill install/uninstall/permission
│               └── builtin.ts   # Builtin skills (read-only scan + permission toggle)
├── dist/                        # Build output
│   └── carrot-switch.exe        # Compiled executable
├── version.json                 # Version info (single source of truth)
├── package.json                 # Workspace root
├── AGENTS.md                    # This file
├── .gitignore
└── README.md
```

## Key Design Decisions

### Shared Package (@carrot-switch/shared)

TypeScript interfaces and API path definitions live in `shared/` and are imported by both frontend and server:
- `shared/src/types.ts` -- Agent, McpServer, RepositoryMcp, SkillMeta, AgentEnableList, etc.
- `shared/src/api.ts` -- API endpoint paths and response types

This ensures type safety: if the API response shape changes, both sides get compile errors.

### jsonc Handling

Both OpenCode and MiMoCode use JSONC config files (with `//` comments).
- Read: strip comments -> `JSON.parse()` -> object
- Write: `JSON.stringify(data, null, 2)` -> overwrite (comments lost, values preserved)

### Agent Config Paths

| Agent | Config File | User Skills Dir |
|-------|------------|-----------------|
| OpenCode | `~/.config/opencode/opencode.jsonc` | `~/.config/opencode/skills/` |
| MiMoCode | `~/.config/mimocode/mimocode.jsonc` | `~/.config/mimocode/skills/` |
| Claude Code | `~/.claude.json` | `~/.claude/skills/` |

### Claude Code Format Differences

Claude Code uses a different MCP format than OpenCode/MiMoCode:
- `command` is a string (not array): `"npx"` + `"args": [...]`
- `env` instead of `environment`
- No `enabled` field (all servers active)
- `type: "http"` for remote (not `"remote"`)

The `claude.ts` module handles format conversion between internal and Claude formats.

### Builtin Skills

Builtin skills are shipped with each agent and cannot be installed/uninstalled.
They are read-only and can only be toggled via permission.

| Agent | Builtin Skills Path |
|-------|---------------------|
| OpenCode | `~/.codex/skills/.system/` |
| MiMoCode | `~/.local/share/mimocode/builtin_skills/{version}/skills/` |
| Claude Code | `~/.claude/skills/.system/` |

### Unified Repository Architecture

Carrot Switch uses a unified repository model at `%APPDATA%/.carrotswitch/`:

```
%APPDATA%/.carrotswitch/
├── repository/
│   ├── mcps/                          # All MCP servers (one .json per server)
│   │   └── {name}.json
│   ├── skills/                        # All skills (directories with SKILL.md)
│   │   └── {name}/
│   └── skill-meta.json                # Skill metadata
├── agents/
│   ├── opencode/
│   │   ├── mcp-enabled.json           # ["server1", "server2", ...]
│   │   └── skill-enabled.json         # ["skill1", "skill2", ...]
│   ├── mimocode/
│   │   ├── mcp-enabled.json
│   │   └── skill-enabled.json
│   └── claude/
│       ├── mcp-enabled.json
│       └── skill-enabled.json
├── backup/
│   ├── mcp/{agent}/config_*.jsonc
│   └── skill/{agent}/{name}_*/
└── logs/
    └── {date}.log
```

**Core concepts**:
- **Repository** (`repository/`): Single source of truth for all MCP servers and skills
- **Agent enable lists** (`agents/{name}/`): Records which MCP/skills each agent uses
- **Enable** = copy from repository to agent native config
- **Disable** = remove from agent native config (repository unchanged)

### Lifecycle

```
carrot-switch start
  |-- 1. migrateIfNeeded() -> migrate old per-agent store to repository
  |-- 2. Bun.serve({ port: 0 }) -> random free port
  |-- 3. HTTP server starts (Hono)
  |-- 4. Browser opens -> http://localhost:{port}
  |-- 5. UI -> fetch API -> read/write repository + sync to agent config
  |-- 6. User closes browser tab
  '-- 7. Process exits
```

### Backup

Before every config/skill modification, backup to:
```
%APPDATA%/.carrotswitch/backup/
├── mcp/{opencode,mimocode,claude}/config_YYYYMMDD_HHMMSS.jsonc
└── skill/{opencode,mimocode,claude}/{skillname}_YYYYMMDD_HHMMSS/
```

## API Endpoints

### Version

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/version` | Get current version number |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents + availability |

### Repository Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/repository/mcp` | List all MCP servers in repository |
| POST | `/api/repository/mcp` | Add MCP server to repository |
| PUT | `/api/repository/mcp/:name` | Update MCP server |
| DELETE | `/api/repository/mcp/:name` | Delete MCP server |
| GET | `/api/repository/skills` | List all skills in repository |
| POST | `/api/repository/skills/install` | Install skill to repository |
| DELETE | `/api/repository/skills/:name` | Delete skill |
| POST | `/api/repository/import/:agent` | Import from agent to repository |

### Agent Enable/Disable

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/:agent/mcp` | List enabled MCP for agent |
| POST | `/api/agents/:agent/mcp/:name/enable` | Enable/disable MCP (Body: `{ enabled: boolean }`) |
| POST | `/api/agents/:agent/mcp/toggle-all` | Toggle all MCP (Body: `{ enabled: boolean }`) |
| GET | `/api/agents/:agent/skills` | List enabled skills for agent |
| POST | `/api/agents/:agent/skills/:name/enable` | Enable/disable skill |
| POST | `/api/agents/:agent/skills/toggle-all` | Toggle all skills |

### Builtin Skills

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents/:agent/builtin-skills` | List builtin skills (read-only) |
| POST | `/api/agents/:agent/builtin-skills/:name/toggle` | Toggle permission |

## Build & Package

```bash
# Step 1: Build frontend
cd frontend && bun run build && cd ..

# Step 2: Run in dev mode
cd server && bun run dev

# Step 3: Compile to exe (produces dist/carrot-switch.exe ~94MB)
cd server && bun run build
```

### Dev Proxy

`vite.config.ts` configures `/api` proxy to backend (default `CARROT_BACKEND_PORT=8099`).

## Agent Unavailability

When an agent is not installed (config file doesn't exist), its tab is greyed out and all API calls return 404.

## Error Handling

- `main.ts`: Global crash handler -- `window.onerror` / `onunhandledrejection` catches fatal errors before Svelte mount
- `api.ts`: `NetworkError` (backend not running) and `ApiError` (HTTP error / non-JSON response)
- `App.svelte`: `error` state drives error card + retry button
