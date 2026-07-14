import type { Agent, McpServer, AddMcpPayload, Skill, InstallSkillPayload, BuiltinSkill, RepositoryMcp, SkillMeta, AgentEnableList, VersionResponse } from './types.js';

// API Paths
export const API = {
  // Version
  version: '/api/version',

  // Agents
  agents: '/api/agents',

  // ── Repository ────────────────────────────────────────────────────────────
  repositoryMcp: '/api/repository/mcp',
  repositoryMcpItem: (name: string) => `/api/repository/mcp/${name}`,
  repositorySkills: '/api/repository/skills',
  repositorySkillItem: (name: string) => `/api/repository/skills/${name}`,
  repositoryImport: (agent: string) => `/api/repository/import/${agent}`,

  // ── Agent enable/disable ──────────────────────────────────────────────────
  agentMcp: (agent: string) => `/api/agents/${agent}/mcp`,
  agentMcpEnable: (agent: string, name: string) => `/api/agents/${agent}/mcp/${name}/enable`,
  agentMcpToggle: (agent: string, name: string) => `/api/agents/${agent}/mcp/${name}/toggle`,
  agentMcpToggleAll: (agent: string) => `/api/agents/${agent}/mcp/toggle-all`,
  agentSkills: (agent: string) => `/api/agents/${agent}/skills`,
  agentSkillEnable: (agent: string, name: string) => `/api/agents/${agent}/skills/${name}/enable`,
  agentSkillToggleAll: (agent: string) => `/api/agents/${agent}/skills/toggle-all`,

  // ── Builtin Skills (read-only, permission toggle) ─────────────────────────
  builtinSkills: (agent: string) => `/api/agents/${agent}/builtin-skills`,
  builtinSkillToggle: (agent: string, name: string) => `/api/agents/${agent}/builtin-skills/${name}/toggle`,
} as const;

// Response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

// Agent API
export interface AgentsResponse {
  agents: Agent[];
}

// MCP API
export interface McpServersResponse {
  servers: McpServer[];
}

// Skills API
export interface SkillsResponse {
  skills: Skill[];
}

export interface BuiltinSkillsResponse {
  skills: BuiltinSkill[];
}

// Repository API
export interface RepositoryMcpResponse {
  servers: Record<string, RepositoryMcp>;
}

export interface RepositorySkillsResponse {
  skills: SkillMeta[];
}

// Agent enable list API
export interface AgentEnableListResponse {
  enabled: AgentEnableList;
}

// Version API
export type { VersionResponse };
