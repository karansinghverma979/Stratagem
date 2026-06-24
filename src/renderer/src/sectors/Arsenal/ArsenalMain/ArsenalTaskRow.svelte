<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';
  import { syncAntaryami, addNotification } from '../../../core/store';
  import { onMount } from 'svelte';

  let { task, onprotocolclick, searchQuery = '', clickable = true, onstrategize = null, coolingState = null, onInitiateTransfer = null, ondeleteclick = null } = $props();

  const handleDragStart = (e: DragEvent) => {
    if ((task.status || '').toUpperCase() === 'SYNTHESIZING') {
      if (!coolingState) {
        e.preventDefault();
        onInitiateTransfer?.();
        return;
      } else if (coolingState.phase === 'cooling') {
        e.preventDefault();
        return;
      }
    }
    // Allow dragging
    e.dataTransfer?.setData('text/plain', task.id.toString());
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  let isHovered = $state(false);
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);
  let noteExists = $state(false);

  const checkNote = async () => {
    try {
      noteExists = await window.stratagemAPI.checkNoteExists(task.id);
    } catch { noteExists = false; }
  };

  onMount(() => { checkNote(); });

  const openStrategize = (e: MouseEvent) => {
    e.stopPropagation();
    AudioEngine.play('ui-click');
    // Fire callback so ArsenalBoard renders the modal at root level
    if (onstrategize) (onstrategize as Function)({ task, onNoteWritten: checkNote });
  };

  // Format creation date from task.createdAt
  let creationDate = $derived.by(() => {
    const raw = task.createdAt || task.initiateDate || '';
    if (!raw) return 'UNKNOWN DATE';
    const match = (raw as string).match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      }
    }
    return (raw as string).split(' ')[0].toUpperCase();
  });

  // Highlighted title for search
  let highlightedTitle = $derived.by(() => {
    const title = task.title as string;
    if (!searchQuery || !(searchQuery as string).trim()) return title;
    try {
      const escaped = (searchQuery as string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return title.replace(regex, '<mark class="fui-highlight">$1</mark>');
    } catch { return title; }
  });

  // Filter out internal system tags for display
  const HIDDEN_TAGS = new Set(['RAW', 'SYNTH', 'WEAPON', 'SYSTEM', '#SYSTEM', 'HIGH', 'MED', 'LOW']);
  let displayTags = $derived(
    (task.tags || []).filter((t: string) => !HIDDEN_TAGS.has(t.replace('#', '').toUpperCase()))
  );

  const handleRowClick = () => {
    if (!clickable || showDeleteConfirm || isDeleting) return;
    AudioEngine.play('ui-click');
    onprotocolclick && onprotocolclick(task);
  };

  const openDeleteConfirm = (e: MouseEvent) => {
    e.stopPropagation();
    AudioEngine.play('ui-click');
    if ((task.status || '').toUpperCase() === 'SYNTHESIZING') {
      ondeleteclick?.(task);
    } else {
      showDeleteConfirm = true;
    }
  };

  const cancelDelete = (e: MouseEvent) => {
    e.stopPropagation();
    AudioEngine.play('ui-click');
    showDeleteConfirm = false;
  };

  const confirmDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    isDeleting = true;
    showDeleteConfirm = false;
    AudioEngine.play('ui-click');
    try {
      await window.stratagemAPI.deleteMission(task.id);
      await syncAntaryami();  // immediately refreshes arsenalTasks store → card disappears
      addNotification('THREAD PURGED', `The mission thread "${task.title.toUpperCase()}" was successfully deleted from the SQLite core`, 'success');
    } catch (err) {
      console.error('[Arsenal] Delete failed:', err);
      isDeleting = false;
      addNotification('PURGE ACTION INTERRUPTED', `An error occurred while deleting task: ${err.message || err}`, 'error');
    }
  };

  const handleMouseEnter = () => {
    isHovered = true;
    if (clickable) AudioEngine.play('ui-hover');
  };
  const handleMouseLeave = () => { isHovered = false; };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="task-row"
  class:hovered={isHovered && clickable && !showDeleteConfirm}
  class:priority-high={task.priority === 'HIGH'}
  class:priority-med={task.priority === 'MED'}
  class:priority-low={task.priority === 'LOW'}
  class:non-clickable={!clickable}
  class:transfer-cooling={coolingState && coolingState.phase === 'cooling'}
  class:transfer-ready={coolingState && coolingState.phase === 'ready'}
  draggable="true"
  ondragstart={handleDragStart}
  onclick={handleRowClick}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Background layers -->
  <div class="row-glass"></div>
  <div class="priority-edge"></div>
  <div class="row-specular"></div>
  {#if clickable && !showDeleteConfirm}
    <div class="hover-sweep"></div>
  {/if}

  <!-- Transfer state overlays -->
  {#if coolingState}
    {#if coolingState.phase === 'cooling'}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="transfer-overlay cooling" onclick={(e) => e.stopPropagation()}>
        <svg class="transfer-icon pulsing" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span class="transfer-text cooling-text">THINK & PLAN: ({coolingState.timeLeft}s)</span>
      </div>
    {:else if coolingState.phase === 'ready'}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="transfer-overlay ready" onclick={(e) => e.stopPropagation()}>
        <svg class="transfer-icon blinking" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff9f" stroke-width="2.2">
          <path d="M12 2v20M17 5l-5-5-5 5M17 19l-5 5-5-5"/>
        </svg>
        <span class="transfer-text ready-text">DRAG THREAD: ({coolingState.timeLeft}s)</span>
      </div>
    {/if}
  {/if}

  <!-- Full-card confirm overlay (absolute, sits on top of everything) -->
  {#if showDeleteConfirm}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="confirm-overlay" onclick={(e) => e.stopPropagation()}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2.2" stroke-linecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="confirm-text">PURGE THIS THREAD?</span>
      <div class="confirm-actions">
        <button class="confirm-btn confirm-yes" onclick={confirmDelete}>CONFIRM</button>
        <button class="confirm-btn confirm-no"  onclick={cancelDelete}>ABORT</button>
      </div>
    </div>
  {/if}

  {#if isDeleting}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="confirm-overlay" onclick={(e) => e.stopPropagation()}>
      <div class="deleting-spinner"></div>
      <span class="confirm-text">PURGING THREAD...</span>
    </div>
  {/if}

  <!-- ─── Main layout row ─── -->
  <div class="card-layout">

    <!-- Priority node (left) -->
    <div class="priority-node"
      class:high={task.priority === 'HIGH'}
      class:med={task.priority === 'MED'}
      class:low={task.priority === 'LOW'}
    >
      <div class="node-core"></div>
      <div class="node-ring"></div>
      <div class="node-glow"></div>
    </div>

    <!-- Text content (center, grows) -->
    <div class="text-block">
      <div class="creation-date">CREATED {creationDate}</div>
      <h4 class="task-title">{@html highlightedTitle}</h4>
      {#if displayTags.length > 0}
        <div class="tags-row">
          {#each displayTags as tag}
            <span class="tag-chip">{(tag as string).replace('#', '')}</span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Priority badge — own column, vertically centred -->
    <div class="priority-col">
      <span class="priority-badge p-badge-{task.priority.toLowerCase()}">{task.priority}</span>
    </div>

    <!-- STRATEGIZE button — own column, vertically centred -->
    <div class="strategize-col">
      <button
        class="strategize-btn"
        class:has-note={noteExists}
        onclick={openStrategize}
        title={noteExists ? 'Open Intel File' : 'Create Intel File'}
        aria-label="Open Strategize editor"
      >
        <div class="strat-icon-wrap">
          <!-- Book / document icon -->
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          {#if noteExists}
            <span class="note-dot"></span>
          {/if}
        </div>
        <span class="strat-label">{noteExists ? 'INTEL FILE' : 'STRATEGIZE'}</span>
      </button>
    </div>

    <!-- Delete button — own column, vertically centred -->
    <div class="delete-col">
      <button
        class="delete-btn"
        onclick={openDeleteConfirm}
        title="Purge thread"
        aria-label="Delete task"
        disabled={isDeleting}
      >
        <div class="delete-icon-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
      </button>
    </div>

  </div>
</div>



<style>
  /* ─── Card shell ─── */
  .task-row {
    position: relative;
    box-sizing: border-box;
    border-radius: 12px;
    border: 1px solid rgba(139, 92, 246, 0.12);
    overflow: hidden;
    cursor: pointer;
    min-height: 116px;
    transition:
      transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.28s ease,
      box-shadow 0.28s ease;
    will-change: transform;
    isolation: isolate;
  }

  .task-row.non-clickable { cursor: default; }

  /* Background glass */
  .row-glass {
    position: absolute; inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg,
      rgba(139,92,246,0.05) 0%,
      rgba(13,10,30,0.76) 55%,
      rgba(4,2,10,0.91) 100%
    );
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    z-index: 0;
    transition: background 0.28s ease;
  }

  /* Priority accent edge */
  .priority-edge {
    position: absolute;
    left: 0; top: 18%; bottom: 18%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(139, 92, 246, 0.5);
    z-index: 1;
    transition: top 0.28s ease, bottom 0.28s ease;
    filter: blur(0.5px);
  }

  /* Top specular shimmer */
  .row-specular {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(139,92,246,0.35) 30%,
      rgba(255,255,255,0.2) 50%,
      rgba(139,92,246,0.35) 70%,
      transparent 100%
    );
    z-index: 1;
    pointer-events: none;
  }

  .hover-sweep {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(139,92,246,0.07) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.28s ease;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
  }

  /* Priority tint edges */
  .task-row.priority-high .priority-edge { background: rgba(255,45,85,0.7);  box-shadow: 0 0 10px rgba(255,45,85,0.4); }
  .task-row.priority-med  .priority-edge { background: rgba(255,184,0,0.65); box-shadow: 0 0 10px rgba(255,184,0,0.4); }
  .task-row.priority-low  .priority-edge { background: rgba(0,255,159,0.6);  box-shadow: 0 0 10px rgba(0,255,159,0.35); }

  /* Hover state */
  .task-row.hovered {
    transform: translateX(3px) translateY(-2px);
    border-color: rgba(139, 92, 246, 0.38);
    box-shadow:
      0 10px 28px rgba(0,0,0,0.6),
      0 0 18px rgba(109,40,217,0.12),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .task-row.hovered .hover-sweep    { opacity: 1; }
  .task-row.hovered .priority-edge  { top: 10%; bottom: 10%; }
  .task-row.priority-high.hovered   { border-color: rgba(255,45,85,0.38); }
  .task-row.priority-med.hovered    { border-color: rgba(255,184,0,0.35); }
  .task-row.priority-low.hovered    { border-color: rgba(0,255,159,0.32); }

  /* ─── Card layout ─── */
  .card-layout {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 28px 16px 28px 20px;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    min-height: 116px;
  }

  /* ─── Priority node ─── */
  .priority-node {
    width: 16px; height: 16px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    align-self: center;
  }

  .node-core {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(139,92,246,1);
    z-index: 2; position: relative;
  }
  .node-ring {
    position: absolute;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 1.5px solid rgba(139,92,246,0.5);
    animation: nodeRingPulse 2.5s ease-in-out infinite;
    z-index: 1;
  }
  .node-glow {
    position: absolute;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: rgba(139,92,246,0.3);
    filter: blur(7px); z-index: 0;
  }

  @keyframes nodeRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%       { transform: scale(1.45); opacity: 0.1; }
  }

  .priority-node.high .node-core { background: #ff2d55; }
  .priority-node.high .node-ring { border-color: rgba(255,45,85,0.5); }
  .priority-node.high .node-glow { background: rgba(255,45,85,0.28); }
  .priority-node.med  .node-core { background: #ffb800; }
  .priority-node.med  .node-ring { border-color: rgba(255,184,0,0.5); }
  .priority-node.med  .node-glow { background: rgba(255,184,0,0.28); }
  .priority-node.low  .node-core { background: #00ff9f; }
  .priority-node.low  .node-ring { border-color: rgba(0,255,159,0.5); }
  .priority-node.low  .node-glow { background: rgba(0,255,159,0.25); }

  /* ─── Text block ─── */
  .text-block {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .creation-date {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: rgba(139,92,246,0.6);
    text-transform: uppercase;
  }

  .task-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.05rem;
    font-weight: 800;
    color: #ffffff;
    margin: 0;
    /* Allow wrapping — no truncation */
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
    line-height: 1.35;
    letter-spacing: 0.02em;
    text-shadow: 0 0 16px rgba(255,255,255,0.1);
  }

  .tags-row {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .tag-chip {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    border-radius: 5px;
    background: rgba(139,92,246,0.07);
    border: 1px solid rgba(139,92,246,0.18);
    color: rgba(139,92,246,0.72);
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ─── Priority column ─── */
  .priority-col {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    padding: 0 4px;
  }

  /* Priority badge */
  .priority-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.13em;
    padding: 4px 14px;
    border-radius: 6px;
    display: inline-block;
    white-space: nowrap;
  }
  .priority-badge.p-badge-high {
    background: rgba(255,45,85,0.12);
    border: 1.5px solid #ff2d55;
    color: #ff2d55;
    box-shadow: 0 0 10px rgba(255,45,85,0.22);
  }
  .priority-badge.p-badge-med {
    background: rgba(255,184,0,0.12);
    border: 1.5px solid #ffb800;
    color: #ffb800;
    box-shadow: 0 0 10px rgba(255,184,0,0.18);
  }
  .priority-badge.p-badge-low {
    background: rgba(0,255,159,0.1);
    border: 1.5px solid #00ff9f;
    color: #00ff9f;
    box-shadow: 0 0 10px rgba(0,255,159,0.18);
  }

  /* ─── Strategize column ─── */
  .strategize-col {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    padding: 0 6px;
  }

  .strategize-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.25);
    cursor: pointer;
    outline: none;
    transition: all 0.22s ease;
    white-space: nowrap;
  }

  .strategize-btn:hover {
    border-color: rgba(6,182,212,0.35);
    background: rgba(6,182,212,0.07);
    color: rgba(6,182,212,0.8);
    box-shadow: 0 0 12px rgba(6,182,212,0.15);
  }

  .strategize-btn.has-note {
    border-color: rgba(6,182,212,0.4);
    background: rgba(6,182,212,0.08);
    color: rgba(6,182,212,0.9);
    box-shadow: 0 0 14px rgba(6,182,212,0.18);
    animation: stratGlow 2.5s ease-in-out infinite;
  }

  .strategize-btn.has-note:hover {
    border-color: rgba(6,182,212,0.7);
    background: rgba(6,182,212,0.15);
    box-shadow: 0 0 22px rgba(6,182,212,0.35);
    animation: none;
    transform: scale(1.04);
  }

  @keyframes stratGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(6,182,212,0.15); }
    50%       { box-shadow: 0 0 20px rgba(6,182,212,0.35); }
  }

  .strat-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .note-dot {
    position: absolute;
    top: -3px; right: -3px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #06b6d4;
    box-shadow: 0 0 6px rgba(6,182,212,0.8);
    animation: dotPop 2s ease-in-out infinite;
  }

  @keyframes dotPop {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(0.7); }
  }

  .strat-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  /* ─── Delete column (right side, vertically centred) ─── */
  .delete-col {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    padding-left: 8px;
    border-left: 1px solid rgba(255,255,255,0.05);
  }

  .delete-btn {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .delete-icon-wrap {
    width: 34px; height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    transition: all 0.22s ease;
    animation: deletePulse 3.5s ease-in-out infinite;
  }

  @keyframes deletePulse {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 1; }
  }

  .delete-btn:not(:disabled):hover .delete-icon-wrap {
    color: #ff2d55;
    border-color: rgba(255,45,85,0.5);
    background: rgba(255,45,85,0.1);
    box-shadow: 0 0 16px rgba(255,45,85,0.28);
    animation: none;
    transform: scale(1.1);
  }

  /* ─── Confirm overlay ─── */
  .confirm-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    border-radius: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 20px;
    /* Solid enough to fully hide card content behind it */
    background: linear-gradient(135deg,
      rgba(180,20,50,0.18) 0%,
      rgba(8,3,14,0.97) 100%
    );
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255,45,85,0.2);
    animation: overlayIn 0.18s ease;
  }

  @keyframes overlayIn {
    from { opacity: 0; transform: scale(0.98); }
    to   { opacity: 1; transform: scale(1); }
  }

  .confirm-text {
    font-family: 'Outfit', sans-serif;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.8);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .confirm-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .confirm-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.14em;
    padding: 5px 18px;
    border-radius: 6px;
    border: 1.5px solid;
    cursor: pointer;
    outline: none;
    transition: all 0.18s ease;
    text-transform: uppercase;
  }

  .confirm-yes {
    background: rgba(255,45,85,0.15);
    border-color: #ff2d55;
    color: #ff2d55;
  }
  .confirm-yes:hover {
    background: rgba(255,45,85,0.28);
    box-shadow: 0 0 14px rgba(255,45,85,0.4);
  }

  .confirm-no {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.5);
  }
  .confirm-no:hover {
    background: rgba(255,255,255,0.08);
    color: #ffffff;
  }

  /* Deleting spinner */
  .deleting-spinner {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid rgba(255,45,85,0.2);
    border-top-color: #ff2d55;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  :global(.fui-highlight) {
    background: rgba(139,92,246,0.22) !important;
    color: #fff !important;
    text-shadow: 0 0 12px rgba(139,92,246,0.6) !important;
    padding: 0 3px;
    border-bottom: 2px solid rgba(139,92,246,0.6);
    border-radius: 2px;
  }

  /* ─── Transfer Overlay ─── */
  .transfer-overlay {
    position: absolute;
    inset: 0;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0 20px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: overlayIn 0.2s ease;
  }

  .transfer-overlay.cooling {
    background: linear-gradient(135deg, rgba(46, 16, 101, 0.75) 0%, rgba(8, 3, 20, 0.98) 100%);
    border: 1px solid rgba(139, 92, 246, 0.4);
  }

  .transfer-overlay.ready {
    background: linear-gradient(135deg, rgba(6, 95, 70, 0.75) 0%, rgba(2, 8, 4, 0.98) 100%);
    border: 1px solid rgba(0, 255, 159, 0.4);
  }

  .transfer-text {
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .cooling-text {
    color: #c084fc;
    text-shadow: 0 0 8px rgba(192, 132, 252, 0.5);
  }

  .ready-text {
    color: #00ff9f;
    text-shadow: 0 0 8px rgba(0, 255, 159, 0.5);
  }

  .transfer-icon {
    flex-shrink: 0;
  }

  .pulsing {
    animation: iconPulse 1.5s infinite alternate;
  }

  .blinking {
    animation: iconBlink 0.8s infinite alternate;
  }

  @keyframes iconBlink {
    from { opacity: 0.3; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1.05); }
  }

  .task-row.transfer-cooling {
    border-color: rgba(139, 92, 246, 0.85) !important;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.45);
    animation: borderBreathePurple 2s infinite ease-in-out;
  }

  .task-row.transfer-ready {
    border-color: rgba(0, 255, 159, 0.85) !important;
    box-shadow: 0 0 15px rgba(0, 255, 159, 0.45);
    animation: borderBreatheGreen 1s infinite ease-in-out;
  }

  @keyframes borderBreathePurple {
    0%, 100% { border-color: rgba(139, 92, 246, 0.4); }
    50% { border-color: rgba(139, 92, 246, 0.95); }
  }

  @keyframes borderBreatheGreen {
    0%, 100% { border-color: rgba(0, 255, 159, 0.4); }
    50% { border-color: rgba(0, 255, 159, 0.95); }
  }
</style>
