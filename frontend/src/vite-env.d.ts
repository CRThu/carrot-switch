<script context="module" lang="ts">
  declare module '*.svelte' {
    import type { ComponentType } from 'svelte';
    const component: ComponentType;
    export default component;
  }
</script>
