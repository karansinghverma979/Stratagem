import { writable } from 'svelte/store';
import { AudioEngine } from './audio-engine.js';

export const AntaryamiState = writable({
  audioEnabled: true,
  audioVolume: 0.8,
  audioTheme: 'cyberpunk',
  nukeProtocolLocked: true,
  deepFocusMode: false,
  telemetryActive: true,
  aigirlFolderMode: 'random',
  aigirlNudityEnabled: false,
  notecardsClickCount: 0,
  nudeClicksRemaining: 0,
  appLaunchOnStartup: false,
  autoSleepEnabled: true,
  autoSleepTimeoutMinutes: 5,
  batteryStealthEnabled: true,
  tacticalNavEnabled: true,
  fastColdBoot: false,
  githubUrl: 'https://github.com/karansinghverma979/',
  emailAddress: 'karansinghverma979@gmail.com',
  linkedinUrl: 'https://www.linkedin.com/in/karansinghverma979/',
  nudeBypassAllowed: false,
  isPackaged: false
});

export const isStasisActive = writable(false);
export const isBatteryStealthMode = writable(false);

isBatteryStealthMode.subscribe(stealth => {
  if (typeof document !== 'undefined') {
    if (stealth) {
      document.body.classList.add('battery-stealth-mode');
    } else {
      document.body.classList.remove('battery-stealth-mode');
    }
  }
});

export function toggleStasisMode(active) {
  if (typeof window !== 'undefined' && window.osAPI && typeof window.osAPI.toggleStasis === 'function') {
    window.osAPI.toggleStasis(active);
  } else {
    isStasisActive.update(curr => typeof active === 'boolean' ? active : !curr);
  }
}

isStasisActive.subscribe(active => {
  if (typeof document !== 'undefined') {
    if (active) {
      document.body.classList.add('stasis-suspended');
      AudioEngine.suspendAudio();
    } else {
      document.body.classList.remove('stasis-suspended');
      AudioEngine.resumeAudio();
    }
  }
});

// Only push audio settings to the engine when those specific fields change.
// Prevents AudioEngine calls on every unrelated state update (e.g. nude countdown ticks).
let _prevAudioEnabled;
let _prevAudioVolume;
let _prevAudioTheme;

AntaryamiState.subscribe(state => {
  if (!state) return;
  if (state.audioEnabled !== _prevAudioEnabled) {
    AudioEngine.setAudioEnabled(state.audioEnabled);
    _prevAudioEnabled = state.audioEnabled;
  }
  if (state.audioVolume !== _prevAudioVolume) {
    AudioEngine.setAudioVolume(state.audioVolume);
    _prevAudioVolume = state.audioVolume;
  }
  if (state.audioTheme !== _prevAudioTheme) {
    AudioEngine.setAudioTheme(state.audioTheme);
    _prevAudioTheme = state.audioTheme;
  }
});

export const currentSector = writable('Execution');
export const genesisActiveTab = writable('developer');

// Helper to update config in DB
export async function updateConfig(key, value) {
  if (typeof window !== 'undefined' && window.stratagemAPI) {
    await window.stratagemAPI.setConfig(key, value);
    AntaryamiState.update(state => ({ ...state, [key]: value }));
  }
}

// Writable stores for each sector's array of tasks/cards
export const executionTasks = writable([]);
export const breachedTasks = writable([]);
export const rawIntelTasks = writable([]);
export const synthesizingTasks = writable([]);
export const weaponizedTasks = writable([]);
export const archivedTasks = writable([]);
export const arsenalTasks = writable([]);

export const highlightedTaskId = writable(null);
export function triggerHighlightTask(taskId) {
  if (!taskId) return;
  highlightedTaskId.set(taskId);
  setTimeout(() => {
    highlightedTaskId.update(curr => curr === taskId ? null : curr);
  }, 4500);
}

let cachedMissions = [];
let initialSyncDone = false;


const storeCache = {
  exec: '',
  breach: '',
  rawIntel: '',
  synth: '',
  weapon: '',
  archive: '',
  arsenal: ''
};

export function rebuildStoresFromCache(silent = false) {
  const exec = [];
  const breach = [];
  const rawIntel = [];
  const synth = [];
  const weapon = [];
  const archive = [];
  const arsenal = [];

  for (const m of cachedMissions) {
    const dbClassifications = m.classifications ? m.classifications.split(',') : [];
    if (m.status === 'ABORTED' && (m.is_rescheduled === 1 || m.is_rescheduled === true || m.is_rescheduled === '1')) {
      if (!dbClassifications.includes('DRIFT-ABORTED')) {
        dbClassifications.unshift('DRIFT-ABORTED');
      }
    }
    
    const rawInitiated = m.initiated_at || m.created_at || new Date().toISOString();
    let initDateFormatted = 'N/A';
    const dateRegex = /(\d{4}-\d{2}-\d{2})/;
    const dateMatch = rawInitiated.match(dateRegex);
    if (dateMatch) {
      const parsed = Date.parse(dateMatch[1]);
      if (!isNaN(parsed)) {
        initDateFormatted = new Date(parsed).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }).toUpperCase();
      }
    } else {
      const splitDate = rawInitiated.split(' ')[0];
      initDateFormatted = splitDate.toUpperCase();
    }

    const tbUpper = (m.temporal_boundary || '').trim().toUpperCase();
    const hasDeadline = m.temporal_boundary && tbUpper !== '' && tbUpper !== 'TBD' && tbUpper !== 'READY' && tbUpper !== 'DEPLOYED' && tbUpper !== 'NO DEADLINE';

    let isOverdue = false;
    if (hasDeadline) {
      const dlDate = new Date(m.temporal_boundary);
      if (!isNaN(dlDate.getTime())) {
        const dlMidnight = new Date(dlDate.getFullYear(), dlDate.getMonth(), dlDate.getDate(), 0, 0, 0, 0).getTime();
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).getTime();
        isOverdue = todayMidnight > dlMidnight;
      }
    }
    const isFinalState = m.status === 'VICTORY' || m.status === 'ABORTED' || m.status === 'ABORT';
    const derivedStatus = (!isFinalState && (m.status === 'BREACH' || (m.status === 'EXECUTION' && hasDeadline && isOverdue))) ? 'BREACH' : m.status;

    const resCount = m.reschedule_count !== undefined && m.reschedule_count !== null 
      ? Number(m.reschedule_count) 
      : (m.is_rescheduled ? 1 : 0);

    const isNeglected = (derivedStatus === 'ABORTED' || m.status === 'ABORTED' || m.status === 'ABORT') && 
      (dbClassifications.includes('NEGLECTED') || (m.classifications && m.classifications.includes('NEGLECTED')));

    const formattedMission = {
      id: m.id,
      title: m.title,
      status: derivedStatus,
      priority: m.threat_level || 'MED',
      tags: derivedStatus === 'VICTORY' || derivedStatus === 'ABORTED' || derivedStatus === 'ABORT' ? ['HISTORICAL', ...dbClassifications] : ['#SYSTEM', ...dbClassifications],
      countdown: m.temporal_boundary ? `T-MINUS ${m.temporal_boundary}` : 'NO DEADLINE',
      deadlineDate: m.temporal_boundary || '',
      initiateDate: initDateFormatted,
      done: derivedStatus === 'VICTORY',
      priorityVal: m.threat_level === 'HIGH' ? 3 : (m.threat_level === 'LOW' ? 1 : 2),
      rescheduleCount: resCount,
      isRescheduled: resCount > 0,
      isRescheduleLocked: resCount >= 2,
      isNeglected: isNeglected,
      resolution: (derivedStatus || '').toUpperCase() === 'VICTORY' ? 'VICTORY' : (((derivedStatus || '').toUpperCase() === 'ABORTED' || (derivedStatus || '').toUpperCase() === 'ABORT') ? 'ABORTED' : null),
      completionDate: m.completed_at 
        ? m.completed_at.split('T')[0].split(' ')[0] 
        : (m.created_at ? m.created_at.split(' ')[0] : new Date().toISOString().split('T')[0]),
      desc: `Mission designated under threat level ${m.threat_level}. Boundary: ${m.temporal_boundary}`,
      classifications: dbClassifications.length > 0 ? dbClassifications : ['DATABASE', m.threat_level || 'MED'],
      createdAt: m.created_at,
      initiatedAt: m.initiated_at,
      rescheduledAt: m.rescheduled_at,
      resolutionComment: m.resolution_comment || ''
    };

    if (m.status === 'VICTORY' || m.status === 'ABORTED' || m.status === 'ABORT') {
      archive.push(formattedMission);
    } else if (m.status === 'RAW_INTEL' || m.status === 'SYNTHESIZING' || m.status === 'WEAPONIZED' || !hasDeadline) {
      arsenal.push(formattedMission);

      // Arsenal has two active categories: SYNTHESIZING and RAW_INTEL (legacy WEAPONIZED maps to SYNTHESIZING)
      const isSynth = m.status === 'SYNTHESIZING' || m.status === 'WEAPONIZED';
      const arsenalTag = isSynth ? 'SYNTH' : 'RAW';
      const arsenalObj = { 
        id: m.id, 
        title: m.title, 
        desc: formattedMission.desc, 
        tags: [arsenalTag, m.threat_level, ...formattedMission.classifications], 
        createdAt: formattedMission.createdAt 
      };
      
      if (isSynth) {
        synth.push(arsenalObj);
      } else {
        rawIntel.push(arsenalObj);
      }
    } else {
      if (derivedStatus === 'BREACH') {
        breach.push(formattedMission);
      } else {
        exec.push(formattedMission);
      }
    }
  }

  const execStr = JSON.stringify(exec);
  if (storeCache.exec !== execStr) {
    storeCache.exec = execStr;
    executionTasks.set(exec);
  }

  const breachStr = JSON.stringify(breach);
  if (storeCache.breach !== breachStr) {
    storeCache.breach = breachStr;
    breachedTasks.set(breach);
  }

  const rawIntelStr = JSON.stringify(rawIntel);
  if (storeCache.rawIntel !== rawIntelStr) {
    storeCache.rawIntel = rawIntelStr;
    rawIntelTasks.set(rawIntel);
  }

  const synthStr = JSON.stringify(synth);
  if (storeCache.synth !== synthStr) {
    storeCache.synth = synthStr;
    synthesizingTasks.set(synth);
  }

  const weaponStr = JSON.stringify(weapon);
  if (storeCache.weapon !== weaponStr) {
    storeCache.weapon = weaponStr;
    weaponizedTasks.set(weapon);
  }

  const archiveStr = JSON.stringify(archive);
  if (storeCache.archive !== archiveStr) {
    storeCache.archive = archiveStr;
    archivedTasks.set(archive);
  }

  const arsenalStr = JSON.stringify(arsenal);
  if (storeCache.arsenal !== arsenalStr) {
    storeCache.arsenal = arsenalStr;
    arsenalTasks.set(arsenal);
  }

  if (!silent) {
    AudioEngine.play('data-decode');
  }
}

export async function syncAntaryami(silent = false) {
  try {
    if (typeof window === 'undefined' || !window.stratagemAPI) {
      console.warn('[Antaryami] Secure IPC Bridge (stratagemAPI) is unavailable.');
      return;
    }

    console.log('[Antaryami] Synchronizing SQLite Matrix...');
    
    const config = await window.stratagemAPI.getConfig();
    if (config) {
      const notecardsClickCount = parseInt(config.notecardsClickCount || '0', 10);
      const nudeClicksRemaining = parseInt(config.nudeClicksRemaining || '0', 10);
      const aigirlNudityEnabled = config.aigirlNudityEnabled === true || config.aigirlNudityEnabled === 'true';

      const isPackaged = await window.stratagemAPI.isPackaged();
      const nudeBypassAllowed = await window.stratagemAPI.checkNudeBypass();
      const isUnlocked = notecardsClickCount >= 1440 || (!isPackaged && nudeBypassAllowed);

      let finalNudityEnabled = aigirlNudityEnabled;
      let finalNudeClicks = nudeClicksRemaining;

      if (finalNudityEnabled) {
        if (!isUnlocked || finalNudeClicks <= 0) {
          finalNudityEnabled = false;
          finalNudeClicks = 0;
          await window.stratagemAPI.setConfig('aigirlNudityEnabled', 'false');
        }
      }

      AntaryamiState.update(state => ({
        ...state,
        ...config,
        aigirlNudityEnabled: finalNudityEnabled,
        notecardsClickCount,
        nudeClicksRemaining: finalNudeClicks,
        isPackaged,
        nudeBypassAllowed
      }));
    }

    const missions = await window.stratagemAPI.fetchSectorMissions();
    cachedMissions = missions;
    initialSyncDone = true;

    rebuildStoresFromCache(silent);
    console.log('[Antaryami] SQLite synchronization successfully concluded.');
  } catch (error) {
    console.error('[Antaryami] Matrix synchronization failed:', error);
  }
}

export async function recordNoteCardsImageClick() {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  let state;
  AntaryamiState.subscribe(s => { state = s; })();
  if (!state || state.aigirlNudityEnabled) return;

  const currentCount = state.notecardsClickCount || 0;
  if (currentCount < 1440) {
    const newCount = currentCount + 1;
    AntaryamiState.update(s => ({ ...s, notecardsClickCount: newCount }));
    await window.stratagemAPI.setConfig('notecardsClickCount', newCount.toString());

    if (newCount === 1440) {
      AudioEngine.play('ping');
      addNotification(
        'NUDITY INTERFACE UNLOCKED',
        'Target threshold reached (1,440 NoteCards clicks verified). Synthetic Companion Nudity Interface authorized!',
        'success'
      );
    }
  }
}

export async function recordNudityImageClick() {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  let state;
  AntaryamiState.subscribe(s => { state = s; })();
  if (!state || !state.aigirlNudityEnabled) return;

  const remaining = state.nudeClicksRemaining !== undefined && state.nudeClicksRemaining > 0 ? state.nudeClicksRemaining : 60;
  if (remaining > 1) {
    const newRemaining = remaining - 1;
    AntaryamiState.update(s => ({ ...s, nudeClicksRemaining: newRemaining }));
    await window.stratagemAPI.setConfig('nudeClicksRemaining', newRemaining.toString());
  } else {
    // 0 clicks remaining — Revert to NoteCards mode and reset count to 0
    AntaryamiState.update(s => ({
      ...s,
      aigirlNudityEnabled: false,
      notecardsClickCount: 0,
      nudeClicksRemaining: 0
    }));
    await window.stratagemAPI.setConfig('aigirlNudityEnabled', 'false');
    await window.stratagemAPI.setConfig('notecardsClickCount', '0');
    await window.stratagemAPI.setConfig('nudeClicksRemaining', '0');

    AudioEngine.play('fail');
    addNotification(
      'NUDITY QUOTA EXHAUSTED',
      'All 60 Nudity image allocations consumed. Auto-reverted to NoteCards Mode.',
      'error'
    );
  }
}

/**
 * MISSION OPERATIONS:
 * These wrappers ensure every mutation is immediately followed by a full store sync.
 */

export async function insertMission(mission) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  const result = await window.stratagemAPI.insertMission(mission);
  const newMission = {
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    is_rescheduled: 0,
    rescheduled_at: null,
    resolution_comment: '',
    ...result
  };
  cachedMissions.unshift(newMission);
  rebuildStoresFromCache(true);
  AudioEngine.play('data-lock');
  return result;
}

export async function updateMissionStatus(id, status) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.updateMissionStatus(id, status);
  const index = cachedMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    cachedMissions[index].status = status;
    rebuildStoresFromCache(true);
  }
  AudioEngine.play('data-lock');
  triggerHighlightTask(id);
}

export async function updateMissionThreatLevel(id, threatLevel) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.updateMissionThreatLevel(id, threatLevel);
  const index = cachedMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    cachedMissions[index].threat_level = threatLevel;
    rebuildStoresFromCache(true);
  }
  AudioEngine.play('data-lock');
}

export async function updateMissionDetails(id, title, classifications, threatLevel, deadline, status) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.updateMissionDetails(id, title, classifications, threatLevel, deadline, status);
  const index = cachedMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    const old = cachedMissions[index];
    const tbUpper = (deadline || '').trim().toUpperCase();
    const hasDeadline = deadline && tbUpper !== '' && tbUpper !== 'TBD' && tbUpper !== 'READY' && tbUpper !== 'DEPLOYED' && tbUpper !== 'NO DEADLINE' && tbUpper !== 'CLOSED';
    
    let targetStatus = status;
    let targetInitiatedAt = old.initiated_at;
    if (hasDeadline) {
      targetStatus = 'EXECUTION';
      if (!old.initiated_at || old.initiated_at === 'null' || old.temporal_boundary === 'NO DEADLINE' || !old.temporal_boundary) {
        targetInitiatedAt = new Date().toISOString();
      }
    } else {
      if (status === 'EXECUTION' || status === 'BREACH') {
        targetStatus = 'RAW_INTEL';
      }
    }
    
    cachedMissions[index] = {
      ...old,
      title,
      classifications,
      threat_level: threatLevel,
      temporal_boundary: deadline,
      status: targetStatus,
      initiated_at: targetInitiatedAt
    };
    rebuildStoresFromCache(true);
  }
  AudioEngine.play('data-lock');
}

export async function rescheduleMission(id, newDeadline) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.rescheduleMission(id, newDeadline);
  const index = cachedMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    const old = cachedMissions[index];
    const nowStr = new Date().toISOString();
    
    if (!old.initiated_at || old.initiated_at === 'null' || old.temporal_boundary === 'NO DEADLINE' || !old.temporal_boundary) {
      cachedMissions[index] = {
        ...old,
        status: 'EXECUTION',
        temporal_boundary: newDeadline,
        initiated_at: nowStr,
        is_rescheduled: 0
      };
    } else {
      cachedMissions[index] = {
        ...old,
        status: 'EXECUTION',
        temporal_boundary: newDeadline,
        is_rescheduled: 1,
        rescheduled_at: nowStr
      };
    }
    rebuildStoresFromCache(true);
  }
  AudioEngine.play('data-lock');
}

export async function deleteMission(id) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.deleteMission(id);
  localStorage.removeItem(`stratagem_objectives_${id}`);
  cachedMissions = cachedMissions.filter(m => m.id !== id);
  rebuildStoresFromCache(true);
  AudioEngine.play('fail');
}

export async function purgeDatabase() {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.purgeDatabase();
  // Clear all localStorage keys starting with stratagem_objectives_
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('stratagem_objectives_')) {
      localStorage.removeItem(key);
    }
  }
  cachedMissions = [];
  rebuildStoresFromCache(true);
  AudioEngine.play('shutdown');
}

export async function updateResolutionComment(id, comment) {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.updateResolutionComment(id, comment);
  const index = cachedMissions.findIndex(m => m.id === id);
  if (index !== -1) {
    cachedMissions[index].resolution_comment = comment;
    rebuildStoresFromCache(true);
  }
  AudioEngine.play('data-lock');
}

export const notifications = writable([]);
export function addNotification(title, desc, type = 'info') {
  const id = Math.random().toString(36).substring(2, 9);
  notifications.update(n => [...n, { id, title, desc, type }]);

  if (type === 'success') {
    AudioEngine.play('success');
  } else if (type === 'error' || type === 'critical') {
    AudioEngine.play('fail');
  } else {
    AudioEngine.play('ping');
  }

  setTimeout(() => {
    notifications.update(n => n.filter(item => item.id !== id));
  }, 4000);
}

export const isTaskViewOpen = writable(false);
export const closeTaskViewTrigger = writable(0);
export const isNeuralUplinkOpen = writable(false);
export const neuralUplinkLogs = writable([]);
export const editingEntry = writable(null);
export const editingEntryIndex = writable(-1);
export const activeStrategizeTask = writable(null);
export const onNoteSavedCallback = writable(null);
export const isPurgeModalOpen = writable(false);
export const taskToPurge = writable(null);
let initialDraft = {
  category: 'Matrix Undefined',
  agency: 'Undefined',
  vector: 'Undefined',
  location: 'Matrix Undefined',
  priority: 'ELEVATED',
  tolerance: 'STRICT',
  operator: 'ANTIGRAVITY',
  content: ''
};

try {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('neural_uplink_draft');
    if (saved) {
      initialDraft = { ...initialDraft, ...JSON.parse(saved) };
    }
  }
} catch (e) {
  console.warn('[store] Failed to parse neural_uplink_draft from localStorage:', e);
}

export const neuralUplinkDraft = writable(initialDraft);

if (typeof localStorage !== 'undefined') {
  // Cache the last persisted value to avoid unnecessary writes on every state read.
  let _lastDraftJson = JSON.stringify(initialDraft);
  neuralUplinkDraft.subscribe(draft => {
    try {
      const json = JSON.stringify(draft);
      if (json !== _lastDraftJson) {
        localStorage.setItem('neural_uplink_draft', json);
        _lastDraftJson = json;
      }
    } catch (e) {
      console.warn('[store] Failed to save neural_uplink_draft to localStorage:', e);
    }
  });
}
export async function loadNeuralUplinkLogs() {
  if (typeof window !== 'undefined' && window.stratagemAPI) {
    try {
      const result = await window.stratagemAPI.intelReadQuotes('improvements.json');
      if (result && result.success && Array.isArray(result.data)) {
        neuralUplinkLogs.set(result.data);
      } else {
        neuralUplinkLogs.set([]);
      }
    } catch (err) {
      console.warn("Could not load improvements.json:", err);
    }
  }
}

/**
 * Start a background auto-sync interval.
 * Runs syncAntaryami() every 60 seconds so that deadlines crossing
 * into the past (EXECUTION → BREACH) are reflected immediately in the UI.
 */
let autoSyncInterval = null;

export function startAutoSync(intervalMs = 60000) {
  if (autoSyncInterval) return; // already running
  autoSyncInterval = setInterval(async () => {
    await syncAntaryami(true);
    console.log('[Antaryami] Background auto-sync pulse complete.');
  }, intervalMs);
  console.log(`[Antaryami] Auto-sync started (every ${intervalMs / 1000}s).`);
}

export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log('[Antaryami] Auto-sync stopped.');
  }
}

// DevTools bypass helpers for NoteCards / Nude Mode gates
if (typeof window !== 'undefined') {
  window.unlockNudityMode = () => {
    window.stratagemAPI.setConfig('notecardsClickCount', '1440').then(() => {
      window.stratagemAPI.setConfig('nudeClicksRemaining', '60').then(() => {
        AntaryamiState.update(s => ({
          ...s,
          notecardsClickCount: 1440,
          nudeClicksRemaining: 60
        }));
        console.log('[DevTools] Nudity Mode unlocked (1,440 clicks set).');
      });
    });
  };
  window.lockNudityMode = () => {
    window.stratagemAPI.setConfig('notecardsClickCount', '0').then(() => {
      window.stratagemAPI.setConfig('nudeClicksRemaining', '0').then(() => {
        window.stratagemAPI.setConfig('aigirlNudityEnabled', 'false').then(() => {
          AntaryamiState.update(s => ({
            ...s,
            aigirlNudityEnabled: false,
            notecardsClickCount: 0,
            nudeClicksRemaining: 0
          }));
          console.log('[DevTools] Nudity Mode locked.');
        });
      });
    });
  };
  window.setNotecardsClickCount = (count) => {
    window.stratagemAPI.setConfig('notecardsClickCount', count.toString()).then(() => {
      AntaryamiState.update(s => ({ ...s, notecardsClickCount: count }));
      console.log(`[DevTools] NoteCards click count set to ${count}.`);
    });
  };
  window.setNudeClicksRemaining = (count) => {
    window.stratagemAPI.setConfig('nudeClicksRemaining', count.toString()).then(() => {
      AntaryamiState.update(s => ({ ...s, nudeClicksRemaining: count }));
      console.log(`[DevTools] Nude clicks remaining set to ${count}.`);
    });
  };

  if (window.stratagemAPI) {
    window.stratagemAPI.isPackaged().then(packaged => {
      AntaryamiState.update(state => ({ ...state, isPackaged: packaged }));
      if (packaged) {
        delete window.unlockNudityMode;
        delete window.lockNudityMode;
        delete window.setNotecardsClickCount;
        delete window.setNudeClicksRemaining;
      }
    }).catch(e => console.error(e));

    window.stratagemAPI.checkNudeBypass().then(allowed => {
      AntaryamiState.update(state => ({ ...state, nudeBypassAllowed: allowed }));
    }).catch(e => console.error(e));
  }
}
