<script lang="ts">
  import { api } from '../api';
  import type { McpServer } from '../types';

  let { name, server, agent, onRefresh }: {
    name: string;
    server: McpServer;
    agent: string;
    onRefresh: () => void;
  } = $props();

  let toggling = $state(false);

  async function toggle() {
    toggling = true;
    try {
      await api.toggleMcpServer(agent, name);
      onRefresh();
    } finally {
      toggling = false;
    }
  }

  async function deleteServer() {
    if (!confirm(`Delete MCP server "${name}"?`)) return;
    await api.deleteMcpServer(agent, name);
    onRefresh();
  }
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="font-medium text-gray-800">{name}</h3>
      <p class="text-xs text-gray-500 mt-1">{server.type}</p>
    </div>
    <button
      class="w-10 h-6 rounded-full transition-colors relative"
      class:bg-carrot-500={server.enabled}
      class:bg-gray-300={!server.enabled}
      disabled={toggling}
      onclick={toggle}
    >
      <span
        class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
        class:translate-x-4={server.enabled}
      ></span>
    </button>
  </div>
  <div class="flex gap-2 mt-3">
    <button
      class="text-xs text-gray-500 hover:text-gray-700"
      onclick={deleteServer}
    >
      Delete
    </button>
  </div>
</div>
