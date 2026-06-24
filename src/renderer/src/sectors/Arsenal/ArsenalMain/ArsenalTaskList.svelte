<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly, fade } from 'svelte/transition';
  import ArsenalTaskRow from './ArsenalTaskRow.svelte';
  import { arsenalTasks } from '../../../core/store';

  let { 
    ontaskselect,
    activeFilter = 'ALL',
    searchVal = '',
    isAscending = true,
    activeSort = 'By creation time (default)',
    selectedTags = [],
    onstrategize = null
  } = $props();

  // Status filter constants that come from the ArsenalTagBar status buttons
  const STATUS_FILTER_KEYS = ['RAW_INTEL', 'SYNTHESIZING'];

  // Filter and sort the missions reactively from the synchronized SQLite store
  let missions = $derived.by(() => {
    let list = [...$arsenalTasks];

    // Filter by threat level (HIGH, MED, LOW)
    if (activeFilter !== 'ALL') {
      list = list.filter(m => m.priority === activeFilter);
    }

    // Separate status filters from regular tag filters
    const statusFilters = (selectedTags as string[]).filter((t: string) => STATUS_FILTER_KEYS.includes(t));
    const tagFilters = (selectedTags as string[]).filter((t: string) => !STATUS_FILTER_KEYS.includes(t));

    // Apply status filters (RAW_INTEL / SYNTHESIZING) against m.status
    if (statusFilters.length > 0) {
      list = list.filter(m => {
        const taskStatus = (m.status || 'RAW_INTEL').toUpperCase();
        // A task with no status or status not in [SYNTHESIZING, WEAPONIZED] is RAW_INTEL
        const effectiveStatus = (taskStatus === 'SYNTHESIZING' || taskStatus === 'WEAPONIZED') ? taskStatus : 'RAW_INTEL';
        return statusFilters.includes(effectiveStatus);
      });
    }

    // Filter by text search query
    if (searchVal.trim() !== '') {
      const q = searchVal.toLowerCase().replace('#', '');
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.tags.some((t: string) => t.toLowerCase().replace('#', '').includes(q))
      );
    }

    // Filter by regular tag selections (user-defined tags only)
    if (tagFilters.length > 0) {
      list = list.filter(m => 
        tagFilters.every((t: string) => m.tags.some((mt: string) => mt.toUpperCase().replace('#', '') === t.toUpperCase().replace('#', '')))
      );
    }

    // Sort according to selection exactly mapping custom dropdown items
    list.sort((a, b) => {
      let comparison = 0;
      if (activeSort === 'By Name') {
        comparison = a.title.localeCompare(b.title);
      } else if (activeSort === 'By Modification Date') {
        comparison = a.id - b.id;
      } else { // By Creation Time (Default)
        comparison = a.id - b.id;
      }
      return isAscending ? comparison : -comparison;
    });

    return list;
  });
</script>

<div class="task-list-wrapper">
  {#if missions.length === 0}
    <div class="filtered-empty-card font-outfit" transition:fade={{ duration: 250 }}>
      <svg class="empty-glow-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="var(--primary-accent)" stroke-width="2" stroke-dasharray="4 4" class="fui-pulse"/>
        <path d="M12 8V12M12 16H12.01" stroke="var(--primary-accent)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span class="empty-card-text">NO VISIBLE THREADS IN THIS CLASSIFICATION</span>
    </div>
  {:else}
    <div class="tasks-grid">
      {#each missions as mission, index (mission.id)}
        <div animate:flip={{ duration: 300 }} transition:fly={{ y: 30, duration: 400, delay: index * 50 }}>
          <ArsenalTaskRow task={mission} onprotocolclick={ontaskselect} searchQuery={searchVal} onstrategize={onstrategize} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .task-list-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--fui-gap);
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .tasks-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
    flex: 1;
    padding-right: 0;
    padding-bottom: 16px;
    min-height: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tasks-grid::-webkit-scrollbar {
    display: none;
  }

  .filtered-empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 72px 32px;
    border: 1px dashed rgba(139, 92, 246, 0.2);
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.05) 0%,
      rgba(13, 10, 30, 0.55) 60%,
      rgba(0, 0, 0, 0.3) 100%
    );
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border-radius: 16px;
    text-align: center;
    box-shadow:
      0 0 40px rgba(139, 92, 246, 0.06),
      inset 0 1px 0 rgba(255,255,255,0.04);
    margin: 20px auto;
    max-width: 560px;
    width: 100%;
    box-sizing: border-box;
  }

  .empty-glow-icon {
    filter: drop-shadow(0 0 16px var(--primary-glow));
    color: var(--primary-accent);
  }

  .empty-card-text {
    color: rgba(139, 92, 246, 0.85);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-shadow: 0 0 16px var(--primary-glow);
    text-transform: uppercase;
  }

  .fui-pulse {
    animation: emptyPulse 2s infinite ease-in-out;
  }

  @keyframes emptyPulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
</style>
