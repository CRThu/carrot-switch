import type { Agent, McpServer, AddMcpPayload, Skill, InstallSkillPayload, BuiltinSkill } from './types.js';

// API Paths
export const API = {
  agents: '/api/agents',
  mcp: (agent: string) => `/api/mcp/${agent}`,
  mcpServer: (agent: string, name: string) => `/api/mcp/${agent}/${name}`,
  mcpToggle: (agent: string, name: string) => `/api/mcp/${agent}/${name}/toggle`,
  skills: (agent: string) => `/api/skills/${agent}`,
  skillInstall: (agent: string) => `/api/skills/${agent}/install`,
  skill: (agent: string, name: string) => `/api/skills/${agent}/${name}`,
  skillPermission: (agent: string, name: string) => `/api/skills/${agent}/${name}/permission`,
  builtinSkills: (agent: string) => `/api/builtin-skills/${agent}`,
  builtinSkillPermission: (agent: string, name: string) => `/api/builtin-skills/${agent}/${name}/permission`,
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
