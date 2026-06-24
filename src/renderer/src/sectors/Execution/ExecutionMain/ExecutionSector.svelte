<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import FilterBar from '../ExecutionFilterBar/FilterBar.svelte';
  import ExecutionTagBar from '../ExecutionTagBar.svelte';
  import MissionProtocol from '../ExecutionTaskView/MissionProtocol.svelte';
  import ExecutionTaskList from './ExecutionTaskList.svelte';
  import { executionTasks, isTaskViewOpen } from '../../../core/store';

  let isProtocolOpen = $state(false);
  let isEmpty = $state(false);

  let activeFilter = $state('ALL');
  let searchVal = $state('');
  let isAscending = $state(true);
  let activeSort = $state('By Deadline');
  let selectedTask = $state(null);
  let selectedTags = $state<string[]>([]);

  // Derive counts based on the global executionTasks store reactively
  let allTasks = $derived($executionTasks);

  // Tasks filtered by search & selected tags (but not by priority activeFilter)
  let searchAndTagFilteredTasks = $derived.by(() => {
    let list = [...allTasks];

    if (searchVal.trim() !== '') {
      const q = searchVal.toLowerCase().replace('#', '');
      list = list.filter((m: any) =>
        m.title.toLowerCase().includes(q) ||
        (m.tags || []).some((t: string) => t.toLowerCase().replace('#', '').includes(q))
      );
    }

    if (selectedTags.length > 0) {
      list = list.filter((m: any) =>
        selectedTags.every((t: string) =>
          (m.tags || []).some((mt: string) => mt.toUpperCase().replace('#', '') === t.toUpperCase().replace('#', ''))
        )
      );
    }

    return list;
  });

  let countAll = $derived(searchAndTagFilteredTasks.length);
  let countHigh = $derived(searchAndTagFilteredTasks.filter(t => t.priority === 'HIGH').length);
  let countMed = $derived(searchAndTagFilteredTasks.filter(t => t.priority === 'MED').length);
  let countLow = $derived(searchAndTagFilteredTasks.filter(t => t.priority === 'LOW').length);

  let filters = $derived([
    { id: 'ALL', count: countAll },
    { id: 'HIGH', count: countHigh },
    { id: 'MED', count: countMed },
    { id: 'LOW', count: countLow }
  ]);

  const handleTaskSelect = (task: any) => {
    selectedTask = task;
    isProtocolOpen = true;
  };

  $effect(() => {
    isTaskViewOpen.set(isProtocolOpen);
  });

  onDestroy(() => {
    isTaskViewOpen.set(false);
  });
</script>

<div class="execution-root">
  <!-- Layered Glassmorphic Atmosphere -->
  <div class="sector-atmosphere">
    <!-- Deep base gradient -->
    <div class="atmo-base"></div>
    {#if !isProtocolOpen}
      <!-- Rotating radial gradient flow -->
      <div class="gradient-orb orb-1" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-2" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-3" in:fade={{ delay: 150, duration: 250 }}></div>
      <!-- Frosted glass surface layer -->
      <div class="glass-surface" in:fade={{ delay: 150, duration: 250 }}></div>
    {/if}
    <!-- Scanline overlay -->
    <div class="fui-scanline"></div>
    <!-- Grid mesh -->
    <div class="grid-mesh"></div>
    <!-- Vignette -->
    <div class="vignette"></div>
  </div>

  <!-- Pure Open-Space UI Content -->
  <div class="ui-content-wrapper">
    {#if !isProtocolOpen}
      <div class="standard-content-box" in:fade={{ delay: 150, duration: 250 }}>
        <FilterBar 
          bind:activeFilter={activeFilter}
          bind:searchVal={searchVal}
          bind:isAscending={isAscending}
          bind:activeSort={activeSort}
          filters={filters}
          mode="execution"
        />

        <ExecutionTagBar bind:selectedTags={selectedTags} />

        {#if isEmpty}
          <div class="status-display">
            <svg class="shield-slash-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="var(--primary-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="shield-path" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="var(--critical-alert)" stroke-width="2.5" stroke-linecap="round" class="slash-line" />
            </svg>
            <h3 class="fui-h2 status-message">NO MISSIONS DETECTED</h3>
            <p class="fui-telemetry status-hint">STAND BY FOR INCOMING COMBAT DISPATCHES OR AUTHORIZE NEW MISSION PROTOCOL</p>
            
            <button class="fui-button" style="margin-top: 24px;" onclick={() => isEmpty = false}>
              RESCAN SECTOR MATRIX
            </button>
          </div>
        {:else}
          <div class="list-display">
            <ExecutionTaskList 
              activeFilter={activeFilter}
              searchVal={searchVal}
              isAscending={isAscending}
              activeSort={activeSort}
              selectedTags={selectedTags}
              ontaskselect={handleTaskSelect} 
            />
          </div>
        {/if}
      </div>
      
      <button class="test-trigger-btn fui-telemetry" onclick={() => isEmpty = true}>
        [ DEBUG: SIMULATE EMPTY STATE ]
      </button>
    {/if}
  </div>

  <MissionProtocol isOpen={isProtocolOpen} mission={selectedTask} onclose={() => { isProtocolOpen = false; selectedTask = null; }} />
</div>

<style>
  .execution-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ─── Atmosphere Layers ─────────────────────────────── */
  .sector-atmosphere {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 0;
    overflow: hidden;
  }

  /* Deep base — not pure black, always a subtle gradient */
  .atmo-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      145deg,
      #0a0714 0%,
      #080c1a 35%,
      #0b0a1e 65%,
      #060912 100%
    );
  }

  /* Floating gradient orbs — give the "alive" feeling */
  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    will-change: transform;
    pointer-events: none;
  }

  .orb-1 {
    width: 70vw;
    height: 70vw;
    top: -25vw;
    left: -20vw;
    background: radial-gradient(circle, rgba(109, 40, 217, 0.28) 0%, transparent 70%);
    animation: orbDrift1 28s ease-in-out infinite alternate;
  }

  .orb-2 {
    width: 55vw;
    height: 55vw;
    bottom: -20vw;
    right: -15vw;
    background: radial-gradient(circle, rgba(147, 51, 234, 0.18) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%);
    animation: orbDrift2 35s ease-in-out infinite alternate;
  }

  .orb-3 {
    width: 40vw;
    height: 40vw;
    top: 30%;
    left: 40%;
    background: radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%);
    animation: orbDrift3 22s ease-in-out infinite alternate;
  }

  @keyframes orbDrift1 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(8vw, 6vw) scale(1.12); }
  }
  @keyframes orbDrift2 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-6vw, -8vw) scale(1.08); }
  }
  @keyframes orbDrift3 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-4vw, 5vw) scale(1.15); }
  }

  /* Frosted glass surface */
  .glass-surface {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    background: rgba(8, 6, 20, 0.35);
  }

  /* FUI scanlines */
  .fui-scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(139, 92, 246, 0.012) 3px,
      rgba(139, 92, 246, 0.012) 4px
    );
    pointer-events: none;
  }

  /* Subtle grid mesh */
  .grid-mesh {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, transparent 20%, black 100%);
  }

  /* Vignette */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%);
    pointer-events: none;
  }

  /* ─── Content Wrapper ───────────────────────────────── */
  .ui-content-wrapper {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0; /* Managed by standard-content-box */
    min-height: 0;
  }

  .standard-content-box {
    width: 94%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 0;
    padding-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    box-sizing: border-box;
  }

  .list-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
  }

  .status-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: auto;
    max-width: 600px;
  }

  .shield-slash-icon {
    filter: drop-shadow(0 0 20px var(--primary-glow));
    margin-bottom: 32px;
    animation: hoverFloat 4s ease-in-out infinite;
  }

  .status-message {
    color: var(--primary-accent);
    margin: 0 0 16px 0;
    text-shadow: 0 0 20px var(--primary-glow);
  }

  .status-hint {
    max-width: 400px;
    line-height: 1.8;
  }

  .test-trigger-btn {
    position: absolute;
    bottom: 20px;
    left: 20px;
    opacity: 0.3;
    font-family: monospace;
    font-size: 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    transition: color var(--anim-fast), opacity var(--anim-fast);
    padding: 8px;
    z-index: 10;
  }

  .test-trigger-btn:hover {
    opacity: 0.8;
    color: var(--primary-accent);
  }

  @keyframes hoverFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(5deg); }
  }
</style>
