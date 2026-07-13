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
  let envVars = $state('');
  let error = $state('');
  let saving = $state(false);

  function parseEnvVars(raw: string): Record<string, string> | undefined {
    if (!raw.trim()) return undefined;
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
    return Object.keys(env).length > 0 ? env : undefined;
  }

  async function save() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    if (type === 'local' && !command.trim()) {
      error = 'Command is required for local type';
      return;
    }
    if (type === 'remote' && !url.trim()) {
      error = 'URL is required for remote type';
      return;
    }
    saving = true;
    error = '';
    try {
      const payload: any = { name: name.trim(), type };
      if (type === 'local' && command.trim()) {
        payload.command = command.trim();
      }
      if (type === 'remote' && url.trim()) {
        payload.url = url.trim();
      }
      const env = parseEnvVars(envVars);
      if (env) payload.environment = env;
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
  <div class="bg-white rounded-lg p-4 w-full max-w-sm shadow-xl" onclick={(e) => e.stopPropagation()}>
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Add MCP Server</h3>

    <div class="space-y-3">
      <div>
        <label for="mcp-name" class="label">Name</label>
        <input
          id="mcp-name"
          type="text"
          bind:value={name}
          class="input"
          placeholder="my-server"
        />
      </div>

      <div>
        <label for="mcp-type" class="label">Type</label>
        <select id="mcp-type" bind:value={type} class="input">
          <option value="local">Local (command)</option>
          <option value="remote">Remote (URL)</option>
        </select>
      </div>

      {#if type === 'local'}
        <div>
          <label for="mcp-cmd" class="label">Command</label>
          <input
            id="mcp-cmd"
            type="text"
            bind:value={command}
            class="input"
            placeholder="uvx some-server or python -m server"
          />
          <p class="text-[10px] text-gray-400 mt-0.5">Space-separated, e.g. "uvx mcp-server-fetch"</p>
        </div>
      {:else}
        <div>
          <label for="mcp-url" class="label">URL</label>
          <input
            id="mcp-url"
            type="text"
            bind:value={url}
            class="input"
            placeholder="https://mcp.example.com/sse"
          />
        </div>
      {/if}

      <div>
        <label for="mcp-env" class="label">Environment Variables</label>
        <textarea
          id="mcp-env"
          bind:value={envVars}
          class="input min-h-[60px] resize-none font-mono text-[11px]"
          placeholder="KEY=value&#10;ANOTHER_KEY=another-value"
        ></textarea>
      </div>

      {#if error}
        <p class="text-xs text-red-500">{error}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <button class="btn-ghost" onclick={onClose}>Cancel</button>
      <button class="btn-primary" disabled={saving} onclick={save}>
        {saving ? 'Adding...' : 'Add'}
      </button>
    </div>
  </div>
</div>
