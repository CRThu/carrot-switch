# Carrot Switch

> 独立的桌面工具，用于可视化管理 **OpenCode**、**MiMoCode** 和 **Claude Code** 的 MCP 服务器和 Skills 配置。

## 功能

- **统一仓库管理**：MCP 和 Skills 存储在中央仓库，支持跨 Agent 共享
- **Agent 启用/禁用**：一键开关各 Agent 的 MCP 和 Skills
- **Builtin Skills 权限管理**：控制 Agent 内置 Skills 的允许/拒绝
- **配置备份**：修改前自动备份
- **旧数据迁移**：从旧版本无缝升级

## 快速开始

### 前置条件

- [Bun](https://bun.sh/)（JavaScript 运行时和包管理器）

### 开发模式

```bash
# 1. 安装依赖
bun install

# 2. 构建前端
cd frontend && bun run build && cd ..

# 3. 启动后端（自动打开浏览器）
cd server && bun run dev
```

### 编译为 exe

```bash
cd server && bun run build
# 输出: dist/carrot-switch.exe (~94MB)
```

## 技术栈

| 层 | 技术 |
|----|------|
| Frontend | Svelte 5, TypeScript, Tailwind CSS 4, Vite 8 |
| Backend | Hono, Bun.serve(), Zod |
| 打包 | `bun build --compile` → 单文件 exe |

## 项目结构

```
carrot-switch/
├── shared/                  # 共享类型和 API 定义
│   └── src/
│       ├── types.ts         # TypeScript 接口
│       └── api.ts           # API 端点路径和响应类型
├── frontend/                # Svelte 5 + Vite 8 + Tailwind 4
│   └── src/
│       ├── App.svelte       # 主布局：仓库 Tab + Agent Tab
│       └── lib/components/
│           ├── AgentTabs.svelte
│           ├── EnableToggle.svelte
│           ├── RepositoryTab.svelte
│           ├── AddMcpDialog.svelte
│           └── InstallSkillDialog.svelte
├── server/                  # Hono + Bun 后端
│   └── src/
│       ├── index.ts         # 入口：服务器 + 迁移 + 浏览器启动
│       └── lib/
│           ├── api.ts       # Hono 路由 + Zod 验证
│           ├── config/      # Agent 配置模块（opencode, mimocode, claude）
│           ├── repository/  # 仓库 MCP/Skill CRUD
│           ├── agent/       # Agent MCP/Skill 启用/禁用
│           ├── skill/       # Skill 路径、管理器、内置扫描
│           ├── backup.ts    # 配置/Skill 备份
│           ├── logger.ts    # 日志文件管理
│           └── migration.ts # 旧版存储迁移
└── dist/
    └── carrot-switch.exe
```

## 数据存储

统一仓库模型，存储在 `%APPDATA%/.carrotswitch/`：

```
%APPDATA%/.carrotswitch/
├── repository/
│   ├── mcps/                # MCP 服务器配置（每个服务器一个 .json）
│   └── skills/              # Skill 目录（每个包含 SKILL.md）
├── agents/
│   ├── opencode/
│   ├── mimocode/
│   └── claude/
│       ├── mcp-enabled.json
│       └── skill-enabled.json
├── backup/                  # 修改前自动备份
└── logs/                    # 操作日志
```

## 支持的 Agent

| Agent | 配置文件 | Skills 目录 |
|-------|---------|-------------|
| OpenCode | `~/.config/opencode/opencode.jsonc` | `~/.config/opencode/skills/` |
| MiMoCode | `~/.config/mimocode/mimocode.jsonc` | `~/.config/mimocode/skills/` |
| Claude Code | `~/.claude.json` | `~/.claude/skills/` |

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/agents` | 列出所有 Agent 及可用性 |
| GET | `/api/repository/mcp` | 列出仓库中所有 MCP |
| POST | `/api/repository/mcp` | 添加 MCP 到仓库 |
| PUT | `/api/repository/mcp/:name` | 更新 MCP |
| DELETE | `/api/repository/mcp/:name` | 删除 MCP |
| GET | `/api/repository/skills` | 列出仓库中所有 Skills |
| POST | `/api/repository/skills/install` | 安装 Skill |
| DELETE | `/api/repository/skills/:name` | 删除 Skill |
| POST | `/api/repository/import/:agent` | 从 Agent 导入 |
| GET | `/api/agents/:agent/mcp` | 列出 Agent 已启用的 MCP |
| POST | `/api/agents/:agent/mcp/:name/enable` | 启用/禁用 MCP |
| POST | `/api/agents/:agent/mcp/toggle-all` | 全部启用/禁用 MCP |
| GET | `/api/agents/:agent/skills` | 列出 Agent 已启用的 Skills |
| POST | `/api/agents/:agent/skills/:name/enable` | 启用/禁用 Skill |
| POST | `/api/agents/:agent/skills/toggle-all` | 全部启用/禁用 Skills |
| GET | `/api/agents/:agent/builtin-skills` | 列出内置 Skills |
| POST | `/api/agents/:agent/builtin-skills/:name/toggle` | 切换权限 |

## License

Apache 2.0
