<script lang="ts">
  import { onMount } from 'svelte';
  import { api, NetworkError } from './lib/api';
  import type { Agent, McpServer, Skill, BuiltinSkill } from './lib/types';
  import AgentTabs from './lib/components/AgentTabs.svelte';
  import EnableToggle from './lib/components/EnableToggle.svelte';
  import RepositoryTab from './lib/components/RepositoryTab.svelte';

  let currentVersion = $state('...');
  let hasUpdate = $state(false);
  let agents: Agent[] = $state([]);
  let selectedTab: string = $state('repository');
  let mcpServers: Record<string, McpServer> = $state({});
  let skills: Skill[] = $state([]);
  let builtinSkills: BuiltinSkill[] = $state([]);
  let agentMcpEnabled: string[] = $state([]);
  let agentSkillsEnabled: string[] = $state([]);
  let error: string | null = $state(null);
  let refreshKey = $state(0);

  const GITHUB_REPO = 'https://github.com/CRThu/carrot-switch';
  const GITHUB_RAW_VERSION = 'https://raw.githubusercontent.com/CRThu/carrot-switch/main/version.json';

  async function loadVersion() {
    try {
      const data = await api.getVersion();
      currentVersion = data.version || 'dev';
    } catch {
      currentVersion = 'dev';
    }
  }

  async function checkUpdate() {
    try {
      const res = await fetch(GITHUB_RAW_VERSION + '?t=' + Date.now());
      if (!res.ok) return;
      const remote = await res.json();
      if (remote.version && remote.version !== currentVersion) {
        hasUpdate = true;
      }
    } catch {
      // 网络不可用，静默忽略
    }
  }

  async function loadAgents() {
    const res = await api.getAgents();
    agents = res.agents;
    if (agents.length > 0 && !agents.find(a => a.name === selectedTab && a.available)) {
      const firstAvailable = agents.find(a => a.available);
      selectedTab = firstAvailable ? firstAvailable.name : 'repository';
    }
  }

  async function loadAgentData() {
    if (!selectedTab || selectedTab === 'repository') return;
    try {
      const [mcpRes, skillsRes, builtinRes, enabledMcpRes, enabledSkillsRes] = await Promise.all([
        api.getRepositoryMcp(),
        api.getRepositorySkills(),
        api.getBuiltinSkills(selectedTab),
        api.getAgentMcpEnabled(selectedTab),
        api.getAgentSkillsEnabled(selectedTab),
      ]);
      mcpServers = mcpRes.servers;
      skills = skillsRes.skills;
      builtinSkills = builtinRes.skills;
      agentMcpEnabled = enabledMcpRes.enabled;
      agentSkillsEnabled = enabledSkillsRes.enabled;
    } catch {
      mcpServers = {};
      skills = [];
      builtinSkills = [];
      agentMcpEnabled = [];
      agentSkillsEnabled = [];
    }
  }

  async function refresh() {
    refreshKey++;
    if (selectedTab === 'repository') {
      // RepositoryTab handles its own refresh
    } else {
      await loadAgentData();
    }
  }

  function handleTabChange(tab: string) {
    selectedTab = tab;
    refresh();
  }

  async function toggleMcp(name: string) {
    if (!selectedTab) return;
    const enabled = agentMcpEnabled.includes(name);
    await api.enableAgentMcp(selectedTab, name, !enabled);
    await refresh();
  }

  async function toggleSkill(name: string) {
    if (!selectedTab) return;
    const enabled = agentSkillsEnabled.includes(name);
    await api.enableAgentSkill(selectedTab, name, !enabled);
    await refresh();
  }

  async function toggleBuiltinSkill(name: string) {
    if (!selectedTab) return;
    await api.toggleBuiltinSkillPermission(selectedTab, name);
    await refresh();
  }

  async function toggleAllMcp(enabled: boolean) {
    if (!selectedTab) return;
    await api.toggleAllAgentMcp(selectedTab, enabled);
    await refresh();
  }

  async function toggleAllSkills(enabled: boolean) {
    if (!selectedTab) return;
    await api.toggleAllAgentSkills(selectedTab, enabled);
    await refresh();
  }

  async function init() {
    try {
      await loadVersion();
      checkUpdate();
      await loadAgents();
      await refresh();
      error = null;
    } catch (e) {
      if (e instanceof NetworkError) {
        error = '无法连接后端服务，请确认 carrot-switch 后端已启动';
      } else {
        error = `加载失败: ${(e as Error).message}`;
      }
    }
  }

  onMount(init);

  function isAgentTab(tab: string): boolean {
    return agents.some(a => a.name === tab);
  }
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b border-gray-200 px-4 py-3">
    <div class="max-w-5xl mx-auto flex items-center gap-2">
      <div class="w-6 h-6 bg-carrot-500 rounded-md flex items-center justify-center">
        <span class="text-white text-xs font-bold">C</span>
      </div>
      <h1 class="text-base font-semibold text-gray-800">Carrot Switch</h1>
      <span class="text-[10px] text-gray-400">v{currentVersion}</span>
      {#if hasUpdate}
        <button
          class="text-[10px] text-carrot-500 hover:text-carrot-600 font-medium cursor-pointer"
          onclick={() => window.open(GITHUB_REPO, '_blank')}
          title="点击前往下载新版本"
        >
          ↑ 有新版本
        </button>
      {/if}
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-4">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
        <div class="flex items-start gap-3">
          <div class="text-red-500 text-sm mt-0.5">!</div>
          <div>
            <h3 class="text-red-800 font-medium text-sm">应用启动失败</h3>
            <p class="text-red-600 text-xs mt-1">{error}</p>
            <button
              class="mt-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              onclick={init}
            >
              重试
            </button>
          </div>
        </div>
      </div>
    {:else if agents.length > 0}
      <!-- Tabs: Repository + Agent tabs -->
      <div class="flex gap-1 border-b border-gray-200">
        <button
          class="px-3 py-1.5 text-xs font-medium border-b-2 transition-colors"
          class:border-carrot-500={selectedTab === 'repository'}
          class:text-carrot-600={selectedTab === 'repository'}
          class:border-transparent={selectedTab !== 'repository'}
          class:text-gray-500={selectedTab !== 'repository'}
          class:hover:text-gray-700={selectedTab !== 'repository'}
          onclick={() => handleTabChange('repository')}
        >
          Repository
        </button>
        {#each agents as agent}
          <button
            class="px-3 py-1.5 text-xs font-medium border-b-2 transition-colors"
            class:border-carrot-500={selectedTab === agent.name}
            class:text-carrot-600={selectedTab === agent.name}
            class:border-transparent={selectedTab !== agent.name}
            class:text-gray-500={selectedTab !== agent.name}
            class:hover:text-gray-700={selectedTab !== agent.name}
            class:opacity-50={!agent.available}
            class:cursor-not-allowed={!agent.available}
            disabled={!agent.available}
            onclick={() => handleTabChange(agent.name)}
          >
            {agent.name}
            {#if !agent.available}
              <span class="text-[10px] text-gray-400 ml-1">(n/a)</span>
            {/if}
          </button>
        {/each}
      </div>

      {#if selectedTab === 'repository'}
        <div class="mt-4">
          <RepositoryTab onRefresh={refresh} />
        </div>
      {:else if isAgentTab(selectedTab)}
        <div class="mt-4 space-y-4">
          <!-- MCP Servers -->
          <section>
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-sm font-medium text-gray-700">MCP Servers</h2>
              <div class="flex gap-1.5">
                <button class="btn-secondary text-[10px] px-2 py-0.5" onclick={() => toggleAllMcp(true)}>
                  All ON
                </button>
                <button class="btn-secondary text-[10px] px-2 py-0.5" onclick={() => toggleAllMcp(false)}>
                  All OFF
                </button>
              </div>
            </div>
            {#if Object.keys(mcpServers).length > 0}
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each Object.entries(mcpServers) as [name, server]}
                  {@const enabled = agentMcpEnabled.includes(name)}
                  <div class="card">
                    <div class="flex items-center justify-between gap-1">
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-medium text-gray-800 truncate">{name}</div>
                        <p class="text-[10px] text-gray-400 truncate">
                          {server.type}
                        </p>
                      </div>
                      <EnableToggle {enabled} onToggle={() => toggleMcp(name)} />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="empty-state text-xs">No MCP servers in repository</div>
            {/if}
          </section>

          <!-- Skills -->
          <section>
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-sm font-medium text-gray-700">Skills</h2>
              <div class="flex gap-1.5">
                <button class="btn-secondary text-[10px] px-2 py-0.5" onclick={() => toggleAllSkills(true)}>
                  All ON
                </button>
                <button class="btn-secondary text-[10px] px-2 py-0.5" onclick={() => toggleAllSkills(false)}>
                  All OFF
                </button>
              </div>
            </div>
            {#if skills.length > 0}
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each skills as skill}
                  {@const enabled = agentSkillsEnabled.includes(skill.name)}
                  <div class="card">
                    <div class="flex items-center justify-between gap-1">
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-medium text-gray-800 truncate">{skill.name}</div>
                        <p class="text-[10px] text-gray-400 truncate">
                          {skill.source || 'unknown'}
                        </p>
                      </div>
                      <EnableToggle {enabled} onToggle={() => toggleSkill(skill.name)} />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="empty-state text-xs">No skills in repository</div>
            {/if}
          </section>

          <!-- Builtin Skills -->
          {#if builtinSkills.length > 0}
            <section>
              <h2 class="text-sm font-medium text-gray-700 mb-2">Builtin Skills (read-only)</h2>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each builtinSkills as skill}
                  <div class="card">
                    <div class="flex items-center justify-between gap-1">
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-medium text-gray-800 truncate">{skill.name}</div>
                      </div>
                      <EnableToggle
                        enabled={skill.allowed}
                        onToggle={() => toggleBuiltinSkill(skill.name)}
                      />
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        </div>
      {:else}
        <div class="empty-state mt-8">No agents installed</div>
      {/if}
    {:else}
      <div class="empty-state mt-8">Loading agents...</div>
    {/if}
  </main>
</div>
