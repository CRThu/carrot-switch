# Carrot Switch

独立的桌面工具，用于可视化管理 **OpenCode**、**MiMoCode** 和 **Claude Code** 的 MCP 服务器和 Skills 配置。

## 功能

- 管理三个 Agent 的 MCP 服务器配置
- 安装、卸载、启用/禁用 Skills
- 配置备份与恢复
- 一键导出为 exe 可执行文件

## 快速开始

### 前置条件

- [Bun](https://bun.sh/) (JavaScript runtime)

### 开发模式

```bash
# 1. 构建前端
cd frontend
bun install
bun run build
cd ..

# 2. 启动后端（自动打开浏览器）
cd server
bun run dev
```

### 编译为 exe

```bash
cd server
bun run build
# 输出: dist/carrot-switch.exe (~94MB)
```

## 项目结构

```
carrot-switch/
├── frontend/          # Svelte 5 + Vite 8 + Tailwind CSS 4
├── server/            # Hono + Bun + TypeScript
├── dist/              # 编译输出
│   └── carrot-switch.exe
├── AGENTS.md          # 架构文档
└── README.md          # 本文件
```

## 技术栈

| 层 | 技术 |
|----|------|
| Frontend | Svelte 5, TypeScript, Tailwind CSS 4, Vite 8 |
| Backend | Hono, Bun.serve(), Zod |
| 打包 | bun build --compile → 单文件 exe |
| 测试 | bun test |

## 测试

```bash
cd server && bun test
```

138 个测试覆盖：
- JSONC 工具（注释剥离、读写）
- Config 模块（CRUD、Claude 格式转换）
- API 端点（Agent 列表、MCP 增删改查、Skills 管理）
- 备份操作
- Skill 路径配置

## 支持的 Agent

| Agent | 配置文件 | Skills 目录 |
|-------|---------|-------------|
| OpenCode | `~/.config/opencode/opencode.jsonc` | `~/.config/opencode/skills/` |
| MiMoCode | `~/.config/mimocode/mimocode.jsonc` | `~/.config/mimocode/skills/` |
| Claude Code | `~/.claude.json` | `~/.claude/skills/` |

## License

Apache 2.0
