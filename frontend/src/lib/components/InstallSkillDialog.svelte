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

  const placeholders: Record<string, string> = {
    github: 'owner/repo or https://github.com/owner/repo',
    local: 'C:\\path\\to\\skill',
    zip: 'C:\\path\\to\\skill.zip or https://example.com/skill.zip',
    url: 'https://example.com/skill.tar.gz',
  };

  const labels: Record<string, string> = {
    github: 'GitHub URL or owner/repo',
    local: 'Local Directory Path',
    zip: 'ZIP File Path or URL',
    url: 'Archive URL',
  };

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
  <div class="bg-white rounded-lg p-4 w-full max-w-sm shadow-xl" onclick={(e) => e.stopPropagation()}>
    <h3 class="text-sm font-semibold text-gray-800 mb-3">Install Skill</h3>

    <div class="space-y-3">
      <div>
        <label for="skill-type" class="label">Source Type</label>
        <select id="skill-type" bind:value={sourceType} class="input">
          <option value="github">GitHub</option>
          <option value="local">Local Directory</option>
          <option value="zip">ZIP File</option>
          <option value="url">URL (tar.gz/zip)</option>
        </select>
      </div>

      <div>
        <label for="skill-source" class="label">{labels[sourceType]}</label>
        <input
          id="skill-source"
          type="text"
          bind:value={source}
          class="input"
          placeholder={placeholders[sourceType]}
        />
      </div>

      {#if error}
        <p class="text-xs text-red-500">{error}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <button class="btn-ghost" onclick={onClose}>Cancel</button>
      <button class="btn-primary" disabled={saving} onclick={install}>
        {saving ? 'Installing...' : 'Install'}
      </button>
    </div>
  </div>
</div>
