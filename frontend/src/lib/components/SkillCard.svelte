<script lang="ts">
  import { api } from '../api';
  import type { Skill } from '../types';

  let { skill, agent, onRefresh }: {
    skill: Skill;
    agent: string;
    onRefresh: () => void;
  } = $props();

  let toggling = $state(false);

  async function togglePermission() {
    toggling = true;
    try {
      await api.toggleSkillPermission(agent, skill.name);
      onRefresh();
    } finally {
      toggling = false;
    }
  }

  async function uninstall() {
    if (!confirm(`Uninstall skill "${skill.name}"?`)) return;
    await api.uninstallSkill(agent, skill.name);
    onRefresh();
  }

  function getSubtitle(): string {
    const parts: string[] = [];
    if (skill.source_type) parts.push(skill.source_type);
    if (skill.source) parts.push(skill.source);
    if (parts.length === 0) parts.push(skill.builtin ? 'builtin' : 'user');
    return parts.join(' · ');
  }
</script>

<div class="card">
  <div class="flex items-center justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5">
        <h3 class="text-sm font-medium text-gray-800 truncate">{skill.name}</h3>
        {#if skill.builtin}
          <span class="badge badge-gray text-[10px]">builtin</span>
        {:else if skill.allowed}
          <span class="badge badge-green text-[10px]">allow</span>
        {:else}
          <span class="badge badge-red text-[10px]">deny</span>
        {/if}
      </div>
      <p class="text-[11px] text-gray-500 truncate mt-0.5">{getSubtitle()}</p>
    </div>
    <div class="flex items-center gap-1.5">
      {#if !skill.builtin}
        <button
          class="toggle"
          class:bg-green-500={skill.allowed}
          class:bg-gray-300={!skill.allowed}
          disabled={toggling}
          onclick={togglePermission}
          title={skill.allowed ? 'Deny' : 'Allow'}
        >
          <span
            class="toggle-knob"
            class:translate-x-3={skill.allowed}
          ></span>
        </button>
        <button class="btn-danger" onclick={uninstall} title="Uninstall">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      {:else}
        <span class="text-gray-300">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </span>
      {/if}
    </div>
  </div>
</div>
