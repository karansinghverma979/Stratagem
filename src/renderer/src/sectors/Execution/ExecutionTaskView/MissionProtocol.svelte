<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { untrack, onDestroy } from 'svelte';
  import { AudioEngine } from '../../../core/audio-engine';
  import { 
    syncAntaryami, addNotification, 
    updateMissionStatus, updateMissionThreatLevel, updateResolutionComment 
  } from '../../../core/store';
  import { triggerShield } from '../../../core/shield-store.js';
  import AbortConfirmation from './AbortConfirmation.svelte';
  import VictoryConfirmation from './VictoryConfirmation.svelte';
  import StrategizeModal from '../../Arsenal/ArsenalMain/StrategizeModal.svelte';
  
  let { isOpen = false, onclose, readOnly: initialReadOnly = false, mission = null } = $props();
  let readOnly = $derived(initialReadOnly || (mission && (mission.resolution || mission.status === 'VICTORY' || mission.status === 'ABORTED')));

  let isVictory = $derived(mission && (mission.resolution === 'VICTORY' || mission.status === 'VICTORY'));
  let isAborted = $derived(mission && (mission.resolution === 'ABORTED' || mission.status === 'ABORTED'));
  let isDriftAbort = $derived(mission && (mission.classifications?.includes('DRIFT-ABORTED') || mission.tags?.includes('DRIFT-ABORTED')));

  let isCommentPopupOpen = $state(false);

  const warnReadOnly = (elementName: string) => {
    AudioEngine.play('alarm_warning');
    triggerShield('ACCESS DENIED', 'WARNING', 3000);
    addNotification('ACCESS RESTRICTED', `CANNOT MODIFY ${elementName.toUpperCase()} - RECORD ARCHIVED`, 'error');
  };

  let archivedComment = $derived.by(() => {
    if (!mission?.id) return '';
    // DB-backed comment (from syncAntaryami → resolution_comment column)
    return mission.resolutionComment || '';
  });

  const openCommentPopup = (e: MouseEvent) => {
    e.stopPropagation();
    AudioEngine.play('ui-click');
    isCommentPopupOpen = true;
  };

  const closeCommentPopup = () => {
    AudioEngine.play('ui-click');
    isCommentPopupOpen = false;
  };

  let missionTitle = $state('Project Titan Shield');
  let deadline = $state('2026-05-30');
  let threatLevel = $state('HIGH');
  let classifications = $state<string[]>(['#DEFENSE', '#TACTICAL']);
  
  // Svelte state for objectives
  let newObjective = $state('');
  let objectives = $state<{ text: string; done: boolean }[]>([
    { text: 'Synchronize breach nodes with core router', done: true },
    { text: 'Deploy neural network safeguard firewalls', done: false },
    { text: 'Confirm payload integrity validation keys', done: false }
  ]);

  // Derived progress stats using Svelte 5 derived rune
  let totalObjectives = $derived(objectives.length);
  let completedObjectives = $derived(objectives.filter(o => o.done).length);
  let progressPercentage = $derived(totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0);

  // Timeline entries
  let timeline = $state<{ time: string; event: string; desc: string }[]>([]);

  let isVictoryTriggered = $state(false);
  let isAbortTriggered = $state(false);
  let isAbortConfirmOpen = $state(false);
  let isVictoryConfirmOpen = $state(false);

  // 3D perspective mouse tilt tracking (Forge alignment)
  let tiltX = $state(0);
  let tiltY = $state(0);
  let isScopeHovered = $state(false);
  let isTitleHovered = $state(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isOpen) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    tiltX = ((clientX / innerWidth) - 0.5) * 6; // range from -3 to 3 degrees
    tiltY = ((clientY / innerHeight) - 0.5) * -6;
  };

  // Inline subtask editing state
  let editingIndex = $state<number | null>(null);
  let editingText = $state('');

  // Click counting for access warning alerts
  let clickCount = $state(0);
  let lastUpdatedDate = $state<string | null>(null);
  let subtasksModified = $state(false);
  let auditScrollContainer = $state<HTMLDivElement | null>(null);

  const triggerClose = () => {
    if (subtasksModified && mission && mission.id) {
      const nowISO = new Date().toISOString();
      localStorage.setItem(`stratagem_last_updated_${mission.id}`, nowISO);
      lastUpdatedDate = nowISO;
      subtasksModified = false;
    }
    onclose();
  };

  onDestroy(() => {
    if (subtasksModified && mission && mission.id) {
      const nowISO = new Date().toISOString();
      localStorage.setItem(`stratagem_last_updated_${mission.id}`, nowISO);
    }
  });
  let subtaskListContainer = $state<HTMLDivElement | null>(null);

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
 
  const registerClick = () => {
    clickCount++;
    if (clickCount >= 5) {
      AudioEngine.play('alarm_warning');
      triggerShield('ACCESS DENIED', 'WARNING', 3000);
      clickCount = 0;
    } else {
      AudioEngine.play('click');
    }
  };

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

  function formatDateToDDMMYYYY(dateStr: string): string {
    if (!dateStr) return '03-06-2026';
    let cleanStr = dateStr.trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
      return cleanStr;
    }
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    try {
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return cleanStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return cleanStr;
    }
  }

  function formatDateToDDMMYYYYHHMM(dateStr: string): string {
    if (!dateStr) return '03-06-2026 12:00';
    let cleanStr = dateStr.trim();
    
    const matchSQLite = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (matchSQLite) {
      return `${matchSQLite[3]}-${matchSQLite[2]}-${matchSQLite[1]} ${matchSQLite[4]}:${matchSQLite[5]}`;
    }
    
    const matchSQLiteShort = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
    if (matchSQLiteShort) {
      return `${matchSQLiteShort[3]}-${matchSQLiteShort[2]}-${matchSQLiteShort[1]} ${matchSQLiteShort[4]}:${matchSQLiteShort[5]}`;
    }

    try {
      const isoStr = cleanStr.includes(' ') && !cleanStr.includes('T') ? cleanStr.replace(' ', 'T') : cleanStr;
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) {
        const matchDDMMYYYYHHMM = cleanStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
        if (matchDDMMYYYYHHMM) {
          return cleanStr;
        }
        return '03-06-2026 12:00';
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (e) {
      return '03-06-2026 12:00';
    }
  }

  function calculateDaysLeft(dateStr: string): string {
    if (!dateStr) return '0 DAYS LEFT';
    let cleanStr = dateStr.trim();
    let target: Date;
    const matchDDMMYYYY = cleanStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (matchDDMMYYYY) {
      target = new Date(Number(matchDDMMYYYY[3]), Number(matchDDMMYYYY[2]) - 1, Number(matchDDMMYYYY[1]));
    } else {
      const cleanISO = cleanStr.replace(/[^0-9\-]/g, '').trim();
      target = new Date(cleanISO);
    }
    
    const current = new Date();
    target.setHours(0,0,0,0);
    current.setHours(0,0,0,0);
    const diffTime = target.getTime() - current.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(diffDays)) return '0 DAYS LEFT';
    if (diffDays < 0) return `${Math.abs(diffDays)} DAYS OVERDUE`;
    if (diffDays === 0) return '0 DAYS LEFT';
    return `${diffDays} DAYS LEFT`;
  }

  function calculateDaysSpent(): string {
    if (!mission) return '0 DAYS SPENT';
    const initDateStr = mission.initiatedAt || mission.createdAt || mission.initiateDate;
    const endDateStr = mission.completionDate || mission.createdAt || new Date().toISOString();
    
    if (!initDateStr) return '0 DAYS SPENT';
    
    try {
      const start = new Date(initDateStr);
      const end = new Date(endDateStr);
      
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const cleanDays = Math.max(0, diffDays);
      return `${cleanDays} ${cleanDays === 1 ? 'DAY' : 'DAYS'} SPENT`;
    } catch (e) {
      return '0 DAYS SPENT';
    }
  }

  const startEditing = (index: number, text: string) => {
    if (readOnly) {
      warnReadOnly('subtask text');
      return;
    }
    editingIndex = index;
    editingText = text;
    AudioEngine.play('click');
  };

  const finishEditing = async (index: number) => {
    if (editingText.trim()) {
      const oldText = objectives[index].text;
      const newText = editingText.trim();
      if (oldText !== newText) {
        objectives = objectives.map((o, i) => i === index ? { ...o, text: newText } : o);
        saveObjectives();
        addTimelineLog('EDIT_GOAL', `Subtask recalibrated: from "${oldText}" to "${newText}"`);
        
        if (window.stratagemAPI?.appendNoteLog && mission?.id) {
          await window.stratagemAPI.appendNoteLog(mission.id, 'EDIT_GOAL', `Subtask renamed from "${oldText}" to "${newText}"`);
        }
        await loadAuditLogs();
      }
    }
    editingIndex = null;
  };

  const cancelEditing = () => {
    editingIndex = null;
  };

  const focusOnMount = (node: HTMLInputElement) => {
    node.focus();
  };

  // Determistic tag presets (Forge alignment)
  function getTagPresetClass(tag: string) {
    const clean = tag.replace('#', '');
    if (clean === 'DRIFT-ABORTED') return 'tag-preset-drift-abort';
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash += clean.charCodeAt(i);
    }
    return `tag-preset-${hash % 5}`;
  }

  // Load custom archived mission details
  $effect(() => {
    if (isOpen && mission) {
      untrack(() => {
        // Play a cool holographic system handshake sound!
        AudioEngine.play('access_handshake');
        
        missionTitle = mission.title || 'Archived Mission';
        let rawDeadline = mission.deadlineDate;
        if (!rawDeadline || rawDeadline === 'CLOSED') {
          rawDeadline = mission.completionDate || mission.rescheduledAt || mission.initiatedAt || '';
        }
        deadline = rawDeadline;
        threatLevel = mission.priority || 'MED';
        classifications = (mission.classifications || []).map((c: string) => c.startsWith('#') ? c : `#${c}`);
        
        // Load objectives from localStorage or generate defaults
        const localKey = `stratagem_objectives_${mission.id}`;
        const saved = localStorage.getItem(localKey);
        if (saved) {
          try {
            objectives = JSON.parse(saved);
          } catch(e) {
            initializeDefaultObjectives();
          }
        } else {
          initializeDefaultObjectives();
        }

        lastUpdatedDate = localStorage.getItem(`stratagem_last_updated_${mission.id}`) || null;
        
        // Load audit logs from DB
        loadAuditLogs();
        
        // Seed timeline logs for this session
        timeline = [
          { time: new Date().toTimeString().split(' ')[0], event: 'ACCESS_HANDSHAKE', desc: `Secure handshake established with terminal designate: ${missionTitle}` },
          { time: 'SYSTEM', event: 'DESIGNATE_INIT', desc: `Mission designated. Initiate Date: ${mission.initiateDate || 'UNKNOWN'}. Boundary: ${mission.deadlineDate || 'TBD'}` }
        ];
        
        if (mission.resolution) {
          timeline.push({
            time: new Date().toTimeString().split(' ')[0],
            event: mission.resolution === 'VICTORY' ? 'SECTOR_VICTORY' : 'MISSION_ABORT',
            desc: `Mission finalized under resolution designation: ${mission.resolution}`
          });
        }
      });

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  });

  // Auto-scroll the audit logs to the bottom when modal is opened
  $effect(() => {
    if (isOpen && auditScrollContainer) {
      setTimeout(() => {
        if (auditScrollContainer) {
          auditScrollContainer.scrollTo({
            top: auditScrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
  });

  // Flow timeline history items
  let auditFlow = $derived.by(() => {
    const flow: { label: string; date: string }[] = [];
    if (!mission) return flow;

    const formatDate = (dateStr: string) => {
      try {
        return formatDateToDDMMYYYYHHMM(dateStr);
      } catch (e) {
        return dateStr;
      }
    };

    // 1. Creation Time
    let creationDate = mission.createdAt;
    if (dbAuditLogs && dbAuditLogs.length > 0) {
      const initLog = dbAuditLogs.find(l => l.action === 'INITIALIZE_CORE');
      if (initLog) creationDate = initLog.logged_at;
    }
    if (creationDate) {
      flow.push({ label: 'Creation Time', date: formatDate(creationDate) });
    }

    // 2. Initiated Time
    let initiatedDate = mission.initiatedAt;
    if (dbAuditLogs && dbAuditLogs.length > 0) {
      const alignLog = dbAuditLogs.find(l => l.action === 'TEMPORAL_ALIGNMENT');
      if (alignLog) initiatedDate = alignLog.logged_at;
    }
    if (initiatedDate) {
      flow.push({ label: 'Initiated Time', date: formatDate(initiatedDate) });
    }

    // 3. Last Modification (WEAPONIZED_UPDATE, THREAT_RECALIBRATION)
    let modificationDate = null;
    if (dbAuditLogs && dbAuditLogs.length > 0) {
      const modLogs = dbAuditLogs.filter(l => l.action === 'WEAPONIZED_UPDATE' || l.action === 'THREAT_RECALIBRATION');
      if (modLogs.length > 0) {
        modificationDate = modLogs[modLogs.length - 1].logged_at;
      }
    }
    if (modificationDate) {
      flow.push({ label: 'Last Modification', date: formatDate(modificationDate) });
    }

    // 4. Last Updatation (localStorage objectives edit date)
    if (lastUpdatedDate) {
      flow.push({ label: 'Last Updatation', date: formatDate(lastUpdatedDate) });
    }

    // 5. Rescheduled Time (TEMPORAL_REALIGNMENT)
    let rescheduledDate = mission.rescheduledAt;
    if (dbAuditLogs && dbAuditLogs.length > 0) {
      const realignLogs = dbAuditLogs.filter(l => l.action === 'TEMPORAL_REALIGNMENT' || (l.action === 'TEMPORAL_ALIGNMENT' && mission.isRescheduled));
      if (realignLogs.length > 0) {
        rescheduledDate = realignLogs[realignLogs.length - 1].logged_at;
      }
    }
    if (rescheduledDate && (mission.isRescheduled || (dbAuditLogs && dbAuditLogs.some(l => l.action === 'TEMPORAL_REALIGNMENT')))) {
      flow.push({ label: 'Rescheduled Time', date: formatDate(rescheduledDate) });
    }

    // 6. Victory/Aborted Time
    let resolutionDate = null;
    let isVictory = mission.status === 'VICTORY' || mission.resolution === 'VICTORY';
    let isAborted = mission.status === 'ABORTED' || mission.resolution === 'ABORTED';

    if (dbAuditLogs && dbAuditLogs.length > 0) {
      const statusLogs = dbAuditLogs.filter(l => l.action === 'STATUS_UPDATE' || l.action === 'DEBRIEF_SUBMISSION');
      if (statusLogs.length > 0) {
        const lastStatusLog = statusLogs[statusLogs.length - 1];
        if (lastStatusLog.description.includes('VICTORY') || (lastStatusLog.action === 'DEBRIEF_SUBMISSION' && mission.resolution === 'VICTORY')) {
          isVictory = true;
          resolutionDate = lastStatusLog.logged_at;
        } else if (lastStatusLog.description.includes('ABORTED') || (lastStatusLog.action === 'DEBRIEF_SUBMISSION' && mission.resolution === 'ABORTED')) {
          isAborted = true;
          resolutionDate = lastStatusLog.logged_at;
        }
      }
    }
    if (!resolutionDate && mission.completionDate) {
      resolutionDate = mission.completionDate;
    }
    if (resolutionDate) {
      if (isVictory) {
        flow.push({ label: 'Victory Time', date: formatDate(resolutionDate) });
      } else if (isAborted) {
        flow.push({ label: 'Aborted Time', date: formatDate(resolutionDate) });
      }
    }

    return flow;
  });

  function initializeDefaultObjectives() {
    const firstWord = missionTitle.split(' ')[0] || 'DATA';
    objectives = [
      { text: `Synchronize ${firstWord.toLowerCase()} nodes with core router`, done: mission?.resolution === 'VICTORY' },
      { text: `Deploy ${firstWord.toLowerCase()} network safeguard firewalls`, done: mission?.resolution === 'VICTORY' },
      { text: `Verify ${firstWord.toLowerCase()} integrity validation signature`, done: mission?.resolution === 'VICTORY' }
    ];
    saveObjectives();
  }

  function saveObjectives() {
    if (mission && mission.id) {
      localStorage.setItem(`stratagem_objectives_${mission.id}`, JSON.stringify(objectives));
      subtasksModified = true;
    }
  }

  const addObjective = async () => {
    if (readOnly) return;
    if (newObjective.trim()) {
      const text = newObjective.trim();
      objectives = [...objectives, { text, done: false }];
      newObjective = '';
      saveObjectives();
      AudioEngine.play('click');
      addTimelineLog('INJECT_GOAL', `New target node injected: "${text}"`);
      
      if (window.stratagemAPI?.appendNoteLog && mission?.id) {
        await window.stratagemAPI.appendNoteLog(mission.id, 'INJECT_GOAL', `New subtask injected: "${text}"`);
      }
      await loadAuditLogs();
      
      setTimeout(() => {
        if (subtaskListContainer) {
          subtaskListContainer.scrollTo({
            top: subtaskListContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 60);
    }
  };

  const toggleObjective = async (index: number) => {
    if (readOnly) {
      warnReadOnly('subtask state');
      return;
    }
    objectives = objectives.map((o, i) => i === index ? { ...o, done: !o.done } : o);
    saveObjectives();
    const obj = objectives[index];
    AudioEngine.play('click');
    addTimelineLog(
      obj.done ? 'SECURE_GOAL' : 'RELEASE_GOAL',
      `Objective: "${obj.text}" set to ${obj.done ? 'SECURED' : 'UNRESOLVED'}`
    );
    
    if (window.stratagemAPI?.appendNoteLog && mission?.id) {
      await window.stratagemAPI.appendNoteLog(mission.id, obj.done ? 'SECURE_GOAL' : 'RELEASE_GOAL', `Subtask "${obj.text}" set to ${obj.done ? 'SECURED' : 'UNRESOLVED'}`);
    }
    await loadAuditLogs();
  };

  const deleteObjective = async (index: number, event: MouseEvent) => {
    event.stopPropagation(); // prevent triggering toggle
    if (readOnly) return;
    const removedText = objectives[index].text;
    objectives = objectives.filter((_, i) => i !== index);
    saveObjectives();
    AudioEngine.play('click');
    addTimelineLog('PURGE_GOAL', `Target node purged: "${removedText}"`);
    
    if (window.stratagemAPI?.appendNoteLog && mission?.id) {
      await window.stratagemAPI.appendNoteLog(mission.id, 'PURGE_GOAL', `Subtask purged: "${removedText}"`);
    }
    await loadAuditLogs();
  };

  const updateThreatLevelInDB = async (level: string) => {
    if (readOnly || !mission) return;
    threatLevel = level;
    AudioEngine.play('alarm_warning');
    addTimelineLog('CALIBRATE_THREAT', `Threat parameters set to: ${level}`);
    
    try {
      await updateMissionThreatLevel(mission.id, level);
      await loadAuditLogs();
    } catch (e) {
      console.error('Failed to update threat level in database:', e);
    }
  };

  const addTimelineLog = (event: string, desc: string) => {
    const timeNow = new Date().toTimeString().split(' ')[0];
    timeline = [...timeline, { time: timeNow, event: event.toUpperCase(), desc }];
  };

  const handleConfirmVictory = async (comments: string) => {
    isVictoryConfirmOpen = false;
    if (readOnly || !mission) return;
    AudioEngine.play('victory');
    
    const missionId = mission.id;
    
    // Save operator debrief comment to DB for Archive view
    try {
      if (comments.trim()) {
        await updateResolutionComment(missionId, comments.trim());
        addTimelineLog('FINALIZING_VICTORY', `Sector Containment Verified. Debrief: ${comments.trim()}`);
      } else {
        addTimelineLog('FINALIZING_VICTORY', `Sector Containment Verified. No debrief logged.`);
      }
      
      triggerClose();
      
      await updateMissionStatus(missionId, 'VICTORY');
      addNotification('PROTOCOL SUCCESS', 'Sector Containment Verified', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAbort = async (comments: string) => {
    isAbortConfirmOpen = false;
    if (readOnly || !mission) return;
    AudioEngine.play('critical_breach');
    
    const missionId = mission.id;
    
    // Save operator debrief comment to DB for Archive view
    try {
      if (comments.trim()) {
        await updateResolutionComment(missionId, comments.trim());
        addTimelineLog('SYSTEM_ABORT', `Emergency Purge Authorized. Reason: ${comments.trim()}`);
      } else {
        addTimelineLog('SYSTEM_ABORT', `Emergency Purge Authorized. No comment logged.`);
      }
      
      triggerClose();
      
      await updateMissionStatus(missionId, 'ABORTED');
      addNotification('PROTOCOL ABORTED', 'Emergency Purge Dispatched', 'error');
    } catch (err) {
      console.error(err);
    }
  };

  let showStrategize = $state(false);
  let noteExists = $state(false);

  const checkNote = async () => {
    if (!mission || !mission.id) return;
    try {
      noteExists = await window.stratagemAPI.checkNoteExists(mission.id);
    } catch { 
      noteExists = false; 
    }
  };

  const openStrategize = (e: MouseEvent) => {
    e.stopPropagation();
    AudioEngine.play('ui-click');
    showStrategize = true;
  };

  $effect(() => {
    if (mission && mission.id) {
      checkNote();
    }
  });
</script>

{#if isOpen}
  <!-- Overlay Backdrop -->
  <div class="overlay-backdrop" onclick={triggerClose} role="presentation" transition:fade={{ duration: 150 }}>
    
    <!-- Pulsar Forge Void Background -->
    <div class="pulsar-void">
      <div class="pulsar-core"></div>
      <div class="void-ray r1"></div>
      <div class="void-ray r2"></div>
      <div class="reactive-dust"></div>
    </div>
    <div class="overlord-blur-isolation"></div>

    <div class="modal-transition-wrapper" transition:fly={{ y: 80, duration: 250 }}>
      <div 
        class="overlord-forge-station modal-panel-custom" 
        class:modal-drift-abort-active={isDriftAbort}
        onclick={(e) => e.stopPropagation()} 
        role="presentation" 
        style="transform: perspective(3000px) rotateX({tiltY}deg) rotateY({tiltX}deg)"
      >
      <!-- Premium Glass overlay assets -->
      <div class="chromatic-aura-edge"></div>
      <div class="celestial-glass-finish"></div>
      <div class="scanlines-texture"></div>



      <!-- Header Zone -->
      <header class="master-command-header">
        <div class="header-inline-container">
          <div class="header-left-nexus">
            
            <!-- OMNI-SCOPE v6.0 reticle -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="omni-scope-terminal"
                 class:acquired={isScopeHovered}
                 onmouseenter={() => { isScopeHovered = true; AudioEngine.play('data_decode'); }}
                 onmouseleave={() => isScopeHovered = false}
                 role="button"
                 tabindex="0"
                 onclick={() => AudioEngine.play('success')}
            >
              <!-- Mechanical Outer Chassis -->
              <div class="scope-chassis">
                <div class="chassis-segment top"></div><div class="chassis-segment right"></div>
                <div class="chassis-segment bottom"></div><div class="chassis-segment left"></div>
              </div>

              <!-- Kinetic Data Rings -->
              <div class="scope-data-rings">
                <div class="data-ring ring-cyan"></div>
                <div class="data-ring ring-violet"></div>
              </div>

              <!-- High-Clarity Reticle System -->
              <div class="scope-reticle-core">
                <div class="lens-glint-effect"></div>
                <svg class="reticle-svg" width="100" height="100" viewBox="0 0 100 100" fill="none">
                  <!-- SVG Gradient Definitions -->
                  <defs>
                    <linearGradient id="mission-primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--primary-accent)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>
                    <linearGradient id="mission-utilityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" />
                      <stop offset="100%" stop-color="var(--secure-status)" />
                    </linearGradient>
                    <linearGradient id="mission-warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--warning-amber)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>
                    <linearGradient id="mission-alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--critical-alert)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>

                    <linearGradient id="mission-spotlightNorthGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="mission-spotlightSouthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="mission-spotlightWestGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="mission-spotlightEastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>

                    <linearGradient id="mission-brightCrossGrad" x1="-286" y1="50" x2="386" y2="50" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="0" />
                      <stop offset="42%" stop-color="var(--tertiary-accent)" stop-opacity="0.8" />
                      <stop offset="50%" stop-color="#ffffff" stop-opacity="1" />
                      <stop offset="58%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--primary-accent)" stop-opacity="0" />
                    </linearGradient>
                  </defs>

                  <!-- "+" Targeting crosshair spans 400px -->
                  <g class="massive-plus-crosshair">
                    <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#mission-utilityGrad)" stroke-width="0.75" class="plus-line plus-horizontal" />
                    <line x1="-286" y1="43" x2="-286" y2="57" stroke="url(#mission-utilityGrad)" stroke-width="1.5" class="plus-tick tick-left" />
                    <line x1="386" y1="43" x2="386" y2="57" stroke="url(#mission-utilityGrad)" stroke-width="1.5" class="plus-tick tick-right" />

                    <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#mission-utilityGrad)" stroke-width="0.75" class="plus-line plus-vertical" />
                    <line x1="43" y1="-286" x2="57" y2="-286" stroke="url(#mission-utilityGrad)" stroke-width="1.5" class="plus-tick tick-top" />
                    <line x1="43" y1="386" x2="57" y2="386" stroke="url(#mission-utilityGrad)" stroke-width="1.5" class="plus-tick tick-bottom" />
                  </g>

                  <!-- Spotlight beams -->
                  <g class="spotlight-breath-wrapper">
                    <line x1="50" y1="50" x2="50" y2="-454" stroke="url(#mission-spotlightNorthGrad)" class="spotlight-beam beam-north" />
                    <line x1="50" y1="50" x2="50" y2="386" stroke="url(#mission-spotlightSouthGrad)" class="spotlight-beam beam-south" />
                    <line x1="50" y1="50" x2="-454" y2="50" stroke="url(#mission-spotlightWestGrad)" class="spotlight-beam beam-west" />
                    <line x1="50" y1="50" x2="386" y2="50" stroke="url(#mission-spotlightEastGrad)" class="spotlight-beam beam-east" />
                  </g>

                  <!-- Rotating perpendicular crossing lines -->
                  <g class="rotating-crossing-lines-group">
                    <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#mission-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                    <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#mission-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                  </g>

                  <!-- Concentric broken rings -->
                  <g class="outer-ring-breath-wrapper">
                    <circle cx="50" cy="50" r="38" stroke="url(#mission-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
                  </g>

                  <g class="inner-ring-breath-wrapper">
                    <circle cx="50" cy="50" r="23" stroke="url(#mission-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
                  </g>

                  <!-- Sliding mechanical crosshairs -->
                  <line x1="50" y1="4" x2="50" y2="18" stroke="url(#mission-primaryGrad)" class="crosshair-line line-top" />
                  <line x1="50" y1="96" x2="50" y2="82" stroke="url(#mission-primaryGrad)" class="crosshair-line line-bottom" />
                  <line x1="4" y1="50" x2="18" y2="50" stroke="url(#mission-primaryGrad)" class="crosshair-line line-left" />
                  <line x1="96" y1="50" x2="82" y2="50" stroke="url(#mission-primaryGrad)" class="crosshair-line line-right" />

                  <!-- Dynamic center threat icon -->
                  {#if threatLevel === 'LOW'}
                    <path d="M 45,44 L 50,41 L 55,44 L 55,49 C 55,53 50,56 50,56 C 50,56 45,53 45,49 Z" stroke="url(#mission-utilityGrad)" stroke-width="3" fill="rgba(0, 255, 159, 0.12)" class="center-lock-icon" />
                  {:else if threatLevel === 'MED'}
                    <path d="M 50,41 L 59,50 L 50,59 L 41,50 Z" stroke="url(#mission-warningGrad)" stroke-width="3" fill="rgba(255, 184, 0, 0.12)" class="center-lock-icon" />
                  {:else}
                    <g class="center-lock-icon">
                      <path d="M 44,44 L 56,56 M 56,44 L 44,56" stroke="url(#mission-alertGrad)" stroke-width="3" />
                      <circle cx="50" cy="50" r="5" fill="rgba(255, 45, 85, 0.2)" stroke="url(#mission-alertGrad)" stroke-width="3" class="center-danger-lock-circle" />
                    </g>
                  {/if}

                  <!-- Center laser locking dot -->
                  <circle cx="50" cy="50" r="2.5" fill="var(--secure-status)" class="reticle-laser-dot" />
                </svg>
              </div>

              <div class="scope-vignette-overlay"></div>
            </div>

            <!-- Stable Title Group -->
            <div class="title-group-animated" class:acquired={isScopeHovered}>
               <div class="title-fui-shell">
                  <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                  <h1 
                    class="forge-title font-outfit"
                    class:title-hovered={isTitleHovered}
                    onmouseenter={() => isTitleHovered = true}
                    onmouseleave={() => isTitleHovered = false}
                  >
                    {#if isDriftAbort}
                      <span class="drift-abort-title-badge font-mono">⚡ DRIFT-ABORTED</span>
                    {/if}
                    {missionTitle}
                  </h1>
                  <div class="title-laser-bar">
                     <div class="laser-pulse"></div>
                  </div>
                  
                  {#if isTitleHovered}
                    <div class="title-tooltip" transition:fade={{ duration: 150 }}>
                      <span class="tooltip-decor font-mono">// FULL MISSION DESIGNATE</span>
                      <p class="tooltip-text font-inter">{missionTitle}</p>
                    </div>
                  {/if}
               </div>
            </div>
          </div>

          <!-- Top Header Close button with Constant Color Gradient -->
          <button class="gradient-close-btn" onclick={triggerClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- 3-Column Grid Center Body -->
      <div class="body-grid">
        
        <!-- Left Side: Task Parameters -->
        <section class="grid-column left-info">
          <div class="left-info-card" onclick={registerClick} role="presentation">

            <!-- Inner Scroll Container outside warning overlay -->
            <div class="left-info-scroll-container custom-scroll">
              
              <!-- Title Header inside the tile -->
              <div class="tile-header-cyber">
                <svg class="tile-header-icon-cyber" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle class="reticle-ring" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
                  <circle class="reticle-dot" cx="12" cy="12" r="2.5" fill="currentColor"/>
                  <path class="reticle-lines" d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="tile-title-cyber font-outfit">PROTOCOL SPECS</span>
              </div>

              <div class="tile-divider-cyber"></div>
              
              <div class="info-group">
                <div class="info-group-header">
                  <svg class="elem-icon init-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <circle class="init-icon-dot" cx="12" cy="15" r="1.5" fill="currentColor"></circle>
                  </svg>
                  <span class="info-label font-outfit">INITIATION DATE</span>
                </div>
                <div class="read-only-pill init-pill-cyber font-outfit">
                  {formatDateToDDMMYYYY(mission?.initiateDate || '2026-06-03')}
                </div>
              </div>

              <div class="info-group">
                <div class="info-group-header">
                  <svg class="elem-icon deadline-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline class="clock-hands" points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span class="info-label font-outfit">TEMPORAL DEADLINE</span>
                </div>
                <div class="read-only-pill deadline-pill-cyber font-outfit">
                  {formatDateToDDMMYYYY(deadline) || 'NO TEMPORAL LIMIT'}
                </div>
              </div>

              <div class="info-group">
                <div class="info-group-header">
                  <svg class="elem-icon days-icon" class:days-icon-overdue={!readOnly && calculateDaysLeft(deadline).includes('OVERDUE')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path class="hourglass-top" d="M5 2h14M5 22h14M19 2v4c0 3-2 6-6 6M5 2v4c0 3 2 6 6 6"></path>
                    <path class="hourglass-bottom" d="M13 12c4 0 6 3 6 6v4M11 12c-4 0-6 3-6 6v4"></path>
                    <circle class="hourglass-drip" cx="12" cy="13" r="0.75" fill="currentColor"/>
                  </svg>
                  <span class="info-label font-outfit">{readOnly ? 'DURATION SPENT' : 'DAYS REMAINING'}</span>
                </div>
                <div class="read-only-pill days-pill-cyber font-outfit" class:overdue-pill-cyber={!readOnly && calculateDaysLeft(deadline).includes('OVERDUE')}>
                  {readOnly ? calculateDaysSpent() : calculateDaysLeft(deadline)}
                </div>
              </div>

              <div class="info-group">
                <div class="info-group-header">
                  <svg class="elem-icon priority-icon priority-icon-{threatLevel.toLowerCase()}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path class="triangle-path" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span class="info-label font-outfit">PRIORITY LEVEL</span>
                </div>
                <div class="priority-readonly-badge-cyber font-outfit priority-{threatLevel.toLowerCase()}-cyber">
                  {threatLevel} PRIORITY STATE
                </div>
              </div>

              <div class="info-group">
                <div class="info-group-header">
                  <svg class="elem-icon tags-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path class="tag-outline" d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line class="tag-hole" x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  <span class="info-label font-outfit">NEURAL CLASSIFICATIONS</span>
                </div>
                <div class="tags-row read-only-tags">
                  {#each classifications as tag}
                    <span class="classification-pill-cyber font-mono {getTagPresetClass(tag)}">{tag.replace('#', '')}</span>
                  {/each}
                </div>
              </div>

            </div>

          </div>
        </section>

        <!-- Center Side: Subtasks (Objectives) -->
        <section class="grid-column center-subtask">
          <div class="section-decor-header">
            <div class="header-left-part">
              <span class="param-decor">⚙</span>
              <span class="info-label font-outfit sub-protocol-title">SUB-PROTOCOL DIRECTORY</span>
            </div>
            <button 
              class="strategize-trigger-btn font-outfit" 
              class:has-note={noteExists}
              onclick={openStrategize}
              title={noteExists ? 'Open Intel File' : 'Create Intel File'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              <span>{noteExists ? 'INTEL FILE' : 'STRATEGIZE'}</span>
            </button>
          </div>
          <div class="center-subtask-container">
            <div class="subtask-list custom-scroll" bind:this={subtaskListContainer}>
              {#each objectives as obj, i}
                {#if editingIndex === i}
                  <div class="objective-edit-row" transition:fade={{ duration: 100 }}>
                    <input 
                      type="text" 
                      bind:value={editingText} 
                      class="objective-edit-input font-inter" 
                      onkeydown={(e) => {
                        if (e.key === 'Enter') finishEditing(i);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      onblur={() => finishEditing(i)}
                      use:focusOnMount
                    />
                    <button class="edit-save-btn" onclick={() => finishEditing(i)}>
                      ✓
                    </button>
                  </div>
                {:else}
                  <div 
                    class="subtask-item" 
                    class:done={obj.done} 
                    class:readonly-item={readOnly} 
                    onclick={() => toggleObjective(i)} 
                    role="presentation" 
                    transition:fade={{ delay: i * 40, duration: 150 }}
                  >
                    <div class="subtask-checkbox">
                      {#if obj.done}
                        <div class="subtask-check-dot"></div>
                      {/if}
                    </div>
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="subtask-text font-inter" 
                      ondblclick={(e) => { e.stopPropagation(); startEditing(i, obj.text); }}
                    >
                      {obj.text}
                    </span>
                    
                    <div class="item-actions">
                      <button 
                        class="action-icon-btn edit" 
                        onclick={(e) => { e.stopPropagation(); startEditing(i, obj.text); }} 
                        aria-label="Edit subtask"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        class="action-icon-btn delete" 
                        onclick={(e) => { e.stopPropagation(); if (readOnly) { warnReadOnly('subtask deletion'); } else { deleteObjective(i, e); } }} 
                        aria-label="Purge subtask"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>

            <div 
              class="add-subtask-row-cyber" 
              class:add-row-readonly={readOnly} 
              onclick={() => { if (readOnly) warnReadOnly('subtask creation'); }}
              role="presentation"
            >
              <button 
                class="add-btn-cyber" 
                onclick={(e) => { if (readOnly) { e.stopPropagation(); warnReadOnly('subtask creation'); } else { addObjective(); } }} 
                aria-label="Add subtask"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle class="reticle-outer-ring" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" style="transform-origin: 12px 12px; transition: transform 0.4s ease;" />
                  <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                </svg>
              </button>
              <input 
                type="text" 
                bind:value={newObjective}
                placeholder={readOnly ? "SUB-PROTOCOL DIRECTORY LOCKED..." : "DEPLOY NEW TARGET NODE..."} 
                class="add-input-cyber font-inter"
                readonly={readOnly}
                onkeydown={(e) => {
                  if (readOnly) {
                    e.preventDefault();
                    warnReadOnly('subtask creation');
                  } else if (e.key === 'Enter') {
                    addObjective();
                  }
                }}
              />
            </div>
          </div>
        </section>

        <!-- Right Side: Secure Audit Logs -->
        <section class="grid-column right-audit">
          <div class="right-audit-card" onclick={registerClick} role="presentation">
            <div class="right-audit-scroll-container custom-scroll" bind:this={auditScrollContainer}>
              
              <!-- Title Header inside the tile -->
              <div class="tile-header-cyber">
                <svg class="tile-header-icon-cyber" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                <span class="tile-title-cyber font-outfit">KERNEL SECURE AUDIT</span>
              </div>

              <div class="tile-divider-cyber"></div>

              <div class="timeline-flow-wrapper">
                <div class="timeline-flow-list">
                  {#if auditFlow.length > 1}
                    <div class="timeline-vertical-line-cyber"></div>
                  {/if}
                  {#each auditFlow as item, i}
                    <div class="timeline-flow-item" in:fly={{ x: -15, delay: i * 80, duration: 400 }}>
                      <div class="timeline-dot-cyber"></div>
                      <div class="timeline-flow-content">
                        <span class="flow-title font-outfit" style="color: #ffffff; font-weight: bold; font-size: 13.5px; letter-spacing: 0.5px;">{item.label}</span>
                        <span class="flow-date font-mono" style="color: rgba(255, 255, 255, 0.45); font-size: 11px;">{item.date}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

            </div>
          </div>
        </section>

      </div>

      <!-- Footer Zone -->
      <footer class="modal-footer">
        <!-- Volumetric Colorful Progress bar for subtasks -->
        <div class="footer-left font-outfit">
          <div class="progress-header-row">
            <span class="percent-readout">{progressPercentage}% SECURED</span>
            <span class="count-readout font-mono">{completedObjectives} OF {totalObjectives} NODE INTERRUPTS INSTALLED</span>
          </div>
          <div class="progress-bar-track-cyber">
            <div class="progress-bar-fill-cyber" style="width: {progressPercentage}%">
              <div class="progress-shimmer-cyber"></div>
            </div>
          </div>
        </div>

        <!-- Buttons with constant gradients & icons animations -->
        <div class="footer-right">
          {#if readOnly}
            <button 
              class="action-btn-cyber close-archive-btn-cyber font-outfit btn-disconnect-link"
              class:btn-victory-theme={isVictory}
              class:btn-abort-theme={isAborted && !isDriftAbort}
              class:btn-drift-theme={isDriftAbort}
              onclick={openCommentPopup}
            >
              {#if isVictory}
                GLORY SECURED
              {:else if isDriftAbort}
                DEADLINE BREACHED // UNWORTHY
              {:else}
                COWARDICE REGISTERED
              {/if}
            </button>
          {:else}
            <button class="action-btn-cyber abort-btn-cyber font-outfit" onclick={() => isAbortConfirmOpen = true}>
              <svg class="btn-icon abort-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle class="abort-icon-outer" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
                <path class="abort-icon-inner" d="M15 9L9 15M9 9l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              ABORT MISSION
            </button>
            
            <button class="action-btn-cyber victory-btn-cyber font-outfit" onclick={() => isVictoryConfirmOpen = true}>
              <svg class="btn-icon victory-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer Rotating Aura / Rings (Constant Animation) -->
                <circle class="victory-icon-ring" cx="12" cy="11" r="9" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1"/>
                <!-- Left Handle -->
                <path class="victory-icon-handle-l" d="M6 8H4.5a2.5 2.5 0 0 1 0-5H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Right Handle -->
                <path class="victory-icon-handle-r" d="M18 8h1.5a2.5 2.5 0 0 0 0-5H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Trophy Cup Body -->
                <path class="victory-icon-cup" d="M12 2a6 6 0 0 1 6 6v2c0 2.2-1.8 4-4 4h-4c-2.2 0-4-1.8-4-4V8a6 6 0 0 1 6-6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <!-- Stem & Base -->
                <path class="victory-icon-base" d="M12 14v4M9 18h6M7 20h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Glowing Center Core Node (Pulsing Constant Animation) -->
                <circle class="victory-icon-core" cx="12" cy="7" r="1.5" fill="currentColor"/>
                <!-- Left Sparkle -->
                <path class="victory-icon-sparkle sp-1" d="M7 6L7.5 7.5L9 8L7.5 8.5L7 10L6.5 8.5L5 8L6.5 7.5L7 6z" fill="currentColor"/>
                <!-- Right Sparkle -->
                <path class="victory-icon-sparkle sp-2" d="M17 6L17.5 7.5L19 8L17.5 8.5L17 10L16.5 8.5L15 8L16.5 7.5L17 6z" fill="currentColor"/>
              </svg>
              SECURE VICTORY
            </button>
          {/if}
        </div>
      </footer>

      </div>
    </div>
  </div>

  <AbortConfirmation
    isOpen={isAbortConfirmOpen}
    mission={mission}
    auditFlow={auditFlow}
    onConfirm={handleConfirmAbort}
    onCancel={() => isAbortConfirmOpen = false}
  />

  <VictoryConfirmation
    isOpen={isVictoryConfirmOpen}
    mission={mission}
    auditFlow={auditFlow}
    onConfirm={handleConfirmVictory}
    onCancel={() => isVictoryConfirmOpen = false}
  />

  {#if isCommentPopupOpen}
    <div class="comment-popup-backdrop" onclick={closeCommentPopup} role="presentation" transition:fade={{ duration: 150 }}>
      <div class="comment-popup-window" onclick={(e) => e.stopPropagation()} role="presentation" transition:fly={{ y: 30, duration: 250 }}>
        <div class="popup-glass"></div>
        <div class="popup-border-glow" class:victory={isVictory} class:abort={isAborted && !isDriftAbort} class:drift={isDriftAbort}></div>
        
        <header class="popup-header">
          <div class="popup-header-icon" class:victory={isVictory} class:abort={isAborted && !isDriftAbort} class:drift={isDriftAbort}>
            {#if isVictory}✓{:else if isDriftAbort}⚡{:else}✕{/if}
          </div>
          <div class="popup-header-title">
            <span class="popup-label font-outfit">OPERATIVE ARCHIVE DEBRIEF</span>
            <h3 class="popup-task-title font-outfit">{missionTitle}</h3>
          </div>
        </header>
        
        <div class="popup-divider"></div>
        
        <div class="popup-body font-inter">
          <div class="comment-label font-outfit">ARCHIVE RESOLUTION COMMENT:</div>
          <div class="comment-box font-mono">
            {archivedComment.trim() ? archivedComment : "NO DEBRIEF LOG RECORDED BY OPERATIVE."}
          </div>
          
          {#if isDriftAbort}
            <div class="drift-warning-box font-mono">
              <span class="drift-warning-icon">⚠</span>
              <div class="drift-warning-text">
                <strong>CRITICAL DESIGNATION: DRIFT-ABORTED</strong><br>
                THIS MISSION WAS TERMINATED AUTOMATICALLY FOLLOWING A BREACH OF ITS RESCHEDULED TEMPORAL BOUNDARY.
              </div>
            </div>
          {/if}
        </div>
        
        <footer class="popup-footer">
          <button class="popup-btn popup-btn-close font-outfit" onclick={closeCommentPopup}>
            CLOSE DEBRIEF
          </button>
          <button class="popup-btn popup-btn-disconnect font-outfit" onclick={() => { closeCommentPopup(); triggerClose(); }}>
            {#if isVictory}
              GLORY SECURED
            {:else if isDriftAbort}
              DEADLINE BREACHED // UNWORTHY
            {:else}
              COWARDICE REGISTERED
            {/if}
          </button>
        </footer>
      </div>
    </div>
  {/if}
{/if}

{#if showStrategize && mission}
  <StrategizeModal
    taskId={mission.id}
    taskTitle={mission.title}
    onClose={() => {
      showStrategize = false;
      checkNote();
    }}
    onSave={() => {
      checkNote();
    }}
  />
{/if}

<style>
  /* Root color tokens fallback */
  :root {
    --primary-accent: #8b5cf6;
    --secondary-accent: #d8b4fe;
    --tertiary-accent: #06b6d4;
    --secure-status: #10b981;
    --critical-alert: #ef4444;
  }

  /* Overlay Backdrop */
  .overlay-backdrop {
    position: fixed;
    top: 80px; /* Start right below the navbar */
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15000;
    overflow: hidden;
    box-sizing: border-box;
    background: transparent;
  }

  .pulsar-void {
    display: none;
  }

  .pulsar-core {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 280px;
    height: 280px;
    background: #ffffff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    filter: blur(140px);
    opacity: 0.12;
    animation: pulsar-heartbeat 12s infinite alternate ease-in-out;
  }

  @keyframes pulsar-heartbeat {
    from { transform: translate(-50%, -50%) scale(1); opacity: 0.08; }
    to { transform: translate(-50%, -50%) scale(1.35); opacity: 0.15; }
  }

  .void-ray {
    position: absolute;
    border-radius: 50%;
    filter: blur(180px);
    opacity: 0.5;
  }

  .r1 {
    width: 1300px;
    height: 1300px;
    top: -450px;
    left: -450px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.75), transparent 80%);
    animation: void-drift 40s infinite alternate;
  }

  .r2 {
    width: 1000px;
    height: 1000px;
    bottom: -350px;
    right: -350px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.55), transparent 80%);
    animation: void-drift 30s infinite alternate-reverse;
  }

  @keyframes void-drift {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(100px, 80px) scale(1.15); }
  }

  .reactive-dust {
    position: absolute;
    inset: 0;
    background: url('https://www.transparenttextures.com/patterns/dust.png');
    opacity: 0.025;
  }

  .overlord-blur-isolation {
    display: none;
  }

  /* Modal Panel Custom overrides (Forge themed) */
  .modal-panel-custom {
    width: 1184px;
    height: 800px;
    max-height: calc(100vh - 120px);
    background: linear-gradient(165deg, #0b0722 0%, #010103 100%);
    border: 3px solid rgba(139, 92, 246, 0.95);
    border-radius: 48px;
    padding: 20px 40px 32px 40px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    box-shadow: 
      0 0 350px rgba(0, 0, 0, 1), 
      inset 0 0 100px rgba(139, 92, 246, 0.05);
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .chromatic-aura-edge {
    position: absolute;
    inset: 0;
    border: 6px solid rgba(6, 182, 212, 0.18);
    border-radius: 48px;
    pointer-events: none;
    z-index: 10;
    filter: blur(3px);
  }

  .celestial-glass-finish {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 15%, rgba(0,0,0,0.6) 100%);
    pointer-events: none;
    z-index: 2;
  }

  .scanlines-texture {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(139, 92, 246, 0.012) 2px,
      rgba(139, 92, 246, 0.012) 4px
    );
    pointer-events: none;
    z-index: 3;
  }

  /* Resolution Screens Overlay */
  .overlay-modal-resolution {
    position: absolute;
    inset: 0;
    z-index: 16000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(25px) saturate(180%);
    background: rgba(4, 2, 10, 0.95);
    padding: 40px;
    text-align: center;
  }

  .victory-resolution-screen {
    border: 2px solid rgba(16, 185, 129, 0.5);
    box-shadow: inset 0 0 50px rgba(16, 185, 129, 0.2);
  }

  .abort-resolution-screen {
    border: 2px solid rgba(239, 68, 68, 0.5);
    box-shadow: inset 0 0 50px rgba(239, 68, 68, 0.2);
  }

  .glow-pulse-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-bottom: 24px;
    position: relative;
  }

  .victory-pulse-circle {
    background: rgba(16, 185, 129, 0.15);
    border: 2px solid #10b981;
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
    animation: victoryPulseRing 2s infinite alternate;
  }

  .abort-pulse-circle {
    background: rgba(239, 68, 68, 0.15);
    border: 2px solid #ef4444;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.6);
    animation: abortPulseRing 2s infinite alternate;
  }

  @keyframes victoryPulseRing {
    0% { transform: scale(0.96); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
    100% { transform: scale(1.06); box-shadow: 0 0 35px rgba(16, 185, 129, 0.8); }
  }

  @keyframes abortPulseRing {
    0% { transform: scale(0.96); box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
    100% { transform: scale(1.06); box-shadow: 0 0 35px rgba(239, 68, 68, 0.8); }
  }

  .resolution-title {
    font-size: 2.6rem;
    font-weight: 900;
    letter-spacing: 3px;
    margin: 0 0 20px 0;
  }

  .victory-text {
    color: #10b981;
    text-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
  }

  .abort-text {
    color: #ef4444;
    text-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  }

  .resolution-status {
    width: 100%;
    max-width: 460px;
    background: rgba(0, 0, 0, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 16px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .scrolling-term-line {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    letter-spacing: 0.5px;
  }

  .blinking-cursor {
    font-weight: 800;
    color: #8b5cf6;
    animation: blinkCursorText 0.8s step-end infinite;
    font-size: 11px;
  }

  @keyframes blinkCursorText {
    50% { opacity: 0; }
  }

  /* Header Section */
  .master-command-header {
    position: relative;
    z-index: 100;
    display: flex;
    margin-bottom: 18px;
    padding-top: 0;
  }

  .header-inline-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 64px;
  }

  .header-left-nexus {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    flex: 1;
    margin-right: 20px;
  }

  /* Root color tokens fallback */
  :root {
    --primary-accent: #8b5cf6;
    --secondary-accent: #d8b4fe;
    --tertiary-accent: #06b6d4;
    --secure-status: #10b981;
    --critical-alert: #ef4444;
    --warning-amber: #f59e0b;
    --ease-fui: cubic-bezier(0.19, 1, 0.22, 1);
  }

  /* OMNI-SCOPE v6.0 (ULTIMATE SURGICAL OPTICS) */
  .omni-scope-terminal {
    width: 60px; height: 60px; position: relative;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 80%);
    border-radius: 50%;
    transform: translateZ(0);
    cursor: pointer;
    border: 2.5px solid rgba(139, 92, 246, 0.25);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.08), inset 0 0 12px rgba(139, 92, 246, 0.15);
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: visible !important;
  }

  .omni-scope-terminal.acquired {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 80%);
    border-color: rgba(239, 68, 68, 0.85);
    transform: scale(1.15);
    box-shadow:
      0 0 35px rgba(239, 68, 68, 0.45),
      inset 0 0 25px rgba(239, 68, 68, 0.3),
      0 0 0 5px rgba(239, 68, 68, 0.08);
  }

  /* Chassis Segments */
  .scope-chassis {
    position: absolute;
    width: 100%;
    height: 100%;
    animation: chassis-spin 40s linear infinite, chassis-pulse 3s infinite alternate ease-in-out;
    overflow: visible !important;
  }
  .chassis-segment { position: absolute; background: rgba(139, 92, 246, 0.45); transition: all 0.5s var(--ease-fui); }
  .chassis-segment.top, .chassis-segment.bottom { width: 12px; height: 3px; left: 50%; transform: translateX(-50%); }
  .chassis-segment.left, .chassis-segment.right { width: 3px; height: 12px; top: 50%; transform: translateY(-50%); }
  .chassis-segment.top { top: -2px; } .chassis-segment.bottom { bottom: -2px; }
  .chassis-segment.left { left: -2px; } .chassis-segment.right { right: -2px; }

  @keyframes chassis-pulse {
    0% { scale: 1; opacity: 0.85; }
    100% { scale: 1.04; opacity: 1; }
  }

  .acquired .chassis-segment {
    background: var(--critical-alert);
    box-shadow: 0 0 10px var(--critical-alert);
  }
  .acquired .scope-chassis {
    animation-duration: 8s;
  }

  /* Kinetic Data Rings */
  .scope-data-rings { position: absolute; width: 100%; height: 100%; }
  .data-ring { position: absolute; border-radius: 50%; border-width: 1.5px; border-style: solid; opacity: 0.5; transition: all 0.5s var(--ease-fui); }

  .ring-cyan {
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    border-color: #06b6d4; border-style: dashed;
    animation: data-ring-breath-a 6s ease-in-out infinite alternate;
  }
  .ring-violet {
    top: 8px; left: 8px; right: 8px; bottom: 8px;
    border-color: #8b5cf6; border-style: dotted;
    animation: data-ring-breath-b 4s ease-in-out infinite alternate-reverse;
  }

  .acquired .ring-cyan { border-color: var(--critical-alert); animation-duration: 1.8s; }
  .acquired .ring-violet { border-color: var(--secondary-accent); animation-duration: 1.2s; }

  /* Reticle System */
  .scope-reticle-core { position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; overflow: visible !important; }

  .lens-glint-effect {
    position: absolute; width: 38px; height: 38px;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%, transparent 55%, rgba(255,255,255,0.06) 100%);
    border-radius: 50%; pointer-events: none;
    z-index: 6;
    transition: all 0.3s var(--ease-fui);
  }
  .acquired .lens-glint-effect {
    transform: rotate(180deg);
    background: linear-gradient(135deg, rgba(255, 45, 85, 0.25) 0%, transparent 40%, transparent 60%, rgba(6, 182, 212, 0.15) 100%);
  }

  .reticle-svg {
    width: 80px;
    height: 80px;
    overflow: visible !important;
    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4));
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  /* VERY THIN, TOO MUCH LONG "+" TARGETING CROSSHAIR HUD */
  .plus-line {
    stroke-width: 0.75px;
    opacity: 0.45;
    transition: all 0.25s var(--ease-fui);
  }

  .plus-horizontal {
    stroke-dasharray: 40 360;
    animation: laser-slide-horizontal 3.5s linear infinite;
  }

  .plus-vertical {
    stroke-dasharray: 40 360;
    animation: laser-slide-vertical 3.5s linear infinite;
  }

  .plus-tick {
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    opacity: 0.55;
  }

  .acquired .plus-line {
    opacity: 0.85;
    stroke: url(#mission-alertGrad) !important;
    stroke-width: 1.2px;
  }

  .acquired .plus-tick {
    stroke: url(#mission-alertGrad) !important;
    opacity: 0.9;
  }

  /* Focus Scoping contractions sliding ticks inward */
  .acquired .tick-left { transform: translateX(25px); }
  .acquired .tick-right { transform: translateX(-25px); }
  .acquired .tick-top { transform: translateY(25px); }
  .acquired .tick-bottom { transform: translateY(-25px); }

  @keyframes laser-slide-horizontal {
    0% { stroke-dashoffset: 400; }
    100% { stroke-dashoffset: -400; }
  }

  @keyframes laser-slide-vertical {
    0% { stroke-dashoffset: -400; }
    100% { stroke-dashoffset: 400; }
  }

  /* SPOTLIGHT BEAMS (North, South, East, West) */
  .spotlight-breath-wrapper {
    transform-origin: center;
    animation: spotlight-sweep 3.2s infinite alternate ease-in-out;
    pointer-events: none;
  }
  .acquired .spotlight-breath-wrapper {
    animation: spotlight-sweep-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }

  .spotlight-beam {
    stroke-width: 1.2px;
    filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.7));
    opacity: 0.75;
    transition: all 0.25s var(--ease-fui);
  }
  .acquired .spotlight-beam {
    stroke-width: 2.2px;
    filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.95));
    stroke: url(#mission-alertGrad) !important;
  }

  @keyframes spotlight-sweep {
    0% { transform: scale(0.04); opacity: 0.1; }
    100% { transform: scale(1.35); opacity: 0.9; }
  }

  @keyframes spotlight-sweep-fast {
    0% { transform: scale(0.12); opacity: 0.25; }
    100% { transform: scale(1.45); opacity: 1; }
  }

  /* TWO VERY THIN, EXTREMELY BRIGHT, LARGE ROTATING CROSSING LINES */
  .rotating-crossing-lines-group {
    transform-origin: center;
    animation: stepped-radar-spin 8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
  }
  .acquired .rotating-crossing-lines-group {
    animation: stepped-radar-spin-fast 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite !important;
  }

  .rotating-cross-line {
    stroke-width: 0.5px;
    filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 3px #ffffff);
    opacity: 0.85;
    transition: all 0.25s var(--ease-fui);
    pointer-events: none;
  }
  .acquired .rotating-cross-line {
    stroke-width: 0.8px;
    filter: drop-shadow(0 0 16px rgba(255, 45, 85, 0.95)) drop-shadow(0 0 5px #ffffff);
    opacity: 1;
  }

  @keyframes stepped-radar-spin {
    0%, 18% { transform: rotate(0deg); }
    25%, 43% { transform: rotate(90deg); }
    50%, 68% { transform: rotate(180deg); }
    75%, 93% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes stepped-radar-spin-fast {
    0%, 12% { transform: rotate(0deg); }
    25%, 37% { transform: rotate(90deg); }
    50%, 62% { transform: rotate(180deg); }
    75%, 87% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }

  .outer-ring-breath-wrapper {
    transform-origin: center;
    animation: ring-breath-outer-opposite 3.2s infinite alternate ease-in-out;
  }
  .acquired .outer-ring-breath-wrapper {
    animation: ring-breath-outer-opposite-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }

  .outer-broken-ring {
    transform-origin: center;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: spin-cw-auto 20s linear infinite;
  }
  .acquired .outer-broken-ring {
    animation: spin-cw-fast 4s linear infinite !important;
    stroke: url(#mission-alertGrad) !important;
    stroke-width: 5.5px;
  }

  .inner-ring-breath-wrapper {
    transform-origin: center;
    animation: ring-breath-inner-opposite 3.2s infinite alternate ease-in-out;
  }
  .acquired .inner-ring-breath-wrapper {
    animation: ring-breath-inner-opposite-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }

  .inner-broken-ring {
    transform-origin: center;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: spin-ccw-auto 12s linear infinite;
  }
  .acquired .inner-broken-ring {
    animation: spin-ccw-fast 2.5s linear infinite !important;
    stroke: url(#mission-alertGrad) !important;
    stroke-width: 4.5px;
  }

  /* Sliding crosshair line animations */
  .crosshair-line {
    stroke-width: 3.5px;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .acquired .crosshair-line {
    stroke: url(#mission-alertGrad) !important;
    stroke-width: 4px;
  }
  .acquired .line-top { transform: translateY(10px); }
  .acquired .line-bottom { transform: translateY(-10px); }
  .acquired .line-left { transform: translateX(10px); }
  .acquired .line-right { transform: translateX(-10px); }

  /* Center Settings Icons */
  .center-lock-icon {
    transform-origin: center;
    opacity: 0.7;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: auto-oscillate 4s ease-in-out infinite alternate, icon-scale-glow 2s infinite alternate ease-in-out;
  }
  .acquired .center-lock-icon {
    opacity: 1;
    transform: scale(1.15) rotate(0deg) !important;
    filter: drop-shadow(0 0 12px currentColor) !important;
    animation: icon-scale-glow 0.8s infinite alternate ease-in-out !important;
  }
  @keyframes icon-scale-glow {
    0% { filter: brightness(0.9) drop-shadow(0 0 1px currentColor); }
    100% { filter: brightness(1.3) drop-shadow(0 0 5px currentColor); }
  }

  @keyframes auto-oscillate {
    0% { transform: scale(0.85) rotate(-6deg); }
    100% { transform: scale(0.85) rotate(6deg); }
  }

  .reticle-laser-dot {
    transition: all 0.25s var(--ease-fui);
    filter: drop-shadow(0 0 5px var(--secure-status));
  }
  .acquired .reticle-laser-dot {
    fill: var(--critical-alert);
    filter: drop-shadow(0 0 10px var(--critical-alert));
    transform: scale(1.3);
  }

  /* Auto Animation keyframe definitions */
  @keyframes spin-cw-auto { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-ccw-auto { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes spin-cw-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-ccw-fast { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes chassis-spin { from { rotate: 0deg; } to { rotate: 360deg; } }
  @keyframes data-ring-breath-a { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.2; } 100% { transform: scale(1.05) rotate(90deg); opacity: 0.6; } }
  @keyframes data-ring-breath-b { 0% { transform: scale(1.1) rotate(0deg); opacity: 0.5; } 100% { transform: scale(0.8) rotate(-180deg); opacity: 0.3; } }
  @keyframes ring-breath-outer-opposite {
    0% { transform: scale(1.16); opacity: 0.75; }
    100% { transform: scale(0.86); opacity: 1; }
  }

  @keyframes ring-breath-inner-opposite {
    0% { transform: scale(1.22); opacity: 0.7; }
    100% { transform: scale(0.8); opacity: 0.95; }
  }

  @keyframes ring-breath-outer-opposite-fast {
    0% { transform: scale(0.9); }
    100% { transform: scale(0.65); }
  }

  @keyframes ring-breath-inner-opposite-fast {
    0% { transform: scale(0.82); }
    100% { transform: scale(0.55); }
  }

  .scope-vignette-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; box-shadow: inset 0 0 20px rgba(0,0,0,1); pointer-events: none; }

  /* Title Group (Adjacent to Scope, Frameless, Underlined Laser Sweep) */
  .title-group-animated {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
  }
  .title-fui-shell {
    position: relative;
    padding: 2px 0 6px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
    min-width: 0;
    flex: 1;
  }

  .forge-title {
    font-size: 30px;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    max-width: 100%;
  }

  .title-group-animated.acquired .forge-title {
    background: linear-gradient(90deg, #fff, var(--critical-alert), var(--warning-amber), #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 2.5s linear infinite, title-alert-pulse 0.6s infinite alternate ease-in-out;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.45);
  }

  /* Custom Hover Tooltip for Long Task Names */
  .title-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: rgba(8, 4, 24, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.7);
    box-shadow: 
      0 10px 25px rgba(0, 0, 0, 0.8), 
      0 0 15px rgba(139, 92, 246, 0.25),
      inset 0 0 8px rgba(139, 92, 246, 0.1);
    border-radius: 6px;
    padding: 8px 12px;
    z-index: 50000;
    max-width: 450px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .tooltip-decor {
    font-size: 8px;
    font-weight: 800;
    color: #06b6d4;
    letter-spacing: 1px;
    text-shadow: 0 0 5px rgba(6, 182, 212, 0.55);
  }

  .tooltip-text {
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: 0.5px;
    word-break: break-all;
    line-height: 1.3;
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes title-alert-pulse {
    0% { filter: drop-shadow(0 0 8px rgba(255, 45, 85, 0.4)); }
    100% { filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.75)); }
  }

  /* Bottom kinetic laser bar */
  .title-laser-bar {
    position: relative;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(6, 182, 212, 0.45) 100%);
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
    transition: all 0.3s var(--ease-fui);
  }

  .title-group-animated.acquired .title-laser-bar {
    background: linear-gradient(90deg, var(--critical-alert) 0%, var(--warning-amber) 100%);
    box-shadow: 0 0 8px var(--critical-alert);
  }

  .laser-pulse {
    position: absolute;
    top: 0;
    left: -50px;
    width: 40px;
    height: 100%;
    background: linear-gradient(90deg, transparent, #ffffff, transparent);
    animation: laser-sweep-pulse 2.5s infinite ease-in-out;
  }

  .title-group-animated.acquired .laser-pulse {
    animation-duration: 0.8s;
  }

  @keyframes laser-sweep-pulse {
    0% { left: -50px; }
    100% { left: 100%; }
  }

  /* Close button with constant red gradient */
  .gradient-close-btn {
    background: linear-gradient(135deg, #ff3b30 0%, #ff2a2a 40%, #990000 100%);
    border: 2px solid rgba(255, 77, 77, 0.85);
    color: #ffffff;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    z-index: 100;
    box-shadow: 
      0 0 12px rgba(255, 59, 48, 0.45), 
      inset 0 0 4px rgba(255, 255, 255, 0.2);
  }

  .gradient-close-btn:hover {
    transform: scale(1.18) rotate(90deg);
    box-shadow: 
      0 0 20px rgba(255, 94, 98, 0.95), 
      inset 0 0 6px rgba(255, 255, 255, 0.3);
    border-color: #ffffff;
  }

  /* Center operational matrix */
  .body-grid {
    position: relative;
    z-index: 10;
    display: flex;
    gap: 24px;
    flex: 1;
    min-height: 0;
    margin-bottom: 24px;
  }

  .grid-column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .left-info {
    width: 282px;
    flex-shrink: 0;
  }

  .center-subtask {
    flex: 1;
  }

  .right-audit {
    width: 282px;
    flex-shrink: 0;
  }

  .section-decor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
    width: 100%;
  }

  .header-left-part {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .param-decor {
    color: #8b5cf6;
    font-size: 10px;
    text-shadow: 0 0 6px #8b5cf6;
  }

  .info-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
  }

  .sub-protocol-title {
    font-size: 11px !important;
    font-weight: 900;
    letter-spacing: 1.2px;
    color: rgba(255, 255, 255, 0.5);
  }

  .strategize-trigger-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(6, 182, 212, 0.08);
    border: 1px solid rgba(6, 182, 212, 0.35);
    border-radius: 4px;
    padding: 3px 8px;
    color: #06b6d4;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.8px;
    cursor: pointer;
    text-shadow: 0 0 6px rgba(6, 182, 212, 0.3);
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.05);
    transition: all 0.2s ease;
  }

  .strategize-trigger-btn:hover {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.35);
    color: #ffffff;
  }

  .strategize-trigger-btn.has-note {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.45);
    color: #8b5cf6;
    text-shadow: 0 0 6px rgba(139, 92, 246, 0.4);
  }

  .strategize-trigger-btn.has-note:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.45);
    color: #ffffff;
  }

  /* Cards */
  .left-info-card, .right-audit-card {
    background: rgba(10, 8, 28, 0.45);
    border: 1px solid rgba(139, 92, 246, 0.22);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    flex-grow: 1;
    min-height: 0;
    position: relative;
    cursor: not-allowed;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .left-info-card:hover, .right-audit-card:hover {
    border-color: rgba(139, 92, 246, 0.35);
    box-shadow: 0 16px 45px rgba(139, 92, 246, 0.08), 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .left-info-scroll-container, .right-audit-scroll-container {
    overflow-y: auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 20px;
  }
  
  .left-info-scroll-container::-webkit-scrollbar,
  .right-audit-scroll-container::-webkit-scrollbar {
    width: 5px;
  }
  
  .left-info-scroll-container::-webkit-scrollbar-track,
  .right-audit-scroll-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 4px;
  }
  
  .left-info-scroll-container::-webkit-scrollbar-thumb,
  .right-audit-scroll-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #8b5cf6 0%, #06b6d4 100%);
    border-radius: 4px;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.5);
  }

  /* Title Header inside the tile */
  .tile-header-cyber {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 2px;
  }

  .tile-header-icon-cyber {
    color: #8b5cf6;
    filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6));
    flex-shrink: 0;
  }

  .reticle-ring {
    transform-origin: 12px 12px;
    animation: reticleSpin 8s linear infinite;
  }

  @keyframes reticleSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .reticle-dot {
    transform-origin: 12px 12px;
    animation: reticleDotPulse 1.5s infinite alternate ease-in-out;
  }

  @keyframes reticleDotPulse {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  .tile-title-cyber {
    font-size: 14.5px;
    font-weight: 950;
    letter-spacing: 1.5px;
    background: linear-gradient(90deg, #d8b4fe 0%, #a78bfa 50%, #06b6d4 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: titleGradientMove 4s linear infinite;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  @keyframes titleGradientMove {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .tile-divider-cyber {
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.35) 0%, rgba(6, 182, 212, 0.35) 50%, transparent 100%);
    margin-top: -6px;
    margin-bottom: 2px;
  }

  /* Info Group layout inside spec tile */
  .info-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .elem-icon {
    color: rgba(255, 255, 255, 0.35);
    flex-shrink: 0;
  }

  /* Element Specific animations */
  .init-icon-dot {
    animation: initDotBlink 1s infinite alternate;
  }

  @keyframes initDotBlink {
    0% { opacity: 0.2; }
    100% { opacity: 1; }
  }

  .clock-hands {
    transform-origin: 12px 12px;
    animation: clockRotate 12s linear infinite;
  }

  @keyframes clockRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .hourglass-drip {
    animation: hourglassDrip 1.5s infinite linear;
  }

  @keyframes hourglassDrip {
    0% { transform: translateY(-3px); opacity: 0; }
    30% { opacity: 1; }
    70% { opacity: 1; }
    100% { transform: translateY(6px); opacity: 0; }
  }

  .priority-icon {
    animation: priorityWarnPulse 2s infinite alternate ease-in-out;
  }

  @keyframes priorityWarnPulse {
    0% { filter: drop-shadow(0 0 1px rgba(245, 158, 11, 0.3)); opacity: 0.6; }
    100% { filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.8)); opacity: 1; }
  }

  .tag-outline {
    transform-origin: 12px 12px;
    animation: tagSway 4s infinite alternate ease-in-out;
  }

  @keyframes tagSway {
    0% { transform: rotate(-3deg); }
    100% { transform: rotate(3deg); }
  }

  .info-label {
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 1.2px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, #a78bfa 50%, rgba(255, 255, 255, 0.8) 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: labelGradientFlow 5s linear infinite;
    text-transform: uppercase;
    display: inline-block;
  }

  @keyframes labelGradientFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Specific header icons color-coding */
  .init-icon {
    color: #a78bfa !important;
    filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.8));
  }
  .deadline-icon {
    color: #f59e0b !important;
    filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.8));
  }
  .days-icon {
    color: #06b6d4 !important;
    filter: drop-shadow(0 0 3px rgba(6, 182, 212, 0.8));
  }
  .days-icon.days-icon-overdue {
    color: #ef4444 !important;
    filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.85));
  }
  .priority-icon-low {
    color: #10b981 !important;
    filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.8));
  }
  .priority-icon-med {
    color: #3b82f6 !important;
    filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.8));
  }
  .priority-icon-high {
    color: #ef4444 !important;
    filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.85));
  }
  .tags-icon {
    color: #c084fc !important;
    filter: drop-shadow(0 0 3px rgba(167, 139, 250, 0.8));
  }

  /* Pill overrides styled like buttons */
  .read-only-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0 18px;
    border-radius: 12px;
    font-weight: 950;
    font-size: 16.5px;
    letter-spacing: 0.8px;
    position: relative;
    overflow: hidden;
    color: #ffffff;
    cursor: not-allowed;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .read-only-pill:hover, .priority-readonly-badge-cyber:hover {
    transform: translateY(-2px) scale(1.02);
    border-color: #ffffff;
  }

  /* Shimmer sweep effect for read only display parameters */
  .read-only-pill::after, .priority-readonly-badge-cyber::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 80%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transform: skewX(-25deg);
    transition: none;
    pointer-events: none;
  }

  .read-only-pill:hover::after, .priority-readonly-badge-cyber:hover::after {
    left: 150%;
    transition: left 0.8s ease-in-out;
  }

  .init-pill-cyber {
    background: linear-gradient(135deg, #8b5cf6 0%, #5b21b6 50%, #2e1065 100%);
    border: 2px solid rgba(139, 92, 246, 0.6);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
  }

  /* Deadline button styled exactly like abort button gradient theme */
  .deadline-pill-cyber {
    background: linear-gradient(135deg, #ff3b30 0%, #aa0000 50%, #4a0000 100%);
    border: 2px solid rgba(255, 77, 77, 0.7);
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.35);
  }

  /* Constant flowing high rate glowing reddish themed remaining button */
  .days-pill-cyber {
    background: linear-gradient(90deg, #ef4444, #f43f5e, #be185d, #e11d48, #ef4444);
    background-size: 300% 100%;
    animation: fastRedGradientFlow 1.5s linear infinite;
    border: 2px solid rgba(239, 68, 68, 0.85);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.55), inset 0 0 8px rgba(255, 255, 255, 0.2);
    font-weight: 999 !important; /* Maximized boldness */
  }

  .days-pill-cyber.overdue-pill-cyber {
    background: linear-gradient(90deg, #b91c1c, #ef4444, #9f1239, #dc2626, #b91c1c);
    background-size: 300% 100%;
    animation: fastRedGradientFlow 1s linear infinite;
    border: 2px solid rgba(239, 68, 68, 0.95);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.3);
    font-weight: 999 !important; /* Maximized boldness */
  }

  @keyframes fastRedGradientFlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }

  /* Priority Badges styled like cyber buttons with wildcard priority handles */
  .priority-readonly-badge-cyber {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0 16px;
    border-radius: 12px;
    font-weight: 950;
    font-size: 16.5px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .priority-low-cyber,
  .priority-l-cyber {
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #064e3b 100%);
    border: 2px solid rgba(16, 185, 129, 0.7);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
  }

  /* Medium Priority styled in Yellow Gradient theme */
  .priority-med-cyber,
  .priority-medium-cyber,
  .priority-m-cyber {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #78350f 100%);
    border: 2px solid rgba(245, 158, 11, 0.7);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
  }

  .priority-high-cyber,
  .priority-h-cyber,
  .priority-critical-cyber,
  .priority-urgent-cyber {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #7f1d1d 100%);
    border: 2px solid rgba(239, 68, 68, 0.75);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
  }

  /* Lock Warning Overlay with increased background blur (28px) and breathing warning icon */
  .lock-warning-overlay {
    position: absolute;
    inset: 0;
    z-index: 200;
    background: rgba(8, 2, 14, 0.88);
    backdrop-filter: blur(31px) saturate(1.8);
    -webkit-backdrop-filter: blur(31px) saturate(1.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    border: 2px solid rgba(239, 68, 68, 0.45);
    box-shadow: inset 0 0 35px rgba(239, 68, 68, 0.25);
    pointer-events: auto;
  }

  .lock-warning-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }

  .warning-caution-icon-breathing {
    font-size: 38px;
    filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.8));
    animation: warningIconBreathing 1.8s infinite ease-in-out;
  }

  @keyframes warningIconBreathing {
    0% {
      transform: scale(0.92);
      opacity: 0.65;
    }
    50% {
      transform: scale(1.08);
      opacity: 1;
      filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.95));
    }
    100% {
      transform: scale(0.92);
      opacity: 0.65;
    }
  }

  .warning-alert-bold-text {
    font-size: 19px;
    font-weight: 950;
    color: #ef4444;
    letter-spacing: 2.5px;
    margin: 0;
    text-shadow: 0 0 12px rgba(239, 68, 68, 0.9);
    text-transform: uppercase;
  }

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .classification-pill-cyber {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    font-size: 14.5px;
    font-weight: 950;
    letter-spacing: 0.8px;
    font-family: 'Outfit', sans-serif;
    position: relative;
    overflow: hidden;
    cursor: not-allowed;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .classification-pill-cyber:hover {
    transform: translateY(-2px) scale(1.04);
    border-color: #ffffff;
    box-shadow: 0 6px 15px rgba(255, 255, 255, 0.15);
  }

  /* Shimmer sweep effect for tags */
  .classification-pill-cyber::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 80%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transform: skewX(-25deg);
    transition: none;
    pointer-events: none;
  }

  .classification-pill-cyber:hover::after {
    left: 150%;
    transition: left 0.8s ease-in-out;
  }

  /* Deterministic Tag Presets (Forge style button overrides) */
  .tag-preset-0 {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0c4a6e 100%);
    border: 2px solid rgba(14, 165, 233, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(14, 165, 233, 0.25);
  }
  .tag-preset-1 {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%);
    border: 2px solid rgba(139, 92, 246, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(139, 92, 246, 0.25);
  }
  .tag-preset-2 {
    background: linear-gradient(135deg, #db2777 0%, #be185d 50%, #831843 100%);
    border: 2px solid rgba(219, 39, 119, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(219, 39, 119, 0.25);
  }
  .tag-preset-3 {
    background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%);
    border: 2px solid rgba(245, 158, 11, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(245, 158, 11, 0.25);
  }
  .tag-preset-4 {
    background: linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%);
    border: 2px solid rgba(16, 185, 129, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
  }

  /* Center Subtask column */
  .center-subtask-container {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-grow: 1;
    min-height: 0;
  }

  .subtask-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex-grow: 1;
    padding-right: 4px;
  }

  .subtask-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .subtask-item:hover {
    background: rgba(139, 92, 246, 0.06);
    border-color: rgba(139, 92, 246, 0.25);
    transform: translateY(-2px);
  }

  /* Rounded checkbox dot selector */
  .subtask-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.22);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: rgba(0, 0, 0, 0.4);
    flex-shrink: 0;
  }

  .subtask-item:hover .subtask-checkbox {
    border-color: #06b6d4;
    box-shadow: 0 0 6px rgba(6, 182, 212, 0.4);
  }

  .subtask-item.done .subtask-checkbox {
    border-color: #8b5cf6;
    background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
  }

  .subtask-check-dot {
    width: 6px;
    height: 6px;
    background-color: #ffffff;
    border-radius: 50%;
  }

  .subtask-text {
    flex-grow: 1;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.2px;
    word-break: break-word;
    user-select: none;
    transition: all 0.2s;
  }

  .subtask-item.done .subtask-text {
    text-decoration: line-through;
    color: rgba(139, 92, 246, 0.4);
  }

  /* Inline subtask edit input */
  .objective-edit-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #8b5cf6;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
  }

  .objective-edit-input {
    flex-grow: 1;
    height: 32px;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    outline: none;
    padding: 0 8px;
  }

  .edit-save-btn {
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.4);
    color: #06b6d4;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: bold;
    font-size: 11px;
    transition: all 0.2s;
  }

  .edit-save-btn:hover {
    background: #06b6d4;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
  }

  /* Item Actions List */
  .item-actions {
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .subtask-item:hover .item-actions {
    opacity: 1;
  }

  .action-icon-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .action-icon-btn:hover {
    color: #ffffff;
  }

  .action-icon-btn.edit:hover {
    color: #06b6d4;
    filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.5));
  }

  .action-icon-btn.delete:hover {
    color: #ef4444;
    filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.5));
  }

  /* Add Subtask row cyber */
  .add-subtask-row-cyber {
    display: flex;
    gap: 6px;
    align-items: center;
    background: rgba(10, 8, 24, 0.45);
    border: 1px solid rgba(139, 92, 246, 0.22);
    border-radius: 30px;
    padding: 0 8px 0 14px;
    height: 60px;
    box-sizing: border-box;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .add-subtask-row-cyber:focus-within {
    border-color: #8b5cf6;
    animation: inputBorderPulse 2.5s infinite ease-in-out;
    background: rgba(15, 10, 36, 0.65);
  }

  @keyframes inputBorderPulse {
    0% {
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.25), inset 0 0 4px rgba(139, 92, 246, 0.1);
    }
    50% {
      border-color: rgba(6, 182, 212, 0.85);
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.55), inset 0 0 8px rgba(6, 182, 212, 0.2);
    }
    100% {
      border-color: rgba(139, 92, 246, 0.5);
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.25), inset 0 0 4px rgba(139, 92, 246, 0.1);
    }
  }

  .add-input-cyber {
    flex-grow: 1;
    height: 100%;
    padding: 0 6px;
    background: transparent;
    border: none;
    color: #ffffff;
    font-weight: 900;
    font-size: 15px;
    letter-spacing: 0.5px;
    outline: none;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
    transition: all 0.3s ease;
  }

  .add-input-cyber:focus {
    color: #ffffff;
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.75), 0 0 15px rgba(6, 182, 212, 0.5);
  }

  .add-input-cyber::placeholder {
    color: rgba(255, 255, 255, 0.22);
    font-weight: 800;
    transition: color 0.3s ease;
  }

  .add-input-cyber:focus::placeholder {
    color: rgba(6, 182, 212, 0.35);
  }

  .add-btn-cyber {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: rgba(139, 92, 246, 0.7);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    padding: 0;
    flex-shrink: 0;
  }

  .add-btn-cyber:hover {
    color: #06b6d4;
    transform: scale(1.18);
    filter: drop-shadow(0 0 6px #06b6d4);
  }

  .add-btn-cyber:active {
    transform: scale(0.9);
  }

  .add-btn-cyber:hover .reticle-outer-ring {
    transform: rotate(90deg);
  }

  /* Right Side Audit Flow logs with Pink-Blue-Red-Yellow animated gradient segment line */
  .timeline-flow-wrapper {
    position: relative;
    padding-left: 8px;
    margin-top: 14px;
    margin-bottom: 10px;
    flex-grow: 1;
  }

  .timeline-flow-list {
    display: flex;
    flex-direction: column;
    gap: 28px;
    position: relative;
  }

  .timeline-flow-item {
    display: flex;
    align-items: flex-start;
    position: relative;
    padding-left: 36px;
    min-height: 52px;
    box-sizing: border-box;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .timeline-dot-cyber {
    position: absolute;
    left: 18px;
    top: 14px;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ec4899;
    border: 2px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 10px #ec4899, 0 0 20px rgba(236, 72, 153, 0.5);
    z-index: 5;
    animation: dotGlowPulse 2.5s infinite ease-in-out;
  }

  @keyframes dotGlowPulse {
    0% {
      transform: translateX(-50%) scale(0.85);
      background: #ec4899;
      box-shadow: 0 0 8px #ec4899, 0 0 15px rgba(236, 72, 153, 0.4);
    }
    50% {
      transform: translateX(-50%) scale(1.15);
      background: #3b82f6;
      box-shadow: 0 0 16px #3b82f6, 0 0 25px rgba(59, 130, 246, 0.7);
    }
    100% {
      transform: translateX(-50%) scale(0.85);
      background: #ec4899;
      box-shadow: 0 0 8px #ec4899, 0 0 15px rgba(236, 72, 153, 0.4);
    }
  }

  .timeline-vertical-line-cyber {
    position: absolute;
    left: 18px;
    transform: translateX(-50%);
    top: 14px;
    bottom: 14px;
    width: 4px;
    background: linear-gradient(180deg, #ec4899, #3b82f6, #ef4444, #eab308, #ec4899);
    background-size: 100% 300%;
    animation: flowLineGradient 4s linear infinite;
    border-radius: 2px;
    box-shadow: 0 0 10px rgba(236, 72, 153, 0.4);
    z-index: 1;
  }

  @keyframes flowLineGradient {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 300%; }
  }

  .timeline-flow-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .flow-desc {
    font-size: 0.9rem; /* Chronological telemetry slightly decreased */
    font-weight: 500;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
  }

  .flow-date {
    font-size: 0.75rem; /* Chronological telemetry slightly decreased */
    font-weight: 700;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 4px;
  }

  /* Custom thin scrollbar styling */
  .custom-scroll::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scroll::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  .custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.25);
    border-radius: 4px;
  }
  .custom-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.5);
  }

  /* Footer Zone styling */
  .modal-footer {
    position: relative;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 24px;
    margin-top: auto;
  }

  .footer-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    max-width: 50%;
  }

  .progress-header-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }

  .percent-readout {
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 0.8px;
    color: #06b6d4;
    text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
  }

  .count-readout {
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.35);
  }

  /* Volumetric Segmented Progress Bar overrides */
  .progress-bar-track-cyber {
    width: 100%;
    height: 18px;
    background: rgba(0, 0, 0, 0.75);
    border: 1.5px solid rgba(139, 92, 246, 0.25);
    border-radius: 9px;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  .progress-bar-fill-cyber {
    height: 100%;
    background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%);
    border-radius: 9px;
    position: relative;
    transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
  }

  .progress-shimmer-cyber {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.22) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: barShimmerSweep 2.5s linear infinite;
  }

  @keyframes barShimmerSweep {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }


  .footer-right {
    display: flex;
    gap: 12px;
  }

  /* Polished Action Buttons with constant gradients and icon animations */
  .action-btn-cyber {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 63px;
    padding: 0 25px;
    border-radius: 32px; /* Rounded corners matching theme */
    font-weight: 950;
    font-size: 12.5px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
  }

  .btn-icon {
    flex-shrink: 0;
  }

  /* Abort Icon and Animations */
  .abort-icon-svg {
    display: block;
  }

  .abort-icon-outer {
    transform-origin: center;
    animation: abortOuterSpin 4s linear infinite;
    transition: transform 0.3s ease;
  }

  .abort-btn-cyber:hover:not(:disabled) .abort-icon-outer {
    animation: abortOuterSpin 0.8s linear infinite;
    color: #ff4d4d;
  }

  @keyframes abortOuterSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .abort-icon-inner {
    transform-origin: center;
    transition: all 0.3s ease;
  }

  .abort-btn-cyber:hover:not(:disabled) .abort-icon-inner {
    animation: abortInnerShudder 0.25s infinite linear;
    color: #ffffff;
    filter: drop-shadow(0 0 6px rgba(255, 59, 48, 0.9));
  }

  @keyframes abortInnerShudder {
    0% { transform: scale(1.1) translate(0, 0); }
    20% { transform: scale(1.1) translate(-0.5px, 0.5px); }
    40% { transform: scale(1.1) translate(0.5px, -0.5px); }
    60% { transform: scale(1.1) translate(-0.5px, -0.5px); }
    80% { transform: scale(1.1) translate(0.5px, 0.5px); }
    100% { transform: scale(1.1) translate(0, 0); }
  }

  /* Victory Icon and Animations */
  .victory-icon-svg {
    display: block;
  }

  .victory-icon-ring {
    transform-origin: 12px 11px;
    animation: victoryRingSpin 8s linear infinite;
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .victory-btn-cyber:hover:not(:disabled) .victory-icon-ring {
    animation: victoryRingSpin 2s linear infinite;
    opacity: 0.95;
    color: #ffffff;
    filter: drop-shadow(0 0 3px #06b6d4);
  }

  @keyframes victoryRingSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .victory-icon-core {
    transform-origin: 12px 7px;
    animation: victoryCorePulse 2s infinite alternate ease-in-out;
  }

  @keyframes victoryCorePulse {
    0% { opacity: 0.4; transform: scale(0.85); }
    100% { opacity: 1; transform: scale(1.25); }
  }

  .victory-icon-cup, .victory-icon-handle-l, .victory-icon-handle-r, .victory-icon-base {
    transform-origin: 12px 14px;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .victory-btn-cyber:hover:not(:disabled) .victory-icon-cup,
  .victory-btn-cyber:hover:not(:disabled) .victory-icon-handle-l,
  .victory-btn-cyber:hover:not(:disabled) .victory-icon-handle-r,
  .victory-btn-cyber:hover:not(:disabled) .victory-icon-base {
    transform: translateY(-1px) scale(1.05);
    filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.6));
  }

  .victory-icon-sparkle {
    opacity: 0;
    transition: all 0.3s ease;
  }

  .sp-1 { transform-origin: 7px 8px; }
  .sp-2 { transform-origin: 17px 8px; }

  .victory-btn-cyber:hover:not(:disabled) .victory-icon-sparkle {
    opacity: 0.85;
    animation: victorySparkleGlow 1.2s infinite alternate ease-in-out;
  }

  @keyframes victorySparkleGlow {
    0% { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
    100% { transform: scale(1.15) rotate(90deg); opacity: 1; }
  }

  /* Constant Red gradient for abort button */
  .abort-btn-cyber {
    background: linear-gradient(135deg, #ff3b30 0%, #aa0000 50%, #4a0000 100%);
    border: 2px solid rgba(255, 77, 77, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(255, 59, 48, 0.3);
    
    /* Slightly increased size */
    height: 68px;
    padding: 0 32px;
    font-size: 16.5px;
    gap: 12px;
    border-radius: 34px;
  }

  .abort-btn-cyber:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 
      0 12px 30px rgba(255, 59, 48, 0.75), 
      inset 0 0 10px rgba(255, 255, 255, 0.2);
    border-color: #ffffff;
  }

  /* Constant Cyan gradient for victory button */
  .victory-btn-cyber {
    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0c4a6e 100%);
    border: 2px solid rgba(6, 182, 212, 0.65);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
    
    /* Slightly increased size */
    height: 68px;
    padding: 0 32px;
    font-size: 16.5px;
    gap: 12px;
    border-radius: 34px;
  }

  .victory-btn-cyber:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 
      0 12px 30px rgba(6, 182, 212, 0.75), 
      inset 0 0 10px rgba(255, 255, 255, 0.2);
    border-color: #ffffff;
  }

  /* Shimmer reflect effect on hover for both buttons */
  .abort-btn-cyber::after, .victory-btn-cyber::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 80%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transform: skewX(-25deg);
    transition: none;
    pointer-events: none;
  }

  .abort-btn-cyber:hover:not(:disabled)::after, .victory-btn-cyber:hover:not(:disabled)::after {
    left: 150%;
    transition: left 0.8s ease-in-out;
  }

  .close-archive-btn-cyber {
    background: linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%);
    border: 2px solid rgba(139, 92, 246, 0.6);
    color: #ffffff;
    border-radius: 34px;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    height: 68px;
    padding: 0 32px;
    font-size: 16.5px;
  }

  .close-archive-btn-cyber:hover {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 12px 30px rgba(139, 92, 246, 0.6);
    border-color: #ffffff;
  }

  :global(.readonly-selector button) {
    cursor: default !important;
  }

  .readonly-item {
    cursor: default !important;
  }

  .font-outfit { font-family: 'Outfit', sans-serif; font-weight: 950; }
  .font-inter { font-family: 'Inter', sans-serif; font-weight: 700; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  :global(.tag-preset-drift-abort) {
    color: #ff2d55 !important;
    background: rgba(255, 45, 85, 0.1) !important;
    border-color: rgba(255, 45, 85, 0.45) !important;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.25) !important;
  }

  /* Modal transition container wrapper */
  .modal-transition-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  /* Pulsing crimson border for drift abort task view modal */
  .modal-panel-custom.modal-drift-abort-active {
    border-color: rgba(255, 45, 85, 0.95) !important;
    box-shadow: 
      0 0 350px rgba(0, 0, 0, 1), 
      inset 0 0 100px rgba(255, 45, 85, 0.1),
      0 0 40px rgba(255, 45, 85, 0.25) !important;
    animation: modalDriftPulse 3s infinite alternate ease-in-out !important;
  }
  @keyframes modalDriftPulse {
    0% { box-shadow: 0 0 350px rgba(0, 0, 0, 1), inset 0 0 100px rgba(255, 45, 85, 0.1), 0 0 25px rgba(255, 45, 85, 0.15); }
    100% { box-shadow: 0 0 350px rgba(0, 0, 0, 1), inset 0 0 100px rgba(255, 45, 85, 0.15), 0 0 45px rgba(255, 45, 85, 0.35); }
  }

  /* Title badge for drift-abort missions */
  .drift-abort-title-badge {
    display: inline-block;
    font-size: 13px;
    font-weight: 950;
    color: #ff2d55;
    background: rgba(255, 45, 85, 0.12);
    border: 1px solid rgba(255, 45, 85, 0.5);
    padding: 3px 8px;
    border-radius: 4px;
    margin-right: 12px;
    vertical-align: middle;
    letter-spacing: 1px;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.25);
    animation: driftBadgeTitlePulse 2s ease-in-out infinite alternate;
  }
  @keyframes driftBadgeTitlePulse {
    from { opacity: 0.8; box-shadow: 0 0 8px rgba(255, 45, 85, 0.15); }
    to { opacity: 1; box-shadow: 0 0 16px rgba(255, 45, 85, 0.45); }
  }

  /* Hover enhancements for task title name */
  .forge-title:hover, .forge-title.title-hovered {
    transform: scale(1.02);
    letter-spacing: 4px;
    text-shadow: 0 0 25px rgba(139, 92, 246, 0.8), 0 0 12px rgba(6, 182, 212, 0.8) !important;
    animation: chroma-loop 1.5s linear infinite, glow-breath 1s infinite alternate ease-in-out !important;
  }

  /* Speeded up animations on scope hover */
  .omni-scope-terminal {
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  .acquired .scope-chassis {
    animation-duration: 2s !important;
  }
  .acquired .ring-cyan {
    border-color: var(--critical-alert) !important;
    animation-duration: 0.5s !important;
  }
  .acquired .ring-violet {
    border-color: var(--secondary-accent) !important;
    animation-duration: 0.4s !important;
  }
  .acquired .rotating-crossing-lines-group {
    animation: stepped-radar-spin-fast 0.8s cubic-bezier(0.25, 1, 0.5, 1) infinite !important;
  }
  .acquired .outer-broken-ring {
    animation: spin-cw-fast 1.2s linear infinite !important;
  }
  .acquired .inner-broken-ring {
    animation: spin-ccw-fast 0.8s linear infinite !important;
  }
  .acquired .spotlight-breath-wrapper {
    animation: spotlight-sweep-fast 0.5s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }

  /* Disconnect Link button styling and width increase */
  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link {
    width: 380px;
    max-width: 100%;
    justify-content: center;
    border-radius: 34px;
    height: 68px;
    font-size: 17px;
    font-weight: 950;
    letter-spacing: 1.2px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  }

  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-victory-theme {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: 2px solid rgba(16, 185, 129, 0.65);
    color: #ffffff;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }
  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-victory-theme:hover {
    transform: translateY(-4px) scale(1.03);
    border-color: #ffffff;
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.65);
  }

  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-abort-theme {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    border: 2px solid rgba(239, 68, 68, 0.65);
    color: #ffffff;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }
  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-abort-theme:hover {
    transform: translateY(-4px) scale(1.03);
    border-color: #ffffff;
    box-shadow: 0 12px 30px rgba(239, 68, 68, 0.65);
  }

  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-drift-theme {
    background: linear-gradient(135deg, #ff2d55 0%, #900a22 100%);
    border: 2px solid rgba(255, 45, 85, 0.75);
    color: #ffffff;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }
  .action-btn-cyber.close-archive-btn-cyber.btn-disconnect-link.btn-drift-theme:hover {
    transform: translateY(-4px) scale(1.03);
    border-color: #ffffff;
    box-shadow: 0 12px 30px rgba(255, 45, 85, 0.75);
  }

  /* Subtask Locked Items */
  .add-subtask-row-cyber.add-row-readonly {
    border-color: rgba(255, 45, 85, 0.18) !important;
    background: rgba(255, 45, 85, 0.02) !important;
    cursor: not-allowed;
  }
  .add-subtask-row-cyber.add-row-readonly .add-input-cyber {
    color: rgba(255, 45, 85, 0.45) !important;
    cursor: not-allowed;
  }
  .add-subtask-row-cyber.add-row-readonly .add-btn-cyber {
    color: rgba(255, 45, 85, 0.35) !important;
    cursor: not-allowed;
  }
  .add-subtask-row-cyber.add-row-readonly .add-btn-cyber:hover {
    transform: none;
    filter: none;
  }

  /* Comment popup styling */
  .comment-popup-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30000;
    background: rgba(4, 2, 12, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 24px;
  }

  .comment-popup-window {
    width: 620px;
    background: linear-gradient(165deg, #0e092a 0%, #020205 100%);
    border: 2px solid rgba(139, 92, 246, 0.5);
    border-radius: 24px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    box-shadow: 0 15px 45px rgba(0, 0, 0, 0.95);
  }

  .popup-glass {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
  }

  .popup-border-glow {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.15);
  }
  .popup-border-glow.victory {
    box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.15);
  }
  .popup-border-glow.abort {
    box-shadow: inset 0 0 20px rgba(239, 68, 68, 0.15);
  }
  .popup-border-glow.drift {
    box-shadow: inset 0 0 25px rgba(255, 45, 85, 0.25);
  }

  .popup-header {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 2;
    position: relative;
  }

  .popup-header-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    flex-shrink: 0;
    background: rgba(139, 92, 246, 0.12);
    border: 1.5px solid rgba(139, 92, 246, 0.4);
    color: #a78bfa;
  }
  .popup-header-icon.victory {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.4);
    color: #10b981;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
  }
  .popup-header-icon.abort {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
  }
  .popup-header-icon.drift {
    background: rgba(255, 45, 85, 0.15);
    border-color: rgba(255, 45, 85, 0.5);
    color: #ff2d55;
    box-shadow: 0 0 20px rgba(255, 45, 85, 0.35);
  }

  .popup-header-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .popup-label {
    font-size: 10px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 2px;
  }

  .popup-task-title {
    font-size: 18px;
    font-weight: 950;
    color: #ffffff;
    margin: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .popup-divider {
    height: 1px;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.35) 0%, transparent 100%);
    margin: 18px 0;
    z-index: 2;
    position: relative;
  }

  .popup-body {
    z-index: 2;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .comment-label {
    font-size: 11px;
    font-weight: 900;
    color: rgba(139, 92, 246, 0.8);
    letter-spacing: 1px;
  }

  .comment-box {
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 8px;
    padding: 16px 20px;
    color: #ffffff;
    font-size: 19px;
    font-weight: 900;
    line-height: 1.6;
    min-height: 85px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
  }

  .drift-warning-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(255, 45, 85, 0.08);
    border: 1.5px solid rgba(255, 45, 85, 0.4);
    border-radius: 8px;
    padding: 12px 16px;
    color: #ff2d55;
    margin-top: 8px;
  }

  .drift-warning-icon {
    font-size: 20px;
    animation: driftWarningIconBlink 1s infinite alternate;
  }

  @keyframes driftWarningIconBlink {
    0% { opacity: 0.4; }
    100% { opacity: 1; filter: drop-shadow(0 0 6px #ff2d55); }
  }

  .drift-warning-text {
    font-size: 11.5px;
    line-height: 1.5;
  }

  .popup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    z-index: 2;
    position: relative;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 18px;
  }

  .popup-btn {
    height: 44px;
    padding: 0 20px;
    border-radius: 22px;
    font-size: 11.5px;
    font-weight: 950;
    letter-spacing: 1px;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s;
    outline: none;
  }

  .popup-btn-close {
    background: transparent;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.7);
  }
  .popup-btn-close:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .popup-btn-disconnect {
    background: linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(139, 92, 246, 0.25);
  }
  .popup-btn-disconnect:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(139, 92, 246, 0.4);
    border-color: #ffffff;
  }
</style>

<!-- cache-bust-trigger: 2026-06-03T10:35 -->
