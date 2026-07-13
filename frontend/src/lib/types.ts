export interface Agent {
  name: string;
  available: boolean;
  config_path: string;
}

export interface McpServer {
  name: string;
  type: 'local' | 'remote';
  command?: string[];
  url?: string;
  enabled: boolean;
  environment?: Record<string, string>;
  created_at?: string;
}

export interface Skill {
  name: string;
  allowed: boolean;
  builtin: boolean;
  path: string;
  source?: string;
  source_type?: string;
  installed_at?: string;
}

export interface AddMcpPayload {
  name: string;
  type: 'local' | 'remote';
  command?: string;
  url?: string;
  environment?: Record<string, string>;
}

export interface InstallSkillPayload {
  source: string;
  source_type: 'local' | 'github' | 'zip' | 'url';
}
