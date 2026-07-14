import type {
  Agent,
  McpServer,
  AddMcpPayload,
  Skill,
  InstallSkillPayload,
  BuiltinSkill,
  RepositoryMcp,
  SkillMeta,
  AgentEnableList,
  VersionResponse,
} from "@carrot-switch/shared";
import { API } from "@carrot-switch/shared";

const BASE = '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, opts);
  } catch (e) {
    throw new NetworkError(`无法连接后端服务: ${(e as Error).message}`);
  }
  if (!res.ok) {
    let text: string;
    try {
      text = await res.text();
    } catch {
      text = res.statusText;
    }
    throw new ApiError(res.status, `${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status, `后端返回了非 JSON 响应 (${res.status})，请确认后端服务已启动`);
  }
  return res.json();
}

export const api = {
  // ── Version ─────────────────────────────────────────────────────────────────
  getVersion: () => request<VersionResponse>('GET', API.version),

  // ── Agents ──────────────────────────────────────────────────────────────────
  getAgents: () => request<{ agents: Agent[] }>('GET', API.agents),

  // ── Repository MCP ──────────────────────────────────────────────────────────
  getRepositoryMcp: () =>
    request<{ servers: Record<string, RepositoryMcp> }>('GET', API.repositoryMcp),

  addRepositoryMcp: (data: AddMcpPayload) =>
    request<{ ok: boolean }>('POST', API.repositoryMcp, data),

  updateRepositoryMcp: (name: string, data: Partial<AddMcpPayload>) =>
    request<{ ok: boolean }>('PUT', API.repositoryMcpItem(name), data),

  deleteRepositoryMcp: (name: string) =>
    request<{ ok: boolean }>('DELETE', API.repositoryMcpItem(name)),

  // ── Repository Skills ───────────────────────────────────────────────────────
  getRepositorySkills: () =>
    request<{ skills: SkillMeta[] }>('GET', API.repositorySkills),

  installRepositorySkill: (data: InstallSkillPayload) =>
    request<{ ok: boolean }>('POST', API.repositorySkills + '/install', data),

  deleteRepositorySkill: (name: string) =>
    request<{ ok: boolean }>('DELETE', API.repositorySkillItem(name)),

  // ── Import from agent ───────────────────────────────────────────────────────
  importFromAgent: (agent: string) =>
    request<{ ok: boolean }>('POST', API.repositoryImport(agent)),

  // ── Agent MCP enable/disable ────────────────────────────────────────────────
  getAgentMcpEnabled: (agent: string) =>
    request<{ enabled: string[] }>('GET', API.agentMcp(agent)),

  enableAgentMcp: (agent: string, name: string, enabled: boolean) =>
    request<{ ok: boolean }>('POST', API.agentMcpEnable(agent, name), { enabled }),

  toggleAgentMcp: (agent: string, name: string) =>
    request<{ enabled: boolean }>('POST', API.agentMcpToggle(agent, name)),

  deleteAgentMcp: (agent: string, name: string) =>
    request<{ ok: boolean }>('POST', API.agentMcpEnable(agent, name), { enabled: false }),

  toggleAllAgentMcp: (agent: string, enabled: boolean) =>
    request<{ ok: boolean }>('POST', API.agentMcpToggleAll(agent), { enabled }),

  // ── Agent Skills enable/disable ─────────────────────────────────────────────
  getAgentSkillsEnabled: (agent: string) =>
    request<{ enabled: string[] }>('GET', API.agentSkills(agent)),

  enableAgentSkill: (agent: string, name: string, enabled: boolean) =>
    request<{ ok: boolean }>('POST', API.agentSkillEnable(agent, name), { enabled }),

  uninstallAgentSkill: (agent: string, name: string) =>
    request<{ ok: boolean }>('POST', API.agentSkillEnable(agent, name), { enabled: false }),

  toggleAllAgentSkills: (agent: string, enabled: boolean) =>
    request<{ ok: boolean }>('POST', API.agentSkillToggleAll(agent), { enabled }),

  // ── Builtin Skills (read-only, permission toggle) ───────────────────────────
  getBuiltinSkills: (agent: string) =>
    request<{ skills: BuiltinSkill[] }>('GET', API.builtinSkills(agent)),

  toggleBuiltinSkillPermission: (agent: string, name: string) =>
    request<{ allowed: boolean }>('POST', API.builtinSkillToggle(agent, name), { enabled: true }),

  // ── Agent Skill permission toggle ───────────────────────────────────────────
  toggleSkillPermission: (agent: string, name: string) =>
    request<{ allowed: boolean }>('POST', API.builtinSkillToggle(agent, name), { enabled: true }),
};
