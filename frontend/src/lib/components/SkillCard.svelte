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
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="font-medium text-gray-800">{skill.name}</h3>
      <p class="text-xs text-gray-500 mt-1">
        {skill.builtin ? 'builtin' : 'user'}
        &middot;
        {skill.allowed ? 'allow' : 'deny'}
      </p>
    </div>
    {#if !skill.builtin}
      <button
        class="w-10 h-6 rounded-full transition-colors relative"
        class:bg-green-500={skill.allowed}
        class:bg-red-400={!skill.allowed}
        disabled={toggling}
        onclick={togglePermission}
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
          class:translate-x-4={skill.allowed}
        ></span>
      </button>
    {/if}
  </div>
  <div class="flex gap-2 mt-3">
    {#if !skill.builtin}
      <button
        class="text-xs text-gray-500 hover:text-gray-700"
        onclick={uninstall}
      >
        Uninstall
      </button>
    {/if}
  </div>
</div>
