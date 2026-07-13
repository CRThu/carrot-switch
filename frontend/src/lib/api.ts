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
  getAgents: () => request<{ agents: import('./types').Agent[] }>('GET', '/api/agents'),

  getMcpServers: (agent: string) =>
    request<{ servers: Record<string, import('./types').McpServer> }>('GET', `/api/mcp/${agent}`),

  addMcpServer: (agent: string, data: import('./types').AddMcpPayload) =>
    request<{ ok: boolean }>('POST', `/api/mcp/${agent}`, data),

  updateMcpServer: (agent: string, name: string, data: import('./types').AddMcpPayload) =>
    request<{ ok: boolean }>('PUT', `/api/mcp/${agent}/${name}`, data),

  deleteMcpServer: (agent: string, name: string) =>
    request<{ ok: boolean }>('DELETE', `/api/mcp/${agent}/${name}`),

  toggleMcpServer: (agent: string, name: string) =>
    request<{ enabled: boolean }>('PATCH', `/api/mcp/${agent}/${name}/toggle`),

  getSkills: (agent: string) =>
    request<{ skills: import('./types').Skill[] }>('GET', `/api/skills/${agent}`),

  installSkill: (agent: string, data: import('./types').InstallSkillPayload) =>
    request<{ ok: boolean }>('POST', `/api/skills/${agent}/install`, data),

  uninstallSkill: (agent: string, name: string) =>
    request<{ ok: boolean }>('DELETE', `/api/skills/${agent}/${name}`),

  toggleSkillPermission: (agent: string, name: string) =>
    request<{ allowed: boolean }>('PATCH', `/api/skills/${agent}/${name}/permission`)
};
