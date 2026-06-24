<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { AudioEngine } from '../../../core/audio-engine';
  import { archivedTasks, isTaskViewOpen } from '../../../core/store';
  import ArchiveFilterBar from '../ArchiveComponents/ArchiveFilterBar.svelte';
  import ArchiveTagBar from '../ArchiveComponents/ArchiveTagBar.svelte';
  import ArchiveTaskRow from '../ArchiveComponents/ArchiveTaskRow.svelte';
  import MissionProtocol from '../../Execution/ExecutionTaskView/MissionProtocol.svelte';

  // ── Filter / Sort / Search state ──
  let activeFilter  = $state('ALL');
  let searchVal     = $state('');
  let isAscending   = $state(false);   // newest first by default
  let activeSort    = $state('By Resolution Date');
  let selectedTags  = $state<string[]>([]);

  // ── Protocol viewer state ──
  let selectedMission  = $state<any>(null);
  let isProtocolOpen   = $state(false);

  // ── Reactive task lists ──
  let allTasks = $derived($archivedTasks);

  // Count helpers for FilterBar badges — filtered by priority
  let countAll  = $derived(allTasks.length);
  let countHigh = $derived(allTasks.filter(t => (t.priority || '').toUpperCase() === 'HIGH').length);
  let countMed  = $derived(allTasks.filter(t => (t.priority || '').toUpperCase() === 'MED').length);
  let countLow  = $derived(allTasks.filter(t => (t.priority || '').toUpperCase() === 'LOW').length);

  let filters = $derived([
    { id: 'ALL',  count: countAll  },
    { id: 'HIGH', count: countHigh },
    { id: 'MED',  count: countMed  },
    { id: 'LOW',  count: countLow  }
  ]);

  // ── Combined filtered list (for when activeFilter !== 'ALL') ──
  let filteredAll = $derived.by(() => {
    let list = [...allTasks];

    // Filter by priority
    if (activeFilter === 'HIGH') {
      list = list.filter(t => (t.priority || '').toUpperCase() === 'HIGH');
    } else if (activeFilter === 'MED') {
      list = list.filter(t => (t.priority || '').toUpperCase() === 'MED');
    } else if (activeFilter === 'LOW') {
      list = list.filter(t => (t.priority || '').toUpperCase() === 'LOW');
    }

    // Text search
    if (searchVal.trim() !== '') {
      const q = searchVal.toLowerCase().replace('#', '');
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.tags || []).some((tag: string) => tag.toLowerCase().replace('#', '').includes(q)) ||
        (t.classifications || []).some((tag: string) => tag.toLowerCase().replace('#', '').includes(q))
      );
    }

    // Tag filter
    if (selectedTags && selectedTags.length > 0) {
      list = list.filter(t => {
        const allTagsForTask = [...(t.tags || []), ...(t.classifications || [])];
        return selectedTags.every((sel: string) =>
          allTagsForTask.some((mt: string) => mt.toUpperCase().replace('#', '') === sel.toUpperCase().replace('#', ''))
        );
      });
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (activeSort === 'By Resolution Date') {
        const aD = a.completionDate || a.createdAt || '';
        const bD = b.completionDate || b.createdAt || '';
        cmp = aD.localeCompare(bD);
      } else if (activeSort === 'By Creation Time') {
        cmp = (a.id || 0) - (b.id || 0);
      } else if (activeSort === 'By Name') {
        cmp = a.title.localeCompare(b.title);
      } else if (activeSort === 'By Priority') {
        cmp = (b.priorityVal || 2) - (a.priorityVal || 2);
      }
      return isAscending ? cmp : -cmp;
    });

    return list;
  });

  // ── Split lists for the two-column layout ──
  // Left column: ABORTED + DRIFT-ABORTED | Right column: VICTORY
  let leftTasks = $derived(filteredAll.filter(t => t.resolution === 'ABORTED'));
  let rightTasks = $derived(filteredAll.filter(t => t.resolution === 'VICTORY'));

  // Always split layout, even when filtered by priority
  let showSplitLayout = $state(true);

  // For single-column mode (unused but kept for reference)
  let singleColumnTasks = $derived(filteredAll);

  const openProtocol = (mission: any) => {
    AudioEngine.play('ui-click');
    selectedMission = mission;
    isProtocolOpen = true;
  };

  $effect(() => {
    isTaskViewOpen.set(isProtocolOpen);
  });

  onMount(() => {
    AudioEngine.play('data-decode');
  });

  onDestroy(() => {
    isTaskViewOpen.set(false);
  });
</script>

<div class="archive-root">
  <!-- ── Atmosphere ── -->
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

  <!-- ── Content ── -->
  <div class="ui-content-wrapper">
    {#if !isProtocolOpen}
      <div class="standard-content-box" in:fade={{ delay: 150, duration: 250 }}>

        <!-- Filter Bar -->
        <ArchiveFilterBar
          bind:activeFilter={activeFilter}
          bind:searchVal={searchVal}
          bind:isAscending={isAscending}
          bind:activeSort={activeSort}
          filters={filters}
        />

        <!-- Tag Bar -->
        <ArchiveTagBar bind:selectedTags={selectedTags} />

        <!-- Empty state -->
        {#if filteredAll.length === 0}
          <div class="status-display">
            <svg class="vault-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="rgba(139,92,246,0.6)" stroke-width="1.5"/>
              <path d="M12 8V12M12 16H12.01" stroke="rgba(139,92,246,0.6)" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="12" r="3" stroke="rgba(139,92,246,0.4)" stroke-width="1.5"/>
            </svg>
            <h3 class="fui-h2 status-message">NO RECORDS IN THE VAULT</h3>
            <p class="fui-telemetry status-hint">COMPLETE OR ABORT A MISSION TO LOG IT IN THE ARCHIVE</p>
          </div>

        {:else if showSplitLayout}
          <!-- ── Split Layout: Aborted Left | Victory Right ── -->
          <div class="split-layout">

            <!-- LEFT: Aborted column -->
            <div class="split-col aborted-col">
              <div class="col-header aborted-col-header">
                <div class="col-header-dot dot-red"></div>
                <span class="col-header-label">ABORTED RECORDS</span>
                <span class="col-count">{leftTasks.length}</span>
              </div>
              <div class="col-divider divider-red"></div>
              <div class="task-column">
                {#if leftTasks.length === 0}
                  <div class="col-empty col-empty-aborted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="rgba(239,68,68,0.35)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 12L15 12" stroke="rgba(239,68,68,0.35)" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>NO ABORTED RECORDS</span>
                  </div>
                {:else}
                  {#each leftTasks as task, i (task.id)}
                    <div
                      animate:flip={{ duration: 300 }}
                      transition:fly={{ y: 30, duration: 400, delay: i * 50 }}
                    >
                      <ArchiveTaskRow
                        task={task}
                        searchQuery={searchVal}
                        onrowclick={openProtocol}
                      />
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- CENTER DIVIDER -->
            <div class="center-spine">
              <div class="spine-line"></div>
              <div class="spine-node spine-node-top"></div>
              <div class="spine-node spine-node-bot"></div>
            </div>

            <!-- RIGHT: Victory column -->
            <div class="split-col victory-col">
              <div class="col-header victory-col-header">
                <div class="col-header-dot dot-green"></div>
                <span class="col-header-label">VICTORY RECORDS</span>
                <span class="col-count col-count-victory">{rightTasks.length}</span>
              </div>
              <div class="col-divider divider-green"></div>
              <div class="task-column">
                {#if rightTasks.length === 0}
                  <div class="col-empty col-empty-victory">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="rgba(0,255,159,0.35)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 12L11 14L15 10" stroke="rgba(0,255,159,0.35)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>NO VICTORIES LOGGED</span>
                  </div>
                {:else}
                  {#each rightTasks as task, i (task.id)}
                    <div
                      animate:flip={{ duration: 300 }}
                      transition:fly={{ y: 30, duration: 400, delay: i * 50 }}
                    >
                      <ArchiveTaskRow
                        task={task}
                        searchQuery={searchVal}
                        onrowclick={openProtocol}
                      />
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </div>

        {:else}
          <!-- ── Single Column layout (filtered) ── -->
          <div class="list-display">
            <div class="tasks-grid">
              {#each singleColumnTasks as task, i (task.id)}
                <div
                  animate:flip={{ duration: 300 }}
                  transition:fly={{ y: 30, duration: 400, delay: i * 50 }}
                >
                  <ArchiveTaskRow
                    task={task}
                    searchQuery={searchVal}
                    onrowclick={openProtocol}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

      </div>
    {/if}
  </div>

  <!-- ── Task View (read-only — identical to Execution Task View) ── -->
  <MissionProtocol
    isOpen={isProtocolOpen}
    readOnly={true}
    mission={selectedMission}
    onclose={() => { isProtocolOpen = false; selectedMission = null; }}
  />
</div>

<style>
  .archive-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Atmosphere ── */
  .sector-atmosphere {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 0;
    overflow: hidden;
  }

  .atmo-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, #080614 0%, #06080f 35%, #090614 65%, #040608 100%);
  }

  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    will-change: transform;
    pointer-events: none;
  }

  /* LEFT orb: red/crimson (aborted side) */
  .orb-1 {
    width: 60vw;
    height: 60vw;
    top: -20vw;
    left: -15vw;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
    animation: orbDrift1 30s ease-in-out infinite alternate;
  }

  /* RIGHT orb: emerald (victory side) */
  .orb-2 {
    width: 55vw;
    height: 55vw;
    bottom: -18vw;
    right: -12vw;
    background: radial-gradient(circle, rgba(0, 255, 159, 0.1) 0%, rgba(0, 180, 100, 0.06) 50%, transparent 70%);
    animation: orbDrift2 38s ease-in-out infinite alternate;
  }

  /* CENTER drift-abort violet hint */
  .orb-3 {
    width: 35vw;
    height: 35vw;
    top: 35%;
    left: 35%;
    background: radial-gradient(circle, rgba(109, 40, 217, 0.08) 0%, transparent 70%);
    animation: orbDrift3 24s ease-in-out infinite alternate;
  }

  @keyframes orbDrift1 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(6vw, 5vw) scale(1.1); }
  }
  @keyframes orbDrift2 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-5vw, -7vw) scale(1.08); }
  }
  @keyframes orbDrift3 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-3vw, 4vw) scale(1.12); }
  }

  .glass-surface {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    background: rgba(6, 5, 14, 0.38);
  }

  .fui-scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(139, 92, 246, 0.009) 3px,
      rgba(139, 92, 246, 0.009) 4px
    );
    pointer-events: none;
  }

  .grid-mesh {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(139, 92, 246, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, transparent 20%, black 100%);
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.65) 100%);
    pointer-events: none;
  }

  /* ── Content Wrapper ── */
  .ui-content-wrapper {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
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

  /* ── Empty State ── */
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

  .vault-icon {
    filter: drop-shadow(0 0 18px rgba(139, 92, 246, 0.35));
    animation: vaultFloat 4s ease-in-out infinite;
  }

  @keyframes vaultFloat {
    0%, 100% { transform: translateY(0px); opacity: 0.7; }
    50%       { transform: translateY(-12px); opacity: 1; }
  }

  .status-message {
    color: rgba(139, 92, 246, 0.85);
    margin: 0;
    text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  }

  .status-hint {
    max-width: 420px;
    line-height: 1.8;
    opacity: 0.45;
  }

  /* ── Single-column list ── */
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
    gap: 10px;
    overflow-y: auto;
    flex: 1;
    padding-bottom: 24px;
    min-height: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .tasks-grid::-webkit-scrollbar { display: none; }

  /* ── Split Layout ── */
  .split-layout {
    display: grid;
    grid-template-columns: 1fr 32px 1fr;
    gap: 0;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .split-col {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  /* Column headers */
  .col-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px 10px;
    flex-shrink: 0;
  }

  .col-header-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-red   { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.8); animation: dotPulse 2s ease-in-out infinite alternate; }
  .dot-green { background: #00ff9f; box-shadow: 0 0 8px rgba(0,255,159,0.8); animation: dotPulse 2s ease-in-out infinite alternate; }

  @keyframes dotPulse {
    from { opacity: 0.5; }
    to   { opacity: 1;   }
  }

  .col-header-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .aborted-col-header .col-header-label { color: rgba(239,68,68,0.75); }
  .victory-col-header .col-header-label { color: rgba(0,255,159,0.75); }

  .col-count {
    margin-left: auto;
    font-family: ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
  }

  .aborted-col-header .col-count {
    background: rgba(239,68,68,0.12);
    color: #ef4444;
    border: 1px solid rgba(239,68,68,0.3);
  }

  .col-count-victory {
    background: rgba(0,255,159,0.12) !important;
    color: #00ff9f !important;
    border: 1px solid rgba(0,255,159,0.3) !important;
  }

  /* Column dividers */
  .col-divider {
    height: 1px;
    margin-bottom: 12px;
    flex-shrink: 0;
  }
  .divider-red   { background: linear-gradient(90deg, rgba(239,68,68,0.5) 0%, rgba(239,68,68,0.05) 100%); }
  .divider-green { background: linear-gradient(90deg, rgba(0,255,159,0.05) 0%, rgba(0,255,159,0.5) 100%); }

  /* Scrollable task column */
  .task-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
    flex: 1;
    padding-bottom: 24px;
    padding-right: 8px;
    min-height: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .task-column::-webkit-scrollbar { display: none; }

  /* Empty col placeholders */
  .col-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex: 1;
    opacity: 0.35;
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .col-empty-aborted { color: rgba(239,68,68,0.8); }
  .col-empty-victory { color: rgba(0,255,159,0.8); }

  /* Center spine */
  .center-spine {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .spine-line {
    width: 1px;
    flex: 1;
    background: linear-gradient(
      180deg,
      rgba(239,68,68,0.08) 0%,
      rgba(239,68,68,0.3) 20%,
      rgba(139,92,246,0.25) 50%,
      rgba(0,255,159,0.3) 80%,
      rgba(0,255,159,0.08) 100%
    );
  }

  .spine-node {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(139,92,246,0.6);
    box-shadow: 0 0 8px rgba(139,92,246,0.4);
    flex-shrink: 0;
    margin: 8px 0;
  }
</style>
