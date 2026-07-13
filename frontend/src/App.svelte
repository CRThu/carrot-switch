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
  <header class="bg-white border-b border-gray-200 px-6 py-4">
    <h1 class="text-xl font-bold text-carrot-600">Carrot Switch</h1>
  </header>

  <main class="max-w-5xl mx-auto p-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
        <div class="flex items-start gap-3">
          <div class="text-red-500 text-lg mt-0.5">!</div>
          <div>
            <h3 class="text-red-800 font-medium">应用启动失败</h3>
            <p class="text-red-600 text-sm mt-1">{error}</p>
            <button
              class="mt-3 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
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
        <section class="mt-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-800">MCP Servers</h2>
            <button
              class="px-3 py-1.5 text-sm bg-carrot-500 text-white rounded hover:bg-carrot-600"
              onclick={() => (showAddMcp = true)}
            >
              + Add Server
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each Object.entries(mcpServers) as [name, server]}
              <McpCard {name} {server} agent={selectedAgent} onRefresh={refresh} />
            {/each}
          </div>
          {#if Object.keys(mcpServers).length === 0}
            <p class="text-gray-400 text-sm">No MCP servers configured</p>
          {/if}
        </section>

        <section class="mt-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-800">Skills</h2>
            <div class="flex gap-2">
              <button
                class="px-3 py-1.5 text-sm bg-carrot-500 text-white rounded hover:bg-carrot-600"
                onclick={() => (showInstallSkill = true)}
              >
                + Install Skill
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each skills as skill}
              <SkillCard {skill} agent={selectedAgent} onRefresh={refresh} />
            {/each}
          </div>
          {#if skills.length === 0}
            <p class="text-gray-400 text-sm">No skills installed</p>
          {/if}
        </section>
      {:else}
        <p class="text-gray-500 mt-8">No agents installed. Please install OpenCode or MiMoCode first.</p>
      {/if}
    {:else}
      <p class="text-gray-500 mt-8">Loading agents...</p>
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
