<script lang="ts">
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';
  import { isNeuralUplinkOpen, neuralUplinkLogs, loadNeuralUplinkLogs, editingEntry, editingEntryIndex, neuralUplinkDraft } from '../../../../core/store';
  import ImprovementActionBar from './ImprovementActionBar.svelte';
  import ImprovementFilterBar from './ImprovementFilterBar.svelte';

  // Filters State
  let filterIntent = $state('');
  let filterAgency = $state('');
  let filterVector = $state('');
  let filterSector = $state('');
  let showResolvedOnly = $state(false);
  let sortBy = $state<'creation' | 'resolution' | 'name'>('creation');

  // Staged for batch operations (selection set of timestamps)
  let selectedTimestamps = $state(new Set<string>());

  onMount(() => {
    loadNeuralUplinkLogs();
  });

  // Helper to extract L1 sector name
  function getSectorFromPath(path: string) {
    if (!path || path === 'Matrix Undefined') return 'UNDEFINED';
    const parts = path.split('/');
    if (parts[1] === 'App.svelte') return 'GLOBAL';
    if (parts[1] === 'components') return 'COMPONANTES';
    if (parts[1] === 'sectors') {
      if (parts[2] === 'StratagemHub') return 'DATABASE STATION';
      return parts[2].toUpperCase();
    }
    return 'UNDEFINED';
  }

  // Filtered and sorted logs
  let filteredLogs = $derived.by(() => {
    let list = [...$neuralUplinkLogs];

    // Filter by Resolved
    list = list.filter(log => {
      const isResolved = !!log.resolved;
      return showResolvedOnly ? isResolved : !isResolved;
    });

    // Filter by Intent
    if (filterIntent) {
      list = list.filter(log => log.category === filterIntent);
    }

    // Filter by Agency
    if (filterAgency) {
      list = list.filter(log => log.agency === filterAgency);
    }

    // Filter by Vector
    if (filterVector) {
      list = list.filter(log => log.vector === filterVector);
    }

    // Filter by Sector
    if (filterSector) {
      list = list.filter(log => getSectorFromPath(log.location) === filterSector);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'creation') {
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      } else if (sortBy === 'resolution') {
        return (b.resolved_at || '').localeCompare(a.resolved_at || '');
      } else {
        return (a.content || '').localeCompare(b.content || '');
      }
    });

    return list;
  });

  // Count of selected items among the filtered logs
  let selectedCount = $derived.by(() => {
    let count = 0;
    for (const log of filteredLogs) {
      if (selectedTimestamps.has(log.timestamp)) {
        count++;
      }
    }
    return count;
  });

  function handleToggleSelect(timestamp: string) {
    if (selectedTimestamps.has(timestamp)) {
      selectedTimestamps.delete(timestamp);
    } else {
      selectedTimestamps.add(timestamp);
    }
    selectedTimestamps = new Set(selectedTimestamps); // trigger reactivity
  }

  function handleToggleSelectAll() {
    const allStaged = filteredLogs.every(log => selectedTimestamps.has(log.timestamp));
    if (allStaged) {
      // Unselect all filtered
      for (const log of filteredLogs) {
        selectedTimestamps.delete(log.timestamp);
      }
    } else {
      // Select all filtered
      for (const log of filteredLogs) {
        selectedTimestamps.add(log.timestamp);
      }
    }
    selectedTimestamps = new Set(selectedTimestamps);
  }

  function getStagedLogs() {
    return filteredLogs.filter(log => selectedTimestamps.has(log.timestamp));
  }

  function formatLogForExport(log: any) {
    const intentStr = log.category && log.category !== 'Matrix Undefined' ? log.category.toUpperCase() : '';
    const agencyStr = log.agency && log.agency !== 'Undefined' ? `{${log.agency.toUpperCase()}}` : '';
    const vectorStr = log.vector && log.vector !== 'Undefined' ? `{${log.vector}}` : '';
    const fileStr = log.location && log.location !== 'Matrix Undefined' ? `@${log.location}` : '';

    const parts = [];
    if (intentStr) parts.push(intentStr);
    if (agencyStr) parts.push(agencyStr);
    if (vectorStr) parts.push(vectorStr);
    if (fileStr) parts.push(fileStr);

    const promptLineText = `{${parts.join(' - ')}}`;
    return `${promptLineText}\n\n${log.content}`;
  }

  function handleCopyStaged() {
    const staged = getStagedLogs();
    if (staged.length === 0) return;

    const formattedText = staged.map(formatLogForExport).join('\n\n---\n\n');

    navigator.clipboard.writeText(formattedText).then(() => {
      AudioEngine.play('data-lock');
    });
  }

  function handleExportStaged() {
    const staged = getStagedLogs();
    if (staged.length === 0) return;

    const formattedMarkdown = staged.map(formatLogForExport).join('\n\n---\n\n');

    const blob = new Blob([formattedMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Realignment_Protocols_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleResolveOrClearStaged() {
    const staged = getStagedLogs();
    if (staged.length === 0) return;

    let updatedList = [...$neuralUplinkLogs];

    if (showResolvedOnly) {
      // PURGE: Delete permanently
      const timestampsToPurge = new Set(staged.map(l => l.timestamp));
      updatedList = updatedList.filter(l => !timestampsToPurge.has(l.timestamp));
    } else {
      // RESOLVE: Mark as resolved
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const stagedTimestamps = new Set(staged.map(l => l.timestamp));
      updatedList = updatedList.map(l => {
        if (stagedTimestamps.has(l.timestamp)) {
          return {
            ...l,
            resolved: true,
            resolved_at: nowStr
          };
        }
        return l;
      });
    }

    if (window.stratagemAPI) {
      try {
        const result = await window.stratagemAPI.intelWriteQuotes('improvements.json', JSON.stringify(updatedList, null, 2));
        if (result && result.success) {
          selectedTimestamps = new Set();
          loadNeuralUplinkLogs();
        }
      } catch (err) {
        console.error("Resolve/Purge write failed:", err);
      }
    } else {
      selectedTimestamps = new Set();
      neuralUplinkLogs.set(updatedList);
    }
  }

  async function handleOpenEdit(log: any) {
    AudioEngine.play('data-lock');

    // Auto-save suspended draft if there is content in the modal
    if ($neuralUplinkDraft && $neuralUplinkDraft.content && $neuralUplinkDraft.content.trim() !== '') {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newLog = {
        timestamp: $editingEntry ? $editingEntry.timestamp : nowStr,
        category: $neuralUplinkDraft.category,
        agency: $neuralUplinkDraft.agency,
        location: $neuralUplinkDraft.location,
        priority: $neuralUplinkDraft.priority,
        tolerance: $neuralUplinkDraft.tolerance,
        operator: $neuralUplinkDraft.operator,
        content: $neuralUplinkDraft.content,
        vector: $neuralUplinkDraft.vector,
        resolved: $editingEntry ? $editingEntry.resolved : false,
        resolved_at: $editingEntry ? $editingEntry.resolved_at : null
      };

      let updatedLogs = [...$neuralUplinkLogs];
      if ($editingEntryIndex !== -1) {
        updatedLogs[$editingEntryIndex] = newLog;
      } else {
        if (!updatedLogs.some(l => l.timestamp === newLog.timestamp)) {
          updatedLogs = [newLog, ...updatedLogs];
        }
      }

      if (window.stratagemAPI) {
        try {
          await window.stratagemAPI.intelWriteQuotes('improvements.json', JSON.stringify(updatedLogs, null, 2));
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      } else {
        neuralUplinkLogs.set(updatedLogs);
      }

      // Reset the draft store
      neuralUplinkDraft.set({
        category: 'Matrix Undefined',
        agency: 'Undefined',
        vector: 'Undefined',
        location: 'Matrix Undefined',
        priority: 'ELEVATED',
        tolerance: 'STRICT',
        operator: 'ANTIGRAVITY',
        content: ''
      });
    }

    $editingEntry = log;
    $editingEntryIndex = $neuralUplinkLogs.indexOf(log);
    $isNeuralUplinkOpen = true;

    await loadNeuralUplinkLogs();
  }

  function toggleResolvedOnly() {
    showResolvedOnly = !showResolvedOnly;
    if (!showResolvedOnly && sortBy === 'resolution') {
      sortBy = 'creation';
    }
  }

  // Header hover state
  let isHeaderHovered = $state(false);
</script>

<div class="improvement-panel glass-container" in:fade={{ duration: 120 }} out:fade={{ duration: 60 }}>
  <!-- Top Tech Header -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="panel-header" onmouseenter={() => { isHeaderHovered = true; AudioEngine.play('ui-hover'); }} onmouseleave={() => isHeaderHovered = false}>
    <div class="live-icon improvement-icon" class:acquired={isHeaderHovered}>
      <svg viewBox="0 0 100 100" class="svg-anim">
        <defs>
          <linearGradient id="plant-grad-stem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00ff9f" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <linearGradient id="plant-grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#ff2d55" />
          </linearGradient>
          <linearGradient id="plant-grad-violet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#d946ef" />
          </linearGradient>
          <linearGradient id="plant-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00ffff" />
            <stop offset="100%" stop-color="#3b82f6" />
          </linearGradient>
          <linearGradient id="ring-grad-multi" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00ff9f" />
            <stop offset="33%" stop-color="#ec4899" />
            <stop offset="66%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#00ffff" />
          </linearGradient>
        </defs>

        <!-- Multi-Layered Rotating Tactical Rings -->
        {#if !$isNeuralUplinkOpen}
          <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ring-grad-multi)" stroke-width="2.5" stroke-dasharray="1 5" class="spin-cw-fast" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0, 255, 159, 0.4)" stroke-width="4" stroke-dasharray="15 10" class="spin-cw-slow" />
          <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(236, 72, 153, 0.35)" stroke-width="3.5" stroke-dasharray="4 8" class="spin-ccw-fast" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(139, 92, 246, 0.25)" stroke-width="1.5" stroke-dasharray="80 100" class="spin-cw-slow" />
        {/if}

        <!-- High-Fidelity Living Plant System -->
        <g class="plant-root-system" class:growing={isHeaderHovered}>
          <!-- Ground Base -->
          <path d="M 20 85 Q 50 80 80 85" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round" opacity="0.8" />
          
          <!-- Thick Textured Stem -->
          <path d="M 50 82 C 50 60, 55 45, 45 25" fill="none" stroke="url(#plant-grad-stem)" stroke-width="7" stroke-linecap="round" class="stem-growth-path" />
          
          <!-- Lush Animated Leaf Canopy -->
          <g class="leaf-assembly">
            <!-- Top Primary Pink Leaf -->
            <path d="M 45 25 C 20 10, 10 40, 45 35 Z" fill="url(#plant-grad-pink)" class="leaf-flutter-1" />
            
            <!-- Mid-Left Violet Leaf -->
            <path d="M 48 45 C 25 35, 20 60, 48 55 Z" fill="url(#plant-grad-violet)" class="leaf-flutter-3" />
            
            <!-- Mid-Right Cyan Leaf -->
            <path d="M 52 55 C 75 45, 80 70, 52 65 Z" fill="url(#plant-grad-cyan)" class="leaf-flutter-4" />
            
            <!-- Bottom Green Sprout Leaf -->
            <path d="M 48 70 C 65 60, 75 90, 48 80 Z" fill="#00ff9f" class="leaf-flutter-2" />
          </g>

          <!-- Evolutionary Energy Core -->
          <circle cx="45" cy="25" r="6" fill="#ffffff" class="pulse-tip-energy" />
        </g>
      </svg>
    </div>
    
    <!-- Title Group -->
    <div class="title-group-animated" class:acquired={isHeaderHovered}>
      <div class="title-fui-shell">
        <h1 class="forge-title font-outfit">REALIGNMENT MODULE</h1>
        <div class="title-laser-bar"></div>
      </div>
    </div>
  </div>

  <div class="improvement-content">
    <!-- Action Bar -->
    <ImprovementActionBar 
      selectedCount={selectedCount}
      totalCount={filteredLogs.length}
      resolvedFilterActive={showResolvedOnly}
      onToggleSelectAll={handleToggleSelectAll}
      onCopy={handleCopyStaged}
      onExport={handleExportStaged}
      onResolveOrClear={handleResolveOrClearStaged}
      onLaunchUplink={() => { AudioEngine.play('data-lock'); $isNeuralUplinkOpen = true; loadNeuralUplinkLogs(); }}
    />

    <!-- Filter Bar -->
    <ImprovementFilterBar 
      filterIntent={filterIntent}
      filterAgency={filterAgency}
      filterVector={filterVector}
      filterSector={filterSector}
      showResolvedOnly={showResolvedOnly}
      sortBy={sortBy}
      setIntent={(v) => filterIntent = v}
      setAgency={(v) => filterAgency = v}
      setVector={(v) => filterVector = v}
      setSector={(v) => filterSector = v}
      toggleResolvedOnly={toggleResolvedOnly}
      setSortBy={(v) => sortBy = v}
    />

    <!-- Realignment Protocols Card Listing -->
    <div class="cards-viewport scrollable-content">
      {#each filteredLogs as log (log.timestamp)}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="entry-card" onclick={() => handleOpenEdit(log)}>
          <!-- Checkbox column -->
          <div class="card-checkbox-cell" onclick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox" 
              class="cyber-checkbox" 
              checked={selectedTimestamps.has(log.timestamp)}
              onchange={() => handleToggleSelect(log.timestamp)}
            />
          </div>

          <!-- Main Card Content -->
          <div class="card-main">
            <!-- 1st line: Timestamp -->
            <div class="card-meta">
              <span class="meta-label">RECORDED AT:</span>
              <span class="meta-val">{log.timestamp}</span>
              {#if log.resolved && log.resolved_at}
                <span class="meta-separator font-mono">|</span>
                <span class="meta-label">RESOLVED AT:</span>
                <span class="meta-val">{log.resolved_at}</span>
              {/if}
            </div>

            <!-- 2nd line: Formula Intent - Agency - Vector - Sector -->
            <div class="card-formula">
              <span class="formula-badge badge-intent" class:intent-bug={log.category === 'FIX BUG'} class:intent-enhance={log.category === 'ENHANCE EXISTING FEATURE'} class:intent-new={log.category === 'NEW IMPLEMENTATION'}>
                {log.category.toUpperCase()}
              </span>
              <span class="formula-separator font-mono">⧽</span>
              <span class="formula-badge badge-agency" class:agency-strict={log.agency === 'Strict Compliance'} class:agency-mod={log.agency === 'Moderate Editing'} class:agency-creative={log.agency === 'Creative Autonomy'}>
                {(log.agency || 'Undefined').toUpperCase()}
              </span>
              <span class="formula-separator font-mono">⧽</span>
              <span class="formula-badge badge-vector" class:vector-ui={log.vector?.includes('UI')} class:vector-ux={log.vector?.includes('UX')}>
                {(log.vector || 'Undefined').toUpperCase()}
              </span>
              <span class="formula-separator font-mono">⧽</span>
              <span class="formula-badge badge-sector">
                {getSectorFromPath(log.location)}
              </span>
            </div>

            <!-- 3rd line: Target Path/File -->
            <div class="card-target">
              <span class="target-label">LOCATOR:</span>
              <span class="target-path">{log.location === 'Matrix Undefined' ? 'UNDEFINED' : `@${log.location}`}</span>
            </div>

            <!-- 4th line: Truncated Comment -->
            <div class="card-comment-preview">
              <span class="comment-label">INTEL:</span>
              <span class="comment-text">{log.content}</span>
            </div>
          </div>
        </div>
      {:else}
        <div class="no-entries-card font-mono">
          NO ACTIVE PROTOCOLS DEPLOYED FOR THE TARGET FILTERS.
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .improvement-panel {
    width: 100%;
    height: 100%;
    max-height: 100%;
    padding: 30px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 34px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      0 12px 30px rgba(0, 0, 0, 0.75);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    height: 64px;
    box-sizing: border-box;
    margin-bottom: 24px;
    position: relative;
    user-select: none;
    outline: none;
  }

  @keyframes title-laser-sweep {
    0% { left: -100%; opacity: 0; }
    30% { opacity: 1; }
    70% { opacity: 1; }
    100% { left: 100%; opacity: 0; }
  }

  .title-laser-bar {
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 100%;
    height: 1.5px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }
  .title-laser-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #8b5cf6, #00ffff, transparent);
    animation: title-laser-sweep 4s infinite linear;
  }

  @keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
  }

  @keyframes sheenSweep {
    0% { transform: translateX(-150%) skewX(-25deg); }
    100% { transform: translateX(150%) skewX(-25deg); }
  }

  .live-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 8px var(--glow-color, #ec4899));
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease, background 0.3s ease;
    background: transparent;
    border: none;
    border-radius: 50%;
    box-shadow: none;
    overflow: visible !important;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .live-icon:hover {
    transform: scale(1.2) rotate(20deg);
    filter: drop-shadow(0 0 12px #ec4899);
    background: radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%);
  }
  .live-icon.acquired {
    transform: scale(1.15) rotate(15deg);
    filter: drop-shadow(0 0 12px #ec4899);
    background: radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%);
  }

  .improvement-icon {
    --glow-color: #ec4899;
  }

  .svg-anim {
    width: 100%;
    height: 100%;
  }

  .spin-cw-fast {
    transform-origin: 50px 50px;
    animation: spinCW 10s linear infinite;
  }

  .spin-cw-slow {
    transform-origin: 50px 50px;
    animation: spinCW 25s linear infinite;
  }

  .spin-ccw-fast {
    transform-origin: 50px 50px;
    animation: spinCCW 15s linear infinite;
  }

  @keyframes spinCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spinCCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }

  .plant-root-system {
    transform-origin: 50px 85px;
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .plant-root-system.growing {
    transform: scale(1.2) translateY(-4px);
    filter: drop-shadow(0 0 15px #00ff9f) drop-shadow(0 0 5px #ec4899);
  }

  .stem-growth-path {
    stroke-dasharray: 120;
    stroke-dashoffset: 120;
    animation: drawStem 2.5s forwards cubic-bezier(0.4, 0, 0.2, 1);
  }

  .leaf-flutter-1 { transform-origin: 45px 25px; animation: leafFlutter 2.5s infinite ease-in-out; }
  .leaf-flutter-2 { transform-origin: 48px 70px; animation: leafFlutter 3s infinite ease-in-out 0.5s; }
  .leaf-flutter-3 { transform-origin: 48px 45px; animation: leafFlutter 3.5s infinite ease-in-out 1s; }
  .leaf-flutter-4 { transform-origin: 52px 55px; animation: leafFlutter 2.8s infinite ease-in-out 0.2s reverse; }

  .pulse-tip-energy {
    animation: tipEnergyGlow 1s infinite alternate ease-in-out;
  }

  @keyframes drawStem {
    to { stroke-dashoffset: 0; }
  }

  @keyframes leafFlutter {
    0%, 100% { transform: rotate(0deg) scale(1); filter: brightness(1); }
    50% { transform: rotate(12deg) scale(1.12); filter: brightness(1.4); }
  }

  @keyframes tipEnergyGlow {
    0% { opacity: 0.3; filter: blur(3px) drop-shadow(0 0 2px #fff); transform: scale(0.8); }
    100% { opacity: 1; filter: blur(0px) drop-shadow(0 0 20px #ffffff); transform: scale(1.1); }
  }

  /* Title Group (Adjacent to Scope, Frameless, Underlined Laser Sweep) */
  .title-group-animated {
    display: flex;
    align-items: center;
  }
  .title-fui-shell {
    position: relative;
    padding: 2px 0 6px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .forge-title {
    font-size: 38px;
    font-weight: 950;
    color: #fff;
    margin: 0;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 8s linear infinite, glow-breath 5s infinite alternate ease-in-out;
    transition: all 0.3s var(--ease-fui);
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  .title-group-animated.acquired .forge-title {
    background: linear-gradient(90deg, #fff, var(--critical-alert), var(--warning-amber), #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 2.5s linear infinite, title-alert-pulse 0.6s infinite alternate ease-in-out;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.45);
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes title-alert-pulse {
    0% { filter: drop-shadow(0 0 8px rgba(255, 45, 85, 0.4)); }
    100% { filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.75)); }
  }

  @keyframes chroma-loop { 
    from { background-position: 0% center; } 
    to { background-position: 200% center; } 
  }


  .improvement-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
  }

  .meta-separator {
    color: rgba(139, 92, 246, 0.4);
    margin: 0 8px;
    font-weight: bold;
  }

  .cards-viewport {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 8px;
    min-height: 0;
  }

  .cards-viewport::-webkit-scrollbar {
    width: 6px;
  }
  .cards-viewport::-webkit-scrollbar-track {
    background: transparent;
  }
  .cards-viewport::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 3px;
  }
  .cards-viewport::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.4);
  }

  .entry-card {
    display: flex;
    gap: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
    position: relative;
    user-select: none;
  }

  .entry-card:hover {
    transform: translateX(4px);
    background: rgba(139, 92, 246, 0.04);
    border-color: rgba(139, 92, 246, 0.45);
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 15px rgba(139, 92, 246, 0.15),
      inset 0 0 15px rgba(139, 92, 246, 0.05);
  }

  .card-checkbox-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* CYBER CHECKBOX */
  .cyber-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    outline: none;
    cursor: pointer;
    position: relative;
    transition: all 0.25s ease;
    background: rgba(0, 0, 0, 0.3);
  }

  .cyber-checkbox:hover {
    border-color: #8b5cf6;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }

  .cyber-checkbox:checked {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
  }

  .cyber-checkbox:checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #00ffff;
    font-size: 11px;
    font-weight: bold;
  }

  .card-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    letter-spacing: 0.1em;
    word-spacing: 0.22em;
    font-weight: 950 !important;
    font-family: 'Outfit', sans-serif;
  }

  .meta-label {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 950 !important;
  }

  .meta-val {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 950 !important;
  }

  .card-formula {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 6px 0;
  }

  .formula-badge {
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 950 !important;
    letter-spacing: 0.1em;
    word-spacing: 0.22em;
    padding: 6px 14px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
  }

  .formula-separator {
    color: rgba(139, 92, 246, 0.4);
    font-size: 9px;
  }

  /* Formula Badges Color Coding */
  .badge-intent.intent-bug {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
    text-shadow: 0 0 6px rgba(239, 68, 68, 0.2);
  }

  .badge-intent.intent-enhance {
    background: rgba(34, 211, 238, 0.08);
    border-color: rgba(34, 211, 238, 0.3);
    color: #22d3ee;
    text-shadow: 0 0 6px rgba(34, 211, 238, 0.2);
  }

  .badge-intent.intent-new {
    background: rgba(236, 72, 153, 0.08);
    border-color: rgba(236, 72, 153, 0.3);
    color: #ec4899;
    text-shadow: 0 0 6px rgba(236, 72, 153, 0.2);
  }

  .badge-agency.agency-strict {
    background: rgba(251, 146, 60, 0.08);
    border-color: rgba(251, 146, 60, 0.3);
    color: #fb923c;
    text-shadow: 0 0 6px rgba(251, 146, 60, 0.2);
  }

  .badge-agency.agency-mod {
    background: rgba(34, 211, 238, 0.08);
    border-color: rgba(34, 211, 238, 0.3);
    color: #22d3ee;
    text-shadow: 0 0 6px rgba(34, 211, 238, 0.2);
  }

  .badge-agency.agency-creative {
    background: rgba(167, 139, 250, 0.08);
    border-color: rgba(167, 139, 250, 0.3);
    color: #c084fc;
    text-shadow: 0 0 6px rgba(167, 139, 250, 0.2);
  }

  .badge-vector.vector-ui {
    background: rgba(74, 222, 128, 0.08);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
    text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
  }

  .badge-vector.vector-ux {
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.3);
    color: #38bdf8;
    text-shadow: 0 0 6px rgba(56, 189, 248, 0.2);
  }

  .badge-sector {
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.3);
    color: #a78bfa;
    text-shadow: 0 0 6px rgba(139, 92, 246, 0.2);
  }

  .card-target {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14.5px;
    font-family: 'Share Tech Mono', monospace;
  }

  .target-label {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 950 !important;
    word-spacing: 0.22em;
    letter-spacing: 0.15em;
  }

  .target-path {
    color: #00ffff;
    text-shadow: 0 0 5px rgba(0, 255, 255, 0.25);
    font-weight: 950 !important;
    word-spacing: 0.22em;
    letter-spacing: 0.1em;
  }

  .card-comment-preview {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 12.5px;
    line-height: 1.8;
    min-width: 0;
    word-spacing: 0.22em;
    letter-spacing: 0.1em;
    font-family: 'Outfit', sans-serif;
  }

  .comment-label {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 950 !important;
    word-spacing: 0.22em;
    letter-spacing: 0.15em;
  }

  .comment-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 950 !important;
    word-spacing: 0.22em;
    letter-spacing: 0.08em;
  }

  .no-entries-card {
    padding: 30px;
    text-align: center;
    color: rgba(255, 255, 255, 0.2);
    font-size: 11px;
    border: 1px dashed rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.15);
  }
</style>
