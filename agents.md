# Carrot Switch - Architecture Overview

## What is this

Carrot Switch 是一个独立的桌面工具，用于可视化管理 **OpenCode**、**MiMoCode** 和 **Claude Code** 的 MCP 服务器和 Skills 配置。

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript 7 + Tailwind CSS 4 |
| Build | Vite 8 |
| Backend | FastAPI + uvicorn |
| Desktop | pywebview (WebView2) |
| Package | uv + hatchling |
| Testing | pytest + httpx |
| Python | 3.12+ |

## Quick Start

```powershell
# Step 1: Build frontend
cd frontend && bun install && bun run build && cd ..

# Step 2: Run the app
uv run carrot-switch
```

## Project Structure

```
carrot-switch/
├── pyproject.toml               # hatchling build, Python 3.12+
├── frontend/                    # Vite 8 + Svelte 5 + Tailwind 4
│   ├── vite.config.ts           # @tailwindcss/vite + svelte plugins
│   ├── src/
│   │   ├── main.ts              # Svelte 5 mount() + global crash handler
│   │   ├── App.svelte           # Main layout: agent tabs + MCP/Skills sections
│   │   ├── app.css              # Tailwind 4 CSS-first config (@theme, @utility)
│   │   └── lib/
│   │       ├── api.ts           # Fetch wrapper (ApiError / NetworkError)
│   │       ├── types.ts         # TypeScript interfaces
│   │       └── components/
│   │           ├── AgentTabs.svelte
│   │           ├── McpCard.svelte
│   │           ├── SkillCard.svelte
│   │           ├── AddMcpDialog.svelte
│   │           └── InstallSkillDialog.svelte
├── src/carrot_switch/
│   ├── __main__.py              # python -m carrot_switch
│   ├── cli.py                   # carrot-switch command entry
│   ├── backup.py                # Auto-backup to %APPDATA%/.carrotswitch/
│   ├── config/
│   │   ├── __init__.py          # jsonc read/write (strip comments)
│   │   ├── base.py              # BaseConfig + LazyBaseConfig
│   │   ├── opencode.py          # OpenCode config (LazyBaseConfig)
│   │   ├── mimocode.py          # MiMoCode config (LazyBaseConfig)
│   │   └── claude.py            # Claude Code config (format conversion)
│   ├── store/
│   │   ├── __init__.py          # STORE_ROOT, _ensure_dir, _now_iso
│   │   ├── mcp.py               # MCP local store + sync_to_agent
│   │   └── skill.py             # Skill metadata store
│   ├── skill/
│   │   ├── __init__.py          # Skill directory paths (incl. Claude)
│   │   └── manager.py           # Skill install/uninstall/permission
│   └── web/
│       ├── api.py               # FastAPI REST routes (store-backed)
│       ├── app.py               # FastAPI + pywebview lifecycle
│       └── static/              # ← Vite build output (auto-generated)
├── tests/
│   ├── conftest.py              # Shared fixtures (tmp_home, tmp_store)
│   ├── test_config.py           # JSONC utilities
│   ├── test_opencode.py         # OpenCode config CRUD
│   ├── test_mimocode.py         # MiMoCode config CRUD
│   ├── test_backup.py           # Backup management
│   ├── test_skill_paths.py      # Skill directory paths
│   ├── test_skill_manager.py    # Skill install/uninstall/permission
│   ├── test_api.py              # FastAPI endpoints
│   └── test_integration.py      # Full lifecycle integration tests
```

## Key Design Decisions

### jsonc Handling

Both OpenCode and MiMoCode use JSONC config files (with `//` comments).
- Read: strip comments → `json.loads()` → dict
- Write: `json.dumps(indent=2)` → overwrite (comments lost, values preserved)

### Agent Config Paths

| Agent | Config File | User Skills Dir |
|-------|------------|-----------------|
| OpenCode | `~/.config/opencode/opencode.jsonc` | `~/.codex/skills/` |
| MiMoCode | `~/.config/mimocode/mimocode.jsonc` | `~/.local/share/mimocode/skills/` |
| Claude Code | `~/.claude.json` | `~/.claude/skills/` |

### Claude Code Format Differences

Claude Code uses a different MCP format than OpenCode/MiMoCode:
- `command` is a string (not array): `"npx"` + `"args": [...]`
- `env` instead of `environment`
- No `enabled` field (all servers active)
- `type: "http"` for remote (not `"remote"`)

The `claude.py` module handles format conversion between internal and Claude formats.

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
  ├─ 1. socket.bind(0) → random free port
  ├─ 2. FastAPI starts on background thread (uvicorn)
  ├─ 3. pywebview opens window → load http://localhost:{port}
  ├─ 4. UI → fetch API → read/write local store + sync to agent config
  ├─ 5. User closes window
  └─ 6. pywebview exits → uvicorn thread stops → process exits
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
| GET | `/api/skills/{agent}` | List skills + metadata |
| POST | `/api/skills/{agent}/install` | Install skill (github/local/zip/url) |
| DELETE | `/api/skills/{agent}/{name}` | Uninstall skill |
| PATCH | `/api/skills/{agent}/{name}/permission` | Toggle allow/deny |

## Build & Package

```powershell
# Step 1: Build frontend (outputs to src/carrot_switch/web/static/)
cd frontend && bun run build && cd ..

# Step 2: Run backend (serves static + API)
uv run carrot-switch
```

## Testing

```powershell
# Run all tests
uv run pytest tests/ -v

# Run a specific test file
uv run pytest tests/test_config.py -v

# Run integration tests only
uv run pytest tests/test_integration.py -v
```

Tests use `tmp_home` and `tmp_store` fixtures to isolate filesystem operations.

### Dev Proxy

`vite.config.ts` 配置了 `/api` 代理到后端（默认 `CARROT_BACKEND_PORT=8099`）。

## Agent Unavailability

When an agent is not installed (config file doesn't exist), its tab is greyed out and all API calls return 404.

## Error Handling

- `main.ts`: 全局崩溃兜底 — `window.onerror` / `onunhandledrejection` 捕获 Svelte 挂载前的致命错误
- `api.ts`: `NetworkError`（后端未启动）和 `ApiError`（HTTP 错误 / 非 JSON 响应）
- `App.svelte`: `error` state 驱动错误提示卡片 + 重试按钮
