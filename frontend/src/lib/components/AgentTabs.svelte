<script lang="ts">
  import type { Agent } from '../types';

  let { agents, selectedAgent, onSelect }: {
    agents: Agent[];
    selectedAgent: string;
    onSelect: (agent: string) => void;
  } = $props();

  const labels: Record<string, string> = {
    opencode: 'OpenCode',
    mimocode: 'MiMoCode',
    claude: 'Claude',
  };
</script>

<div class="flex gap-1 border-b border-gray-200">
  {#each agents as agent}
    <button
      class="px-3 py-1.5 text-xs font-medium border-b-2 transition-colors"
      class:border-carrot-500={selectedAgent === agent.name}
      class:text-carrot-600={selectedAgent === agent.name}
      class:border-transparent={selectedAgent !== agent.name}
      class:text-gray-500={selectedAgent !== agent.name}
      class:hover:text-gray-700={selectedAgent !== agent.name}
      class:opacity-50={!agent.available}
      class:cursor-not-allowed={!agent.available}
      disabled={!agent.available}
      onclick={() => onSelect(agent.name)}
    >
      {labels[agent.name] || agent.name}
      {#if !agent.available}
        <span class="text-[10px] text-gray-400 ml-1">(n/a)</span>
      {/if}
    </button>
  {/each}
</div>
