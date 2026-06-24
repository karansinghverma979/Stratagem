<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { AudioEngine } from '../core/audio-engine';
  import { executionTasks, breachedTasks, archivedTasks } from '../core/store';

  let { isOpen = $bindable(false), onsectorchange } = $props();

  let query = $state('');
  let results = $state<any[]>([]);
  let selectedIndex = $state(0);
  let inputElement = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isOpen && inputElement) {
      setTimeout(() => inputElement?.focus(), 50);
    }
  });

  // Declarative task compilation using Svelte store auto-subscriptions ($)
  let allTasks = $derived([
    ...$executionTasks.map(t => ({ ...t, type: 'MISSION', sector: 'Execution' })),
    ...$breachedTasks.map(t => ({ ...t, type: 'MISSION', sector: 'Breach' })),
    ...$archivedTasks.map(t => ({ ...t, type: 'MISSION', sector: 'Archive' }))
  ]);
  const sectors = ['Execution', 'Arsenal', 'Breach', 'Archive', 'Chronos', 'Genesis'];

  onMount(() => {
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
    };
  });

  const handleGlobalKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      isOpen = !isOpen;
      if (isOpen) {
        query = '';
        selectedIndex = 0;
        AudioEngine.play('data-decode');
      }
    }
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeAction(results[selectedIndex]);
    }
  };

  $effect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      results = sectors.map(s => ({ title: `GO TO ${s.toUpperCase()} SECTOR`, type: 'SECTOR', sector: s }));
    } else {
      const filteredSectors = sectors
        .filter(s => s.toLowerCase().includes(q))
        .map(s => ({ title: `GO TO ${s.toUpperCase()} SECTOR`, type: 'SECTOR', sector: s }));
      
      const filteredMissions = allTasks
        .filter(t => t.title.toLowerCase().includes(q))
        .map(t => ({ title: t.title, type: 'MISSION', sector: t.sector, id: t.id }));

      results = [...filteredSectors, ...filteredMissions];
    }
    selectedIndex = 0;
  });

  const executeAction = (action: any) => {
    if (!action) return;
    AudioEngine.play('ui-click');
    if (action.type === 'SECTOR') {
      onsectorchange(action.sector);
    } else if (action.type === 'MISSION') {
      onsectorchange(action.sector);
      // Future: highlight mission
    }
    isOpen = false;
  };
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="palette-overlay" transition:fade={{ duration: 200, easing: quintOut }} onclick={() => isOpen = false}>
    <div class="palette-container" in:fly={{ y: -20, duration: 350, easing: quintOut }} out:fly={{ y: -15, duration: 200, easing: quintOut }} onclick={(e) => e.stopPropagation()}>
      <div class="input-wrapper">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input 
          type="text" 
          placeholder="ENTER COMMAND OR MISSION DESIGNATION..." 
          bind:value={query} 
          onkeydown={handleKeyDown}
          bind:this={inputElement}
          class="font-outfit"
        />
        <div class="esc-hint font-mono">ESC</div>
      </div>

      <div class="results-list">
        {#each results as result, i}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <div 
            class="result-item" 
            class:selected={i === selectedIndex}
            onmouseenter={() => selectedIndex = i}
            onclick={() => executeAction(result)}
          >
            <div class="result-icon">
              {#if result.type === 'SECTOR'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              {:else}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
            </div>
            <div class="result-content">
              <div class="result-title font-outfit">{result.title}</div>
              <div class="result-sector font-mono">{result.sector.toUpperCase()}</div>
            </div>
          </div>
        {/each}
        {#if results.length === 0}
          <div class="no-results font-outfit">NO MATCHING COMMANDS FOUND</div>
        {/if}
      </div>

      <div class="palette-footer">
        <div class="shortcut-item">
          <span class="key font-mono">↑↓</span>
          <span class="label font-inter">NAVIGATE</span>
        </div>
        <div class="shortcut-item">
          <span class="key font-mono">ENTER</span>
          <span class="label font-inter">EXECUTE</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    padding-top: 20vh;
    z-index: 10000;
  }

  .palette-container {
    width: 600px;
    max-height: 400px;
    background: rgba(13, 15, 30, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-icon {
    filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.5));
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 16px;
    letter-spacing: 0.5px;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  .esc-hint {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .results-list::-webkit-scrollbar {
    width: 4px;
  }

  .results-list::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 4px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .result-item.selected {
    background: rgba(139, 92, 246, 0.15);
    box-shadow: inset 0 0 10px rgba(139, 92, 246, 0.1);
  }

  .result-icon {
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.4);
  }

  .result-item.selected .result-icon {
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
  }

  .result-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .result-title {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
  }

  .result-item.selected .result-title {
    color: #ffffff;
  }

  .result-sector {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.25);
    letter-spacing: 0.5px;
  }

  .no-results {
    padding: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.2);
    font-size: 12px;
    letter-spacing: 1px;
  }

  .palette-footer {
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    gap: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .key {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 4px;
    border-radius: 2px;
  }

  .label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.25);
    letter-spacing: 0.5px;
  }
</style>
