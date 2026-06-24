<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine.js';

  let {
    activeFilter = $bindable('ALL'),
    searchVal = $bindable(''),
    isAscending = $bindable(true),
    activeSort = $bindable('By Creation Time (Default)'),
    filters = [
      { id: 'ALL', count: 0 },
      { id: 'HIGH', count: 0 },
      { id: 'MED', count: 0 },
      { id: 'LOW', count: 0 }
    ],
    mode = 'execution'   // 'execution' | 'arsenal'
  } = $props();

  let showDropdown = $state(false);

  // Sort options differ per mode
  let sortOptions = $derived(
    mode === 'arsenal'
      ? [
          { label: 'By Creation Time (Default)', icon: 'clock' },
          { label: 'By Modification Date', icon: 'edit',    hint: 'Last name/tag/priority change' },
          { label: 'By Name',               icon: 'az' },
        ]
      : [
          { label: 'By Creation Time (Default)', icon: 'clock' },
          { label: 'By Initiation Time',          icon: 'init',    hint: 'When deadline was assigned' },
          { label: 'By Deadline',                 icon: 'calendar' },
          { label: 'By Modification Date',        icon: 'edit',    hint: 'Last subtask add/remove/done' },
          { label: 'By Name',                     icon: 'az' },
          { label: 'Show Rescheduled Tasks Only',  icon: 'refresh' },
        ]
  );

  const toggleSortDirection = () => {
    isAscending = !isAscending;
    AudioEngine.play('ui-click');
  };
</script>

<!-- Full Filter Bar Shell -->
<div class="filter-bar-shell">

  <!-- Glassmorphic Bar Container -->
  <div class="filter-bar">

    <!-- ── Left: Priority Toggle Group ─────────────── -->
    <div class="toggle-group">
      {#each filters as filter}
        <button 
          class="tactical-btn tactical-btn-{filter.id.toLowerCase()}" 
          class:active={activeFilter === filter.id}
          onclick={() => { AudioEngine.play('ui-click'); activeFilter = filter.id; }}
        >
          <!-- Icon with hard-coded priority colour -->
          <span class="btn-icon">
            {#if filter.id === 'ALL'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            {:else if filter.id === 'HIGH'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53224 19 5.07183 19Z" stroke="#ff2d55" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {:else if filter.id === 'MED'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#ffb800" stroke-width="2.5"/>
                <circle cx="12" cy="12" r="3" stroke="#ffb800" stroke-width="2.5"/>
                <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#ffb800" stroke-width="2" stroke-linecap="round"/>
              </svg>
            {:else if filter.id === 'LOW'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#00ff9f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 11L11 13L15 9" stroke="#00ff9f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {/if}
          </span>

          <span class="btn-label">{filter.id}</span>

          <!-- Count badge -->
          <span class="badge">{filter.count}</span>

          <!-- Active indicator bar -->
          {#if activeFilter === filter.id}
            <span class="active-bar"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- ── Center: Search ───────────────────────────── -->
    <div class="search-container">
      <div class="search-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <input 
        type="text" 
        placeholder="SEARCH MISSIONS..." 
        bind:value={searchVal}
        class="tactical-input"
        id="execution-search"
      />
      {#if searchVal !== ''}
        <button class="clear-btn" onclick={() => { searchVal = ''; AudioEngine.play('ui-click'); }} aria-label="Clear search">
          <!-- Slash-light sweep -->
          <span class="clear-slash"></span>
          <svg class="clear-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </button>
      {/if}
    </div>

    <!-- ── Right: Sort Controls ─────────────────────── -->
    <div class="sort-container">
      <div class="dropdown-wrapper">
        <button class="sort-select-btn" id="sort-toggle-btn" onclick={() => showDropdown = !showDropdown}>
          <svg class="sort-icon-lead" width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H21M6 12H18M10 18H14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <span class="sort-prefix">SORT</span>
          <span class="sort-value">{activeSort}</span>
          <svg class="chevron-icon" class:open={showDropdown} width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        {#if showDropdown}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="sort-dropdown" onmouseleave={() => showDropdown = false}>
            <div class="dropdown-header">INTELLIGENCE SORT PROTOCOL</div>
            {#each sortOptions as item}
              <button 
                class="dropdown-item"
                class:selected={activeSort === item.label}
                onclick={() => { AudioEngine.play('ui-click'); activeSort = item.label; showDropdown = false; }}
              >
                <span class="di-icon">
                  {#if item.icon === 'clock'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {:else if item.icon === 'init'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>
                  {:else if item.icon === 'calendar'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {:else if item.icon === 'edit'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {:else if item.icon === 'az'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4M20 4v16M4 4l16 16M4 20l16-16"/></svg>
                  {:else if item.icon === 'refresh'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  {/if}
                </span>
                <span class="di-label">
                  {item.label}
                  {#if item.hint}
                    <span class="di-hint">{item.hint}</span>
                  {/if}
                </span>
                {#if activeSort === item.label}
                  <span class="di-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17L4 12"/></svg>
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Sort Direction Toggle -->
      <button 
        class="direction-btn" 
        onclick={toggleSortDirection} 
        title={isAscending ? "Ascending" : "Descending"}
        aria-label="Toggle Sort Direction"
        id="sort-direction-btn"
      >
        <svg 
          class="sort-dir-icon" 
          class:descending={!isAscending}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 4H16M3 10H12M3 16H8M19 6V20M19 20L16 17M19 20L22 17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="dir-label">{isAscending ? 'ASC' : 'DESC'}</span>
      </button>
    </div>
  </div>
</div>

<style>
  /* ─── Shell ─────────────────────────────────────────── */
  .filter-bar-shell {
    width: 100%;
    position: relative;
    z-index: 10;
    margin-bottom: 6px;
  }

  /* ─── Main Bar ────────────────────────────────────────  */
  .filter-bar {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 12px 0; /* Zero left/right padding so corner buttons align flush with page boundaries */
    box-sizing: border-box;
    position: relative;
    background: transparent;
    border: none;
  }

  /* ─── Left: Toggle Group ─────────────────────────────── */
  .toggle-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  /* ── ALL button ───────────────────────────────────────── */
  .tactical-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 900;
    font-size: 15px;
    letter-spacing: 0.18em;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    overflow: hidden;
  }

  /* Specular inner highlight top edge */
  .tactical-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    border-radius: inherit;
  }

  /* Hover glow sweep */
  .tactical-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: inherit;
    pointer-events: none;
  }

  .tactical-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  .tactical-btn:hover::after { opacity: 1; }

  /* ── ALL Active ───────────────── */
  .tactical-btn.active {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.32) 0%, rgba(109, 40, 217, 0.22) 100%);
    border-color: rgba(139, 92, 246, 0.9);
    box-shadow:
      0 0 28px rgba(139, 92, 246, 0.5),
      0 0 10px rgba(139, 92, 246, 0.35),
      inset 0 1px 0 rgba(255,255,255,0.18);
    transform: translateY(-2px);
    animation: btnPulseAll 3s ease-in-out infinite;
  }

  @keyframes btnPulseAll {
    0%, 100% { box-shadow: 0 0 28px rgba(139,92,246,0.5), 0 0 10px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
    50%       { box-shadow: 0 0 40px rgba(139,92,246,0.7), 0 0 18px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
  }

  /* ── HIGH Active ─────────────── */
  .tactical-btn.active.tactical-btn-high {
    background: linear-gradient(135deg, rgba(255, 45, 85, 0.28) 0%, rgba(200, 20, 60, 0.18) 100%);
    border-color: rgba(255, 45, 85, 0.92);
    box-shadow:
      0 0 32px rgba(255, 45, 85, 0.55),
      0 0 12px rgba(255, 45, 85, 0.35),
      inset 0 1px 0 rgba(255,255,255,0.15);
    animation: btnPulseHigh 3s ease-in-out infinite;
  }

  @keyframes btnPulseHigh {
    0%, 100% { box-shadow: 0 0 32px rgba(255,45,85,0.55), 0 0 12px rgba(255,45,85,0.35), inset 0 1px 0 rgba(255,255,255,0.15); }
    50%       { box-shadow: 0 0 48px rgba(255,45,85,0.75), 0 0 20px rgba(255,45,85,0.55), inset 0 1px 0 rgba(255,255,255,0.25); }
  }

  /* ── MED Active ──────────────── */
  .tactical-btn.active.tactical-btn-med {
    background: linear-gradient(135deg, rgba(255, 184, 0, 0.26) 0%, rgba(200, 140, 0, 0.16) 100%);
    border-color: rgba(255, 184, 0, 0.9);
    box-shadow:
      0 0 32px rgba(255, 184, 0, 0.5),
      0 0 12px rgba(255, 184, 0, 0.32),
      inset 0 1px 0 rgba(255,255,255,0.15);
    animation: btnPulseMed 3s ease-in-out infinite;
  }

  @keyframes btnPulseMed {
    0%, 100% { box-shadow: 0 0 32px rgba(255,184,0,0.5), 0 0 12px rgba(255,184,0,0.32), inset 0 1px 0 rgba(255,255,255,0.15); }
    50%       { box-shadow: 0 0 48px rgba(255,184,0,0.7), 0 0 20px rgba(255,184,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
  }

  /* ── LOW Active ──────────────── */
  .tactical-btn.active.tactical-btn-low {
    background: linear-gradient(135deg, rgba(0, 255, 159, 0.22) 0%, rgba(0, 200, 120, 0.14) 100%);
    border-color: rgba(0, 255, 159, 0.88);
    box-shadow:
      0 0 32px rgba(0, 255, 159, 0.45),
      0 0 12px rgba(0, 255, 159, 0.28),
      inset 0 1px 0 rgba(255,255,255,0.15);
    animation: btnPulseLow 3s ease-in-out infinite;
  }

  @keyframes btnPulseLow {
    0%, 100% { box-shadow: 0 0 32px rgba(0,255,159,0.45), 0 0 12px rgba(0,255,159,0.28), inset 0 1px 0 rgba(255,255,255,0.15); }
    50%       { box-shadow: 0 0 48px rgba(0,255,159,0.65), 0 0 20px rgba(0,255,159,0.45), inset 0 1px 0 rgba(255,255,255,0.25); }
  }

  /* ── Color-coded icons when inactive (hover tint) ─── */
  .tactical-btn-high:hover { border-color: rgba(255, 45, 85, 0.5); color: rgba(255, 45, 85, 0.9); }
  .tactical-btn-med:hover  { border-color: rgba(255, 184, 0, 0.5); color: rgba(255, 184, 0, 0.9); }
  .tactical-btn-low:hover  { border-color: rgba(0, 255, 159, 0.45); color: rgba(0, 255, 159, 0.85); }
  .tactical-btn-all:hover  { border-color: rgba(139, 92, 246, 0.5); color: rgba(200, 160, 255, 0.95); }

  /* Active bottom bar indicator */
  .active-bar {
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 3px;
    border-radius: 3px 3px 0 0;
    filter: blur(0.5px);
  }

  .tactical-btn.active.tactical-btn-all .active-bar  { background: rgba(139,92,246,1); box-shadow: 0 0 8px rgba(139,92,246,0.8); }
  .tactical-btn.active.tactical-btn-high .active-bar { background: var(--critical-alert); box-shadow: 0 0 8px rgba(255,45,85,0.8); }
  .tactical-btn.active.tactical-btn-med .active-bar  { background: var(--warning-amber); box-shadow: 0 0 8px rgba(255,184,0,0.8); }
  .tactical-btn.active.tactical-btn-low .active-bar  { background: var(--secure-status); box-shadow: 0 0 8px rgba(0,255,159,0.8); }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-label {
    text-transform: uppercase;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  /* ── Color-coded badge circles ─────────────────────────── */
  .badge {
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 11px;
    font-weight: 800;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 50px;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0;
    border: 1.5px solid rgba(255,255,255,0.12);
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.07);
    transition: all 0.3s ease;
  }

  /* ALL active badge — purple */
  .tactical-btn-all.active .badge {
    background: rgba(139, 92, 246, 0.4);
    color: #d8b4fe;
    border-color: rgba(139, 92, 246, 0.7);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.9);
  }

  /* HIGH active badge — red */
  .tactical-btn-high.active .badge {
    background: rgba(255, 45, 85, 0.35);
    color: #ffa0b4;
    border-color: rgba(255, 45, 85, 0.7);
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.55);
    text-shadow: 0 0 8px rgba(255, 45, 85, 0.9);
  }

  /* MED active badge — amber */
  .tactical-btn-med.active .badge {
    background: rgba(255, 184, 0, 0.3);
    color: #fde68a;
    border-color: rgba(255, 184, 0, 0.65);
    box-shadow: 0 0 10px rgba(255, 184, 0, 0.5);
    text-shadow: 0 0 8px rgba(255, 184, 0, 0.9);
  }

  /* LOW active badge — green */
  .tactical-btn-low.active .badge {
    background: rgba(0, 255, 159, 0.25);
    color: #6ee7b7;
    border-color: rgba(0, 255, 159, 0.6);
    box-shadow: 0 0 10px rgba(0, 255, 159, 0.45);
    text-shadow: 0 0 8px rgba(0, 255, 159, 0.9);
  }

  /* ─── Center: Search ─────────────────────────────────── */
  .search-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
  }


  .search-icon {
    position: absolute;
    left: 14px;
    z-index: 2;
    color: rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    pointer-events: none;
    transition: color 0.3s ease;
  }

  .search-container:focus-within .search-icon {
    color: rgba(139, 92, 246, 0.8);
  }

  .tactical-input {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 46px;
    padding: 0 44px 0 42px;
    background: rgba(0, 0, 0, 0.35);
    /* Single clean border only — no double glow ring */
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    border-radius: 11px;
    color: #ffffff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.1em;
    outline: none;
    box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.35);
    transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    box-sizing: border-box;
  }

  .tactical-input::placeholder {
    color: rgba(255, 255, 255, 0.28);
    letter-spacing: 0.12em;
    font-size: 13px;
    font-weight: 700;
  }

  /* On focus: border colour changes, NO extra ring/outline */
  .tactical-input:focus {
    border-color: rgba(139, 92, 246, 0.7);
    background: rgba(80, 30, 180, 0.08);
    box-shadow:
      inset 0 2px 12px rgba(0, 0, 0, 0.3),
      0 0 24px rgba(139, 92, 246, 0.18);
  }

  .clear-btn {
    position: absolute;
    right: 12px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    /* Constant gradient theme */
    background: linear-gradient(135deg, rgba(200, 40, 80, 0.55) 0%, rgba(139, 30, 60, 0.45) 50%, rgba(255, 60, 100, 0.38) 100%);
    border: 2px solid rgba(255, 45, 85, 0.55);
    border-radius: 8px;
    color: rgba(255, 140, 160, 0.95);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 0 12px rgba(255, 45, 85, 0.25), inset 0 1px 0 rgba(255,255,255,0.1);
  }

  /* Slash-light sweep element */
  .clear-slash {
    position: absolute;
    top: -50%;
    left: -80%;
    width: 40%;
    height: 200%;
    background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);
    transform: skewX(-20deg);
    animation: slashSweep 2.8s ease-in-out infinite;
    pointer-events: none;
    border-radius: 2px;
  }

  @keyframes slashSweep {
    0%   { left: -80%; opacity: 0; }
    15%  { opacity: 1; }
    50%  { left: 160%; opacity: 1; }
    55%  { opacity: 0; }
    100% { left: 160%; opacity: 0; }
  }

  .clear-icon {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .clear-btn:hover {
    background: linear-gradient(135deg, rgba(255, 45, 85, 0.75) 0%, rgba(200, 30, 70, 0.65) 50%, rgba(255, 80, 110, 0.6) 100%);
    border-color: rgba(255, 45, 85, 0.9);
    color: #ffffff;
    box-shadow: 0 0 22px rgba(255, 45, 85, 0.55), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: scale(1.08);
  }

  /* 90° rotation of the × icon on hover */
  .clear-btn:hover .clear-icon {
    transform: rotate(90deg);
  }

  /* ─── Right: Sort Controls ───────────────────────────── */
  .sort-container {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .dropdown-wrapper {
    position: relative;
  }

  .sort-select-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 46px;
    padding: 0 18px;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-radius: 11px;
    color: rgba(255, 255, 255, 0.88);
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 0.1em;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    white-space: nowrap;
  }

  .sort-select-btn:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.35);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }

  .sort-icon-lead {
    color: rgba(139, 92, 246, 0.7);
    flex-shrink: 0;
  }

  .sort-prefix {
    color: rgba(255, 255, 255, 0.55);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2em;
  }

  .sort-value {
    color: rgba(190, 155, 255, 1);
    text-shadow: 0 0 16px rgba(139, 92, 246, 0.7);
    font-size: 14px;
    font-weight: 900;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron-icon {
    color: rgba(255,255,255,0.4);
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }
  .chevron-icon.open { transform: rotate(180deg); }

  /* ─── Dropdown ────────────────────────────────────────── */
  .sort-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 300px;
    background: linear-gradient(
      145deg,
      rgba(20, 12, 45, 0.97) 0%,
      rgba(10, 8, 25, 0.97) 100%
    );
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: 14px;
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.8),
      0 0 40px rgba(109, 40, 217, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    z-index: 200;
    padding: 10px;
    animation: dropSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes dropSlide {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .dropdown-header {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.22em;
    color: rgba(139, 92, 246, 0.75);
    padding: 4px 12px 10px;
    border-bottom: 2px solid rgba(139, 92, 246, 0.18);
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.82);
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 8px;
    text-align: left;
    position: relative;
    letter-spacing: 0.05em;
  }

  .dropdown-item:hover {
    background: rgba(139, 92, 246, 0.12);
    color: #fff;
    padding-left: 18px;
  }

  .dropdown-item.selected {
    background: rgba(139, 92, 246, 0.18);
    color: #fff;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  .di-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: rgba(139, 92, 246, 0.65);
    transition: color 0.2s ease;
  }
  .dropdown-item:hover .di-icon,
  .dropdown-item.selected .di-icon {
    color: rgba(139, 92, 246, 1);
  }

  .di-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .di-hint {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgba(139,92,246,0.5);
    text-transform: uppercase;
  }

  .di-check {
    display: flex;
    align-items: center;
    color: rgba(139, 92, 246, 0.9);
    margin-left: auto;
  }

  /* ─── Direction Button ───────────────────────────────── */
  .direction-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 44px;
    /* Fixed width so DESC never overflows */
    width: 88px;
    flex-shrink: 0;
    padding: 0;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }

  .direction-btn:hover {
    background: rgba(139, 92, 246, 0.14);
    border-color: rgba(139, 92, 246, 0.55);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 18px rgba(0,0,0,0.35), 0 0 14px rgba(139,92,246,0.2);
  }

  .sort-dir-icon {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
  }
  .sort-dir-icon.descending {
    transform: scaleY(-1);
  }

  .dir-label {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.14em;
    min-width: 34px;
    text-align: left;
  }
</style>
