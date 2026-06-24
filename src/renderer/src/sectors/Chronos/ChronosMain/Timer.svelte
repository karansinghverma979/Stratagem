<script lang="ts">
  import { fade } from 'svelte/transition';
  import { chronosStore, chronosProgress } from '../../../core/chronos-store';
  import { AudioEngine } from '../../../core/audio-engine';
  import { AntaryamiState } from '../../../core/store';

  let {
    mode = 'viewport', // 'viewport' or 'sidebar'
    timerSessionSettedAt = null,
    timerSessionStartedAt = null,
    timerSessionPausesCount = 0,
    timerSessionPauseDuration = 0,
    currentTimerMode = '25M FOCUS',
    timerSessionHistory = [],
    toggleTimer,
    resetTimer,
    setPreset,
    saveSettings,
    clearHistory
  } = $props();

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  let strokeDashoffset = $derived(circumference * (1 - $chronosProgress));

  let timerSubMode = $state('active'); // 'active' or 'logs'
  let isSettingsOpen = $state(false);
  let settingsMinutes = $state(25);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openSettings = () => {
    AudioEngine.play('ui-click');
    settingsMinutes = Math.floor($chronosStore.totalTime / 60);
    isSettingsOpen = true;
  };

  const handleSaveSettings = () => {
    saveSettings(settingsMinutes);
    isSettingsOpen = false;
  };
</script>

{#if mode === 'viewport'}
  <div class="timer-view-wrapper" in:fade={{ duration: 80 }} out:fade={{ duration: 80 }}>
    <div class="panel-header">
      <span class="fui-label">TEMPORAL SYNCHRONIZER</span>
      <div style="display: flex; align-items: center; gap: 12px;">
        {#if timerSubMode === 'active'}
          <button class="fui-button header-action-btn timer-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); timerSubMode = 'logs'; }} style="font-weight: 950 !important;">
            VIEW LOGS
          </button>
        {:else}
          <button class="fui-button header-action-btn timer-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); timerSubMode = 'active'; }} style="font-weight: 950 !important;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            RETURN TO TIMER
          </button>
        {/if}
      </div>
    </div>

    {#if timerSubMode === 'active'}
      <div class="timer-active-content" style="position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; flex: 1; min-height: 0; padding-bottom: 24px; box-sizing: border-box;">
        <button class="settings-btn timer-settings-absolute" onclick={openSettings} aria-label="Timer settings" disabled={$chronosStore.isRunning}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="ring-wrapper">
          {#if isSettingsOpen}
            <div class="settings-overlay" transition:fade={{ duration: 100 }}>
              <span class="fui-label" style="background: none; -webkit-text-fill-color: #ffffff; text-shadow: none; font-size: 20px; letter-spacing: 0.12em;">SET DURATION</span>
              <div class="settings-input-group">
                <input 
                  type="number" 
                  min="1" 
                  max="180" 
                  bind:value={settingsMinutes} 
                  class="duration-input" 
                />
                <span class="fui-telemetry" style="font-size: 14px; letter-spacing: 0.15em;">MINUTES</span>
              </div>
              <div class="settings-actions">
                <button class="fui-button save-btn" onclick={handleSaveSettings}>APPLY</button>
                <button class="fui-button cancel-btn" onclick={() => isSettingsOpen = false}>CANCEL</button>
              </div>
            </div>
          {/if}

          <svg class="progress-ring" width="510" height="510" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="chronosGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                {#if $AntaryamiState.deepFocusMode}
                  <stop offset="0%" stop-color="#ef4444" />
                  <stop offset="100%" stop-color="#b91c1c" />
                {:else}
                  <stop offset="0%" stop-color="var(--primary-accent)" />
                  <stop offset="100%" stop-color="var(--secondary-accent)" />
                {/if}
              </linearGradient>
              <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle class="ring-scope" cx="120" cy="120" r="114" stroke={$AntaryamiState.deepFocusMode ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)"} stroke-width="1.5" stroke-dasharray="4 6" fill="none" />
            <circle class="ring-track" cx="120" cy="120" r="100" stroke={$AntaryamiState.deepFocusMode ? "rgba(239, 68, 68, 0.08)" : "rgba(139, 92, 246, 0.05)"} stroke-width="12" fill="none" />
            <circle 
              class="ring-progress" 
              cx="120" 
              cy="120" 
              r="100" 
              stroke="url(#chronosGradient)" 
              stroke-width="12" 
              stroke-linecap="round"
              stroke-dasharray={circumference}
              stroke-dashoffset={strokeDashoffset}
              fill="none" 
              filter="url(#ringGlow)"
              transform="rotate(-90 120 120)"
            />
          </svg>

          <div class="time-display fui-h1" style="text-shadow: 0 0 35px {$AntaryamiState.deepFocusMode ? 'rgba(239, 68, 68, 0.75)' : 'var(--primary-glow)'};">
            {formatTime($chronosStore.timeLeft)}
          </div>
        </div>

        <div class="controls-row">
          <button class="fui-button start-btn" onclick={toggleTimer} disabled={$AntaryamiState.deepFocusMode && $chronosStore.isRunning}>
            {#if $chronosStore.isRunning}
              {#if $AntaryamiState.deepFocusMode}
                LOCKOUT PROTOCOL ACTIVE
              {:else}
                PAUSE OPERATIVE
              {/if}
            {:else}
              START MISSION
            {/if}
          </button>
          <button class="fui-button reset-btn" onclick={resetTimer} disabled={$AntaryamiState.deepFocusMode && $chronosStore.isRunning}>
            RESET
          </button>
        </div>
      </div>
    {:else}
      <div class="center-logs-view font-mono" in:fade={{ duration: 80 }} style="display: flex; flex-direction: column; flex: 1; min-height: 0; box-sizing: border-box; width: 100%;">
        <div class="logs-header-row" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 20px; width: 100%; flex-shrink: 0; height: 32px; box-sizing: border-box;">
          <div class="panel-section-title" style="border-bottom: none; padding-bottom: 0; margin: 0; font-weight: 950 !important; font-size: 16px; letter-spacing: 0.15em; display: flex; align-items: center; height: 32px; line-height: 32px;">FULL TEMPORAL DIAGNOSTIC LOGS</div>
          <button class="fui-button clear-logs-btn font-outfit" onclick={clearHistory} style="font-weight: 950 !important; font-size: 11px; padding: 0 16px; height: 32px; border-radius: 4px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; transition: all 0.2s; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; justify-content: center; margin: 0;">
            CLEAR ALL HISTORY
          </button>
        </div>
        
        <div class="full-logger-box" style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 650px; margin: 0 auto; overflow-y: auto; flex: 1; padding-right: 12px; box-sizing: border-box; background: transparent; border: none; box-shadow: none;">
          {#each timerSessionHistory as session (session.id)}
            {@const isDeep = session.isDeepFocus || session.mode?.includes('DEEP') || false}
            <div class="session-dashboard-card" style="border-color: {isDeep ? 'rgba(239, 68, 68, 0.4)' : 'rgba(139, 92, 246, 0.3)'}; background: {isDeep ? 'rgba(20, 5, 8, 0.65)' : 'rgba(8, 10, 20, 0.65)'}; width: 100%;">
              <div class="session-card-status-row" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 6px;">
                <span class="status-badge" style="font-weight: 950 !important; font-size: 13px; letter-spacing: 0.1em; color: {session.completed ? '#4ade80' : '#fb923c'};">
                  {session.completed ? '● SYNCHRONIZED' : '▲ VECTOR PURGED'}
                </span>
                <span style="font-size: 13px; color: rgba(255,255,255,0.3); font-weight: 950 !important;">ID: {session.id.toUpperCase()}</span>
              </div>

              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">TIMER MODE:</span>
                <span class="m-value" style="color: {isDeep ? '#f43f5e' : '#c084fc'};">{session.mode || 'N/A'}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">FOCUS TYPE:</span>
                <span class="m-value" style="color: {isDeep ? '#ef4444' : '#c084fc'};">{isDeep ? 'DEEP FOCUS OVERLAY' : 'STANDARD'}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">SESSION DATE:</span>
                <span class="m-value" style="color: #fb7185;">{session.date || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">SET TIME:</span>
                <span class="m-value" style="color: {isDeep ? '#fca5a5' : '#22d3ee'};">{session.settedAt}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">COMMENCED:</span>
                <span class="m-value" style="color: {isDeep ? '#fca5a5' : '#c084fc'};">{session.startedAt || 'N/A'}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">ACTIVE ELAPSED:</span>
                <span class="m-value" style="color: {isDeep ? '#ef4444' : '#4ade80'};">{formatTime(session.activeElapsed)}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">PAUSE COUNT:</span>
                <span class="m-value" style="color: {session.pausesCount > 0 ? '#f43f5e' : '#ffffff'};">{session.pausesCount}</span>
              </div>
              <div class="session-metric-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">PAUSE DURATION:</span>
                <span class="m-value" style="color: {session.pauseDuration > 0 ? '#f43f5e' : '#ffffff'};">{formatTime(session.pauseDuration)}</span>
              </div>
              <div class="session-metric-row total-row">
                <span class="m-label" style="color: rgba(255, 255, 255, 0.75); font-weight: 900;">CUMULATIVE TIME:</span>
                <span class="m-value" style="color: {isDeep ? '#ef4444' : '#d946ef'};">{formatTime(session.cumulativeTime)}</span>
              </div>
            </div>
          {/each}
          {#if timerSessionHistory.length === 0}
            <div style="opacity: 0.35; text-align: center; font-size: 12px; letter-spacing: 0.15em; padding: 60px 0; width: 100%;">
              AWAITING DIAGNOSTIC SESSION LOGS FLOWS...
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{:else if mode === 'sidebar'}
  <div class="panel-section-title">TEMPORAL INTERVALS</div>
  <div class="preset-grid">
    <button class="preset-btn font-mono" onclick={() => setPreset(1)} disabled={$chronosStore.isRunning}>1M SOLDIER</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(5)} disabled={$chronosStore.isRunning}>5M BREAK</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(10)} disabled={$chronosStore.isRunning}>10M DEPLOY</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(15)} disabled={$chronosStore.isRunning}>15M RECAL</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(20)} disabled={$chronosStore.isRunning}>20M MISSION</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(25)} disabled={$chronosStore.isRunning}>25M FOCUS</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(30)} disabled={$chronosStore.isRunning}>30M SECTOR</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(40)} disabled={$chronosStore.isRunning}>40M STRATAGEM</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(50)} disabled={$chronosStore.isRunning}>50M DEEP</button>
    <button class="preset-btn font-mono" onclick={() => setPreset(60)} disabled={$chronosStore.isRunning}>60M CYCLE</button>
  </div>

  <div class="panel-section-title">TEMPORAL SESSION METRICS</div>
  <div class="session-dashboard-card" style="border-color: rgba(139, 92, 246, 0.3); background: rgba(8, 10, 20, 0.65); width: 100%;">
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">TIMER MODE:</span>
      <span class="m-value" style="color: #c084fc; text-shadow: 0 0 8px rgba(192,132,252,0.25);">{currentTimerMode}</span>
    </div>
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">SET TIME:</span>
      <span class="m-value" style="color: #22d3ee; text-shadow: 0 0 8px rgba(34,211,238,0.25);">{timerSessionSettedAt || 'N/A'}</span>
    </div>
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">COMMENCED:</span>
      <span class="m-value" style="color: #c084fc; text-shadow: 0 0 8px rgba(192,132,252,0.25);">{timerSessionStartedAt || 'AWAITING START'}</span>
    </div>
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">ACTIVE ELAPSED:</span>
      <span class="m-value" style="color: #4ade80; text-shadow: 0 0 8px rgba(74,222,128,0.25);">{formatTime($chronosStore.totalTime - $chronosStore.timeLeft)}</span>
    </div>
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">PAUSE COUNT:</span>
      <span class="m-value" style="color: {timerSessionPausesCount > 0 ? '#f43f5e' : '#ffffff'};">{timerSessionPausesCount}</span>
    </div>
    <div class="session-metric-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.45); font-weight: 800;">PAUSE DURATION:</span>
      <span class="m-value" style="color: {timerSessionPauseDuration > 0 ? '#f43f5e' : '#ffffff'};">{formatTime(timerSessionPauseDuration)}</span>
    </div>
    <div class="session-metric-row total-row">
      <span class="m-label" style="color: rgba(255, 255, 255, 0.75); font-weight: 900;">CUMULATIVE TIME:</span>
      <span class="m-value" style="color: #d946ef; text-shadow: 0 0 8px rgba(217,70,239,0.3);">{formatTime(($chronosStore.totalTime - $chronosStore.timeLeft) + timerSessionPauseDuration)}</span>
    </div>
  </div>
{/if}
