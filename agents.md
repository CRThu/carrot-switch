# Carrot Switch - Architecture Overview

## What is this

Carrot Switch 是一个独立的桌面工具，用于可视化管理 **OpenCode**、**MiMoCode** 和 **Claude Code** 的 MCP 服务器和 Skills 配置。

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript 7 + Tailwind CSS 4 |
| Build | Vite 8 |
| Backend | Hono + Bun.serve() |
| Package | bun build --compile → exe |
| Testing | bun test |

## Quick Start

```powershell
# Step 1: Build frontend
cd frontend && bun install && bun run build && cd ..

# Step 2: Run the app
cd server && bun run dev
```

## Project Structure

```
carrot-switch/
├── shared/                      # Shared types & API definitions
│   ├── package.json             # @carrot-switch/shared (workspace)
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── types.ts             # TypeScript interfaces (Agent, McpServer, Skill, etc.)
│       └── api.ts               # API endpoint paths & response types
├── frontend/                    # Vite 8 + Svelte 5 + Tailwind 4
│   ├── package.json             # depends on @carrot-switch/shared
│   ├── vite.config.ts           # @tailwindcss/vite + svelte plugins + shared alias
│   ├── src/
│   │   ├── main.ts              # Svelte 5 mount() + global crash handler
│   │   ├── App.svelte           # Main layout: agent tabs + MCP/Skills sections
│   │   ├── app.css              # Tailwind 4 CSS-first config (@theme, @utility)
│   │   └── lib/
│   │       ├── api.ts           # Fetch wrapper using shared API paths
│   │       ├── types.ts         # Re-exports from @carrot-switch/shared
│   │       └── components/
│   │           ├── AgentTabs.svelte
│   │           ├── McpCard.svelte
│   │           ├── SkillCard.svelte
│   │           ├── AddMcpDialog.svelte
│   │           └── InstallSkillDialog.svelte
├── server/                      # Bun + TypeScript backend
│   ├── package.json             # hono, zod, adm-zip, tar + @carrot-switch/shared
│   ├── tsconfig.json            # ESNext, bundler resolution + paths alias
│   └── src/
│       ├── index.ts             # Entry: Bun.serve + browser launch
│       └── lib/
│           ├── api.ts           # Hono routes + Zod validation
│           ├── jsonc.ts         # JSONC read/write (strip comments)
│           ├── backup.ts        # Config/skill backup
│           ├── config/
│           │   ├── base.ts      # BaseConfig class
│           │   ├── opencode.ts  # OpenCode config
│           │   ├── mimocode.ts  # MiMoCode config
│           │   └── claude.ts    # Claude Code config + format conversion
│           ├── store/
│           │   ├── mcp.ts       # MCP local store + sync_to_agent
│           │   └── skill.ts     # Skill metadata store
│           └── skill/
│               ├── paths.ts     # Skill directory paths
│               ├── manager.ts   # Skill install/uninstall/permission
│               └── builtin.ts   # Builtin skills (read-only scan)
├── dist/                        # Build output
│   └── carrot-switch.exe        # Compiled executable
├── package.json                 # Workspace root
├── AGENTS.md                    # This file
├── .gitignore
└── README.md
```

## Key Design Decisions

### Shared Package (@carrot-switch/shared)

TypeScript interfaces and API path definitions live in `shared/` and are imported by both frontend and server:
- `shared/src/types.ts` — Agent, McpServer, Skill, BuiltinSkill, etc.
- `shared/src/api.ts` — API endpoint paths and response types

This ensures type safety: if the API response shape changes, both sides get compile errors.

### jsonc Handling

Both OpenCode and MiMoCode use JSONC config files (with `//` comments).
- Read: strip comments → `JSON.parse()` → object
- Write: `JSON.stringify(data, null, 2)` → overwrite (comments lost, values preserved)

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

### Local Store Architecture

Carrot Switch maintains its own local JSON store at `%APPDATA%/.carrotswitch/`:

```
%APPDATA%/.carrotswitch/
├── mcps/{opencode,mimocode,claude}.json    # MCP server state
├── skills/{opencode,mimocode,claude}.json  # Skill metadata
├── mcp/{agent}/config_*.jsonc              # Config backups
└── skill/{agent}/{name}_*/                 # Skill backups
```

- **MCP**: Local store is primary; sync to agent config on add/update/delete. Toggle is local-only.
- **Skills**: Filesystem scan + local store metadata enrichment. Install/uninstall record to local store.

### Lifecycle

```
carrot-switch start
  ├─ 1. Bun.serve({ port: 0 }) → random free port
  ├─ 2. HTTP server starts (Hono)
  ├─ 3. Browser opens → http://localhost:{port}
  ├─ 4. UI → fetch API → read/write local store + sync to agent config
  ├─ 5. User closes browser tab
  └─ 6. Process exits
```

### Backup

Before every config/skill modification, backup to:
```
%APPDATA%/.carrotswitch/
├── mcp/{opencode,mimocode,claude}/config_YYYYMMDD_HHMMSS.jsonc
└── skill/{opencode,mimocode,claude}/{skillname}_YYYYMMDD_HHMMSS/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents + availability |
| GET | `/api/mcp/{agent}` | Get MCP servers (from local store) |
| POST | `/api/mcp/{agent}` | Add MCP server (local store + sync) |
| PUT | `/api/mcp/{agent}/{name}` | Update MCP server |
| DELETE | `/api/mcp/{agent}/{name}` | Delete MCP server |
| PATCH | `/api/mcp/{agent}/{name}/toggle` | Toggle enable/disable (local only) |
| GET | `/api/skills/{agent}` | List user-installed skills |
| POST | `/api/skills/{agent}/install` | Install skill (github/local/zip/url) |
| DELETE | `/api/skills/{agent}/{name}` | Uninstall skill |
| PATCH | `/api/skills/{agent}/{name}/permission` | Toggle allow/deny |
| GET | `/api/builtin-skills/{agent}` | List builtin skills (read-only) |
| PATCH | `/api/builtin-skills/{agent}/{name}/permission` | Toggle builtin skill allow/deny |

## Build & Package

```powershell
# Step 1: Build frontend
cd frontend && bun run build && cd ..

# Step 2: Run in dev mode
cd server && bun run dev

# Step 3: Compile to exe (produces dist/carrot-switch.exe ~94MB)
cd server && bun run build
```

## Testing

```powershell
cd server && bun test
```

Tests in `server/src/__tests__/` cover:
- JSONC utilities (strip comments, read/write)
- Config modules (BaseConfig CRUD, Claude format conversion)
- API endpoints (agents, MCP CRUD, skills)
- Backup operations
- Skill paths

### Dev Proxy

`vite.config.ts` 配置了 `/api` 代理到后端（默认 `CARROT_BACKEND_PORT=8099`）。

## Agent Unavailability

When an agent is not installed (config file doesn't exist), its tab is greyed out and all API calls return 404.

## Error Handling

- `main.ts`: 全局崩溃兜底 — `window.onerror` / `onunhandledrejection` 捕获 Svelte 挂载前的致命错误
- `api.ts`: `NetworkError`（后端未启动）和 `ApiError`（HTTP 错误 / 非 JSON 响应）
- `App.svelte`: `error` state 驱动错误提示卡片 + 重试按钮
