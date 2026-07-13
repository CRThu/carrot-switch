<script lang="ts">
  let { enabled, onToggle, disabled = false }: {
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  } = $props();

  let toggling = $state(false);

  async function handleClick() {
    if (toggling || disabled) return;
    toggling = true;
    try {
      await onToggle();
    } finally {
      toggling = false;
    }
  }
</script>

<button
  class="toggle"
  class:bg-carrot-500={enabled}
  class:bg-gray-300={!enabled}
  disabled={toggling || disabled}
  onclick={handleClick}
  title={enabled ? 'Disable' : 'Enable'}
>
  <span
    class="toggle-knob"
    class:translate-x-3={enabled}
  ></span>
</button>
