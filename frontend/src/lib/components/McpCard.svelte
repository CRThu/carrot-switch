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

  function getSubtitle(): string {
    if (server.url) return `${server.type} · ${server.url}`;
    if (server.command) return `${server.type} · ${server.command.join(' ')}`;
    return server.type;
  }
</script>

<div class="card">
  <div class="flex items-center justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5">
        <h3 class="text-sm font-medium text-gray-800 truncate">{name}</h3>
        {#if !server.enabled}
          <span class="badge badge-gray text-[10px]">off</span>
        {/if}
      </div>
      <p class="text-[11px] text-gray-500 truncate mt-0.5">{getSubtitle()}</p>
    </div>
    <div class="flex items-center gap-1.5">
      <button
        class="toggle"
        class:bg-carrot-500={server.enabled}
        class:bg-gray-300={!server.enabled}
        disabled={toggling}
        onclick={toggle}
        title={server.enabled ? 'Disable' : 'Enable'}
      >
        <span
          class="toggle-knob"
          class:translate-x-3={server.enabled}
        ></span>
      </button>
      <button class="btn-danger" onclick={deleteServer} title="Delete">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</div>
