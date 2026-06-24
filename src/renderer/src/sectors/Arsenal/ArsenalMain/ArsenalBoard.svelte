<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import FilterBar from '../../Execution/ExecutionFilterBar/FilterBar.svelte';
  import ArsenalTagBar from './ArsenalTagBar.svelte';
  import ArsenalTaskRow from './ArsenalTaskRow.svelte';
  import MissionProtocol from '../../Execution/ExecutionTaskView/MissionProtocol.svelte';
  import { arsenalTasks, isTaskViewOpen, syncAntaryami, addNotification, updateMissionStatus, deleteMission, activeStrategizeTask, onNoteSavedCallback, isPurgeModalOpen, taskToPurge } from '../../../core/store';
  import { AudioEngine } from '../../../core/audio-engine';

  let { onopenforge = null } = $props<{ onopenforge?: (task: any) => void }>();

  let isProtocolOpen = $state(false);
  let activeFilter = $state('ALL');
  let searchVal = $state('');
  let isAscending = $state(true);
  let activeSort = $state('By Creation Time (Default)');
  let selectedTask = $state(null);
  let selectedTags = $state<string[]>([]);

  // Drag and drop states
  let isDragOverRaw = $state(false);
  let isDragOverSynth = $state(false);

  // Cooling timer states for synthesizing transfers
  let coolingStates = $state<Record<number, { phase: 'cooling' | 'ready'; timeLeft: number }>>({});
  let activeIntervals: Record<number, any> = {};

  function initiateCooling(taskId: number) {
    if (coolingStates[taskId]) return;

    AudioEngine.play('alarm_warning');
    coolingStates[taskId] = { phase: 'cooling', timeLeft: 60 };

    activeIntervals[taskId] = setInterval(() => {
      const stateObj = coolingStates[taskId];
      if (!stateObj) {
        clearInterval(activeIntervals[taskId]);
        return;
      }

      if (stateObj.timeLeft > 1) {
        stateObj.timeLeft--;
      } else {
        if (stateObj.phase === 'cooling') {
          stateObj.phase = 'ready';
          stateObj.timeLeft = 60;
          AudioEngine.play('ping');
        } else {
          clearInterval(activeIntervals[taskId]);
          delete activeIntervals[taskId];
          delete coolingStates[taskId];
        }
      }
    }, 1000);
  }

  function handleDragOver(e: DragEvent, targetCol: 'raw' | 'synth') {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (targetCol === 'raw') {
      isDragOverRaw = true;
    } else {
      isDragOverSynth = true;
    }
  }

  function handleDragLeave(targetCol: 'raw' | 'synth') {
    if (targetCol === 'raw') {
      isDragOverRaw = false;
    } else {
      isDragOverSynth = false;
    }
  }

  async function handleDrop(e: DragEvent, targetCol: 'raw' | 'synth') {
    e.preventDefault();
    isDragOverRaw = false;
    isDragOverSynth = false;

    const taskIdStr = e.dataTransfer?.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    if (isNaN(taskId)) return;

    const taskObj = allTasks.find((t: any) => t.id === taskId);
    if (!taskObj) return;

    const currentStatus = taskObj.status || '';
    const currentIsSynth = currentStatus.toUpperCase() === 'SYNTHESIZING';

    if (targetCol === 'synth' && currentIsSynth) return;
    if (targetCol === 'raw' && !currentIsSynth) return;

    if (currentIsSynth && targetCol === 'raw') {
      const stateObj = coolingStates[taskId];
      if (!stateObj || stateObj.phase !== 'ready') return;
      
      AudioEngine.play('ui-click');
      
      // Optimistic UI update
      arsenalTasks.update(tasks => {
        return tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, status: 'RAW_INTEL' };
          }
          return t;
        });
      });

      try {
        await updateMissionStatus(taskId, 'RAW_INTEL');
        
        if (activeIntervals[taskId]) {
          clearInterval(activeIntervals[taskId]);
          delete activeIntervals[taskId];
        }
        delete coolingStates[taskId];

        if (window.stratagemAPI?.appendNoteLog) {
          await window.stratagemAPI.appendNoteLog(taskId, 'SYNTHESIS TRANSFERRED', 'Cognitive pipeline thread returned to Raw Intel.');
        }
      } catch (err) {
        console.error('Failed to update status to RAW_INTEL:', err);
      }
    } else {
      AudioEngine.play('ui-click');
      
      // Optimistic UI update
      arsenalTasks.update(tasks => {
        return tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, status: 'SYNTHESIZING' };
          }
          return t;
        });
      });

      try {
        await updateMissionStatus(taskId, 'SYNTHESIZING');
        if (window.stratagemAPI?.appendNoteLog) {
          await window.stratagemAPI.appendNoteLog(taskId, 'SYNTHESIS INITIATED', 'Task cognitive thread integrated into active Synthesizing pipeline.');
        }
      } catch (err) {
        console.error('Failed to update status to SYNTHESIZING:', err);
      }
    }
  }

  function handleSynthDeleteClick(task: any) {
    taskToPurge.set(task);
    isPurgeModalOpen.set(true);
  }

  // Derive counts based on the global arsenalTasks store reactively
  let allTasks = $derived($arsenalTasks);

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
  let countHigh = $derived(searchAndTagFilteredTasks.filter((t: any) => t.priority === 'HIGH').length);
  let countMed = $derived(searchAndTagFilteredTasks.filter((t: any) => t.priority === 'MED').length);
  let countLow = $derived(searchAndTagFilteredTasks.filter((t: any) => t.priority === 'LOW').length);

  let filters = $derived([
    { id: 'ALL', count: countAll },
    { id: 'HIGH', count: countHigh },
    { id: 'MED', count: countMed },
    { id: 'LOW', count: countLow }
  ]);

  // Base filter: priority + search + tags (shared across both panels)
  let baseMissions = $derived.by(() => {
    let list = [...searchAndTagFilteredTasks];

    if (activeFilter !== 'ALL') {
      list = list.filter((m: any) => m.priority === activeFilter);
    }

    // Sort
    list.sort((a: any, b: any) => {
      let cmp = 0;
      if (activeSort === 'By Name') cmp = a.title.localeCompare(b.title);
      else cmp = a.id - b.id;
      return isAscending ? cmp : -cmp;
    });

    return list;
  });

  // Split into RAW INTEL vs SYNTHESIZING
  let rawIntelMissions = $derived(
    baseMissions.filter((m: any) => {
      const s = (m.status || '').toUpperCase();
      return s !== 'SYNTHESIZING' && s !== 'WEAPONIZED';
    })
  );

  let synthesizingMissions = $derived(
    baseMissions.filter((m: any) => (m.status || '').toUpperCase() === 'SYNTHESIZING')
  );

  const handleTaskSelect = (task: any) => {
    selectedTask = task;
    onopenforge?.(task);
    AudioEngine.play('ui-click');
  };

  const handleStrategize = (event: { task: any; onNoteWritten: () => void }) => {
    activeStrategizeTask.set(event.task);
    onNoteSavedCallback.set(event.onNoteWritten);
  };

  $effect(() => { isTaskViewOpen.set(isProtocolOpen || !!$activeStrategizeTask || $isPurgeModalOpen); });

  onMount(() => {
    const handleSynthPurged = (e: Event) => {
      const taskId = (e as CustomEvent).detail.taskId;
      if (activeIntervals[taskId]) {
        clearInterval(activeIntervals[taskId]);
        delete activeIntervals[taskId];
      }
      delete coolingStates[taskId];
    };
    window.addEventListener('synth-purged', handleSynthPurged);
    return () => {
      window.removeEventListener('synth-purged', handleSynthPurged);
    };
  });

  onDestroy(() => { isTaskViewOpen.set(false); });
</script>

<div class="execution-root">
  <!-- Layered Glassmorphic Atmosphere -->
  <div class="sector-atmosphere">
    <div class="atmo-base"></div>
    {#if !isProtocolOpen && !$activeStrategizeTask}
      <div class="gradient-orb orb-1" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-2" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="gradient-orb orb-3" in:fade={{ delay: 150, duration: 250 }}></div>
      <div class="glass-surface" in:fade={{ delay: 150, duration: 250 }}></div>
    {/if}
    <div class="fui-scanline"></div>
    <div class="grid-mesh"></div>
    <div class="vignette"></div>
  </div>

  <!-- Content -->
  <div class="ui-content-wrapper" style:display={$activeStrategizeTask ? 'none' : ''}>
    {#if !isProtocolOpen}
      <div class="standard-content-box" in:fade={{ delay: 150, duration: 250 }}>

        <FilterBar
          bind:activeFilter={activeFilter}
          bind:searchVal={searchVal}
          bind:isAscending={isAscending}
          bind:activeSort={activeSort}
          filters={filters}
          mode="arsenal"
        />

        <ArsenalTagBar bind:selectedTags={selectedTags} />

        <!-- Two-panel split view -->
        <div class="dual-panel-wrapper">

          <!-- RAW INTEL Panel -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="intel-panel raw-panel"
            class:drag-over={isDragOverRaw}
            ondragover={(e) => handleDragOver(e, 'raw')}
            ondragleave={() => handleDragLeave('raw')}
            ondrop={(e) => handleDrop(e, 'raw')}
          >
            <div class="panel-header raw-header">
              <div class="panel-header-left">
                <div class="panel-status-dot raw-dot">
                  <div class="dot-core"></div>
                  <div class="dot-ring"></div>
                  <div class="dot-glow"></div>
                </div>
                <div class="panel-title-block">
                  <div class="panel-label">RAW INTEL</div>
                  <div class="panel-sublabel">Unprocessed intelligence threads</div>
                </div>
              </div>
              <div class="panel-count raw-count">
                <span class="count-num">{rawIntelMissions.length}</span>
                <span class="count-label">THREADS</span>
              </div>
            </div>

            <div class="panel-body">
              {#if rawIntelMissions.length === 0}
                <div class="panel-empty" transition:fade={{ duration: 200 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" stroke-linejoin="round"/>
                    <path d="M9 21H15" stroke-linecap="round"/>
                    <circle cx="12" cy="9" r="1.5" fill="currentColor"/>
                  </svg>
                  <span>NO RAW INTEL DETECTED</span>
                </div>
              {:else}
                <div class="panel-list">
                  {#each rawIntelMissions as mission, i (mission.id)}
                    <div animate:flip={{ duration: 280 }} transition:fly={{ y: 20, duration: 350, delay: i * 40 }}>
                      <ArsenalTaskRow
                        task={mission}
                        onprotocolclick={handleTaskSelect}
                        searchQuery={searchVal}
                        clickable={false}
                        onstrategize={handleStrategize}
                        coolingState={coolingStates[mission.id]}
                        onInitiateTransfer={() => initiateCooling(mission.id)}
                        ondeleteclick={handleSynthDeleteClick}
                      />
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Divider -->
          <div class="panel-divider">
            <div class="divider-line"></div>
            <div class="divider-node">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="divider-line"></div>
          </div>

          <!-- SYNTHESIZING Panel -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="intel-panel synth-panel"
            class:drag-over={isDragOverSynth}
            ondragover={(e) => handleDragOver(e, 'synth')}
            ondragleave={() => handleDragLeave('synth')}
            ondrop={(e) => handleDrop(e, 'synth')}
          >
            <div class="panel-header synth-header">
              <div class="panel-header-left">
                <div class="panel-status-dot synth-dot">
                  <div class="dot-core"></div>
                  <div class="dot-ring"></div>
                  <div class="dot-glow"></div>
                </div>
                <div class="panel-title-block">
                  <div class="panel-label">SYNTHESIZING</div>
                  <div class="panel-sublabel">Active cognition pipeline</div>
                </div>
              </div>
              <div class="panel-count synth-count">
                <span class="count-num">{synthesizingMissions.length}</span>
                <span class="count-label">PROCESSING</span>
              </div>
            </div>

            <div class="panel-body">
              {#if synthesizingMissions.length === 0}
                <div class="panel-empty synth-empty" transition:fade={{ duration: 200 }}>
                  <svg class="synth-empty-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="9" stroke-dasharray="16 8"/>
                    <path d="M12 7V12L15 14" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>NO ACTIVE SYNTHESIS</span>
                </div>
              {:else}
                <div class="panel-list">
                  {#each synthesizingMissions as mission, i (mission.id)}
                    <div animate:flip={{ duration: 280 }} transition:fly={{ y: 20, duration: 350, delay: i * 40 }}>
                      <ArsenalTaskRow
                        task={mission}
                        onprotocolclick={handleTaskSelect}
                        searchQuery={searchVal}
                        clickable={true}
                        onstrategize={handleStrategize}
                        coolingState={coolingStates[mission.id]}
                        onInitiateTransfer={() => initiateCooling(mission.id)}
                        ondeleteclick={handleSynthDeleteClick}
                      />
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

        </div>
      </div>
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

  /* ─── Atmosphere ─────────────────────────── */
  .sector-atmosphere {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 0;
    overflow: hidden;
  }

  .atmo-base {
    position: absolute;
    inset: 0;
    background: linear-gradient(145deg, #0a0714 0%, #080c1a 35%, #0b0a1e 65%, #060912 100%);
  }

  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    will-change: transform;
    pointer-events: none;
  }

  .orb-1 {
    width: 70vw; height: 70vw;
    top: -25vw; left: -20vw;
    background: radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 70%);
    animation: orbDrift1 28s ease-in-out infinite alternate;
  }
  .orb-2 {
    width: 55vw; height: 55vw;
    bottom: -20vw; right: -15vw;
    background: radial-gradient(circle, rgba(147,51,234,0.18) 0%, rgba(6,182,212,0.1) 50%, transparent 70%);
    animation: orbDrift2 35s ease-in-out infinite alternate;
  }
  .orb-3 {
    width: 40vw; height: 40vw;
    top: 30%; left: 40%;
    background: radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%);
    animation: orbDrift3 22s ease-in-out infinite alternate;
  }

  @keyframes orbDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(8vw,6vw) scale(1.12); } }
  @keyframes orbDrift2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-6vw,-8vw) scale(1.08); } }
  @keyframes orbDrift3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-4vw,5vw) scale(1.15); } }

  .glass-surface {
    position: absolute; inset: 0;
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    background: rgba(8,6,20,0.35);
  }

  .fui-scanline {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,92,246,0.012) 3px, rgba(139,92,246,0.012) 4px);
    pointer-events: none;
  }

  .grid-mesh {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, transparent 20%, black 100%);
  }

  .vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
    pointer-events: none;
  }

  /* ─── Content wrapper ─────────────────────────── */
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
    padding-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    box-sizing: border-box;
    min-height: 0;
  }

  /* ─── Dual Panel ─────────────────────────── */
  .dual-panel-wrapper {
    flex: 1;
    display: flex;
    gap: 0;
    min-height: 0;
    overflow: hidden;
  }

  .intel-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(139,92,246,0.1);
    background: linear-gradient(160deg, rgba(139,92,246,0.04) 0%, rgba(8,6,20,0.7) 60%, rgba(4,2,10,0.85) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  /* RAW INTEL tint */
  .raw-panel {
    border-color: rgba(139,92,246,0.12);
    box-shadow: 0 0 40px rgba(139,92,246,0.04), inset 0 1px 0 rgba(139,92,246,0.08);
    transition: all 0.25s ease;
  }

  .raw-panel.drag-over {
    border-color: rgba(139, 92, 246, 0.7);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.25), inset 0 0 15px rgba(139, 92, 246, 0.1);
    background: linear-gradient(160deg, rgba(139,92,246,0.08) 0%, rgba(8,6,20,0.8) 60%, rgba(4,2,10,0.95) 100%);
  }

  /* SYNTHESIZING tint */
  .synth-panel {
    border-color: rgba(6,182,212,0.12);
    background: linear-gradient(160deg, rgba(6,182,212,0.04) 0%, rgba(8,6,20,0.7) 60%, rgba(4,2,10,0.85) 100%);
    box-shadow: 0 0 40px rgba(6,182,212,0.04), inset 0 1px 0 rgba(6,182,212,0.08);
    transition: all 0.25s ease;
  }

  .synth-panel.drag-over {
    border-color: rgba(6, 182, 212, 0.7);
    box-shadow: 0 0 25px rgba(6, 182, 212, 0.25), inset 0 0 15px rgba(6, 182, 212, 0.1);
    background: linear-gradient(160deg, rgba(6,182,212,0.08) 0%, rgba(8,6,20,0.8) 60%, rgba(4,2,10,0.95) 100%);
  }

  /* ─── Panel Header ─────────────────────────── */
  .panel-header {
    padding: 18px 24px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
  }

  .panel-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* Status dot */
  .panel-status-dot {
    width: 20px;
    height: 20px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dot-core {
    width: 8px; height: 8px;
    border-radius: 50%;
    position: relative; z-index: 2;
  }
  .dot-ring {
    position: absolute;
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 1.5px solid;
    z-index: 1;
    animation: dotPulse 2.5s ease-in-out infinite;
  }
  .dot-glow {
    position: absolute;
    width: 28px; height: 28px;
    border-radius: 50%;
    filter: blur(8px);
    z-index: 0;
  }

  @keyframes dotPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.5); opacity: 0.15; }
  }

  .raw-dot .dot-core  { background: #8b5cf6; }
  .raw-dot .dot-ring  { border-color: rgba(139,92,246,0.5); }
  .raw-dot .dot-glow  { background: rgba(139,92,246,0.3); }

  .synth-dot .dot-core { background: #06b6d4; }
  .synth-dot .dot-ring { border-color: rgba(6,182,212,0.5); }
  .synth-dot .dot-glow { background: rgba(6,182,212,0.3); }

  /* Spinning animation for synth dot */
  .synth-dot .dot-ring {
    animation: dotPulse 2.5s ease-in-out infinite, synthSpin 6s linear infinite;
    border-style: dashed;
  }

  @keyframes synthSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .panel-title-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .panel-label {
    font-family: 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .raw-header .panel-label { color: rgba(139,92,246,0.9); text-shadow: 0 0 12px rgba(139,92,246,0.4); }
  .synth-header .panel-label { color: rgba(6,182,212,0.9); text-shadow: 0 0 12px rgba(6,182,212,0.4); }

  .panel-sublabel {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.28);
    text-transform: uppercase;
  }

  .panel-count {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .count-num {
    font-family: 'Rajdhani', sans-serif;
    font-size: 28px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .count-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
  }

  .raw-count .count-num { color: rgba(139,92,246,0.9); text-shadow: 0 0 16px rgba(139,92,246,0.5); }
  .synth-count .count-num { color: rgba(6,182,212,0.9); text-shadow: 0 0 16px rgba(6,182,212,0.5); }

  /* ─── Panel Body (scrollable list) ─────────────────────────── */
  .panel-body {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 12px 16px 16px;
    min-height: 0;
  }

  .panel-body::-webkit-scrollbar { display: none; }

  .panel-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ─── Empty states ─────────────────────────── */
  .panel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 24px;
    color: rgba(139,92,246,0.35);
    text-align: center;
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .panel-empty svg {
    opacity: 0.4;
    animation: emptyFloat 4s ease-in-out infinite;
  }

  .synth-empty {
    color: rgba(6,182,212,0.35);
  }

  .synth-empty-icon {
    animation: emptyFloat 4s ease-in-out infinite, synthSpin 8s linear infinite !important;
  }

  @keyframes emptyFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  /* ─── Vertical Divider ─────────────────────────── */
  .panel-divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 28px;
    flex-shrink: 0;
    gap: 0;
    padding: 0;
    position: relative;
  }

  .divider-line {
    flex: 1;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(139,92,246,0.18) 20%, rgba(6,182,212,0.18) 80%, transparent);
  }

  .divider-node {
    width: 24px; height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(139,92,246,0.2);
    background: rgba(8,6,20,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.2);
    flex-shrink: 0;
    animation: nodeGlow 3s ease-in-out infinite;
  }

  @keyframes nodeGlow {
    0%, 100% { box-shadow: 0 0 6px rgba(139,92,246,0.1); }
    50% { box-shadow: 0 0 14px rgba(139,92,246,0.3), 0 0 14px rgba(6,182,212,0.2); }
  }

  .divider-node svg {
    animation: synthSpin 12s linear infinite;
    opacity: 0.5;
  }
</style>
