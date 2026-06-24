<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';
  import { chronosStore } from '../../../core/chronos-store';
  import { AntaryamiState, currentSector } from '../../../core/store';

  import LeftSide from './LeftSidePanel/LeftSidePanel.svelte';
  import Timer from './Timer.svelte';
  import Todo from './Todo.svelte';
  import Reminder from './Reminder.svelte';
  import Stopwatch from './Stopwatch.svelte';
  import './chronos.css';

  // Feature selection: 'timer', 'todo', 'reminders', or 'stopwatch'
  let activeFeature = $state('timer');

  // Shared clock tick
  let currentTick = $state(Date.now());

  // Shared Toast Notification state
  let chronosNotification = $state<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  let notificationTimeout: any;

  // Shared metrics states (bound to children and rendered in LeftSide)
  let focusSessionCount = $state(0);
  let todoItems = $state<{ id: string; text: string; done: boolean; editing: boolean }[]>([]);
  let savedLists = $state<{ id: string; title: string; items: { text: string; done: boolean }[] }[]>([]);
  let remindersList = $state<{ id: string; text: string; targetTime: number; triggered: boolean; muted: boolean; scheduler?: any }[]>([]);
  let dispatchedReminders = $state<{ id: string; text: string; targetTime: number; acknowledged: boolean }[]>([]);
  
  // Shared input state for reminders
  let newReminderText = $state('');
  
  // Stopwatch shared states
  let stopwatchTime = $state(0);
  let stopwatchRunning = $state(false);
  let stopwatchLaps = $state<string[]>([]);
  let stopwatchLapsEl = $state<HTMLDivElement | null>(null);

  // Stopwatch interval and control variables
  let stopwatchInterval: any = null;
  let stopwatchStartTime = 0;
  let stopwatchElapsedBefore = 0;

  const formatStopwatchTime = (ms: number) => {
    const totalCentis = Math.floor(ms / 10);
    const centis = totalCentis % 100;
    const totalSecs = Math.floor(totalCentis / 100);
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // Manage stopwatch interval reactively in response to run states and tab visibility
  $effect(() => {
    const isRunning = stopwatchRunning;
    const isTabActive = $currentSector === 'Chronos';
    const isFeatureActive = activeFeature === 'stopwatch';
    const shouldRunHighFrequency = isRunning && isTabActive && isFeatureActive;

    if (stopwatchInterval) {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
    }

    if (shouldRunHighFrequency) {
      stopwatchStartTime = Date.now();
      stopwatchInterval = setInterval(() => {
        stopwatchTime = stopwatchElapsedBefore + (Date.now() - stopwatchStartTime);
      }, 33); // 30 FPS for visual fluidity when tab is open
    } else if (isRunning) {
      stopwatchStartTime = Date.now();
      stopwatchInterval = setInterval(() => {
        stopwatchTime = stopwatchElapsedBefore + (Date.now() - stopwatchStartTime);
      }, 1000); // 1 FPS in background to avoid CPU load
    }

    return () => {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
      }
    };
  });

  const startStopwatch = () => {
    AudioEngine.play('ui-click');
    stopwatchRunning = true;
    stopwatchStartTime = Date.now();
    addLog("STOPWATCH CHRONOLOGY ACTIVATED");
  };

  const pauseStopwatch = () => {
    AudioEngine.play('ui-click');
    stopwatchRunning = false;
    stopwatchElapsedBefore = stopwatchTime;
    addLog("STOPWATCH CHRONOLOGY SUSPENDED");
  };

  const resetStopwatch = () => {
    AudioEngine.play('ui-click');
    stopwatchRunning = false;
    stopwatchTime = 0;
    stopwatchElapsedBefore = 0;
    stopwatchLaps = [];
    addLog("STOPWATCH MATRIX RESET TO ZERO");
  };

  const recordLap = () => {
    if (stopwatchTime === 0) return;
    AudioEngine.play('data-lock');
    const lapTimeStr = formatStopwatchTime(stopwatchTime);
    stopwatchLaps = [...stopwatchLaps, lapTimeStr];
    addLog(`STOPWATCH LAP RECORDED: ${lapTimeStr}`);
    
    setTimeout(() => {
      if (stopwatchLapsEl) {
        stopwatchLapsEl.scrollTo({ top: stopwatchLapsEl.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  };

  const clearLaps = () => {
    AudioEngine.play('fail');
    stopwatchLaps = [];
    addLog("STOPWATCH LAPS CLEARED");
  };

  // Timer session tracking states
  let timerSessionSettedAt = $state<string | null>(null);
  let timerSessionStartedAt = $state<string | null>(null);
  let timerSessionPausesCount = $state(0);
  let timerSessionPauseDuration = $state(0);
  let currentTimerMode = $state('25M FOCUS');
  let timerSessionHistory = $state<any[]>([]);
  let currentSessionSaved = $state(false);

  const resetSessionLogs = () => {
    timerSessionSettedAt = new Date().toTimeString().split(' ')[0];
    timerSessionStartedAt = null;
    timerSessionPausesCount = 0;
    timerSessionPauseDuration = 0;
    currentSessionSaved = false;
  };

  const saveCurrentSessionToHistory = (completed = false) => {
    if (currentSessionSaved) return;
    const elapsed = $chronosStore.totalTime - $chronosStore.timeLeft;
    if (!timerSessionStartedAt && elapsed === 0) return;

    const newSession = {
      id: Math.random().toString(36).substring(2, 9),
      mode: currentTimerMode,
      isDeepFocus: $AntaryamiState.deepFocusMode,
      settedAt: timerSessionSettedAt || new Date().toTimeString().split(' ')[0],
      startedAt: timerSessionStartedAt,
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase(),
      totalTime: $chronosStore.totalTime,
      activeElapsed: elapsed,
      pausesCount: timerSessionPausesCount,
      pauseDuration: timerSessionPauseDuration,
      cumulativeTime: elapsed + timerSessionPauseDuration,
      completed
    };

    timerSessionHistory = [newSession, ...timerSessionHistory].slice(0, 30);
    localStorage.setItem('chronos_timer_session_history', JSON.stringify(timerSessionHistory));
    currentSessionSaved = true;
  };

  const toggleTimer = () => {
    AudioEngine.play('ui-click');
    if ($chronosStore.isRunning) {
      chronosStore.pause();
      addLog("TEMPORAL CYCLE SUSPENDED");
    } else {
      chronosStore.start();
      addLog("TEMPORAL CYCLE COMMENCED");
    }
  };

  const resetTimer = () => {
    AudioEngine.play('ui-click');
    saveCurrentSessionToHistory(false);
    chronosStore.reset();
    addLog("TEMPORAL VECTORS RESET TO ZERO");
    resetSessionLogs();
  };

  const setPreset = (minutes: number) => {
    AudioEngine.play('ui-click');
    saveCurrentSessionToHistory(false);
    
    if (minutes === 1) currentTimerMode = "1M SOLDIER'S MINUTE";
    else if (minutes === 5) currentTimerMode = "5M BREAK";
    else if (minutes === 10) currentTimerMode = "10M DEPLOY";
    else if (minutes === 15) currentTimerMode = "15M RECAL";
    else if (minutes === 20) currentTimerMode = "20M MISSION";
    else if (minutes === 25) currentTimerMode = "25M FOCUS";
    else if (minutes === 30) currentTimerMode = "30M SECTOR";
    else if (minutes === 40) currentTimerMode = "40M STRATAGEM";
    else if (minutes === 50) currentTimerMode = "50M DEEP";
    else if (minutes === 60) currentTimerMode = "60M CYCLE";
    else currentTimerMode = `${minutes}M TIMELINE`;

    chronosStore.setTime(minutes * 60);
    addLog(`PRESET LOADED: ${minutes} MIN`);
    resetSessionLogs();
    showChronosNotification(`PRESET LOADED: ${currentTimerMode}`, "info");
  };

  const saveSettings = (settingsMinutes: number) => {
    AudioEngine.play('success');
    saveCurrentSessionToHistory(false);
    currentTimerMode = `${settingsMinutes}M CUSTOM TIMELINE`;
    chronosStore.setTime(settingsMinutes * 60);
    addLog(`DURATION MANUALLY SET: ${settingsMinutes} MIN`);
    resetSessionLogs();
    showChronosNotification(`TIMELINE CONFIGURED: ${settingsMinutes}M`, "success");
  };

  const clearHistory = () => {
    AudioEngine.play('fail');
    timerSessionHistory = [];
    localStorage.setItem('chronos_timer_session_history', JSON.stringify([]));
  };

  // Watch for timer completion to increment focus session logs
  let lastRunningState = false;
  $effect(() => {
    const isRunning = $chronosStore.isRunning;
    const timeLeft = $chronosStore.timeLeft;
    untrack(() => {
      if (lastRunningState && !isRunning && timeLeft === 0) {
        AudioEngine.play('success');
        focusSessionCount += 1;
        localStorage.setItem('chronos_focus_sessions', focusSessionCount.toString());
        addLog("FOCUS SESS COMPLETION CONFIRMED");
        saveCurrentSessionToHistory(true);
      }
      lastRunningState = isRunning;
    });
  });

  // Watch run state transitions and count pauses / started times
  let lastStoreRunning = false;
  $effect(() => {
    const isRunning = $chronosStore.isRunning;
    const timeLeft = $chronosStore.timeLeft;
    
    untrack(() => {
      if (lastStoreRunning && !isRunning) {
        if (timeLeft > 0) {
          timerSessionPausesCount += 1;
          addLog("SESSION PAUSED");
        } else {
          addLog("SESSION COMPLETED");
        }
      } else if (!lastStoreRunning && isRunning) {
        if (!timerSessionStartedAt) {
          timerSessionStartedAt = new Date().toTimeString().split(' ')[0];
        }
        addLog("SESSION COMMENCED");
      }
      
      lastStoreRunning = isRunning;
    });
  });

  // Increment pause duration tick-by-tick
  $effect(() => {
    const tick = currentTick;
    untrack(() => {
      if (timerSessionStartedAt && !$chronosStore.isRunning && $chronosStore.timeLeft > 0) {
        timerSessionPauseDuration += 1;
      }
    });
  });

  // Active overlays (Alarm Intercept popup and scheduler dial picker)
  let activeAlarm = $state<any>(null);
  let isSchedulerOpen = $state(false);

  // Shared state for filtering completed tasks in Todo
  let hideCompleted = $state(false);

  // Helper to get local date string
  const getLocalDateStr = (d = new Date()) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Shared state for configured scheduler settings in Reminders
  let activeReminderScheduler = $state({
    type: 'once' as 'once' | 'daily' | 'weekly' | 'custom',
    date: getLocalDateStr(),
    time: '',
    weeklyDays: [] as number[],
    customTimes: [] as { date: string; time: string }[]
  });

  // Shared Logger function
  const addLog = (msg: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
    console.log(`[Chronos Log] ${date} ${time} | ${msg}`);
  };

  const showChronosNotification = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    chronosNotification = { text, type };
    if (type === 'error' || type === 'warning') {
      AudioEngine.play('fail');
    } else {
      AudioEngine.play('success');
    }
    notificationTimeout = setTimeout(() => {
      chronosNotification = null;
    }, 4000);
  };

  const setFeature = (feature: string) => {
    if (activeFeature === feature) return;
    AudioEngine.play('ui-click');
    activeFeature = feature;
    addLog(`MODULE SWAP: ${feature.toUpperCase()} PORT DEPLOYED`);
  };

  let mainInterval: any;
  onMount(() => {
    addLog("CHRONOS PROTOCOLS INITIATED");
    
    // Load reminders and sessions data once at startup
    try {
      const savedReminders = localStorage.getItem('chronos_reminders_list');
      if (savedReminders) remindersList = JSON.parse(savedReminders);
    } catch (e) {
      console.error('Failed to parse chronos_reminders_list:', e);
    }

    try {
      const savedDispatched = localStorage.getItem('chronos_dispatched_reminders');
      if (savedDispatched) dispatchedReminders = JSON.parse(savedDispatched);
    } catch (e) {
      console.error('Failed to parse chronos_dispatched_reminders:', e);
    }

    try {
      const savedFocus = localStorage.getItem('chronos_focus_sessions');
      if (savedFocus) focusSessionCount = parseInt(savedFocus);
    } catch (e) {
      console.error('Failed to parse chronos_focus_sessions:', e);
    }

    timerSessionSettedAt = new Date().toTimeString().split(' ')[0];
    try {
      const savedHistory = localStorage.getItem('chronos_timer_session_history');
      if (savedHistory) {
        timerSessionHistory = JSON.parse(savedHistory);
      }
    } catch (e) {
      console.error('Failed to parse chronos_timer_session_history:', e);
    }

    if (window.stratagemAPI) {
      window.stratagemAPI.getConfig().then(config => {
        if (config) {
          if (config.chronosReminders) {
            remindersList = JSON.parse(config.chronosReminders);
            localStorage.setItem('chronos_reminders_list', config.chronosReminders);
          }
          if (config.chronosDispatchedReminders) {
            dispatchedReminders = JSON.parse(config.chronosDispatchedReminders);
            localStorage.setItem('chronos_dispatched_reminders', config.chronosDispatchedReminders);
          }
        }
      }).catch(err => {
        console.error('Failed to load Chronos Reminders from backend:', err);
      });
    }

    // Main ticking loop (updates tick once a second)
    mainInterval = setInterval(() => {
      currentTick = Date.now();
    }, 1000);

    return () => {
      if (mainInterval) clearInterval(mainInterval);
      if (stopwatchInterval) clearInterval(stopwatchInterval);
    };
  });

  onDestroy(() => {
    if (stopwatchInterval) clearInterval(stopwatchInterval);
  });
</script>

<div class="fui-container chronos-page-container">
  <!-- Toast Notification Toast -->
  {#if chronosNotification}
    <div class="chronos-notification-toast {chronosNotification.type}" transition:fade={{ duration: 150 }} style="position: absolute; top: 24px; right: 32px; z-index: 100000; display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: 4px; border-width: 1.5px; border-style: solid; font-family: 'Share Tech Mono', monospace; font-size: 11px; font-weight: 950 !important; letter-spacing: 0.05em; min-width: 320px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45); pointer-events: auto; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="toast-icon" style="font-size: 14px;">
          {#if chronosNotification.type === 'error'}⚠️{:else if chronosNotification.type === 'warning'}⚡{:else if chronosNotification.type === 'success'}✓{:else}ℹ{/if}
        </span>
        <span class="toast-text">{chronosNotification.text.toUpperCase()}</span>
      </div>
      <button class="toast-close-btn" onclick={() => { AudioEngine.play('ui-click'); chronosNotification = null; }} style="background: transparent; border: none; color: inherit; font-size: 16px; cursor: pointer; padding: 0 4px; font-weight: 950 !important; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
  {/if}

  <!-- Reminders alert / alarm full screen intercept overlays -->
  <Reminder 
    mode="overlay_only"
    bind:remindersList={remindersList}
    bind:dispatchedReminders={dispatchedReminders}
    bind:activeAlarm={activeAlarm}
    bind:isSchedulerOpen={isSchedulerOpen}
    bind:activeReminderScheduler={activeReminderScheduler}
    bind:newReminderText={newReminderText}
    bind:currentTick={currentTick}
    {addLog}
    {showChronosNotification}
  />

  <!-- Main layout grid (culled from DOM if active alarm or scheduler picker overlay is active to prevent tile memory limits warnings) -->
  {#if !(activeAlarm || isSchedulerOpen)}
    <div class="chronos-main-layout">
    <LeftSide />

    <!-- Center Column: Viewport (Timer / To-Do / Reminders / Stopwatch) -->
    <main class="chronos-center-viewport">
      <div class="view-viewport">
        {#if activeFeature === 'timer'}
          <Timer 
            mode="viewport" 
            timerSessionSettedAt={timerSessionSettedAt}
            timerSessionStartedAt={timerSessionStartedAt}
            timerSessionPausesCount={timerSessionPausesCount}
            timerSessionPauseDuration={timerSessionPauseDuration}
            currentTimerMode={currentTimerMode}
            timerSessionHistory={timerSessionHistory}
            {toggleTimer}
            {resetTimer}
            {setPreset}
            {saveSettings}
            {clearHistory}
          />
        {:else if activeFeature === 'todo'}
          <Todo 
            mode="viewport" 
            bind:todoItems={todoItems}
            bind:savedLists={savedLists}
            bind:hideCompleted={hideCompleted}
            {addLog}
            {showChronosNotification}
          />
        {:else if activeFeature === 'reminders'}
          <Reminder 
            mode="viewport" 
            bind:remindersList={remindersList}
            bind:dispatchedReminders={dispatchedReminders}
            bind:activeAlarm={activeAlarm}
            bind:isSchedulerOpen={isSchedulerOpen}
            bind:activeReminderScheduler={activeReminderScheduler}
            bind:newReminderText={newReminderText}
            bind:currentTick={currentTick}
            {addLog}
            {showChronosNotification}
          />
        {:else if activeFeature === 'stopwatch'}
          <Stopwatch 
            mode="viewport" 
            stopwatchTime={stopwatchTime}
            stopwatchRunning={stopwatchRunning}
            stopwatchLaps={stopwatchLaps}
            bind:stopwatchLapsEl={stopwatchLapsEl}
            {startStopwatch}
            {pauseStopwatch}
            {resetStopwatch}
            {recordLap}
            {clearLaps}
            {formatStopwatchTime}
          />
        {/if}
      </div>
    </main>

    <!-- Right Column: Control Sidebar Panel -->
    <aside class="chronos-side-panel right-panel">
      <!-- Feature selection toggle buttons at the top of Right Column -->
      <div class="sidebar-toggle-container" style="margin-bottom: 24px; width: 100%; display: flex; justify-content: center;">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="feature-toggle-switch four-way" 
          class:timer-active={activeFeature === 'timer'} 
          class:todo-active={activeFeature === 'todo'} 
          class:reminders-active={activeFeature === 'reminders'}
          class:stopwatch-active={activeFeature === 'stopwatch'}
          onmouseenter={() => AudioEngine.play('ui-hover')}
          aria-label="Toggle Feature"
        >
          <button class="toggle-slot slot-left" onclick={() => setFeature('timer')} aria-label="Timer Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button class="toggle-slot slot-center-left" onclick={() => setFeature('todo')} aria-label="Todo Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 11 3 3 6-6" />
            </svg>
          </button>
          <button class="toggle-slot slot-center-right" onclick={() => setFeature('reminders')} aria-label="Reminders Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button class="toggle-slot slot-right" onclick={() => setFeature('stopwatch')} aria-label="Stopwatch Mode">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l3 3" />
              <path d="M12 2v3" />
              <path d="M9 2h6" />
            </svg>
          </button>
          
          <div class="toggle-thumb">
            {#if activeFeature === 'timer'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            {:else if activeFeature === 'todo'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="m9 11 3 3 6-6" />
              </svg>
            {:else if activeFeature === 'reminders'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            {:else}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l3 3" />
                <path d="M12 2v3" />
                <path d="M9 2h6" />
              </svg>
            {/if}
          </div>
        </div>
      </div>

      <!-- Feature-specific sidebars -->
      {#if activeFeature === 'timer'}
        <Timer 
          mode="sidebar" 
          timerSessionSettedAt={timerSessionSettedAt}
          timerSessionStartedAt={timerSessionStartedAt}
          timerSessionPausesCount={timerSessionPausesCount}
          timerSessionPauseDuration={timerSessionPauseDuration}
          currentTimerMode={currentTimerMode}
          timerSessionHistory={timerSessionHistory}
          {toggleTimer}
          {resetTimer}
          {setPreset}
          {saveSettings}
          {clearHistory}
        />
      {:else if activeFeature === 'todo'}
        <Todo 
          mode="sidebar" 
          bind:todoItems={todoItems}
          bind:savedLists={savedLists}
          bind:hideCompleted={hideCompleted}
          {addLog}
          {showChronosNotification}
        />
      {:else if activeFeature === 'reminders'}
        <Reminder 
          mode="sidebar" 
          bind:remindersList={remindersList}
          bind:dispatchedReminders={dispatchedReminders}
          bind:activeAlarm={activeAlarm}
          bind:isSchedulerOpen={isSchedulerOpen}
          bind:activeReminderScheduler={activeReminderScheduler}
          bind:newReminderText={newReminderText}
          bind:currentTick={currentTick}
          {addLog}
          {showChronosNotification}
        />
      {:else if activeFeature === 'stopwatch'}
        <Stopwatch 
          mode="sidebar" 
          stopwatchTime={stopwatchTime}
          stopwatchRunning={stopwatchRunning}
          stopwatchLaps={stopwatchLaps}
          bind:stopwatchLapsEl={stopwatchLapsEl}
          {startStopwatch}
          {pauseStopwatch}
          {resetStopwatch}
          {recordLap}
          {clearLaps}
          {formatStopwatchTime}
        />
      {/if}
    </aside>
  </div>
  {/if}
</div>
