<script lang="ts">
  import { api } from '../api';

  let { agent, onClose, onSaved }: {
    agent: string;
    onClose: () => void;
    onSaved: () => void;
  } = $props();

  let name = $state('');
  let type = $state('local');
  let command = $state('');
  let url = $state('');
  let error = $state('');
  let saving = $state(false);

  async function save() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    saving = true;
    error = '';
    try {
      const payload: any = { name: name.trim(), type };
      if (type !== 'remote' && command.trim()) {
        payload.command = command.split(/\s+/);
      }
      if (url.trim()) {
        payload.url = url.trim();
      }
      await api.addMcpServer(agent, payload);
      onSaved();
    } catch (e: any) {
      error = e.message || 'Failed to add server';
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
    <h3 class="text-lg font-semibold mb-4">Add MCP Server</h3>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          bind:value={name}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
          placeholder="my-server"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          bind:value={type}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
        >
          <option value="local">Local</option>
          <option value="remote">Remote</option>
          <option value="http">HTTP</option>
        </select>
      </div>

      {#if type !== 'remote'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Command</label>
          <input
            type="text"
            bind:value={command}
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
            placeholder="uvx some-server"
          />
        </div>
      {/if}

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <input
          type="text"
          bind:value={url}
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-carrot-500"
          placeholder="https://..."
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
        onclick={save}
      >
        {saving ? 'Adding...' : 'Add'}
      </button>
    </div>
  </div>
</div>
