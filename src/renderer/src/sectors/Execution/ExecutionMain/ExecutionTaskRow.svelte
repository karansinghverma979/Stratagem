<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';

  let { task, onprotocolclick, searchQuery = '' } = $props();

  let isCompleted = $state(false);

  $effect(() => {
    isCompleted = task.done || false;
  });
  let isHovered = $state(false);

  // Derive highlighted task title reactively using regex matching
  let highlightedTitle = $derived.by(() => {
    const title = task.title;
    if (!searchQuery || !searchQuery.trim()) return title;
    try {
      const escaped = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return title.replace(regex, '<mark class="fui-highlight">$1</mark>');
    } catch (e) {
      return title;
    }
  });

  const toggleCheck = (e: Event) => {
    e.stopPropagation();
    isCompleted = !isCompleted;
    AudioEngine.play('ui-click');
  };

  const handleRowClick = () => {
    AudioEngine.play('ui-click');
    onprotocolclick && onprotocolclick(task);
  };

  const handleMouseEnter = () => {
    isHovered = true;
    AudioEngine.play('ui-hover');
  };

  const handleMouseLeave = () => {
    isHovered = false;
  };

  const getTagIcon = (tag: string) => {
    const cleaned = tag.toUpperCase().replace('#', '');
    if (cleaned === 'HIGH' || cleaned === 'BREACH' || cleaned === 'CRITICAL') {
      return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><path d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53224 19 5.07183 19Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (cleaned === 'MED' || cleaned === 'WARNING') {
      return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (cleaned === 'LOW' || cleaned === 'SECURE' || cleaned === 'SUCCESS') {
      return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (cleaned === 'SYSTEM') {
      return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="3"/><path d="M6 21H18M12 17V21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
    }
    if (cleaned === 'LOGISTICS') {
      return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`;
    }
    return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/><path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  };

  // Derive deadline date & remaining days/hours
  let deadlineInfo = $derived.by(() => {
    const rawVal = task.deadlineDate;
    if (!rawVal) {
      return { date: 'NO DEADLINE', remaining: 'PERPETUAL' };
    }
    
    // Check if it's already an ISO date (e.g. 2026-06-15) or contains a date pattern like YYYY-MM-DD
    const dateRegex = /(\d{4}-\d{2}-\d{2})/;
    const dateMatch = rawVal.match(dateRegex);
    
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const parsedDate = Date.parse(dateStr);
      if (!isNaN(parsedDate)) {
        // Calculate remaining days
        const diffTime = parsedDate - Date.now();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format date string beautifully (e.g., JUN 5, 2026)
        const dateObj = new Date(parsedDate);
        const formattedDate = dateObj.toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }).toUpperCase();
        
        let remainingStr = '';
        if (diffDays < 0) {
          remainingStr = 'OVERDUE';
        } else if (diffDays === 0) {
          remainingStr = 'TODAY';
        } else if (diffDays === 1) {
          remainingStr = '1 DAY LEFT';
        } else {
          remainingStr = `${diffDays} DAYS LEFT`;
        }
        
        return { date: formattedDate, remaining: remainingStr };
      }
    }
    
    // Fallback for duration string values from seed data, like "2 HRS", "1 DAY", "IMMEDIATE"
    const cleanRaw = rawVal.toUpperCase();
    return {
      date: cleanRaw,
      remaining: cleanRaw === 'IMMEDIATE' ? 'URGENT' : `${cleanRaw} LEFT`
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div 
  class="task-row" 
  class:completed={isCompleted}
  class:priority-high={task.priority === 'HIGH'}
  class:priority-med={task.priority === 'MED'}
  class:priority-low={task.priority === 'LOW'}
  class:hovered={isHovered}
  onclick={handleRowClick}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Glassmorphic card surface -->
  <div class="row-glass"></div>

  <!-- Priority accent edge glow (left border) -->
  <div class="priority-edge"></div>

  <!-- Inner specular highlight -->
  <div class="row-specular"></div>

  <!-- Hover sweep light -->
  <div class="hover-sweep"></div>

  <!-- ── Left Section ────────────────────────────── -->
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

  <!-- ── Center Section ─────────────────────────── -->
  <div class="center-section">
    <!-- Initiate Date Badge -->
    <div class="initiate-date-badge font-mono">INITIATED: {task.initiateDate}</div>
    <h4 class="task-title">{@html highlightedTitle}</h4>
    <div class="tags-list">
      {#each task.tags as tag}
        <span class="fui-telemetry tag-label">
          {@html getTagIcon(tag)}
          {tag.replace('#', '')}
        </span>
      {/each}
    </div>
  </div>

  <!-- ── Right Section ──────────────────────────── -->
  <div class="right-section">
    <!-- Deadline Block -->
    <div class="right-block deadline-block">
      <span class="right-label">DEADLINE</span>
      <span class="right-val date-val">{deadlineInfo.date}</span>
    </div>

    <!-- Remaining Block -->
    <div class="right-block remaining-block">
      <span class="right-label">REMAINING</span>
      <span class="right-val remaining-val status-{task.priority.toLowerCase()}">{deadlineInfo.remaining}</span>
    </div>

    <!-- Priority Badge -->
    <div class="priority-badge-container">
      <span class="priority-badge p-badge-{task.priority.toLowerCase()}">{task.priority}</span>
    </div>
  </div>
</div>

<style>
  /* ─── Row Container ───────────────────────────────── */
  .task-row {
    display: grid;
    grid-template-columns: 40px 1fr 467px;
    align-items: center;
    gap: 24px;
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
    border: 1px solid rgba(139, 92, 246, 0.12); /* Clean themed border */
    will-change: transform;
    isolation: isolate;
  }

  /* Glassmorphic card base */
  .row-glass {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.06) 0%,
      rgba(13, 10, 30, 0.72) 50%,
      rgba(4, 2, 10, 0.92) 100%
    );
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    z-index: 0;
    transition: background 0.35s ease;
  }

  /* Left priority edge */
  .priority-edge {
    position: absolute;
    left: 0; top: 15%; bottom: 15%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(139, 92, 246, 0.5);
    z-index: 1;
    transition: all 0.35s ease;
    filter: blur(0.5px);
  }

  /* Inner specular */
  .row-specular {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(
      90deg, 
      transparent 0%, 
      rgba(139, 92, 246, 0.45) 30%, 
      rgba(255, 255, 255, 0.28) 50%, 
      rgba(139, 92, 246, 0.45) 70%, 
      transparent 100%
    );
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
  }

  /* Hover sweep */
  .hover-sweep {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(139,92,246,0.06) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.35s ease;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
  }

  /* ── Priority-specific edge colors ────────────────── */
  .task-row.priority-high .priority-edge {
    background: rgba(255, 45, 85, 0.7);
    box-shadow: 0 0 12px rgba(255, 45, 85, 0.5);
  }
  .task-row.priority-med .priority-edge {
    background: rgba(255, 184, 0, 0.65);
    box-shadow: 0 0 12px rgba(255, 184, 0, 0.4);
  }
  .task-row.priority-low .priority-edge {
    background: rgba(0, 255, 159, 0.6);
    box-shadow: 0 0 12px rgba(0, 255, 159, 0.4);
  }

  /* ── Hover state ───────────────────────────────────── */
  .task-row:hover,
  .task-row.hovered {
    transform: translateX(4px) translateY(-2px); /* Subtle shift */
    border-color: rgba(139, 92, 246, 0.48);
    box-shadow:
      0 12px 36px rgba(0, 0, 0, 0.72),
      0 0 25px rgba(109, 40, 217, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .task-row:hover .row-glass,
  .task-row.hovered .row-glass {
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.08) 0%,
      rgba(15, 10, 35, 0.65) 60%,
      rgba(0, 0, 0, 0.35) 100%
    );
  }

  .task-row:hover .hover-sweep,
  .task-row.hovered .hover-sweep {
    opacity: 1;
  }

  .task-row:hover .priority-edge,
  .task-row.hovered .priority-edge {
    top: 10%; bottom: 10%;
  }

  /* HIGH hover */
  .task-row.priority-high:hover {
    border-color: rgba(255, 45, 85, 0.48);
    box-shadow:
      0 12px 36px rgba(0, 0, 0, 0.72),
      0 0 25px rgba(255, 45, 85, 0.22);
  }
  .task-row.priority-high:hover .hover-sweep {
    background: linear-gradient(90deg, rgba(255,45,85,0.05) 0%, transparent 50%);
  }

  /* MED hover */
  .task-row.priority-med:hover {
    border-color: rgba(255, 184, 0, 0.42);
    box-shadow:
      0 12px 36px rgba(0, 0, 0, 0.72),
      0 0 25px rgba(255, 184, 0, 0.18);
  }
  .task-row.priority-med:hover .hover-sweep {
    background: linear-gradient(90deg, rgba(255,184,0,0.05) 0%, transparent 50%);
  }

  /* LOW hover */
  .task-row.priority-low:hover {
    border-color: rgba(0, 255, 159, 0.38);
    box-shadow:
      0 12px 36px rgba(0, 0, 0, 0.72),
      0 0 25px rgba(0, 255, 159, 0.18);
  }
  .task-row.priority-low:hover .hover-sweep {
    background: linear-gradient(90deg, rgba(0,255,159,0.04) 0%, transparent 50%);
  }

  /* Completed state */
  .task-row.completed {
    opacity: 0.3;
    filter: grayscale(0.8) blur(0.3px);
  }

  /* ─── Left Section ──────────────────────────────── */
  .left-section {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    position: relative;
  }

  /* Priority Node */
  .priority-node {
    width: 16px;
    height: 16px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .node-core {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 1);
    z-index: 2;
    position: relative;
  }

  .node-ring {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid rgba(139, 92, 246, 0.5);
    animation: nodeRingPulse 2.5s ease-in-out infinite;
    z-index: 1;
  }

  .node-glow {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.3);
    filter: blur(8px);
    z-index: 0;
  }

  @keyframes nodeRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%       { transform: scale(1.4); opacity: 0.15; }
  }

  /* HIGH */
  .priority-node.high .node-core  { background: var(--critical-alert); }
  .priority-node.high .node-ring  { border-color: rgba(255,45,85,0.5); }
  .priority-node.high .node-glow  { background: rgba(255,45,85,0.3); }
  /* MED */
  .priority-node.med .node-core   { background: var(--warning-amber); }
  .priority-node.med .node-ring   { border-color: rgba(255,184,0,0.5); }
  .priority-node.med .node-glow   { background: rgba(255,184,0,0.3); }
  /* LOW */
  .priority-node.low .node-core   { background: var(--secure-status); }
  .priority-node.low .node-ring   { border-color: rgba(0,255,159,0.5); }
  .priority-node.low .node-glow   { background: rgba(0,255,159,0.3); }

  /* ─── Center Section ──────────────────────────── */
  .center-section {
    min-width: 0;
    padding-right: 16px;
    z-index: 2;
    position: relative;
  }

  .initiate-date-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 900;
    color: rgba(139, 92, 246, 0.75);
    letter-spacing: 0.14em;
    margin-bottom: 5px;
    text-transform: uppercase;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
  }

  .task-title {
    font-size: 1.35rem;
    color: #ffffff;
    font-weight: 800;
    margin: 0 0 8px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.02em;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
    transition: text-shadow 0.3s ease;
  }

  .task-row:hover .task-title {
    text-shadow: 0 0 25px rgba(255,255,255,0.25), 0 0 50px rgba(139,92,246,0.15);
  }

  :global(.fui-highlight) {
    background: rgba(139, 92, 246, 0.22) !important;
    color: #fff !important;
    text-shadow: 0 0 15px var(--primary-glow) !important;
    padding: 0 4px;
    border-bottom: 2px solid var(--primary-accent);
    border-radius: 2px;
  }

  .tags-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag-label {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    background: rgba(139, 92, 246, 0.07);
    border: 1px solid rgba(139, 92, 246, 0.18);
    border-radius: 6px;
    color: rgba(139, 92, 246, 0.8);
    font-size: 0.67rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    backdrop-filter: blur(5px);
    transition: all 0.2s ease;
  }

  .task-row:hover .tag-label {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(139, 92, 246, 0.12);
  }

  .task-row.priority-high .tag-label {
    background: rgba(255, 45, 85, 0.06);
    border-color: rgba(255, 45, 85, 0.22);
    color: rgba(255, 45, 85, 0.9);
  }
  .task-row.priority-med .tag-label {
    background: rgba(255, 184, 0, 0.06);
    border-color: rgba(255, 184, 0, 0.22);
    color: rgba(255, 184, 0, 0.9);
  }
  .task-row.priority-low .tag-label {
    background: rgba(0, 255, 159, 0.05);
    border-color: rgba(0, 255, 159, 0.2);
    color: rgba(0, 255, 159, 0.85);
  }

  /* ─── Right Section ───────────────────────────── */
  .right-section {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    z-index: 2;
    position: relative;
    width: 467px;
  }

  .right-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .deadline-block {
    width: 140px;
    flex-shrink: 0;
  }

  .remaining-block {
    width: 185px;
    flex-shrink: 0;
  }

  .right-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13.5px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .right-val {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 900;
    font-size: 18.5px;
    letter-spacing: 0.04em;
    text-align: left;
  }

  .date-val {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 12px rgba(255, 255, 255, 0.12);
  }

  .remaining-val {
    text-transform: uppercase;
  }

  /* Color-coded remaining values */
  .remaining-val.status-high {
    color: #ff2d55;
    text-shadow: 0 0 14px rgba(255, 45, 85, 0.7);
  }
  .remaining-val.status-med {
    color: #ffb800;
    text-shadow: 0 0 14px rgba(255, 184, 0, 0.6);
  }
  .remaining-val.status-low {
    color: #00ff9f;
    text-shadow: 0 0 14px rgba(0, 255, 159, 0.6);
  }

  /* Priority Badges */
  .priority-badge-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 110px;
    flex-shrink: 0;
  }

  .priority-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 14.5px;
    font-weight: 900;
    letter-spacing: 0.12em;
    padding: 4px 12px;
    border-radius: 5px;
    text-align: center;
    display: inline-block;
    width: 100%;
    box-sizing: border-box;
  }

  .priority-badge.p-badge-high {
    background: rgba(255, 45, 85, 0.15);
    border: 1.5px solid #ff2d55;
    color: #ff2d55;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.25);
  }

  .priority-badge.p-badge-med {
    background: rgba(255, 184, 0, 0.15);
    border: 1.5px solid #ffb800;
    color: #ffb800;
    box-shadow: 0 0 10px rgba(255, 184, 0, 0.2);
  }

  .priority-badge.p-badge-low {
    background: rgba(0, 255, 159, 0.15);
    border: 1.5px solid #00ff9f;
    color: #00ff9f;
    box-shadow: 0 0 10px rgba(0, 255, 159, 0.2);
  }
</style>
