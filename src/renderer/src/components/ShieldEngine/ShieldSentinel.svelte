<script lang="ts">
  import { flip } from 'svelte/animate';
  import { shieldNotifications } from '../../core/shield-store';
  import ShieldAlert from './ShieldAlert.svelte';
</script>

<!-- Global click-through sentinel container -->
<div class="shield-sentinel-container">
  {#each $shieldNotifications as item (item.id)}
    <div animate:flip={{ duration: 250 }} class="alert-wrapper">
      <ShieldAlert message={item.message} type={item.type} duration={item.duration} />
    </div>
  {/each}
</div>

<style>
  .shield-sentinel-container {
    position: fixed;
    top: 60px; /* Positions below the Top Bar Navigation */
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 999999; /* Higher than all sector modals */
    pointer-events: none; /* Critical Guardrail: click-through when alerts are not active */
    max-width: 460px;
    width: 100%;
    align-items: flex-end;
  }

  .alert-wrapper {
    display: flex;
    justify-content: flex-end;
    pointer-events: none;
    width: 100%;
  }
</style>
