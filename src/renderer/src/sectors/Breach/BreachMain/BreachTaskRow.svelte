<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';
  import { triggerShield } from '../../../core/shield-store.js';

  let { task, onrowclick, searchQuery = '' } = $props();

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

  const handleRowClick = () => {
    AudioEngine.play('ui-click');
    onrowclick && onrowclick(task);
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
    return `<svg class="micro-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px; flex-shrink: 0;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/><path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  };

  // Derived calculations
  let overdueDays = $derived.by(() => {
    if (!task.deadlineDate) return 0;
    const deadlineTime = new Date(task.deadlineDate);
    if (isNaN(deadlineTime.getTime())) return 0;
    const current = new Date();
    deadlineTime.setHours(0,0,0,0);
    current.setHours(0,0,0,0);
    const diffTime = current.getTime() - deadlineTime.getTime();
    return diffTime / (1000 * 60 * 60 * 24);
  });

  let overdueText = $derived.by(() => {
    const days = Math.max(0, Math.floor(overdueDays));
    return `${days} ${days === 1 ? 'DAY' : 'DAYS'}`;
  });

  let isReschedulable = $derived.by(() => {
    if (task.isRescheduled) return false;
    if (overdueDays > 30) return false;
    return true;
  });

  let reschedulableReason = $derived.by(() => {
    if (task.isRescheduled) {
      return "RE-ALIGNMENT LOCKED: MAXIMUM RE-ALIGNMENT LIMIT REACHED (LOCKED TO ONE RE-ALIGNMENT)";
    }
    if (overdueDays > 30) {
      return "RE-ALIGNMENT LOCKED: OVERDUE EXCEEDS 30 DAYS EXPIRY WINDOW";
    }
    return "DEADLINE RE-ALIGNMENT STABLE";
  });

  const handleRescheduleStatusClick = (e: Event) => {
    e.stopPropagation();
    if (!isReschedulable) {
      AudioEngine.play('fail');
      triggerShield(reschedulableReason, 'CRITICAL', 3500);
    } else {
      handleRowClick();
    }
  };

  let formattedDeadline = $derived.by(() => {
    if (!task.deadlineDate) return 'NO DEADLINE';
    const parsedDate = Date.parse(task.deadlineDate);
    if (isNaN(parsedDate)) return task.deadlineDate;
    return new Date(parsedDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div 
  class="breach-task-row" 
  class:hovered={isHovered}
  onclick={handleRowClick}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Glowing left edge indicator -->
  <div class="priority-edge" class:high={task.priority === 'HIGH'} class:med={task.priority === 'MED'} class:low={task.priority === 'LOW'}></div>

  <!-- Specular highlight on hover -->
  {#if isHovered}
    <div class="row-specular-light"></div>
    <div class="hover-sweep"></div>
  {/if}

  <!-- ── Left Section (Priority Indicator Node) ── -->
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

  <!-- ── Center Section (Metadata, Title, Classifications) ── -->
  <div class="center-section">
    <div class="initiate-date-badge font-mono">INITIATED: {task.initiateDate}</div>
    <h4 class="task-title font-outfit">{@html highlightedTitle}</h4>
    <div class="tags-list">
      {#each task.tags as tag}
        <span class="fui-telemetry tag-label">
          {@html getTagIcon(tag)}
          {tag.replace('#', '')}
        </span>
      {/each}
    </div>
  </div>

  <!-- ── Right Section (Reschedulability Button, Deadline, Overdue Status, Priority Badge) ── -->
  <div class="right-section">
    <!-- Actionable Reschedulability Button/Status -->
    <div class="reschedule-status-container">
      <button 
        class="reschedule-status-btn font-outfit"
        class:locked={!isReschedulable}
        onclick={handleRescheduleStatusClick}
        title={reschedulableReason}
      >
        {#if isReschedulable}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="status-icon-svg rotate-anim">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          REALIGNABLE
        {:else}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="status-icon-svg">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          DRIFT LOCKED
        {/if}
      </button>
    </div>

    <!-- Deadline Block -->
    <div class="right-block deadline-block">
      <span class="right-label">DEADLINE</span>
      <span class="right-val date-val font-mono">{formattedDeadline}</span>
    </div>

    <!-- Overdue Block -->
    <div class="right-block overdue-block">
      <span class="right-label">OVERDUE</span>
      <span class="right-val overdue-val font-mono">{overdueText}</span>
    </div>

    <!-- Priority Badge -->
    <div class="priority-badge-container">
      <span class="priority-badge p-badge-{task.priority.toLowerCase()}">{task.priority}</span>
    </div>
  </div>
</div>

<style>
  .breach-task-row {
    display: grid;
    grid-template-columns: 40px 1fr 580px;
    align-items: center;
    gap: 24px;
    padding: 28px 24px;
    min-height: 116px;
    cursor: pointer;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.35s ease;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255, 45, 85, 0.08);
    width: 100%;
  }

  .breach-task-row:hover,
  .breach-task-row.hovered {
    transform: translateX(4px);
    background-color: rgba(255, 45, 85, 0.03);
    border-bottom-color: rgba(255, 45, 85, 0.22);
  }

  /* Left priority edge accent */
  .priority-edge {
    position: absolute;
    left: 0; top: 15%; bottom: 15%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(255, 45, 85, 0.5);
    z-index: 1;
    transition: all 0.35s ease;
    filter: blur(0.5px);
  }

  .breach-task-row:hover .priority-edge,
  .breach-task-row.hovered .priority-edge {
    top: 10%; bottom: 10%;
  }

  .priority-edge.high {
    background: rgba(255, 45, 85, 0.7);
    box-shadow: 0 0 12px rgba(255, 45, 85, 0.5);
  }
  .priority-edge.med {
    background: rgba(255, 184, 0, 0.65);
    box-shadow: 0 0 12px rgba(255, 184, 0, 0.4);
  }
  .priority-edge.low {
    background: rgba(0, 255, 159, 0.6);
    box-shadow: 0 0 12px rgba(0, 255, 159, 0.4);
  }

  .row-specular-light {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 45, 85, 0.3) 30%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 45, 85, 0.3) 70%, transparent 100%);
    pointer-events: none;
    z-index: 1;
  }

  .hover-sweep {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(255, 45, 85, 0.04) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Left Section ── */
  .left-section {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  /* Tactical priority node */
  .priority-node {
    position: relative;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .node-core {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 45, 85, 1);
    z-index: 2;
    position: relative;
  }

  .node-ring {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 45, 85, 0.5);
    animation: nodeRingPulse 2.5s ease-in-out infinite;
    z-index: 1;
  }

  .node-glow {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 45, 85, 0.3);
    filter: blur(8px);
    z-index: 0;
  }

  @keyframes nodeRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%       { transform: scale(1.4); opacity: 0.15; }
  }

  /* Threat specific node colors */
  .priority-node.high .node-core { background: #ff2d55; }
  .priority-node.high .node-ring { border-color: rgba(255, 45, 85, 0.5); }
  .priority-node.high .node-glow { background: rgba(255, 45, 85, 0.3); }

  .priority-node.med .node-core { background: #ffb800; }
  .priority-node.med .node-ring { border-color: rgba(255, 184, 0, 0.5); }
  .priority-node.med .node-glow { background: rgba(255, 184, 0, 0.3); }

  .priority-node.low .node-core { background: #00ff9f; }
  .priority-node.low .node-ring { border-color: rgba(0, 255, 159, 0.5); }
  .priority-node.low .node-glow { background: rgba(0, 255, 159, 0.3); }

  /* ── Center Section ── */
  .center-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    z-index: 2;
  }

  .initiate-date-badge {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: rgba(255, 45, 85, 0.75);
    text-transform: uppercase;
    text-shadow: 0 0 10px rgba(255, 45, 85, 0.2);
  }

  .task-title {
    margin: 0 0 4px 0;
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #ffffff;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
    transition: color 0.3s ease, text-shadow 0.3s ease;
  }

  .breach-task-row:hover .task-title {
    text-shadow: 0 0 25px rgba(255,255,255,0.25), 0 0 50px rgba(255, 45, 85, 0.15);
  }

  .tags-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag-label {
    display: inline-flex;
    align-items: center;
    font-size: 0.67rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: rgba(255, 45, 85, 0.85);
    background: rgba(255, 45, 85, 0.06);
    border: 1px solid rgba(255, 45, 85, 0.22);
    padding: 3px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    backdrop-filter: blur(5px);
    transition: all 0.2s ease;
  }

  .breach-task-row:hover .tag-label {
    border-color: rgba(255, 45, 85, 0.4);
    background: rgba(255, 45, 85, 0.12);
  }

  :global(.micro-icon) {
    color: currentColor;
    flex-shrink: 0;
  }

  /* ── Right Section ── */
  .right-section {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: flex-end;
    z-index: 2;
    width: 580px;
  }

  .right-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }

  .deadline-block {
    width: 145px;
    flex-shrink: 0;
  }

  .overdue-block {
    width: 155px;
    flex-shrink: 0;
  }

  .right-label {
    font-size: 13.5px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .right-val {
    font-weight: 900;
    font-size: 18.5px;
    letter-spacing: 0.04em;
    text-align: left;
  }

  .date-val {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 0 12px rgba(255, 255, 255, 0.12);
  }

  .overdue-val {
    color: #ff2d55;
    text-shadow: 0 0 14px rgba(255, 45, 85, 0.7);
    text-transform: uppercase;
  }

  /* Reschedulability button/status styling */
  .reschedule-status-container {
    display: flex;
    align-items: center;
    width: 125px;
    flex-shrink: 0;
    margin-right: 48px;
  }

  .reschedule-status-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    cursor: pointer;
    outline: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
    text-transform: uppercase;
    background: rgba(0, 255, 159, 0.12);
    border: 1.5px solid rgba(0, 255, 159, 0.45);
    color: #00ff9f;
    box-shadow: 0 0 8px rgba(0, 255, 159, 0.15);
    width: 100%;
    justify-content: center;
  }

  .reschedule-status-btn:hover:not(.locked) {
    background: #00ff9f;
    color: #0b0f19;
    box-shadow: 0 0 15px rgba(0, 255, 159, 0.5);
  }

  .reschedule-status-btn.locked {
    background: rgba(255, 45, 85, 0.08);
    border-color: rgba(255, 45, 85, 0.35);
    color: #ff2d55;
    opacity: 0.65;
    box-shadow: none;
  }

  .reschedule-status-btn.locked:hover {
    opacity: 0.95;
    background: rgba(255, 45, 85, 0.15);
    box-shadow: 0 0 12px rgba(255, 45, 85, 0.25);
  }

  .status-icon-svg {
    flex-shrink: 0;
  }

  .rotate-anim {
    animation: rotateSlow 8s linear infinite;
  }

  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Priority Badge */
  .priority-badge-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    flex-shrink: 0;
  }

  .priority-badge {
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

  .font-outfit { font-family: 'Outfit', sans-serif; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  :global(.fui-highlight) {
    background: rgba(255, 45, 85, 0.22) !important;
    color: #fff !important;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.5) !important;
    padding: 0 4px;
    border-bottom: 2px solid var(--critical-alert);
    border-radius: 2px;
  }
</style>
