<script lang="ts">
  import { fade } from 'svelte/transition';

  let {
    mode = 'viewport',
    stopwatchTime = 0,
    stopwatchRunning = false,
    stopwatchLaps = [],
    stopwatchLapsEl = $bindable(null),
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    recordLap,
    clearLaps,
    formatStopwatchTime
  } = $props();
</script>

{#if mode === 'viewport'}
  <div class="stopwatch-view-wrapper" in:fade={{ duration: 80 }} out:fade={{ duration: 80 }}>
    <div class="panel-header">
      <span class="fui-label stopwatch-themed-title">CHRONOGRAPHIC SENSOR</span>
      <span class="stopwatch-status-pill font-mono">STATUS: {stopwatchRunning ? 'CHRONOLOGY COMMENCED' : 'SUSPENDED'}</span>
    </div>

    <!-- Big Glowing Digit Display -->
    <div class="stopwatch-digit-display font-mono">
      {formatStopwatchTime(stopwatchTime)}
    </div>

    <!-- Controls row directly underneath the digits -->
    <div class="stopwatch-controls-row">
      {#if !stopwatchRunning}
        <button class="fui-button stopwatch-btn start-stopwatch-btn" onclick={startStopwatch}>
          COMMENCE
        </button>
      {:else}
        <button class="fui-button stopwatch-btn pause-stopwatch-btn" onclick={pauseStopwatch}>
          SUSPEND
        </button>
      {/if}
      <button class="fui-button stopwatch-btn lap-stopwatch-btn" onclick={recordLap} disabled={stopwatchTime === 0}>
        RECORD LAP
      </button>
      <button class="fui-button stopwatch-btn reset-stopwatch-btn" onclick={resetStopwatch} disabled={stopwatchTime === 0}>
        RESET
      </button>
    </div>

    <!-- Laps Panel visual HUD -->
    <div class="laps-hud-container">
      <div class="laps-hud-header font-mono">
        <span>LAP INDEX</span>
        <span>CHRONOLOGICAL INTERVAL</span>
      </div>
      <div class="laps-hud-list" bind:this={stopwatchLapsEl}>
        {#each stopwatchLaps as lap, idx}
          <div class="lap-hud-row font-mono">
            <span class="lap-idx">LAP #{String(idx + 1).padStart(2, '0')}</span>
            <span class="lap-val">{lap}</span>
          </div>
        {/each}
        {#if stopwatchLaps.length === 0}
          <div class="empty-laps-placeholder font-mono">
            AWAITING LAP SENSOR VECTORS...
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else if mode === 'sidebar'}
  <div class="stopwatch-quick-actions">
    <div class="stopwatch-status-readout font-mono">
      STATUS: {stopwatchLaps.length} LAPS RECORDED
    </div>
    <button class="action-btn font-mono" onclick={recordLap} disabled={!stopwatchRunning}>RECORD CURRENT LAP</button>
    <button class="action-btn font-mono" onclick={clearLaps} disabled={stopwatchLaps.length === 0}>CLEAR LAPS LIST</button>
    <button class="action-btn font-mono reset-btn-stopwatch" onclick={resetStopwatch} disabled={stopwatchTime === 0}>RESET ANALYZER</button>
  </div>
{/if}
