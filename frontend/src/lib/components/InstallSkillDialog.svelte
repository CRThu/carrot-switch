<script lang="ts">
  import { api } from '../api';

  let { agent, onClose, onSaved }: {
    agent: string;
    onClose: () => void;
    onSaved: () => void;
  } = $props();

  let source = $state('');
  let sourceType = $state('github');
  let error = $state('');
  let saving = $state(false);

  async function install() {
    if (!source.trim()) {
      error = 'Source is required';
      return;
    }
    saving = true;
    error = '';
    try {
      await api.installSkill(agent, { source: source.trim(), source_type: sourceType });
      onSaved();
    } catch (e: any) {
      error = e.message || 'Failed to install skill';
    } finally {
      saving = false;
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onclick={(e) => e.stopPropagation()}>
    <h3 class="text-lg font-semibold mb-4">Install Skill</h3>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
        <select
          bind:value={sourceType}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
        >
          <option value="github">GitHub</option>
          <option value="local">Local Directory</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {sourceType === 'github' ? 'GitHub URL or owner/repo' : 'Local Path'}
        </label>
        <input
          type="text"
          bind:value={source}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
          placeholder={sourceType === 'github' ? 'owner/repo or https://github.com/owner/repo' : 'C:\\path\\to\\skill'}
        />
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <button
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        onclick={onClose}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-carrot-500 text-white rounded hover:bg-carrot-600 disabled:opacity-50"
        disabled={saving}
        onclick={install}
      >
        {saving ? 'Installing...' : 'Install'}
      </button>
    </div>
  </div>
</div>
