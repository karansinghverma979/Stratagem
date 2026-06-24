<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';

  let { task, searchQuery = '', onrowclick } = $props();

  let isHovered = $state(false);

  let isVictory    = $derived(task.resolution === 'VICTORY');
  let isDriftAbort = $derived(task.classifications?.includes('DRIFT-ABORTED') || task.tags?.includes('DRIFT-ABORTED'));
  let isAborted    = $derived(task.resolution === 'ABORTED');

  // Derive highlighted title — allow wrapping, highlight matches
  let highlightedTitle = $derived.by(() => {
    const title = task.title;
    if (!searchQuery || !searchQuery.trim()) return title;
    try {
      const escaped = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return title.replace(regex, '<mark class="archive-highlight">$1</mark>');
    } catch (e) {
      return title;
    }
  });

  const handleRowClick = () => {
    AudioEngine.play('ui-click');
    onrowclick && onrowclick(task);
  };

  const handleMouseEnter = () => { isHovered = true; AudioEngine.play('ui-hover'); };
  const handleMouseLeave = () => { isHovered = false; };

  // Resolved date
  let displayDate = $derived.by(() => {
    const raw = task.completionDate || task.createdAt || '';
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const parsed = Date.parse(m[1]);
      if (!isNaN(parsed)) {
        return new Date(parsed).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        }).toUpperCase();
      }
    }
    return raw.split('T')[0] || 'UNKNOWN';
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="archive-row"
  class:row-victory={isVictory}
  class:row-aborted={isAborted && !isDriftAbort}
  class:row-drift={isDriftAbort}
  class:hovered={isHovered}
  onclick={handleRowClick}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Glassmorphic card surface -->
  <div class="row-glass"></div>

  <!-- Priority accent edge glow -->
  <div class="priority-edge"></div>

  <!-- Inner specular highlight -->
  <div class="row-specular"></div>

  <!-- Hover sweep -->
  <div class="hover-sweep"></div>

  <!-- ── Left: Priority Node ── -->
  <div class="left-section">
    <div
      class="priority-node"
      class:high={task.priority === 'HIGH'}
      class:med={task.priority === 'MED'}
      class:low={task.priority === 'LOW'}
    >
      <div class="node-core"></div>
      <div class="node-ring"></div>
      <div class="node-glow"></div>
    </div>
  </div>

  <!-- ── Center: Meta + Full wrapping Title ── -->
  <div class="center-section">
    <div class="meta-row">
      <div class="resolved-date font-mono">RESOLVED: {displayDate}</div>
      {#if isDriftAbort}
        <span class="resolution-badge drift-badge">⚡ DRIFT-ABORTED</span>
      {:else if isVictory}
        <span class="resolution-badge victory-badge">✓ VICTORY</span>
      {:else}
        <span class="resolution-badge aborted-badge">✕ ABORTED</span>
      {/if}
    </div>
    <!-- Title: wraps fully, no truncation -->
    <h4 class="task-title">{@html highlightedTitle}</h4>
  </div>

  <!-- ── Right: Priority Badge Only ── -->
  <div class="right-section">
    <div class="priority-badge-container">
      <span class="priority-badge p-badge-{(task.priority || 'med').toLowerCase()}">{task.priority || 'MED'}</span>
    </div>
  </div>
</div>

<style>
  /* ── Row Container ── */
  .archive-row {
    display: grid;
    grid-template-columns: 40px 1fr 100px;
    align-items: center;
    gap: 20px;
    padding: 28px 24px;
    min-height: 116px;
    cursor: pointer;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.35s ease;
    border-radius: 14px;
    border: 1px solid rgba(139, 92, 246, 0.12);
    will-change: transform;
    isolation: isolate;
  }

  /* ── Glassmorphic card base ── */
  .row-glass {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    z-index: 0;
    transition: background 0.35s ease;
  }

  .archive-row.row-victory .row-glass {
    background: linear-gradient(135deg, rgba(0,255,159,0.05) 0%, rgba(4,20,12,0.78) 50%, rgba(2,8,5,0.94) 100%);
  }
  .archive-row.row-victory { border-color: rgba(0,255,159,0.12); }

  .archive-row.row-aborted .row-glass {
    background: linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(18,4,4,0.78) 50%, rgba(8,2,2,0.94) 100%);
  }
  .archive-row.row-aborted { border-color: rgba(239,68,68,0.12); }

  .archive-row.row-drift .row-glass {
    background: linear-gradient(135deg, rgba(255,45,85,0.07) 0%, rgba(20,4,6,0.80) 50%, rgba(10,2,3,0.96) 100%);
  }
  .archive-row.row-drift { border-color: rgba(255,45,85,0.15); }

  /* Priority edge */
  .priority-edge {
    position: absolute;
    left: 0; top: 15%; bottom: 15%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    z-index: 1;
    transition: all 0.35s ease;
    filter: blur(0.5px);
  }

  .archive-row.row-victory .priority-edge { background: rgba(0,255,159,0.6);  box-shadow: 0 0 12px rgba(0,255,159,0.45); }
  .archive-row.row-aborted .priority-edge { background: rgba(239,68,68,0.6);  box-shadow: 0 0 12px rgba(239,68,68,0.45); }
  .archive-row.row-drift .priority-edge   { background: rgba(255,45,85,0.75); box-shadow: 0 0 14px rgba(255,45,85,0.55); }

  /* Specular top line */
  .row-specular {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
  }

  .archive-row.row-victory .row-specular {
    background: linear-gradient(90deg, transparent 0%, rgba(0,255,159,0.35) 30%, rgba(255,255,255,0.2) 50%, rgba(0,255,159,0.35) 70%, transparent 100%);
  }
  .archive-row.row-aborted .row-specular {
    background: linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.35) 30%, rgba(255,255,255,0.18) 50%, rgba(239,68,68,0.35) 70%, transparent 100%);
  }
  .archive-row.row-drift .row-specular {
    background: linear-gradient(90deg, transparent 0%, rgba(255,45,85,0.45) 30%, rgba(255,255,255,0.2) 50%, rgba(255,45,85,0.45) 70%, transparent 100%);
  }

  /* Hover sweep */
  .hover-sweep {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.35s ease;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
  }
  .archive-row.row-victory .hover-sweep { background: linear-gradient(90deg, rgba(0,255,159,0.05) 0%, transparent 50%); }
  .archive-row.row-aborted .hover-sweep { background: linear-gradient(90deg, rgba(239,68,68,0.05) 0%, transparent 50%); }
  .archive-row.row-drift .hover-sweep   { background: linear-gradient(90deg, rgba(255,45,85,0.07) 0%, transparent 50%); }

  /* Hover states */
  .archive-row:hover, .archive-row.hovered {
    transform: translateX(4px) translateY(-2px);
    box-shadow: 0 12px 36px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .archive-row.row-victory:hover { border-color: rgba(0,255,159,0.45); box-shadow: 0 12px 36px rgba(0,0,0,0.72), 0 0 25px rgba(0,255,159,0.18); }
  .archive-row.row-aborted:hover { border-color: rgba(239,68,68,0.45); box-shadow: 0 12px 36px rgba(0,0,0,0.72), 0 0 25px rgba(239,68,68,0.18); }
  .archive-row.row-drift:hover   { border-color: rgba(255,45,85,0.55); box-shadow: 0 12px 36px rgba(0,0,0,0.72), 0 0 28px rgba(255,45,85,0.25); }

  .archive-row:hover .hover-sweep, .archive-row.hovered .hover-sweep { opacity: 1; }
  .archive-row:hover .priority-edge, .archive-row.hovered .priority-edge { top: 10%; bottom: 10%; }

  .archive-row.row-victory:hover .row-glass { background: linear-gradient(135deg, rgba(0,255,159,0.07) 0%, rgba(5,25,14,0.68) 60%, rgba(0,0,0,0.38) 100%); }
  .archive-row.row-aborted:hover .row-glass { background: linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(22,5,5,0.68) 60%, rgba(0,0,0,0.38) 100%); }
  .archive-row.row-drift:hover .row-glass   { background: linear-gradient(135deg, rgba(255,45,85,0.10) 0%, rgba(24,5,7,0.70) 60%, rgba(0,0,0,0.38) 100%); }

  /* ── Left Section ── */
  .left-section {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    position: relative;
    flex-shrink: 0;
  }

  .priority-node {
    width: 16px; height: 16px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .node-core {
    width: 8px; height: 8px;
    border-radius: 50%;
    z-index: 2;
    position: relative;
  }

  .archive-row.row-victory .node-core { background: #00ff9f; }
  .archive-row.row-aborted .node-core { background: #ef4444; }
  .archive-row.row-drift .node-core   { background: #ff2d55; }

  .node-ring {
    position: absolute;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 1.5px solid;
    animation: nodeRingPulse 2.5s ease-in-out infinite;
    z-index: 1;
  }

  .archive-row.row-victory .node-ring { border-color: rgba(0,255,159,0.5); }
  .archive-row.row-aborted .node-ring { border-color: rgba(239,68,68,0.5); }
  .archive-row.row-drift .node-ring   { border-color: rgba(255,45,85,0.55); }

  .node-glow {
    position: absolute;
    width: 24px; height: 24px;
    border-radius: 50%;
    filter: blur(8px);
    z-index: 0;
  }

  .archive-row.row-victory .node-glow { background: rgba(0,255,159,0.35); }
  .archive-row.row-aborted .node-glow { background: rgba(239,68,68,0.35); }
  .archive-row.row-drift .node-glow   { background: rgba(255,45,85,0.4); }

  @keyframes nodeRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%       { transform: scale(1.4); opacity: 0.15; }
  }

  /* ── Center Section ── */
  .center-section {
    min-width: 0;
    z-index: 2;
    position: relative;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .resolved-date {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .archive-row.row-victory .resolved-date { color: rgba(0,255,159,0.7); }
  .archive-row.row-aborted .resolved-date { color: rgba(239,68,68,0.7); }
  .archive-row.row-drift .resolved-date   { color: rgba(255,45,85,0.75); }

  /* Resolution badges */
  .resolution-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 9px;
    font-weight: 900;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .victory-badge {
    color: #00ff9f;
    background: rgba(0,255,159,0.1);
    border: 1px solid rgba(0,255,159,0.35);
    box-shadow: 0 0 8px rgba(0,255,159,0.2);
  }

  .aborted-badge {
    color: #ef4444;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.35);
    box-shadow: 0 0 8px rgba(239,68,68,0.2);
  }

  .drift-badge {
    color: #ff2d55;
    background: rgba(255,45,85,0.14);
    border: 1px solid rgba(255,45,85,0.5);
    box-shadow: 0 0 10px rgba(255,45,85,0.3);
    animation: driftBadgePulse 2.5s ease-in-out infinite alternate;
  }

  @keyframes driftBadgePulse {
    from { box-shadow: 0 0 8px rgba(255,45,85,0.25); }
    to   { box-shadow: 0 0 16px rgba(255,45,85,0.55); }
  }

  /* Task title: wraps, no truncation */
  .task-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.25rem;
    color: #ffffff;
    font-weight: 800;
    margin: 0;
    white-space: normal;     /* allow wrapping */
    word-break: break-word;
    letter-spacing: 0.025em;
    text-shadow: 0 0 20px rgba(255,255,255,0.12);
    transition: text-shadow 0.3s ease;
    line-height: 1.3;
  }

  .archive-row:hover .task-title {
    text-shadow: 0 0 28px rgba(255,255,255,0.22);
  }

  :global(.archive-highlight) {
    background: rgba(139,92,246,0.22) !important;
    color: #fff !important;
    text-shadow: 0 0 15px var(--primary-glow) !important;
    padding: 0 4px;
    border-bottom: 2px solid var(--primary-accent);
    border-radius: 2px;
  }

  /* ── Right Section ── */
  .right-section {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    z-index: 2;
    position: relative;
    flex-shrink: 0;
  }

  /* Priority Badges */
  .priority-badge-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 86px;
    flex-shrink: 0;
  }

  .priority-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13.5px;
    font-weight: 900;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 5px;
    text-align: center;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;
  }

  .priority-badge.p-badge-high {
    background: rgba(255,45,85,0.15);
    border: 1.5px solid #ff2d55;
    color: #ff2d55;
    box-shadow: 0 0 10px rgba(255,45,85,0.25);
  }

  .priority-badge.p-badge-med {
    background: rgba(255,184,0,0.15);
    border: 1.5px solid #ffb800;
    color: #ffb800;
    box-shadow: 0 0 10px rgba(255,184,0,0.2);
  }

  .priority-badge.p-badge-low {
    background: rgba(0,255,159,0.15);
    border: 1.5px solid #00ff9f;
    color: #00ff9f;
    box-shadow: 0 0 10px rgba(0,255,159,0.2);
  }
</style>
