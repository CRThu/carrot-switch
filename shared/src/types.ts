export type AgentName = 'opencode' | 'mimocode' | 'claude';

export type McpType = 'local' | 'remote' | 'http';

export type SkillSourceType = 'local' | 'github' | 'zip' | 'url';

export interface Agent {
  name: AgentName;
  available: boolean;
  configPath: string;
}

export interface McpServer {
  name: string;
  type: McpType;
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  enabled: boolean;
  createdAt?: string;
}

export interface AddMcpPayload {
  name: string;
  type?: McpType;
  command?: string | string[];
  url?: string;
  environment?: Record<string, string>;
}

export interface Skill {
  name: string;
  path: string;
  builtin: boolean;
  allowed: boolean;
  source?: string;
  sourceType?: SkillSourceType;
  installedAt?: string;
}

export interface InstallSkillPayload {
  source: string;
  sourceType?: SkillSourceType;
}

export interface BuiltinSkill {
  name: string;
  path: string;
  allowed: boolean;
}
