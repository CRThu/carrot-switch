<script lang="ts">
  import { onMount } from 'svelte';
  import { api, NetworkError } from './lib/api';
  import type { Agent, McpServer, Skill } from './lib/types';
  import AgentTabs from './lib/components/AgentTabs.svelte';
  import McpCard from './lib/components/McpCard.svelte';
  import SkillCard from './lib/components/SkillCard.svelte';
  import AddMcpDialog from './lib/components/AddMcpDialog.svelte';
  import InstallSkillDialog from './lib/components/InstallSkillDialog.svelte';

  let agents: Agent[] = $state([]);
  let selectedAgent: string = $state('opencode');
  let mcpServers: Record<string, McpServer> = $state({});
  let skills: Skill[] = $state([]);
  let showAddMcp = $state(false);
  let showInstallSkill = $state(false);
  let error: string | null = $state(null);

  async function loadAgents() {
    const res = await api.getAgents();
    agents = res.agents;
    if (agents.length > 0 && !agents.find(a => a.name === selectedAgent && a.available)) {
      selectedAgent = agents.find(a => a.available)?.name || '';
    }
  }

  async function loadMcpServers() {
    if (!selectedAgent) return;
    try {
      const res = await api.getMcpServers(selectedAgent);
      mcpServers = res.servers;
    } catch {
      mcpServers = {};
    }
  }

  async function loadSkills() {
    if (!selectedAgent) return;
    try {
      const res = await api.getSkills(selectedAgent);
      skills = res.skills;
    } catch {
      skills = [];
    }
  }

  async function refresh() {
    await loadMcpServers();
    await loadSkills();
  }

  function handleAgentChange(agent: string) {
    selectedAgent = agent;
    refresh();
  }

  async function init() {
    try {
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
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white border-b border-gray-200 px-4 py-3">
    <div class="max-w-5xl mx-auto flex items-center gap-2">
      <div class="w-6 h-6 bg-carrot-500 rounded-md flex items-center justify-center">
        <span class="text-white text-xs font-bold">C</span>
      </div>
      <h1 class="text-base font-semibold text-gray-800">Carrot Switch</h1>
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
      <AgentTabs {agents} {selectedAgent} onSelect={handleAgentChange} />

      {#if selectedAgent}
        <section class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-medium text-gray-700">MCP Servers</h2>
            <button class="btn-primary" onclick={() => (showAddMcp = true)}>
              + Add
            </button>
          </div>
          {#if Object.keys(mcpServers).length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {#each Object.entries(mcpServers) as [name, server]}
                <McpCard {name} {server} agent={selectedAgent} onRefresh={refresh} />
              {/each}
            </div>
          {:else}
            <div class="empty-state">No MCP servers configured</div>
          {/if}
        </section>

        <section class="section">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-medium text-gray-700">Skills</h2>
            <button class="btn-primary" onclick={() => (showInstallSkill = true)}>
              + Install
            </button>
          </div>
          {#if skills.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {#each skills as skill}
                <SkillCard {skill} agent={selectedAgent} onRefresh={refresh} />
              {/each}
            </div>
          {:else}
            <div class="empty-state">No skills installed</div>
          {/if}
        </section>
      {:else}
        <div class="empty-state mt-8">No agents installed</div>
      {/if}
    {:else}
      <div class="empty-state mt-8">Loading agents...</div>
    {/if}
  </main>

  {#if showAddMcp}
    <AddMcpDialog
      agent={selectedAgent}
      onClose={() => (showAddMcp = false)}
      onSaved={() => { showAddMcp = false; refresh(); }}
    />
  {/if}

  {#if showInstallSkill}
    <InstallSkillDialog
      agent={selectedAgent}
      onClose={() => (showInstallSkill = false)}
      onSaved={() => { showInstallSkill = false; refresh(); }}
    />
  {/if}
</div>
