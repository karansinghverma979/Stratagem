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
  notecardsActiveSeconds: 0,
  nudeModeRemainingSeconds: 0,
  appLaunchOnStartup: false,
  githubUrl: 'https://github.com/karansinghverma979/',
  emailAddress: 'karansinghverma979@gmail.com',
  linkedinUrl: 'https://www.linkedin.com/in/karansinghverma979/',
  nudeBypassAllowed: false,
  isPackaged: false
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

let cachedMissions = [];
let initialSyncDone = false;
export let stopTicker = () => {};


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

    const deadlineTime = new Date(m.temporal_boundary).getTime();
    const isOverdue = !isNaN(deadlineTime) && deadlineTime < Date.now();
    const derivedStatus = (m.status === 'BREACH' || (hasDeadline && isOverdue)) ? 'BREACH' : m.status;

    const formattedMission = {
      id: m.id,
      title: m.title,
      status: derivedStatus,
      priority: m.threat_level || 'MED',
      tags: derivedStatus === 'VICTORY' || derivedStatus === 'ABORTED' ? ['HISTORICAL', ...dbClassifications] : ['#SYSTEM', ...dbClassifications],
      countdown: m.temporal_boundary ? `T-MINUS ${m.temporal_boundary}` : 'NO DEADLINE',
      deadlineDate: m.temporal_boundary || '',
      initiateDate: initDateFormatted,
      done: derivedStatus === 'VICTORY',
      priorityVal: m.threat_level === 'HIGH' ? 3 : (m.threat_level === 'LOW' ? 1 : 2),
      isRescheduled: m.is_rescheduled === 1 || m.is_rescheduled === true,
      resolution: derivedStatus === 'VICTORY' ? 'VICTORY' : (derivedStatus === 'ABORTED' ? 'ABORTED' : null),
      completionDate: m.created_at ? m.created_at.split(' ')[0] : new Date().toISOString().split('T')[0],
      desc: `Mission designated under threat level ${m.threat_level}. Boundary: ${m.temporal_boundary}`,
      classifications: dbClassifications.length > 0 ? dbClassifications : ['DATABASE', m.threat_level || 'MED'],
      createdAt: m.created_at,
      initiatedAt: m.initiated_at,
      rescheduledAt: m.rescheduled_at,
      resolutionComment: m.resolution_comment || ''
    };

    if (m.status === 'VICTORY' || m.status === 'ABORTED') {
      archive.push(formattedMission);
    } else if (!hasDeadline) {
      arsenal.push(formattedMission);

      const subStatus = m.status === 'SYNTHESIZING' ? 'SYNTHESIZING' : (m.status === 'WEAPONIZED' ? 'WEAPON' : 'RAW_INTEL');
      const arsenalTag = subStatus === 'SYNTHESIZING' ? 'SYNTH' : (subStatus === 'WEAPONIZED' ? 'WEAPON' : 'RAW');
      const arsenalObj = { 
        id: m.id, 
        title: m.title, 
        desc: formattedMission.desc, 
        tags: [arsenalTag, m.threat_level, ...formattedMission.classifications], 
        createdAt: formattedMission.createdAt 
      };
      
      if (subStatus === 'SYNTHESIZING') {
        synth.push(arsenalObj);
      } else if (subStatus === 'WEAPONIZED') {
        weapon.push(arsenalObj);
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

  executionTasks.set(exec);
  breachedTasks.set(breach);
  rawIntelTasks.set(rawIntel);
  synthesizingTasks.set(synth);
  weaponizedTasks.set(weapon);
  archivedTasks.set(archive);
  arsenalTasks.set(arsenal);

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
      if (config.notecardsActiveSeconds !== undefined) {
        config.notecardsActiveSeconds = parseInt(config.notecardsActiveSeconds || '0', 10);
      }
      
      const isPackaged = await window.stratagemAPI.isPackaged();
      const nudeBypassAllowed = await window.stratagemAPI.checkNudeBypass();
      const activeSecs = config.notecardsActiveSeconds || 0;
      const isUnlocked = activeSecs >= 21600 || (!isPackaged && nudeBypassAllowed);
      
      if (config.aigirlNudityEnabled) {
        if (!isUnlocked) {
          config.aigirlNudityEnabled = false;
          await window.stratagemAPI.setConfig('aigirlNudityEnabled', 'false');
        } else {
          config.nudeModeRemainingSeconds = 360;
        }
      }
      
      AntaryamiState.update(state => ({ ...state, ...config, isPackaged, nudeBypassAllowed }));
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
  cachedMissions = cachedMissions.filter(m => m.id !== id);
  rebuildStoresFromCache(true);
  AudioEngine.play('fail');
}

export async function purgeDatabase() {
  if (typeof window === 'undefined' || !window.stratagemAPI) return;
  await window.stratagemAPI.purgeDatabase();
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

// Background timer for NoteCards / Nude Mode gates
if (typeof window !== 'undefined') {
  // Developer test bypass helpers (run from DevTools console)
  window.unlockNudityMode = () => {
    localStorage.setItem('aigirl_nude_test_bypass', 'true');
    console.log('[DevTools] Nudity Mode bypass activated. Reloading...');
    window.location.reload();
  };
  window.lockNudityMode = () => {
    localStorage.removeItem('aigirl_nude_test_bypass');
    window.stratagemAPI.setConfig('notecardsActiveSeconds', '0').then(() => {
      console.log('[DevTools] Nudity Mode bypass deactivated. Reloading...');
      window.location.reload();
    });
  };
  window.setNotecardsActiveSeconds = (seconds) => {
    window.stratagemAPI.setConfig('notecardsActiveSeconds', seconds.toString()).then(() => {
      AntaryamiState.update(s => ({ ...s, notecardsActiveSeconds: seconds }));
      console.log(`[DevTools] Standard engagement time set to ${seconds} seconds.`);
    });
  };
  window.setNudeModeRemainingSeconds = (seconds) => {
    AntaryamiState.update(s => ({ ...s, nudeModeRemainingSeconds: seconds }));
    console.log(`[DevTools] Nudity mode countdown time set to ${seconds} seconds.`);
  };

  if (window.stratagemAPI) {
    window.stratagemAPI.isPackaged().then(packaged => {
      AntaryamiState.update(state => ({ ...state, isPackaged: packaged }));
      if (packaged) {
        // Enforce strict security: delete the dev bypass triggers in production build
        delete window.unlockNudityMode;
        delete window.lockNudityMode;
        delete window.setNotecardsActiveSeconds;
        delete window.setNudeModeRemainingSeconds;
      }
    }).catch(e => console.error(e));

    window.stratagemAPI.checkNudeBypass().then(allowed => {
      AntaryamiState.update(state => ({ ...state, nudeBypassAllowed: allowed }));
    }).catch(e => console.error(e));
  }

  // ─── Persistent snapshot variables (filled once, read each tick) ──────────
  // Using persistent subscriptions instead of subscribe-then-immediately-unsubscribe
  // inside the interval, which was creating/destroying 3 closures every second.
  let _tickerState = null;
  let _tickerSector = 'Execution';
  let _tickerGenTab = 'developer';

  AntaryamiState.subscribe(s => { _tickerState = s; });
  
  currentSector.subscribe(v => {
    if (_tickerSector === 'Genesis' && _tickerGenTab === 'aigirl' && v !== 'Genesis') {
      if (_tickerState) {
        window.stratagemAPI.setConfig('notecardsActiveSeconds', (_tickerState.notecardsActiveSeconds || 0).toString()).catch(e => console.error(e));
      }
    }
    _tickerSector = v;
  });

  genesisActiveTab.subscribe(v => {
    if (_tickerSector === 'Genesis' && _tickerGenTab === 'aigirl' && v !== 'aigirl') {
      if (_tickerState) {
        window.stratagemAPI.setConfig('notecardsActiveSeconds', (_tickerState.notecardsActiveSeconds || 0).toString()).catch(e => console.error(e));
      }
    }
    _tickerGenTab = v;
  });

  // Transition listener: reacts when aigirlNudityEnabled flips
  let lastNudityState = undefined;
  AntaryamiState.subscribe(state => {
    if (state.aigirlNudityEnabled !== lastNudityState) {
      if (lastNudityState !== undefined) {
        if (state.aigirlNudityEnabled) {
          // false → true: Nude Mode activated — seed the countdown
          window.stratagemAPI.setConfig('notecardsActiveSeconds', '0');
          setTimeout(() => {
            AntaryamiState.update(s => ({
              ...s,
              nudeModeRemainingSeconds: 360,
              notecardsActiveSeconds: 0
            }));
          }, 0);
        } else {
          // true → false: toggled OFF or timed out
          setTimeout(() => {
            AntaryamiState.update(s => ({ ...s, nudeModeRemainingSeconds: 0 }));
          }, 0);
        }
      }
      lastNudityState = state.aigirlNudityEnabled;
    }
  });

  // ─── 1-second ticker ─────────────────────────────────────────────────────
  // Reads from persistent snapshot variables — zero subscription churn per tick.
  let _tickerIntervalId = setInterval(() => {
    if (!initialSyncDone) return;
    const state = _tickerState;
    if (!state) return;

    if (state.aigirlNudityEnabled) {
      // ── Nude Mode: count down ──────────────────────────────────────────
      const remaining = state.nudeModeRemainingSeconds;

      // Guard: if remaining is already 0 or negative, the transition listener
      // has (or will have) disabled nude mode. Do NOT restart at 360 — that
      // was the race condition that caused the timer to reset unexpectedly.
      if (!remaining || remaining <= 0) return;

      if (remaining > 1) {
        AntaryamiState.update(s => ({ ...s, nudeModeRemainingSeconds: remaining - 1 }));
      } else {
        // Natural timeout: revert to NoteCards mode
        AntaryamiState.update(s => ({
          ...s,
          aigirlNudityEnabled: false,
          nudeModeRemainingSeconds: 0,
          notecardsActiveSeconds: 0
        }));
        updateConfig('aigirlNudityEnabled', false);
        window.stratagemAPI.setConfig('notecardsActiveSeconds', '0').catch(e => console.error(e));
        AudioEngine.play('fail');
        addNotification(
          'NEURAL MODE TIMEOUT',
          'Classification protocol duration exceeded. Auto-reverted to NoteCards Mode.',
          'error'
        );
      }
    } else {
      // ── NoteCards Mode: increment only when actively on the AIGirl tab ─
      if (_tickerSector === 'Genesis' && _tickerGenTab === 'aigirl') {
        const activeSecs = (state.notecardsActiveSeconds || 0) + 1;
        AntaryamiState.update(s => ({
          ...s,
          notecardsActiveSeconds: activeSecs,
          nudeModeRemainingSeconds: 0
        }));
        // Persist to database every 10 seconds to avoid SQLite write thrashing
        if (activeSecs % 10 === 0) {
          window.stratagemAPI.setConfig('notecardsActiveSeconds', activeSecs.toString()).catch(e => console.error(e));
        }
      }
    }
  }, 1000);

  stopTicker = () => {
    if (_tickerIntervalId) {
      clearInterval(_tickerIntervalId);
      _tickerIntervalId = null;
      console.log('[Antaryami] Background ticker stopped.');
      if (_tickerState) {
        const activeSecs = _tickerState.notecardsActiveSeconds || 0;
        window.stratagemAPI.setConfig('notecardsActiveSeconds', activeSecs.toString()).catch(e => console.error(e));
      }
    }
  };
}
