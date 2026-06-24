<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';
  import { addNotification } from '../../../core/store';
  import { triggerShield } from '../../../core/shield-store.js';

  let { isOpen = false, onclose, mission = null } = $props();

  // ── State ──
  let tiltX = $state(0);
  let tiltY = $state(0);
  let isScopeHovered = $state(false);
  let showCommentPopup = $state(false);

  // objectives loaded from localStorage
  let objectives = $state<{ text: string; done: boolean }[]>([]);
  let auditScrollContainer = $state<HTMLDivElement | null>(null);
  let subtaskListContainer  = $state<HTMLDivElement | null>(null);

  // Mission meta
  let missionTitle    = $derived(mission?.title || '');
  let threatLevel     = $derived(mission?.priority || 'MED');
  let deadlineDate    = $derived(mission?.deadlineDate || '');
  let classifications = $derived((mission?.classifications || []).map((c: string) => c.startsWith('#') ? c : `#${c}`));
  let resolution      = $derived(mission?.resolution || null);        // 'VICTORY' | 'ABORTED'
  let isDriftAbort    = $derived(mission?.classifications?.includes('DRIFT-ABORTED') || mission?.tags?.includes('DRIFT-ABORTED'));

  const isVictory  = $derived(resolution === 'VICTORY');
  const isAborted  = $derived(resolution === 'ABORTED');

  // ── Praise / Insult lines ──
  const victoryLines  = [
    'SECTOR SECURED. WELL EXECUTED, OPERATIVE.',
    'MISSION COMPLETE. THE SYSTEM ACKNOWLEDGES YOUR DISCIPLINE.',
    'FLAWLESS EXECUTION. INTEL ARCHIVED.',
    'CONTAINMENT VERIFIED. THREAT NEUTRALIZED.',
  ];

  const abortedLines = [
    'MISSION COLLAPSED. FAILURE LOGGED.',
    'OBJECTIVE ABANDONED. WEAK RESOLVE DETECTED.',
    'PURGE AUTHORIZED — MISSION COMPROMISED.',
    'INCOMPLETE OPERATION. RECORD SEALED.',
  ];

  const driftLines = [
    'DEADLINE BREACHED, THEN ABANDONED. UNACCEPTABLE.',
    'DRIFT-ABORT LOGGED. TWICE FAILED.',
    'RESCHEDULED AND STILL FELL. SYSTEM JUDGES.',
    'SECOND CHANCE WASTED. PERMANENTLY SEALED.',
  ];

  // Pick a deterministic line based on mission id
  let resolutionLine = $derived.by(() => {
    if (!mission) return '';
    const idx = (mission.id || 0) % 4;
    if (isDriftAbort) return driftLines[idx];
    if (isVictory)    return victoryLines[idx];
    return abortedLines[idx];
  });

  // ── Comment loaded from DB via mission.resolutionComment (synced from SQLite) ──
  let storedComment = $derived.by(() => {
    if (!mission?.id) return '';
    // Primary: DB-backed field (from syncAntaryami → resolution_comment column)
    return mission.resolutionComment || '';
  });

  let dbAuditLogs = $state<{ action: string; logged_at: string; description: string }[]>([]);

  const loadAuditLogs = async () => {
    if (window.stratagemAPI?.getAuditLog && mission?.id) {
      try {
        const logs = await window.stratagemAPI.getAuditLog(mission.id);
        dbAuditLogs = logs || [];
      } catch (err) {
        console.error('Failed to load audit logs from DB:', err);
      }
    }
  };

  // ── Timeline ──
  let auditFlow = $derived.by(() => {
    if (dbAuditLogs && dbAuditLogs.length > 0) {
      return dbAuditLogs.map(log => ({
        label: log.action.replace(/_/g, ' '),
        description: log.description,
        date: fmt(log.logged_at)
      })).reverse();
    }

    const flow: { label: string; description: string; date: string }[] = [];
    if (!mission) return flow;
    if (mission.createdAt)    flow.push({ label: 'CREATION TIME',    description: 'Operation registered in tactical database.', date: fmt(mission.createdAt) });
    if (mission.initiatedAt)  flow.push({ label: 'INITIATION TIME',  description: 'Operation initiated in execution sector.', date: fmt(mission.initiatedAt) });
    if (mission.rescheduledAt) flow.push({ label: 'RESCHEDULE DATE', description: 'Temporal boundaries recalibrated.', date: fmt(mission.rescheduledAt) });
    if (mission.resolution) {
      const label = mission.resolution === 'VICTORY' ? 'VICTORY DATE' : 'ABORTION DATE';
      const d = mission.completionDate ? `${mission.completionDate} 12:00` : new Date().toISOString();
      flow.push({ label, description: mission.resolution === 'VICTORY' ? 'Operation concluded successfully.' : 'Operation aborted / purged.', date: fmt(d) });
    }
    return flow;
  });

  function fmt(raw: string): string {
    if (!raw) return '—';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`;
    const m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
    return raw;
  }

  function cleanAuditDescription(label: string, desc: string): string {
    if (!desc) return '';
    return desc
      .replace(/Tactical operations center authorized covert operation:\s*/i, 'Operation: ')
      .replace(/with threat level:\s*/i, '| Threat Level: ')
      .replace(/Tactical sector state transitioned to status:\s*/i, 'Status updated: ')
      .replace(/Threat parameters recalibrated to classification:\s*/i, 'Threat level: ')
      .replace(/Tactical protocol details synchronized:\s*/i, 'Protocol sync: ')
      .replace(/Mission temporal boundary aligned to:\s*/i, 'Boundary aligned: ')
      .replace(/Emergency realignment: temporal boundary adjusted to:\s*/i, 'Emergency boundary adjust: ')
      .replace(/Operator debrief logged:\s*/i, 'Debrief: ');
  }

  function getTagPresetClass(tag: string) {
    const clean = tag.replace('#', '');
    if (clean === 'DRIFT-ABORTED') return 'tag-preset-drift-abort';
    let hash = 0;
    for (let i = 0; i < clean.length; i++) hash += clean.charCodeAt(i);
    return `tag-preset-${hash % 5}`;
  }

  // ── Mouse tilt ──
  const handleMouseMove = (e: MouseEvent) => {
    if (!isOpen) return;
    tiltX = ((e.clientX / window.innerWidth)  - 0.5) * 6;
    tiltY = ((e.clientY / window.innerHeight) - 0.5) * -6;
  };

  // ── Read-only warning on blocked interactions ──
  const warnReadOnly = () => {
    AudioEngine.play('alarm_warning');
    addNotification('CLASSIFIED RECORD', 'Archived missions are sealed — no edits permitted.', 'error');
    triggerShield('READ-ONLY VAULT', 'WARNING', 2500);
  };

  // ── Load objectives from localStorage ──
  $effect(() => {
    if (isOpen && mission) {
      AudioEngine.play('access_handshake');

      const key = `stratagem_objectives_${mission.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { objectives = JSON.parse(saved); } catch { objectives = []; }
      } else { objectives = []; }

      loadAuditLogs();

      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }
  });

  // Auto-scroll audit
  $effect(() => {
    if (isOpen && auditScrollContainer) {
      setTimeout(() => {
        auditScrollContainer?.scrollTo({ top: auditScrollContainer.scrollHeight, behavior: 'smooth' });
      }, 150);
    }
  });

  let progressPct = $derived(
    objectives.length > 0
      ? Math.round((objectives.filter(o => o.done).length / objectives.length) * 100)
      : (isVictory ? 100 : 0)
  );
</script>

{#if isOpen}
  <!-- Overlay -->
  <div class="overlay-backdrop" onclick={onclose} role="presentation" transition:fade={{ duration: 150 }}>

    <!-- Background aura -->
    <div class="pulsar-void">
      <div class="pulsar-core" class:core-victory={isVictory} class:core-aborted={isAborted && !isDriftAbort} class:core-drift={isDriftAbort}></div>
      <div class="void-ray r1"></div>
      <div class="void-ray r2"></div>
      <div class="reactive-dust"></div>
    </div>
    <div class="overlord-blur-isolation"></div>

    <!-- Modal panel -->
    <div
      class="archive-view-panel"
      onclick={(e) => e.stopPropagation()}
      role="presentation"
      transition:fly={{ y: 80, duration: 250 }}
      style="transform: perspective(3000px) rotateX({tiltY}deg) rotateY({tiltX}deg)"
    >
      <!-- Glass overlays -->
      <div class="chromatic-aura-edge" class:aura-victory={isVictory} class:aura-aborted={isAborted && !isDriftAbort} class:aura-drift={isDriftAbort}></div>
      <div class="celestial-glass-finish"></div>
      <div class="scanlines-texture"></div>

      <!-- ── Header ── -->
      <header class="avp-header">
        <!-- Sniper scope -->
        <div class="omni-scope-terminal"
          class:acquired={isScopeHovered}
          onmouseenter={() => { isScopeHovered = true; AudioEngine.play('data_decode'); }}
          onmouseleave={() => isScopeHovered = false}
          role="button" tabindex="0"
          onclick={() => AudioEngine.play('success')}
        >
          <div class="scope-chassis">
            <div class="chassis-segment top"></div><div class="chassis-segment right"></div>
            <div class="chassis-segment bottom"></div><div class="chassis-segment left"></div>
          </div>
          <div class="scope-data-rings">
            <div class="data-ring ring-cyan"></div>
            <div class="data-ring ring-violet"></div>
          </div>
          <div class="scope-reticle-core">
            <div class="lens-glint-effect"></div>
            <svg class="reticle-svg" width="100" height="100" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="avp-primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--primary-accent)" />
                  <stop offset="100%" stop-color="var(--secondary-accent)" />
                </linearGradient>
                <linearGradient id="avp-utilityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--tertiary-accent)" />
                  <stop offset="100%" stop-color="var(--secure-status)" />
                </linearGradient>
                <linearGradient id="avp-brightCross" x1="-286" y1="50" x2="386" y2="50" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stop-color="var(--tertiary-accent)" stop-opacity="0" />
                  <stop offset="50%"  stop-color="#ffffff" stop-opacity="1" />
                  <stop offset="100%" stop-color="var(--primary-accent)"   stop-opacity="0" />
                </linearGradient>
              </defs>
              <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#avp-utilityGrad)" stroke-width="0.75" class="plus-line" />
              <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#avp-utilityGrad)" stroke-width="0.75" class="plus-line" />
              <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#avp-brightCross)" stroke-width="0.5" class="rotating-cross-line" />
              <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#avp-brightCross)" stroke-width="0.5" class="rotating-cross-line" />
              <circle cx="50" cy="50" r="38" stroke="url(#avp-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
              <circle cx="50" cy="50" r="23" stroke="url(#avp-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
              <circle cx="50" cy="50" r="5"  fill="url(#avp-primaryGrad)" class="center-dot" />
            </svg>
          </div>
        </div>

        <!-- Title area -->
        <div class="header-title-area">
          <div class="system-breadcrumb font-mono">
            VAULT / ARCHIVE /
            {#if isDriftAbort}
              <span class="bc-drift">DRIFT-ABORTED</span>
            {:else if isVictory}
              <span class="bc-victory">VICTORY</span>
            {:else}
              <span class="bc-aborted">ABORTED</span>
            {/if}
          </div>
          <h2 class="mission-title-display">{missionTitle}</h2>

          <!-- Seal marker -->
          <div class="sealed-marker" class:sealed-victory={isVictory} class:sealed-aborted={isAborted && !isDriftAbort} class:sealed-drift={isDriftAbort}>
            {#if isDriftAbort}
              ⚡ DRIFT-ABORT SEALED
            {:else if isVictory}
              ✓ VICTORY SEALED
            {:else}
              ✕ ABORT SEALED
            {/if}
          </div>
        </div>

        <!-- Close -->
        <button class="close-btn" onclick={onclose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      </header>

      <!-- ── Body (2-column) ── -->
      <div class="avp-body">

        <!-- LEFT column -->
        <div class="avp-left">

          <!-- Threat Level (read-only display) -->
          <section class="avp-section">
            <div class="section-label">THREAT LEVEL</div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="threat-selector" onclick={warnReadOnly}>
              {#each ['LOW', 'MED', 'HIGH'] as level}
                <button
                  class="threat-btn threat-{level.toLowerCase()}"
                  class:active={threatLevel === level}
                  onclick={(e) => { e.stopPropagation(); warnReadOnly(); }}
                >
                  {level}
                </button>
              {/each}
              <div class="readonly-lock">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                SEALED
              </div>
            </div>
          </section>

          <!-- Deadline (read-only) -->
          <section class="avp-section">
            <div class="section-label">TEMPORAL BOUNDARY</div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="deadline-display" onclick={warnReadOnly}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span class="deadline-value">{deadlineDate || 'N/A'}</span>
              <div class="readonly-lock">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                SEALED
              </div>
            </div>
          </section>

          <!-- Classifications (read-only) -->
          <section class="avp-section">
            <div class="section-label">CLASSIFICATIONS</div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="tags-area" onclick={warnReadOnly}>
              <div class="tags-chips">
                {#each classifications as tag}
                  <span class="tag-chip {getTagPresetClass(tag)}">{tag}</span>
                {/each}
              </div>
              <div class="readonly-lock">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                SEALED
              </div>
            </div>
          </section>

          <!-- Intel File (read-only) -->
          <section class="avp-section">
            <div class="section-label">INTEL FILE</div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="intel-area" onclick={warnReadOnly}>
              <div class="intel-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.5)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span>INTEL FILE — READ-ONLY ACCESS</span>
              </div>
              <div class="readonly-lock">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                SEALED
              </div>
            </div>
          </section>

        </div>

        <!-- RIGHT column -->
        <div class="avp-right">

          <!-- Sub-tasks (read-only) -->
          <section class="avp-section subtask-section">
            <div class="section-label-row">
              <div class="section-label">SUB-OBJECTIVES</div>
              <div class="progress-inline">
                <div class="progress-track">
                  <div class="progress-fill" style="width: {progressPct}%" class:fill-victory={isVictory} class:fill-aborted={isAborted && !isDriftAbort} class:fill-drift={isDriftAbort}></div>
                </div>
                <span class="progress-pct">{progressPct}%</span>
              </div>
            </div>

            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="subtask-list" bind:this={subtaskListContainer} onclick={warnReadOnly}>
              {#if objectives.length === 0}
                <div class="subtask-empty">NO OBJECTIVES RECORDED</div>
              {:else}
                {#each objectives as obj}
                  <div class="subtask-row" class:done={obj.done}>
                    <div class="subtask-check" class:checked={obj.done}>
                      {#if obj.done}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6L9 17L4 12"/></svg>
                      {/if}
                    </div>
                    <span class="subtask-text">{obj.text}</span>
                    <div class="subtask-lock">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Blocked "add" input -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="add-subtask-blocked" onclick={warnReadOnly}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              INJECT OBJECTIVE — ACCESS DENIED
            </div>
          </section>

          <!-- Timeline / Audit Flow -->
          <section class="avp-section audit-section">
            <div class="section-label">MISSION TIMELINE</div>
            <div class="audit-flow" bind:this={auditScrollContainer}>
              {#each auditFlow as entry, i}
                <div class="audit-item" class:last={i === auditFlow.length - 1}>
                  <div class="audit-dot" class:dot-victory={isVictory && i === auditFlow.length - 1} class:dot-abort={isAborted && i === auditFlow.length - 1}></div>
                  <div class="audit-content">
                    {#if entry.description}
                      <span class="audit-desc">{cleanAuditDescription(entry.label, entry.description)}</span>
                    {/if}
                    <span class="audit-date">{entry.date}</span>
                  </div>
                </div>
              {/each}
            </div>
          </section>

        </div>
      </div>

      <!-- ── Footer: Resolution Button ── -->
      <footer class="avp-footer">
        <div class="footer-left">
          <span class="footer-mission-id font-mono">MISSION #{mission?.id || '—'}</span>
          <span class="footer-sep">·</span>
          <span class="footer-priority font-mono">
            {#if isDriftAbort}
              <span style="color: #ff2d55;">⚡ DRIFT-ABORTED RECORD</span>
            {:else if isVictory}
              <span style="color: #00ff9f;">✓ VICTORY RECORD</span>
            {:else}
              <span style="color: #ef4444;">✕ ABORTED RECORD</span>
            {/if}
          </span>
        </div>

        <!-- The big combined resolution button -->
        <button
          class="resolution-btn"
          class:res-victory={isVictory}
          class:res-aborted={isAborted && !isDriftAbort}
          class:res-drift={isDriftAbort}
          onclick={() => { AudioEngine.play('ui-click'); showCommentPopup = true; }}
        >
          <div class="res-btn-glow"></div>
          <div class="res-btn-inner">
            <div class="res-icon">
              {#if isDriftAbort}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 19.5H22L12 2Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9V13" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
              {:else if isVictory}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 11L11 13L15 9" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {/if}
            </div>
            <div class="res-text-block">
              <span class="res-status-label">
                {#if isDriftAbort}DRIFT-ABORTED{:else if isVictory}VICTORY{:else}ABORTED{/if}
              </span>
              <span class="res-praise-line">{resolutionLine}</span>
            </div>
            <div class="res-view-comment">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              DEBRIEF
            </div>
          </div>
        </button>
      </footer>

    </div><!-- /modal-panel -->
  </div><!-- /overlay -->

  <!-- ── Comment Popup ── -->
  {#if showCommentPopup}
    <div
      class="comment-popup-overlay"
      onclick={() => { AudioEngine.play('ui-click'); showCommentPopup = false; }}
      role="presentation"
      transition:fade={{ duration: 120 }}
    >
      <div
        class="comment-popup"
        class:popup-victory={isVictory}
        class:popup-aborted={isAborted && !isDriftAbort}
        class:popup-drift={isDriftAbort}
        onclick={(e) => e.stopPropagation()}
        role="presentation"
        transition:fly={{ y: -30, duration: 200 }}
      >
        <div class="popup-header">
          <div class="popup-icon">
            {#if isDriftAbort}⚡{:else if isVictory}✓{:else}✕{/if}
          </div>
          <div class="popup-header-text">
            <span class="popup-title">
              {#if isDriftAbort}DRIFT-ABORT DEBRIEF{:else if isVictory}VICTORY DEBRIEF{:else}ABORT DEBRIEF{/if}
            </span>
            <span class="popup-subtitle">OPERATIVE STATEMENT ON RECORD</span>
          </div>
          <button class="popup-close" onclick={() => { AudioEngine.play('ui-click'); showCommentPopup = false; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6L18 18"/></svg>
          </button>
        </div>

        <!-- Drift-abort warning marker -->
        {#if isDriftAbort}
          <div class="drift-warning-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 19.5H22L12 2Z" stroke-linecap="round"/><path d="M12 9V13" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
            RESCHEDULED DEADLINE ALSO BREACHED — TERMINATED AFTER SECOND FAILURE
          </div>
        {/if}

        <div class="popup-body">
          {#if storedComment && storedComment.trim()}
            <p class="popup-comment">{storedComment}</p>
          {:else}
            <div class="popup-no-comment">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>NO DEBRIEF STATEMENT FILED</span>
              <span class="popup-no-comment-sub">Operative logged no comment at resolution time.</span>
            </div>
          {/if}
        </div>

        <div class="popup-footer-line">
          <span class="popup-praise">{resolutionLine}</span>
        </div>
      </div>
    </div>
  {/if}

{/if}

<style>
  /* ── Overlay & Backdrop ── */
  .overlay-backdrop {
    position: fixed;
    top: 80px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  /* ── Pulsar void background ── */
  .pulsar-void {
    display: none;
  }

  .pulsar-core {
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.25;
    animation: coreBreath 6s ease-in-out infinite alternate;
    background: radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%);
  }
  .pulsar-core.core-victory  { background: radial-gradient(circle, rgba(0,255,159,0.7) 0%, transparent 70%); }
  .pulsar-core.core-aborted  { background: radial-gradient(circle, rgba(239,68,68,0.7) 0%, transparent 70%); }
  .pulsar-core.core-drift    { background: radial-gradient(circle, rgba(255,45,85,0.75) 0%, transparent 70%); }

  @keyframes coreBreath {
    from { transform: scale(0.9); opacity: 0.2; }
    to   { transform: scale(1.15); opacity: 0.32; }
  }

  .void-ray {
    position: absolute;
    width: 2px;
    background: linear-gradient(to top, rgba(139,92,246,0), rgba(139,92,246,0.25), rgba(139,92,246,0));
    transform-origin: bottom center;
    opacity: 0.4;
    border-radius: 2px;
    pointer-events: none;
  }
  .r1 { height: 55vh; bottom: 50%; left: calc(50% - 1px); transform: rotate(-30deg); animation: rayDrift 8s ease-in-out infinite alternate; }
  .r2 { height: 45vh; bottom: 50%; left: calc(50% - 1px); transform: rotate(30deg);  animation: rayDrift 10s ease-in-out infinite alternate-reverse; }
  @keyframes rayDrift { 0% { opacity: 0.2; } 100% { opacity: 0.5; } }

  .reactive-dust {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%);
  }

  .overlord-blur-isolation {
    display: none;
  }

  /* ── Modal Panel ── */
  .archive-view-panel {
    position: relative;
    width: min(96vw, 1120px);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(155deg, rgba(12, 8, 28, 0.97) 0%, rgba(6, 4, 16, 0.99) 100%);
    border-radius: 20px;
    border: 1px solid rgba(139,92,246,0.25);
    box-shadow: 0 40px 100px rgba(0,0,0,0.85), 0 0 60px rgba(109,40,217,0.12), inset 0 1px 0 rgba(255,255,255,0.06);
    overflow: hidden;
    z-index: 9001;
    transform-style: preserve-3d;
  }

  /* Aura edge colored by resolution */
  .chromatic-aura-edge {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;
    box-shadow: inset 0 0 60px rgba(139,92,246,0.06);
  }
  .chromatic-aura-edge.aura-victory  { box-shadow: inset 0 0 60px rgba(0,255,159,0.06),  0 0 40px rgba(0,255,159,0.06); }
  .chromatic-aura-edge.aura-aborted  { box-shadow: inset 0 0 60px rgba(239,68,68,0.06),   0 0 40px rgba(239,68,68,0.06); }
  .chromatic-aura-edge.aura-drift    { box-shadow: inset 0 0 60px rgba(255,45,85,0.08),   0 0 45px rgba(255,45,85,0.08); }

  .celestial-glass-finish {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 40%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.18) 60%, transparent 100%);
    z-index: 1;
  }

  .scanlines-texture {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(139,92,246,0.008) 3px, rgba(139,92,246,0.008) 4px);
    pointer-events: none;
    z-index: 1;
  }

  /* ── Header ── */
  .avp-header {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 24px 28px 20px;
    border-bottom: 1px solid rgba(139,92,246,0.12);
    flex-shrink: 0;
  }

  /* ── Sniper Scope (same as MissionProtocol) ── */
  .omni-scope-terminal {
    width: 100px;
    height: 100px;
    position: relative;
    flex-shrink: 0;
    cursor: crosshair;
    overflow: visible;
  }

  .scope-chassis {
    position: absolute;
    inset: 0;
    animation: chassis-spin 40s linear infinite, chassis-pulse 3s infinite alternate ease-in-out;
    overflow: visible !important;
  }
  .chassis-segment {
    position: absolute;
    background: linear-gradient(135deg, rgba(139,92,246,0.7), rgba(6,182,212,0.5));
    border-radius: 2px;
  }
  .chassis-segment.top    { top: 0;    left: 30%;  right: 30%; height: 3px; }
  .chassis-segment.bottom { bottom: 0; left: 30%;  right: 30%; height: 3px; }
  .chassis-segment.left   { left: 0;   top: 30%;   bottom: 30%; width: 3px; }
  .chassis-segment.right  { right: 0;  top: 30%;   bottom: 30%; width: 3px; }

  .scope-data-rings {
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .data-ring {
    position: absolute;
    border-radius: 50%;
    border-width: 1.5px;
    border-style: solid;
    opacity: 0.5;
    transition: all 0.5s ease-in-out;
  }
  .ring-cyan   { width: 78px; height: 78px; border-color: #06b6d4; border-style: dashed; animation: data-ring-breath-a 6s ease-in-out infinite alternate; }
  .ring-violet { width: 62px; height: 62px; border-color: #8b5cf6; border-style: dotted; animation: data-ring-breath-b 4s ease-in-out infinite alternate-reverse; }

  @keyframes chassis-spin { from { rotate: 0deg; } to { rotate: 360deg; } }
  @keyframes chassis-pulse {
    0% { scale: 1; opacity: 0.85; }
    100% { scale: 1.04; opacity: 1; }
  }
  @keyframes data-ring-breath-a { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.2; } 100% { transform: scale(1.05) rotate(90deg); opacity: 0.6; } }
  @keyframes data-ring-breath-b { 0% { transform: scale(1.1) rotate(0deg); opacity: 0.5; } 100% { transform: scale(0.8) rotate(-180deg); opacity: 0.3; } }

  .scope-reticle-core {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lens-glint-effect {
    position: absolute;
    top: 15%; left: 20%;
    width: 20%; height: 20%;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, transparent 80%);
    pointer-events: none;
    z-index: 5;
  }

  .reticle-svg { overflow: visible; }

  .plus-line { animation: crossPulse 3s ease-in-out infinite alternate; }
  @keyframes crossPulse { 0% { opacity: 0.4; } 100% { opacity: 0.9; } }

  .rotating-cross-line { animation: crossRotate 12s linear infinite; transform-origin: 50px 50px; }
  @keyframes crossRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .outer-broken-ring { animation: ringBreath 3s ease-in-out infinite alternate; transform-origin: 50px 50px; }
  @keyframes ringBreath { 0% { stroke-dashoffset: 0; opacity: 0.6; } 100% { stroke-dashoffset: -34; opacity: 1; } }

  .inner-broken-ring { animation: innerRingBreath 2.5s ease-in-out infinite alternate; transform-origin: 50px 50px; }
  @keyframes innerRingBreath { 0% { stroke-dashoffset: 0; opacity: 0.5; } 100% { stroke-dashoffset: 18; opacity: 0.9; } }

  .center-dot { animation: dotGlow 2s ease-in-out infinite alternate; }
  @keyframes dotGlow { 0% { filter: blur(0px); opacity: 0.8; } 100% { filter: blur(1.5px); opacity: 1; } }

  .omni-scope-terminal.acquired .outer-broken-ring { animation-duration: 0.8s; }
  .omni-scope-terminal.acquired .chassis-segment    { filter: brightness(1.5); }

  /* Header title area */
  .header-title-area {
    flex: 1;
    min-width: 0;
  }

  .system-breadcrumb {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .bc-victory { color: rgba(0,255,159,0.8); }
  .bc-aborted { color: rgba(239,68,68,0.8); }
  .bc-drift   { color: rgba(255,45,85,0.85); }

  .mission-title-display {
    font-family: 'Outfit', sans-serif;
    font-size: 1.65rem;
    font-weight: 900;
    color: #ffffff;
    margin: 0 0 10px;
    letter-spacing: 0.04em;
    text-shadow: 0 0 30px rgba(255,255,255,0.15);
    line-height: 1.2;
    word-break: break-word;
  }

  .sealed-marker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.2em;
    padding: 3px 12px;
    border-radius: 4px;
  }

  .sealed-victory {
    color: #00ff9f;
    background: rgba(0,255,159,0.1);
    border: 1px solid rgba(0,255,159,0.35);
    box-shadow: 0 0 12px rgba(0,255,159,0.2);
  }
  .sealed-aborted {
    color: #ef4444;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.35);
    box-shadow: 0 0 12px rgba(239,68,68,0.2);
  }
  .sealed-drift {
    color: #ff2d55;
    background: rgba(255,45,85,0.14);
    border: 1px solid rgba(255,45,85,0.5);
    box-shadow: 0 0 14px rgba(255,45,85,0.3);
    animation: driftMarkerPulse 2.5s ease-in-out infinite alternate;
  }
  @keyframes driftMarkerPulse {
    from { box-shadow: 0 0 10px rgba(255,45,85,0.25); }
    to   { box-shadow: 0 0 20px rgba(255,45,85,0.55); }
  }

  .close-btn {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.55);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    outline: none;
  }
  .close-btn:hover { background: rgba(255,45,85,0.15); border-color: rgba(255,45,85,0.5); color: #ff2d55; }

  /* ── Body ── */
  .avp-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    flex: 1;
    overflow: hidden;
    position: relative;
    z-index: 2;
  }

  .avp-left, .avp-right {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    padding: 24px 28px;
    scrollbar-width: none;
  }
  .avp-left::-webkit-scrollbar, .avp-right::-webkit-scrollbar { display: none; }

  .avp-left  { border-right: 1px solid rgba(139,92,246,0.08); }

  /* ── Sections ── */
  .avp-section {
    margin-bottom: 20px;
  }

  .section-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 9.5px;
    font-weight: 900;
    color: rgba(139,92,246,0.65);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(139,92,246,0.1);
  }

  .section-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(139,92,246,0.1);
  }

  .section-label-row .section-label {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
  }

  /* Readonly lock badge */
  .readonly-lock {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.2);
    padding: 2px 7px;
    border-radius: 3px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    margin-left: auto;
    flex-shrink: 0;
    user-select: none;
  }

  /* Threat selector (display only) */
  .threat-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: not-allowed;
  }

  .threat-btn {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.14em;
    padding: 6px 18px;
    border-radius: 7px;
    cursor: not-allowed;
    opacity: 0.45;
    border: 1.5px solid transparent;
    background: transparent;
    color: rgba(255,255,255,0.3);
    outline: none;
    pointer-events: none;
  }
  .threat-btn.active { opacity: 1; pointer-events: none; }
  .threat-btn.threat-low.active  { color: #00ff9f; border-color: rgba(0,255,159,0.6); background: rgba(0,255,159,0.1); }
  .threat-btn.threat-med.active  { color: #ffb800; border-color: rgba(255,184,0,0.6); background: rgba(255,184,0,0.1); }
  .threat-btn.threat-high.active { color: #ff2d55; border-color: rgba(255,45,85,0.6); background: rgba(255,45,85,0.1); }

  /* Deadline display */
  .deadline-display {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 10px 14px;
    color: rgba(255,255,255,0.3);
    cursor: not-allowed;
  }
  .deadline-value {
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 900;
    color: rgba(255,255,255,0.65);
    letter-spacing: 0.08em;
    flex: 1;
  }

  /* Classifications */
  .tags-area {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    cursor: not-allowed;
    min-height: 36px;
  }
  .tags-chips { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
  .tag-chip {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 5px;
    letter-spacing: 0.08em;
    pointer-events: none;
  }
  .tag-preset-0 { background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; }
  .tag-preset-1 { background: rgba(6,182,212,0.1);   border: 1px solid rgba(6,182,212,0.3);   color: #67e8f9; }
  .tag-preset-2 { background: rgba(16,185,129,0.1);  border: 1px solid rgba(16,185,129,0.3);  color: #6ee7b7; }
  .tag-preset-3 { background: rgba(245,158,11,0.1);  border: 1px solid rgba(245,158,11,0.3);  color: #fcd34d; }
  .tag-preset-4 { background: rgba(236,72,153,0.1);  border: 1px solid rgba(236,72,153,0.3);  color: #f9a8d4; }
  .tag-preset-drift-abort { background: rgba(255,45,85,0.14) !important; border: 1px solid rgba(255,45,85,0.5) !important; color: #ff2d55 !important; box-shadow: 0 0 8px rgba(255,45,85,0.2); }

  /* Intel area */
  .intel-area {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 14px;
    cursor: not-allowed;
    min-height: 52px;
  }
  .intel-placeholder {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: rgba(139,92,246,0.4);
    letter-spacing: 0.1em;
  }

  /* ── Subtasks ── */
  .subtask-section { flex: 1; }

  .progress-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .progress-track {
    width: 90px;
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s ease;
    background: rgba(139,92,246,0.7);
  }
  .progress-fill.fill-victory  { background: rgba(0,255,159,0.8); }
  .progress-fill.fill-aborted  { background: rgba(239,68,68,0.7); }
  .progress-fill.fill-drift    { background: rgba(255,45,85,0.75); }
  .progress-pct {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.4);
  }

  .subtask-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: none;
    margin-bottom: 8px;
    cursor: not-allowed;
  }
  .subtask-list::-webkit-scrollbar { display: none; }

  .subtask-empty {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.15em;
    padding: 16px 0;
    text-align: center;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px;
    pointer-events: none;
  }
  .subtask-row.done { opacity: 0.55; }

  .subtask-check {
    width: 16px; height: 16px;
    border-radius: 4px;
    border: 1.5px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #00ff9f;
  }
  .subtask-check.checked { background: rgba(0,255,159,0.15); border-color: rgba(0,255,159,0.5); }

  .subtask-text {
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    flex: 1;
    pointer-events: none;
  }
  .subtask-row.done .subtask-text { text-decoration: line-through; color: rgba(255,255,255,0.3); }

  .subtask-lock { color: rgba(255,255,255,0.18); flex-shrink: 0; }

  .add-subtask-blocked {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 7px;
    border: 1px dashed rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.18);
    font-family: 'Rajdhani', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    cursor: not-allowed;
    user-select: none;
    margin-top: 4px;
  }

  /* ── Audit / Timeline ── */
  .audit-section { flex: 1; }
  .audit-flow {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: none;
    position: relative;
    padding-left: 20px;
  }
  .audit-flow::-webkit-scrollbar { display: none; }

  .audit-item {
    position: relative;
    padding: 8px 0 8px 16px;
    border-left: 1px solid rgba(139,92,246,0.15);
  }
  .audit-item.last { border-left-color: transparent; }

  .audit-dot {
    position: absolute;
    left: -4px;
    top: 12px;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: rgba(139,92,246,0.5);
    box-shadow: 0 0 6px rgba(139,92,246,0.35);
  }
  .audit-dot.dot-victory { background: #00ff9f; box-shadow: 0 0 8px rgba(0,255,159,0.6); }
  .audit-dot.dot-abort   { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.6); }

  .audit-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .audit-desc {
    font-family: 'Outfit', sans-serif;
    font-size: 1.15rem;
    font-weight: 500;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
  }
  .audit-date {
    font-family: ui-monospace, monospace;
    font-size: 0.9rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 4px;
  }

  /* ── Footer ── */
  .avp-footer {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 28px;
    border-top: 1px solid rgba(139,92,246,0.1);
    flex-shrink: 0;
    background: rgba(0,0,0,0.25);
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .footer-mission-id {
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.1em;
  }
  .footer-sep { color: rgba(255,255,255,0.15); }
  .footer-priority { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; }

  /* Resolution Button */
  .resolution-btn {
    position: relative;
    display: flex;
    align-items: stretch;
    height: 62px;
    min-width: 420px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    overflow: hidden;
    outline: none;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
    flex-shrink: 0;
  }

  .resolution-btn:hover {
    transform: translateY(-2px);
  }

  /* Victory */
  .resolution-btn.res-victory {
    background: linear-gradient(135deg, rgba(0,255,159,0.18) 0%, rgba(0,180,100,0.12) 60%, rgba(0,255,159,0.08) 100%);
    border: 1.5px solid rgba(0,255,159,0.55);
    box-shadow: 0 0 20px rgba(0,255,159,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .resolution-btn.res-victory:hover {
    box-shadow: 0 0 35px rgba(0,255,159,0.38), 0 8px 24px rgba(0,0,0,0.5);
  }

  /* Aborted */
  .resolution-btn.res-aborted {
    background: linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(180,20,40,0.12) 60%, rgba(239,68,68,0.08) 100%);
    border: 1.5px solid rgba(239,68,68,0.55);
    box-shadow: 0 0 20px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .resolution-btn.res-aborted:hover {
    box-shadow: 0 0 35px rgba(239,68,68,0.38), 0 8px 24px rgba(0,0,0,0.5);
  }

  /* Drift */
  .resolution-btn.res-drift {
    background: linear-gradient(135deg, rgba(255,45,85,0.2) 0%, rgba(160,10,40,0.15) 60%, rgba(255,45,85,0.1) 100%);
    border: 1.5px solid rgba(255,45,85,0.65);
    box-shadow: 0 0 22px rgba(255,45,85,0.28), inset 0 1px 0 rgba(255,255,255,0.07);
    animation: driftBtnPulse 3s ease-in-out infinite;
  }
  @keyframes driftBtnPulse {
    0%, 100% { box-shadow: 0 0 22px rgba(255,45,85,0.28); }
    50%       { box-shadow: 0 0 38px rgba(255,45,85,0.5); }
  }
  .resolution-btn.res-drift:hover {
    box-shadow: 0 0 45px rgba(255,45,85,0.55), 0 8px 24px rgba(0,0,0,0.5);
  }

  .res-btn-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
    pointer-events: none;
  }

  .res-btn-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 0 18px;
  }

  .res-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    opacity: 0.9;
  }
  .resolution-btn.res-victory .res-icon { color: #00ff9f; }
  .resolution-btn.res-aborted .res-icon { color: #ef4444; }
  .resolution-btn.res-drift .res-icon   { color: #ff2d55; }

  .res-text-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .res-status-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.22em;
    opacity: 0.65;
  }
  .resolution-btn.res-victory .res-status-label { color: #00ff9f; }
  .resolution-btn.res-aborted .res-status-label { color: #ef4444; }
  .resolution-btn.res-drift .res-status-label   { color: #ff2d55; }

  .res-praise-line {
    font-family: 'Outfit', sans-serif;
    font-size: 13.5px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: rgba(255,255,255,0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .res-view-comment {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.18em;
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6);
    background: rgba(255,255,255,0.04);
    transition: all 0.2s ease;
  }
  .resolution-btn:hover .res-view-comment {
    color: rgba(255,255,255,0.9);
    border-color: rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.08);
  }

  /* ── Comment Popup ── */
  .comment-popup-overlay {
    position: fixed;
    inset: 0;
    z-index: 9100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
  }

  .comment-popup {
    width: min(90vw, 520px);
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(155deg, rgba(14,10,30,0.98) 0%, rgba(8,5,18,0.99) 100%);
    border: 1px solid rgba(139,92,246,0.25);
    box-shadow: 0 30px 80px rgba(0,0,0,0.85);
  }

  .comment-popup.popup-victory { border-color: rgba(0,255,159,0.35); box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 30px rgba(0,255,159,0.08); }
  .comment-popup.popup-aborted { border-color: rgba(239,68,68,0.35); box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 30px rgba(239,68,68,0.08); }
  .comment-popup.popup-drift   { border-color: rgba(255,45,85,0.45); box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 35px rgba(255,45,85,0.12); }

  .popup-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .popup-icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .popup-victory .popup-icon { background: rgba(0,255,159,0.12); border: 1px solid rgba(0,255,159,0.35); color: #00ff9f; }
  .popup-aborted .popup-icon { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: #ef4444; }
  .popup-drift .popup-icon   { background: rgba(255,45,85,0.15); border: 1px solid rgba(255,45,85,0.5);  color: #ff2d55; }

  .popup-header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .popup-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.9);
    text-transform: uppercase;
  }
  .popup-subtitle {
    font-family: 'Rajdhani', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .popup-close {
    width: 30px; height: 30px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .popup-close:hover { background: rgba(255,45,85,0.1); border-color: rgba(255,45,85,0.4); color: #ff2d55; }

  /* Drift warning banner */
  .drift-warning-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: rgba(255,45,85,0.08);
    border-bottom: 1px solid rgba(255,45,85,0.2);
    color: rgba(255,45,85,0.85);
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .popup-body {
    padding: 22px 22px 16px;
    min-height: 100px;
  }

  .popup-comment {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.65;
    color: rgba(255,255,255,0.8);
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .popup-no-comment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 0;
    text-align: center;
  }

  .popup-no-comment span:first-of-type {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 900;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .popup-no-comment-sub {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: rgba(255,255,255,0.2) !important;
    letter-spacing: 0 !important;
    font-weight: 400 !important;
  }

  .popup-footer-line {
    padding: 12px 22px;
    border-top: 1px solid rgba(255,255,255,0.05);
    background: rgba(0,0,0,0.2);
  }

  .popup-praise {
    font-family: 'Outfit', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    font-style: italic;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.03em;
  }

  .popup-victory .popup-praise { color: rgba(0,255,159,0.5); }
  .popup-aborted .popup-praise { color: rgba(239,68,68,0.5); }
  .popup-drift .popup-praise   { color: rgba(255,45,85,0.55); }
</style>
