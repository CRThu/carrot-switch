<script lang="ts">
  import type { Agent } from '../types';

  let { agents, selectedAgent, onSelect }: {
    agents: Agent[];
    selectedAgent: string;
    onSelect: (agent: string) => void;
  } = $props();
</script>

<div class="flex gap-2 border-b border-gray-200">
  {#each agents as agent}
    <button
      class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
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
      {agent.name === 'opencode' ? 'OpenCode' : 'MiMoCode'}
      {#if !agent.available}
        <span class="text-xs text-gray-400 ml-1">(not installed)</span>
      {/if}
    </button>
  {/each}
</div>
