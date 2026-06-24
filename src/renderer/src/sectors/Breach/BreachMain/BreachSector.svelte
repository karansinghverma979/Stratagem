<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import FilterBar from '../../Execution/ExecutionFilterBar/FilterBar.svelte';
  import BreachTagBar from '../BreachTagBar.svelte';
  import BreachTaskView from './BreachTaskView.svelte';
  import BreachTaskRow from './BreachTaskRow.svelte';
  import { breachedTasks, isTaskViewOpen, closeTaskViewTrigger } from '../../../core/store';

  let { onopenreschedule } = $props();

  let isProtocolOpen = $state(false);
  let activeFilter = $state('ALL');
  let searchVal = $state('');
  let isAscending = $state(true);
  let activeSort = $state('By Creation Time (Default)');
  let selectedTask = $state(null);
  let selectedTags = $state<string[]>([]);

  // Derive counts based on the global breachedTasks store reactively
  let allTasks = $derived($breachedTasks);

  // Tasks filtered by search & selected tags (but not by priority activeFilter)
  let searchAndTagFilteredTasks = $derived.by(() => {
    let list = [...allTasks];

    if (searchVal.trim() !== '') {
      const q = searchVal.toLowerCase().replace('#', '');
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.tags || []).some((t: string) => t.toLowerCase().replace('#', '').includes(q))
      );
    }

    if (selectedTags && selectedTags.length > 0) {
      list = list.filter(m =>
        selectedTags.every((t: string) => (m.tags || []).some((mt: string) => mt.toUpperCase().replace('#', '') === t.toUpperCase().replace('#', '')))
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

  // Derive filtered and sorted tasks reactively
  let filteredTasks = $derived.by(() => {
    let list = [...searchAndTagFilteredTasks];

    // Filter by threat level (HIGH, MED, LOW)
    if (activeFilter !== 'ALL') {
      list = list.filter(m => m.priority === activeFilter);
    }

    // Sort according to selection
    list.sort((a, b) => {
      let comparison = 0;
      if (activeSort === 'By Deadline') {
        const aD = a.deadlineDate || 'ZZZZ';
        const bD = b.deadlineDate || 'ZZZZ';
        comparison = aD.localeCompare(bD);
      } else if (activeSort === 'By Initiation Time') {
        const aI = a.initiatedAt || a.createdAt || '';
        const bI = b.initiatedAt || b.createdAt || '';
        comparison = aI.localeCompare(bI);
      } else if (activeSort === 'By Name') {
        comparison = a.title.localeCompare(b.title);
      } else if (activeSort === 'Show Rescheduled Tasks Only') {
        const aR = a.isRescheduled ? 1 : 0;
        const bR = b.isRescheduled ? 1 : 0;
        comparison = bR - aR;
      } else if (activeSort === 'By Modification Date') {
        comparison = a.id - b.id;
      } else { // By Creation Time (Default)
        comparison = a.id - b.id;
      }
      return isAscending ? comparison : -comparison;
    });

    if (activeSort === 'Show Rescheduled Tasks Only') {
      list = list.filter(m => m.isRescheduled === true);
    }

    return list;
  });

  const handleTaskSelect = (task: any) => {
    selectedTask = task;
    isProtocolOpen = true;
  };

  const handleReschedule = (task: any) => {
    // Keep isProtocolOpen true so details view stays open underneath
    onopenreschedule && onopenreschedule(task);
  };

  $effect(() => {
    isTaskViewOpen.set(isProtocolOpen);
  });

  $effect(() => {
    if ($closeTaskViewTrigger > 0) {
      isProtocolOpen = false;
      selectedTask = null;
      closeTaskViewTrigger.set(0);
    }
  });

  onDestroy(() => {
    isTaskViewOpen.set(false);
  });
</script>

<div class="breach-root">
  <!-- Layered Red-Alert Glassmorphic Atmosphere -->
  <div class="sector-atmosphere">
    <div class="atmo-base"></div>
    {#if !isProtocolOpen}
      <div class="gradient-orb orb-1" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-2" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-3" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="glass-surface" in:fade={{ delay: 150, duration: 250 }}></div>
    {/if}
    <div class="fui-scanline"></div>
    <div class="grid-mesh"></div>
    <div class="vignette"></div>
  </div>

  <!-- Content Layer -->
  <div class="ui-content-wrapper">
    {#if !isProtocolOpen}
      <div class="standard-content-box" in:fade={{ delay: 150, duration: 250 }}>
        
        <!-- Filter controls -->
        <FilterBar 
          bind:activeFilter={activeFilter}
          bind:searchVal={searchVal}
          bind:isAscending={isAscending}
          bind:activeSort={activeSort}
          filters={filters}
          mode="execution"
        />

        <!-- Tag Tabs -->
        <BreachTagBar bind:selectedTags={selectedTags} />

        {#if filteredTasks.length === 0}
          <div class="status-display">
            <svg class="secure-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="var(--secure-status)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="var(--secure-status)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3 class="fui-h2 status-message">TEMPORAL BOUNDARY INTEGRITY SECURED</h3>
            <p class="fui-telemetry status-hint">NO ANOMALOUS OVERDUE BREACHES CURRENTLY DETECTED IN THE LOCAL SECTOR</p>
          </div>
        {:else}
          <div class="list-display">
            <div class="tasks-grid">
              {#each filteredTasks as task, index (task.id)}
                <div animate:flip={{ duration: 300 }} transition:fly={{ y: 30, duration: 400, delay: index * 50 }}>
                  <BreachTaskRow 
                    task={task} 
                    onrowclick={handleTaskSelect}
                    searchQuery={searchVal}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

      </div>
    {/if}
  </div>

  <!-- Detail task view -->
  <BreachTaskView 
    isOpen={isProtocolOpen} 
    mission={selectedTask} 
    onclose={() => { isProtocolOpen = false; selectedTask = null; }}
    onreschedule={handleReschedule}
  />
</div>

<style>
  .breach-root {
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

  .atmo-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      145deg,
      #0d0407 0%,
      #080407 35%,
      #0f050b 65%,
      #050204 100%
    );
  }

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
    background: radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, transparent 70%);
    animation: orbDrift1 28s ease-in-out infinite alternate;
  }

  .orb-2 {
    width: 55vw;
    height: 55vw;
    bottom: -20vw;
    right: -15vw;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, rgba(139, 92, 246, 0.04) 50%, transparent 70%);
    animation: orbDrift2 35s ease-in-out infinite alternate;
  }

  .orb-3 {
    width: 40vw;
    height: 40vw;
    top: 30%;
    left: 40%;
    background: radial-gradient(circle, rgba(251, 113, 133, 0.06) 0%, transparent 70%);
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

  .glass-surface {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    background: rgba(12, 6, 8, 0.45);
  }

  .fui-scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(239, 68, 68, 0.012) 3px,
      rgba(239, 68, 68, 0.012) 4px
    );
    pointer-events: none;
  }

  .grid-mesh {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, transparent 20%, black 100%);
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.72) 100%);
    pointer-events: none;
  }

  /* ─── Content Wrapper ───────────────────────────────── */
  .ui-content-wrapper {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
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

  .tasks-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
    flex: 1;
    padding-right: 0;
    padding-bottom: 24px;
    min-height: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tasks-grid::-webkit-scrollbar {
    display: none;
  }

  .status-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: auto;
    max-width: 600px;
    gap: 24px;
  }

  .secure-icon {
    filter: drop-shadow(0 0 20px rgba(0, 255, 159, 0.4));
    animation: clearedGlow 2.5s infinite alternate;
  }

  .status-message {
    color: var(--secure-status);
    margin: 0;
    text-shadow: 0 0 20px rgba(0, 255, 159, 0.4);
  }

  .status-hint {
    max-width: 450px;
    line-height: 1.8;
    opacity: 0.5;
  }

  @keyframes clearedGlow {
    from { transform: scale(0.95); filter: brightness(0.8) drop-shadow(0 0 10px var(--secure-status)); }
    to { transform: scale(1.05); filter: brightness(1.2) drop-shadow(0 0 25px var(--secure-status)); }
  }
</style>
