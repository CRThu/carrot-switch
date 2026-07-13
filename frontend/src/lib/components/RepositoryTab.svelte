<script lang="ts">
  import { api } from '../api';
  import type { RepositoryMcp, SkillMeta } from '../types';
  import AddMcpDialog from './AddMcpDialog.svelte';

  let { onRefresh: _onRefresh }: { onRefresh: () => void } = $props();

  let mcpServers: Record<string, RepositoryMcp> = $state({});
  let skills: SkillMeta[] = $state([]);
  let loading = $state(true);
  let showAddMcp = $state(false);
  let editingMcp: string | null = $state(null);
  let editForm = $state({ type: 'local', command: '', url: '', environment: '' });

  async function loadData() {
    loading = true;
    try {
      const [mcpRes, skillRes] = await Promise.all([
        api.getRepositoryMcp(),
        api.getRepositorySkills(),
      ]);
      mcpServers = mcpRes.servers;
      skills = skillRes.skills;
    } catch {
      // ignore
    } finally {
      loading = false;
    }
  }

  async function deleteMcp(name: string) {
    if (!confirm(`Delete MCP server "${name}" from repository?`)) return;
    await api.deleteRepositoryMcp(name);
    await loadData();
    _onRefresh();
  }

  async function deleteSkill(name: string) {
    if (!confirm(`Delete skill "${name}" from repository?`)) return;
    await api.deleteRepositorySkill(name);
    await loadData();
    _onRefresh();
  }

  function startEdit(name: string) {
    const mcp = mcpServers[name];
    editingMcp = name;
    editForm = {
      type: mcp.type || 'local',
      command: mcp.command ? mcp.command.join(' ') : '',
      url: mcp.url || '',
      environment: mcp.environment ? Object.entries(mcp.environment).map(([k, v]) => `${k}=${v}`).join('\n') : '',
    };
  }

  function cancelEdit() {
    editingMcp = null;
  }

  async function saveEdit() {
    if (!editingMcp) return;

    let command: string[] | undefined;
    if (editForm.command) {
      command = editForm.command.split(/\s+/);
    }

    const env: Record<string, string> = {};
    if (editForm.environment) {
      for (const line of editForm.environment.split('\n')) {
        const [key, ...rest] = line.split('=');
        if (key && rest.length > 0) {
          env[key.trim()] = rest.join('=').trim();
        }
      }
    }

    await api.updateRepositoryMcp(editingMcp, {
      type: editForm.type as any,
      command,
      url: editForm.url || undefined,
      environment: Object.keys(env).length > 0 ? env : undefined,
    });

    editingMcp = null;
    await loadData();
    _onRefresh();
  }

  function getMcpSubtitle(server: RepositoryMcp): string {
    const parts: string[] = [];
    parts.push(server.type);
    if (server.source) parts.push(server.source);
    if (server.addedAt) parts.push(server.addedAt.split('T')[0]);
    return parts.join(' · ');
  }

  loadData();
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-medium text-gray-700">Repository</h2>
    <button class="btn-primary text-xs" onclick={() => (showAddMcp = true)}>
      + Add MCP
    </button>
  </div>

  {#if loading}
    <div class="text-center py-8 text-gray-400 text-sm">Loading...</div>
  {:else}
    <!-- MCP Servers -->
    <section>
      <h3 class="text-xs font-medium text-gray-500 mb-2">MCP Servers ({Object.keys(mcpServers).length})</h3>
      {#if Object.keys(mcpServers).length > 0}
        <div class="space-y-2">
          {#each Object.entries(mcpServers) as [name, server]}
            <div class="card">
              {#if editingMcp === name}
                <!-- Edit form -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-800">{name}</span>
                    <span class="text-[10px] text-gray-400">editing</span>
                  </div>
                  <div>
                    <label for="edit-type" class="text-[10px] text-gray-500 block mb-0.5">Type</label>
                    <select
                      id="edit-type"
                      class="w-full text-xs border border-gray-200 rounded px-2 py-1"
                      bind:value={editForm.type}
                    >
                      <option value="local">local</option>
                      <option value="remote">remote</option>
                    </select>
                  </div>
                  {#if editForm.type === 'local'}
                    <div>
                      <label for="edit-command" class="text-[10px] text-gray-500 block mb-0.5">Command</label>
                      <input
                        id="edit-command"
                        type="text"
                        class="w-full text-xs border border-gray-200 rounded px-2 py-1"
                        bind:value={editForm.command}
                        placeholder="npx -y @modelcontextprotocol/..."
                      />
                    </div>
                  {:else}
                    <div>
                      <label for="edit-url" class="text-[10px] text-gray-500 block mb-0.5">URL</label>
                      <input
                        id="edit-url"
                        type="text"
                        class="w-full text-xs border border-gray-200 rounded px-2 py-1"
                        bind:value={editForm.url}
                        placeholder="https://..."
                      />
                    </div>
                  {/if}
                  <div>
                    <label for="edit-env" class="text-[10px] text-gray-500 block mb-0.5">Environment (KEY=VALUE, one per line)</label>
                    <textarea
                      id="edit-env"
                      class="w-full text-xs border border-gray-200 rounded px-2 py-1 h-16"
                      bind:value={editForm.environment}
                      placeholder="KEY=VALUE"
                    ></textarea>
                  </div>
                  <div class="flex justify-end gap-1.5">
                    <button class="btn-secondary text-xs" onclick={cancelEdit}>Cancel</button>
                    <button class="btn-primary text-xs" onclick={saveEdit}>Save</button>
                  </div>
                </div>
              {:else}
                <!-- Display mode -->
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-800 truncate">{name}</div>
                    <p class="text-[11px] text-gray-500 truncate mt-0.5">{getMcpSubtitle(server)}</p>
                    {#if server.command}
                      <p class="text-[10px] text-gray-400 truncate mt-0.5">
                        {server.command.join(' ')}
                      </p>
                    {:else if server.url}
                      <p class="text-[10px] text-gray-400 truncate mt-0.5">
                        {server.url}
                      </p>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="btn-secondary text-[10px] px-1.5 py-0.5" onclick={() => startEdit(name)}>
                      Edit
                    </button>
                    <button class="btn-danger text-[10px] px-1.5 py-0.5" onclick={() => deleteMcp(name)}>
                      Delete
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state text-xs">No MCP servers in repository</div>
      {/if}
    </section>

    <!-- Skills -->
    <section>
      <h3 class="text-xs font-medium text-gray-500 mb-2">Skills ({skills.length})</h3>
      {#if skills.length > 0}
        <div class="space-y-2">
          {#each skills as skill}
            <div class="card">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-800 truncate">{skill.name}</div>
                  <p class="text-[11px] text-gray-500 truncate mt-0.5">
                    {skill.sourceType} · {skill.installedAt.split('T')[0]}
                  </p>
                  {#if skill.description}
                    <p class="text-[10px] text-gray-400 truncate mt-0.5">{skill.description}</p>
                  {/if}
                </div>
                <button class="btn-danger text-[10px] px-1.5 py-0.5" onclick={() => deleteSkill(skill.name)}>
                  Delete
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state text-xs">No skills in repository</div>
      {/if}
    </section>
  {/if}
</div>

{#if showAddMcp}
  <AddMcpDialog
    agent=""
    onClose={() => (showAddMcp = false)}
    onSaved={() => { showAddMcp = false; loadData(); _onRefresh(); }}
  />
{/if}
