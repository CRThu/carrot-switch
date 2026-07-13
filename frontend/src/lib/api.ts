import type {
  Agent,
  McpServer,
  AddMcpPayload,
  Skill,
  InstallSkillPayload,
  BuiltinSkill,
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
  getAgents: () => request<{ agents: Agent[] }>('GET', API.agents),

  getMcpServers: (agent: string) =>
    request<{ servers: Record<string, McpServer> }>('GET', API.mcp(agent)),

  addMcpServer: (agent: string, data: AddMcpPayload) =>
    request<{ ok: boolean }>('POST', API.mcp(agent), data),

  updateMcpServer: (agent: string, name: string, data: AddMcpPayload) =>
    request<{ ok: boolean }>('PUT', API.mcpServer(agent, name), data),

  deleteMcpServer: (agent: string, name: string) =>
    request<{ ok: boolean }>('DELETE', API.mcpServer(agent, name)),

  toggleMcpServer: (agent: string, name: string) =>
    request<{ enabled: boolean }>('PATCH', API.mcpToggle(agent, name)),

  getSkills: (agent: string) =>
    request<{ skills: Skill[] }>('GET', API.skills(agent)),

  installSkill: (agent: string, data: InstallSkillPayload) =>
    request<{ ok: boolean }>('POST', API.skillInstall(agent), data),

  uninstallSkill: (agent: string, name: string) =>
    request<{ ok: boolean }>('DELETE', API.skill(agent, name)),

  toggleSkillPermission: (agent: string, name: string) =>
    request<{ allowed: boolean }>('PATCH', API.skillPermission(agent, name)),

  // Builtin Skills (read-only, permission toggle only)
  getBuiltinSkills: (agent: string) =>
    request<{ skills: BuiltinSkill[] }>('GET', API.builtinSkills(agent)),

  toggleBuiltinSkillPermission: (agent: string, name: string) =>
    request<{ allowed: boolean }>('PATCH', API.builtinSkillPermission(agent, name))
};
