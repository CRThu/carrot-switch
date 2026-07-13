# Carrot Switch - Architecture Overview

## What is this

Carrot Switch 是一个独立的桌面工具，用于可视化管理 **OpenCode** 和 **MiMoCode** 的 MCP 服务器和 Skills 配置。

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + TypeScript + Tailwind CSS |
| Build | Vite |
| Backend | FastAPI + uvicorn |
| Desktop | pywebview (WebView2) |
| Package | uv + hatchling |
| Testing | pytest + httpx |

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
├── pyproject.toml               # hatchling build, entry point: carrot-switch
├── frontend/                    # Vite + Svelte 5
│   ├── vite.config.ts           # Dev proxy: /api → backend; build output to static/
│   ├── src/
│   │   ├── main.ts              # Svelte 5 mount() + global crash handler (window.onerror)
│   │   ├── App.svelte           # Main layout: agent tabs + MCP/Skills sections
│   │   ├── lib/
│   │   │   ├── api.ts           # Fetch wrapper (ApiError / NetworkError for backend-down)
│   │   │   ├── types.ts         # TypeScript interfaces
│   │   │   └── components/
│   │   │       ├── AgentTabs.svelte
│   │   │       ├── McpCard.svelte
│   │   │       ├── SkillCard.svelte
│   │   │       ├── AddMcpDialog.svelte
│   │   │       └── InstallSkillDialog.svelte
│   │   └── app.css              # Tailwind entry
├── src/carrot_switch/
│   ├── __main__.py              # python -m carrot_switch
│   ├── cli.py                   # carrot-switch command entry
│   ├── backup.py                # Auto-backup to %APPDATA%/.carrotswitch/
│   ├── config/
│   │   ├── __init__.py          # jsonc read/write (strip comments)
│   │   ├── opencode.py          # OpenCode config CRUD
│   │   └── mimocode.py          # MiMoCode config CRUD
│   ├── skill/
│   │   ├── __init__.py          # Skill directory paths
│   │   └── manager.py           # Skill install/uninstall/permission
│   └── web/
│       ├── api.py               # FastAPI REST routes
│       ├── app.py               # FastAPI + pywebview lifecycle (random port)
│       └── static/              # ← Vite build output (auto-generated)
├── tests/                       # pytest unit + integration tests
│   ├── conftest.py              # Shared fixtures (tmp_home, mock paths)
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

### Lifecycle

```
carrot-switch start
  ├─ 1. socket.bind(0) → random free port
  ├─ 2. FastAPI starts on background thread (uvicorn)
  ├─ 3. pywebview opens window → load http://localhost:{port}
  ├─ 4. UI → fetch API → read/write configs (backup before modify)
  ├─ 5. User closes window
  └─ 6. pywebview exits → uvicorn thread stops → process exits
```

### Backup

Before every config/skill modification, backup to:
```
%APPDATA%/.carrotswitch/
├── mcp/{opencode,mimocode}/config_YYYYMMDD_HHMMSS.jsonc
└── skill/{opencode,mimocode}/{skillname}_YYYYMMDD_HHMMSS/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents + availability |
| GET | `/api/mcp/{agent}` | Get MCP servers |
| POST | `/api/mcp/{agent}` | Add MCP server |
| PUT | `/api/mcp/{agent}/{name}` | Update MCP server |
| DELETE | `/api/mcp/{agent}/{name}` | Delete MCP server |
| PATCH | `/api/mcp/{agent}/{name}/toggle` | Toggle enable/disable |
| GET | `/api/skills/{agent}` | List skills + permissions |
| POST | `/api/skills/{agent}/install` | Install skill (local/github) |
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

Tests use `tmp_home` fixture to isolate filesystem operations — no real configs are modified.

### Dev Proxy

`vite.config.ts` 配置了 `/api` 代理到后端（默认 `CARROT_BACKEND_PORT=8099`）。
同时启动前后端时，设置环境变量 `CARROT_BACKEND_PORT` 匹配后端端口即可。

## Agent Unavailability

When an agent is not installed (config dir doesn't exist), its tab is greyed out and all API calls return 404.

## Error Handling

- `main.ts`: 全局崩溃兜底 — `window.onerror` / `onunhandledrejection` 捕获 Svelte 挂载前的致命错误，直接渲染错误页面（而非白屏）
- `api.ts`: `NetworkError`（后端未启动）和 `ApiError`（HTTP 错误 / 非 JSON 响应）两个错误类
- `App.svelte`: `error` state 驱动错误提示卡片 + 重试按钮，覆盖 init 阶段的所有异常
