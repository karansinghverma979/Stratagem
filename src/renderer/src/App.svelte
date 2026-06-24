<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut, backOut } from 'svelte/easing';
  import TopNavigation from './components/TopNavigation.svelte';
  import TaskForgeButton from './components/TaskForgeButton.svelte';
  import ExecutionSector from './sectors/Execution/ExecutionMain/ExecutionSector.svelte';
  import ChronosSector from './sectors/Chronos/ChronosMain/ChronosSector.svelte';
  import GenesisSector from './sectors/Genesis/GenesisMain/GenesisSector.svelte';
  import BreachSector from './sectors/Breach/BreachMain/BreachSector.svelte';
  import ArsenalBoard from './sectors/Arsenal/ArsenalMain/ArsenalBoard.svelte';
  import ArchiveSector from './sectors/Archive/ArchiveMain/ArchiveSector.svelte';
  import TaskForgeModal from './sectors/Forge/ForgeMain/TaskForgeModal.svelte';
  import HubModal from './sectors/StratagemHub/HubMain/HubModal.svelte';
  import ShieldSentinel from './components/ShieldEngine/ShieldSentinel.svelte';
  import DeepFocusOverlay from './components/DeepFocusOverlay.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import NeuralUplink from './sectors/Genesis/GenesisMain/ImprovementPanel/NeuralUplink/NeuralUplink.svelte';
  import DevPopup from './sectors/Genesis/GenesisMain/DeveloperPanel/DevPopup.svelte';
  import RigorePopup from './sectors/Genesis/GenesisMain/DeveloperPanel/RigorePopup.svelte';
  import MementoPopup from './sectors/Genesis/GenesisMain/DeveloperPanel/MementoPopup.svelte';
  import ReasonPopup from './sectors/Genesis/GenesisMain/DeveloperPanel/ReasonPopup.svelte';
  import MentalSkillsPopup from './sectors/Genesis/GenesisMain/DeveloperPanel/MentalSkillsPopup.svelte';
  import { AntaryamiState, syncAntaryami, breachedTasks, notifications, isTaskViewOpen, startAutoSync, stopAutoSync, stopTicker, isNeuralUplinkOpen, neuralUplinkLogs, loadNeuralUplinkLogs, activeStrategizeTask, onNoteSavedCallback, isPurgeModalOpen, taskToPurge, deleteMission, arsenalTasks, addNotification, currentSector as currentSectorStore } from './core/store';
  import { chronosStore } from './core/chronos-store';
  import { AudioEngine } from './core/audio-engine';
  import StrategizeModal from './sectors/Arsenal/ArsenalMain/StrategizeModal.svelte';
  import SynthDeleteConfirmation from './sectors/Arsenal/ArsenalMain/SynthDeleteConfirmation.svelte';

  let currentSector = $state('Execution');
  let isForgeOpen = $state(false);
  let isRescheduleMode = $state(false);
  let forgeInitialDesignation = $state('');
  let forgeInitialTask = $state<any>(null);
  let isHubOpen = $state(false);
  let isPaletteOpen = $state(false);

  $effect(() => {
    currentSectorStore.set(currentSector);
  });

  // Decoupled Developer Panel Modals State
  let devPopupName = $state('');
  let isDevPopupOpen = $state(false);
  let isRigorePopupOpen = $state(false);
  let isMementoPopupOpen = $state(false);
  let isReasonPopupOpen = $state(false);
  let isMentalSkillsPopupOpen = $state(false);
  let isHollowPurpleRunning = $state(false);
  let isSukunaDomainActive = $state(false);

  let isAnyModalActive = $derived(
    isForgeOpen ||
    isHubOpen ||
    isPaletteOpen ||
    $isTaskViewOpen ||
    $isNeuralUplinkOpen ||
    isDevPopupOpen ||
    isRigorePopupOpen ||
    isMementoPopupOpen ||
    isReasonPopupOpen ||
    isMentalSkillsPopupOpen ||
    !!$activeStrategizeTask ||
    $isPurgeModalOpen ||
    ($AntaryamiState.deepFocusMode && $chronosStore.isRunning)
  );

  let isAnyRootModalActive = $derived(
    isAnyModalActive && !$isTaskViewOpen && !$activeStrategizeTask
  );

  $effect(() => {
    if (isAnyModalActive) {
      window.removeEventListener('mousemove', handleMouseMove);
      isMouseStationary = false;
      showSixEyes = false;
      if (mouseStopTimeout) clearTimeout(mouseStopTimeout);
      if (sixEyesDurationTimeout) clearTimeout(sixEyesDurationTimeout);
    } else {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });

  // Infinity Click Animation State
  let isInfinityRunning = $state(false);
  let infinityX = $state(0);
  let infinityY = $state(0);

  // Six Eyes Stationary Cursor State
  let cursorX = $state(0);
  let cursorY = $state(0);
  let isMouseStationary = $state(false);
  let showSixEyes = $state(false);
  let mouseStopTimeout: any = null;
  let sixEyesDurationTimeout: any = null;

  function handleSukunaDomainCloseActive(e: Event) {
    const customEvent = e as CustomEvent;
    isSukunaDomainActive = customEvent.detail.active;
    if (isSukunaDomainActive) {
      showSixEyes = false;
      isMouseStationary = false;
    }
  }

  function handleTriggerHollowPurple(e: Event) {
    if (isInfinityRunning || isHollowPurpleRunning) return;

    const customEvent = e as CustomEvent;
    const { x, y } = customEvent.detail || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    infinityX = x;
    infinityY = y;

    // Hide Six Eyes immediately on trigger
    showSixEyes = false;
    isMouseStationary = false;
    if (mouseStopTimeout) clearTimeout(mouseStopTimeout);
    if (sixEyesDurationTimeout) clearTimeout(sixEyesDurationTimeout);

    // Step 1: Trigger Satoru Gojo's Infinity effect at click location (runs for 2.0s)
    isInfinityRunning = true;
    AudioEngine.play('data-lock');

    // Step 2: After 2 seconds of Infinity, transition to Hollow Purple (runs for 3.5s)
    setTimeout(() => {
      isInfinityRunning = false;
      isHollowPurpleRunning = true;
      AudioEngine.play('data-decode');

      // Colliding sound cues (at 1.8s into Hollow Purple)
      setTimeout(() => {
        AudioEngine.play('success');
      }, 1800);

      // Open the Cognitive Schemas panel after 3.5s
      setTimeout(() => {
        isHollowPurpleRunning = false;
        isMentalSkillsPopupOpen = true;
      }, 3500);
    }, 2000);
  }

  function handleMouseMove(e: MouseEvent) {
    if (isAnyModalActive) {
      isMouseStationary = false;
      showSixEyes = false;
      if (mouseStopTimeout) clearTimeout(mouseStopTimeout);
      if (sixEyesDurationTimeout) clearTimeout(sixEyesDurationTimeout);
      return;
    }

    cursorX = e.clientX;
    cursorY = e.clientY;
    isMouseStationary = false;
    showSixEyes = false;

    if (mouseStopTimeout) clearTimeout(mouseStopTimeout);
    if (sixEyesDurationTimeout) clearTimeout(sixEyesDurationTimeout);

    const target = e.target as HTMLElement;

    mouseStopTimeout = setTimeout(() => {
      // Cancel showing eyes if hovering over any clickable/interactive elements
      if (target) {
        const onInteractive = target.closest('button, input, select, textarea, [role="button"], a, .dev-portrait-img, .portrait-ring-container, .omni-scope-terminal, .skill-card, .tab-btn, .close-btn, .dismiss-btn') ||
                              window.getComputedStyle(target).cursor === 'pointer';
        if (onInteractive) {
          return;
        }
      }

      const isAnyPopupOpen = isMentalSkillsPopupOpen || isDevPopupOpen || isRigorePopupOpen || 
                            isMementoPopupOpen || isReasonPopupOpen || isSukunaDomainActive || 
                            isHollowPurpleRunning || isInfinityRunning;

      if (systemBooted && !isAnyPopupOpen) {
        isMouseStationary = true;
        showSixEyes = true;

        // Auto hide the Six Eyes cursor after max 6 seconds
        sixEyesDurationTimeout = setTimeout(() => {
          showSixEyes = false;
        }, 6000);
      }
    }, 500);
  }

  function handleDevOpenPopup(e: Event) {
    const customEvent = e as CustomEvent;
    const { type, name } = customEvent.detail;
    if (type === 'dev') {
      devPopupName = name;
      isDevPopupOpen = true;
    } else if (type === 'rigore') {
      isRigorePopupOpen = true;
    } else if (type === 'memento') {
      isMementoPopupOpen = true;
    } else if (type === 'reason') {
      isReasonPopupOpen = true;
    }
  }

  // Cold Boot Startup Sequence State
  let systemBooted = $state(false);
  let bootSteps = $state([
    { id: 'core', title: 'INITIALIZING ANTARYAMI CORE', status: 'PENDING', icon: 'cpu' },
    { id: 'bridge', title: 'ESTABLISHING SECURE BRIDGE', status: 'PENDING', icon: 'lock' },
    { id: 'sqlite', title: 'MOUNTING SQLITE MATRIX', status: 'PENDING', icon: 'database' },
    { id: 'handshake', title: 'SECURE HANDSHAKE COMPLETION', status: 'PENDING', icon: 'check-circle' }
  ]);

  let bootErrorMessage = $state('');
  let bootErrorResolution = $state('');
  let isRetrying = $state(false);
  let dbChoiceResolved = $state(false);
  let isDbMissingState = $state(false);
  let absoluteDbPath = $state('');

  async function writeDiagnosticReport() {
    if (!bootErrorMessage) return;
    const logContent = `==================================================
[STRATAGEM COLD BOOT SYSTEM DIAGNOSTIC ERROR REPORT]
==================================================
Timestamp: ${new Date().toISOString()}
System Integrity Check: FAILED
Sub-system Halt: ERROR

STAGE INTEGRITY CHECKLIST:
- Core Initialization:    ${bootSteps[0].status}
- Secure Bridge IPC:      ${bootSteps[1].status}
- SQLite Matrix Mount:    ${bootSteps[2].status}
- Database Handshake:     ${bootSteps[3].status}

FATAL ERROR SUMMARY:
--------------------------------------------------
Error Message:    ${bootErrorMessage}
Resolution Path:  ${bootErrorResolution}

DIAGNOSTIC TRACE:
--------------------------------------------------
Host Runtime:     Node.js ${window.electron?.process?.versions?.node || 'Active'} / Electron ${window.electron?.process?.versions?.electron || 'Active'}
Security Context: Sandboxed Preload active
Database File:    stratagem_intel.db

Please execute the Recommended Realignment Path or authorize a purge.
==================================================`;
    try {
      await window.stratagemAPI.writeBootLog(logContent);
    } catch (err) {
      console.error('Failed to write boot log:', err);
    }
  }

  async function handleOpenLog() {
    AudioEngine.play('ui-click');
    try {
      await window.stratagemAPI.openBootLog();
    } catch (err) {
      console.error('Failed to open boot log:', err);
    }
  }

  function handleShutdown() {
    AudioEngine.play('fail');
    try {
      window.osAPI.closeWindow();
    } catch (err) {
      console.error('Failed to close application window:', err);
    }
  }

  async function handleDeployClean() {
    AudioEngine.play('success');
    dbChoiceResolved = true;
    isDbMissingState = false;
    await runBootSequence();
  }

  async function handleDeploySeeded() {
    AudioEngine.play('data-decode');
    try {
      await window.stratagemAPI.seedDatabase();
    } catch (e) {
      console.error('Failed to seed database:', e);
    }
    AudioEngine.play('success');
    dbChoiceResolved = true;
    isDbMissingState = false;
    await runBootSequence();
  }

  function handleErrorScrollWheel(event: WheelEvent) {
    event.preventDefault();
    const container = event.currentTarget as HTMLDivElement;
    if (!container) return;
    // 0.35 multiplier slows down scroll speed by 65%, making it feel very controlled and steady
    container.scrollTop += event.deltaY * 0.35;
  }

  async function runBootSequence() {
    isRetrying = true;
    bootErrorMessage = '';
    bootErrorResolution = '';
    
    // Fetch absolute database path for telemetry
    try {
      absoluteDbPath = await window.stratagemAPI.getDatabasePath();
    } catch (e) {
      console.error('Failed to resolve database path:', e);
      absoluteDbPath = 'UNKNOWN/stratagem_intel.db';
    }

    // Load user configuration early to respect audio settings from Stage 1
    try {
      const config = await window.stratagemAPI.getConfig();
      if (config) {
        AntaryamiState.update(state => ({ ...state, ...config }));
      }
    } catch (e) {
      console.log('[Boot] Database config not loaded yet, using defaults.');
    }

    // Reset all steps to PENDING unless database choice was already resolved
    bootSteps.forEach(s => s.status = 'PENDING');

    try {
      // Stage 1: Antaryami Core
      bootSteps[0].status = 'RUNNING';
      AudioEngine.play('ui-click');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const coreResult = await window.stratagemAPI.verifyCore();
      if (coreResult && !coreResult.success) {
        bootSteps[0].status = 'ERROR';
        bootErrorMessage = coreResult.message || 'System environment check failed.';
        bootErrorResolution = 'Check your NodeJS install and dependencies, then restart the application.';
        AudioEngine.play('fail');
        await writeDiagnosticReport();
        isRetrying = false;
        return;
      }
      bootSteps[0].status = 'OK';
      AudioEngine.play('success');

      // Stage 2: Secure Bridge
      bootSteps[1].status = 'RUNNING';
      AudioEngine.play('ui-click');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const bridgeResult = await window.stratagemAPI.verifyBridge();
      if (bridgeResult && !bridgeResult.success) {
        bootSteps[1].status = 'ERROR';
        bootErrorMessage = bridgeResult.message || 'Secure IPC bridge is blocked.';
        bootErrorResolution = 'Verify that Antaryami preload scripts are correctly configured and sandbox modes are active.';
        AudioEngine.play('fail');
        await writeDiagnosticReport();
        isRetrying = false;
        return;
      }
      bootSteps[1].status = 'OK';
      AudioEngine.play('success');

      // Stage 3: Mount SQLite
      bootSteps[2].status = 'RUNNING';
      AudioEngine.play('ui-click');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Intercept missing database file on startup
      const dbExisted = await window.stratagemAPI.checkDbFileExisted();
      if (!dbExisted && !dbChoiceResolved) {
        bootSteps[2].status = 'ERROR';
        bootErrorMessage = 'System database file "stratagem_intel.db" was not found on startup.';
        bootErrorResolution = 'Select "DEPLOY CLEAN PERSISTENCE" to deploy a fresh empty database, or "DEPLOY SEEDED PERSISTENCE" to load default tactical files.';
        AudioEngine.play('fail');
        await writeDiagnosticReport();
        isRetrying = false;
        isDbMissingState = true;
        return;
      }
      
      const sqliteResult = await window.stratagemAPI.verifySqlite();
      if (sqliteResult && !sqliteResult.success) {
        bootSteps[2].status = 'ERROR';
        bootErrorMessage = sqliteResult.message || 'SQLite database mount failed.';
        bootErrorResolution = 'Verify write permissions in AppData directory, repair or delete stratagem_intel.db database file.';
        AudioEngine.play('fail');
        await writeDiagnosticReport();
        isRetrying = false;
        return;
      }
      bootSteps[2].status = 'OK';
      AudioEngine.play('success');

      // Synchronize Store from Local DB
      await syncAntaryami();

      // Stage 4: Completing startup
      bootSteps[3].status = 'RUNNING';
      AudioEngine.play('data-decode');
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const handshakeResult = await window.stratagemAPI.verifyHandshake();
      if (handshakeResult && !handshakeResult.success) {
        bootSteps[3].status = 'ERROR';
        bootErrorMessage = handshakeResult.message || 'Secure database handshake failed.';
        bootErrorResolution = 'Repair table structures, or run full storage purge in Database Station.';
        AudioEngine.play('fail');
        await writeDiagnosticReport();
        isRetrying = false;
        return;
      }
      bootSteps[3].status = 'OK';
      AudioEngine.play('success');

      // Dissolve console terminal
      await new Promise(resolve => setTimeout(resolve, 600));
      systemBooted = true;

      // Start background auto-sync (60s interval) for live EXECUTION→BREACH transitions
      startAutoSync(60000);
    } catch (e: any) {
      console.error('[Boot] Unexpected boot failure:', e);
      bootErrorMessage = e.message || 'An unexpected exception halted the secure boot sequence.';
      bootErrorResolution = 'Re-launch app with administrative rights or review the application logs.';
      AudioEngine.play('fail');
      await writeDiagnosticReport();
    } finally {
      isRetrying = false;
    }
  }

  let lastWheelTime = 0;
  function handleGlobalWheel() {
    const now = Date.now();
    if (now - lastWheelTime > 120) {
      AudioEngine.play('tick');
      lastWheelTime = now;
    }
  }

  function handleGlobalClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target) return;
    const interactive = target.closest('button, input, select, textarea, [role="button"], a, [onclick], .tab-btn, .logo-container');
    if (interactive) {
      AudioEngine.playClickFeedback();
    }
  }

  function handleGlobalKeyDown(e: KeyboardEvent) {
    // Check for Ctrl+Alt+I shortcut (using both code and key for absolute keyboard layout compatibility)
    if (e.ctrlKey && e.altKey && (e.code === 'KeyI' || e.key.toLowerCase() === 'i')) {
      e.preventDefault();
      AudioEngine.play('data-lock');
      $isNeuralUplinkOpen = !$isNeuralUplinkOpen;
      if ($isNeuralUplinkOpen) {
        loadNeuralUplinkLogs();
      }
    }
  }

  async function confirmSynthPurge() {
    const task = $taskToPurge;
    if (!task) return;
    
    // Optimistic UI update
    arsenalTasks.update(tasks => tasks.filter(t => t.id !== task.id));
    
    try {
      await deleteMission(task.id);
      window.dispatchEvent(new CustomEvent('synth-purged', { detail: { taskId: task.id } }));
      addNotification('SYNAPSE THREAD PURGED', `The weapon template "${task.title.toUpperCase()}" has been permanently erased from the Arsenal matrix`, 'success');
    } catch (err: any) {
      console.error('Failed to purge synthesizing task:', err);
      await syncAntaryami(true);
      addNotification('PURGE ACTION INTERRUPTED', `An error occurred while deleting task: ${err.message || err}`, 'error');
    }
    isPurgeModalOpen.set(false);
    taskToPurge.set(null);
  }

  function cancelSynthPurge() {
    isPurgeModalOpen.set(false);
    taskToPurge.set(null);
  }

  onMount(async () => {
    await runBootSequence();
    loadNeuralUplinkLogs();
    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('dev-open-popup', handleDevOpenPopup);
    window.addEventListener('dev-trigger-hollow-purple', handleTriggerHollowPurple);
    window.addEventListener('sukuna-domain-close-active', handleSukunaDomainCloseActive);
  });

  onDestroy(() => {
    stopAutoSync();
    stopTicker();
    if (mouseStopTimeout) clearTimeout(mouseStopTimeout);
    if (sixEyesDurationTimeout) clearTimeout(sixEyesDurationTimeout);
    window.removeEventListener('wheel', handleGlobalWheel);
    window.removeEventListener('click', handleGlobalClick);
    window.removeEventListener('keydown', handleGlobalKeyDown);
    window.removeEventListener('dev-open-popup', handleDevOpenPopup);
    window.removeEventListener('dev-trigger-hollow-purple', handleTriggerHollowPurple);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('sukuna-domain-close-active', handleSukunaDomainCloseActive);
  });
</script>

{#if !systemBooted}
  <div class="boot-terminal" out:fade={{ duration: 1000 }}>
    <!-- Volumetric Atmosphere -->
    <div class="boot-grid-overlay"></div>
    <div class="boot-ambient-orb" class:has-error={!!bootErrorMessage}></div>
    
    <div class="boot-content-wrapper" class:has-error={!!bootErrorMessage}>
      <div class="fui-noise"></div>
      
      <div class="boot-content" class:has-error={!!bootErrorMessage} transition:fly={{ y: 20, duration: 800 }}>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <header class="boot-header" onclick={!!bootErrorMessage ? runBootSequence : null}>
          <div class="boot-icon-container">
            <svg class="boot-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={!!bootErrorMessage ? '#ef4444' : 'var(--secondary-accent)'} stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke={!!bootErrorMessage ? '#fca5a5' : 'var(--primary-accent)'} stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke={!!bootErrorMessage ? '#ef4444' : 'var(--primary-accent)'} stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="2 2"/>
            </svg>
          </div>
          <div class="boot-title-block">
            <h1 class="boot-title font-outfit" style={!!bootErrorMessage ? "background: linear-gradient(90deg, #fff 0%, #ef4444 40%, #fca5a5 70%, #fff 100%); background-size: 300% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;" : ""}>STRATAGEM</h1>
            <div class="boot-status-line">
              <span class="status-dot" style={!!bootErrorMessage ? "background: #ef4444; box-shadow: 0 0 15px #ef4444;" : ""}></span>
              <span class="fui-label font-outfit" style={!!bootErrorMessage ? "background: linear-gradient(90deg, #ef4444, #fca5a5, #ef4444); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;" : ""}>
                {!!bootErrorMessage ? 'SYSTEM DIAGNOSTIC FAILURE' : 'INITIALIZING SYSTEM CORE'}
              </span>
            </div>
          </div>
        </header>

        <div class="boot-logs font-mono">
          {#each bootSteps as step (step.id)}
            {#if !bootErrorMessage || step.status !== 'PENDING'}
              <div class="boot-card" class:compact={!!bootErrorMessage} class:pending={step.status === 'PENDING'} class:running={step.status === 'RUNNING'} class:ok={step.status === 'OK'} class:error={step.status === 'ERROR'}>
                <div class="boot-card-left">
                  <div class="step-icon-box" class:active={step.status === 'RUNNING'} class:ok={step.status === 'OK'} class:error-icon={step.status === 'ERROR'}>
                    {#if step.icon === 'cpu'}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>
                    {:else if step.icon === 'lock'}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    {:else if step.icon === 'database'}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                    {:else if step.icon === 'check-circle'}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    {/if}
                  </div>
                  <span class="step-title">{step.title}</span>
                </div>
                <div class="boot-card-right">
                  {#if step.status === 'RUNNING'}
                    <div class="loading-bar-container">
                      <div class="loading-bar-fill"></div>
                    </div>
                  {:else if step.status === 'OK'}
                    <span class="status-ok">VERIFIED</span>
                  {:else if step.status === 'ERROR'}
                    <span class="status-error">FAILED</span>
                  {:else}
                    <span class="status-pending">PENDING</span>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}

          {#if bootErrorMessage}
            <div class="boot-error-troubleshoot font-mono" onwheel={handleErrorScrollWheel}>
              <div class="error-header-bar">
                <div class="danger-tag font-outfit">[ SECURITY BREACH / SYSTEM FAULT DETECTED ]</div>
                <div class="telemetry-stamp font-outfit">CODE: 0x88000FF</div>
              </div>
              
              <div class="error-body">
                <div class="error-icon-desc">
                  <svg class="alert-symbol" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p class="error-text font-inter">{bootErrorMessage}</p>
                </div>
                
                <div class="realignment-block">
                  <span class="realignment-label font-outfit">RECOMMENDED REALIGNMENT PATH:</span>
                  <p class="realignment-desc font-inter">{bootErrorResolution}</p>
                </div>

                <div class="diagnostic-telemetry">
                  <div class="diag-line"><span class="lbl">DATABASE PATH:</span> <span class="val">{absoluteDbPath}</span></div>
                </div>
              </div>

              <div class="error-actions">
                {#if isDbMissingState}
                  <button class="btn-action btn-log font-outfit" onclick={handleDeployClean}>
                    <svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17v-5M12 17V9M15 17v-3"/>
                    </svg>
                    DEPLOY CLEAN PERSISTENCE
                  </button>

                  <button class="btn-action btn-retry font-outfit" onclick={handleDeploySeeded}>
                    <svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    DEPLOY SEEDED PERSISTENCE
                  </button>
                {/if}

                <button class="btn-action btn-log font-outfit" onclick={handleOpenLog}>
                  <svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  OPEN SYSTEM LOG
                </button>

                <button class="btn-action btn-retry font-outfit" onclick={runBootSequence} disabled={isRetrying}>
                  <svg class="action-icon retry-icon" class:spinning={isRetrying} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  {isRetrying ? 'REASSESSING...' : 'REASSERT PROTOCOLS'}
                </button>

                <button class="btn-action btn-abort font-outfit" onclick={handleShutdown}>
                  <svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
                  </svg>
                  SHUTDOWN CORE
                </button>
              </div>
            </div>
          {/if}
          
          <div class="boot-footer-telemetry">
            <div class="cursor-line">
              <span class="prompt" style={!!bootErrorMessage ? "color: #ef4444; text-shadow: 0 0 10px #ef4444;" : ""}>&gt;</span>
              <span class="cursor" style={!!bootErrorMessage ? "color: #ef4444; text-shadow: 0 0 10px #ef4444;" : ""}>_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="cyber-environment" out:fade={{ duration: 800 }}>
    {#if !isAnyModalActive}
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>
      <div class="cyber-grid"></div>
    {/if}
  </div>

  <div class="app-shell" in:fade={{ duration: 600 }}>
    <!-- Atmospheric Layers -->
    <div class="fui-noise"></div>
    <div class="fui-scanline"></div>
    
    <TopNavigation bind:currentSector={currentSector} onlogoclick={() => isHubOpen = true} hasBreached={$breachedTasks.length > 0} />

    <main class="main-viewport" class:system-suspended={isAnyRootModalActive} style:display={isAnyRootModalActive ? 'none' : 'flex'} in:fade={{ delay: 100, duration: 250 }}>
      <!-- Keep all sectors alive to preserve local variables, scroll positions, and modal states -->
      <div class="sector-wrapper" style:display={currentSector === 'Execution' ? 'flex' : 'none'}>
        <ExecutionSector />
      </div>

      <div class="sector-wrapper" style:display={currentSector === 'Chronos' ? 'flex' : 'none'}>
        <ChronosSector />
      </div>

      <div class="sector-wrapper" style:display={currentSector === 'Genesis' ? 'flex' : 'none'}>
        {#if currentSector === 'Genesis'}
          <GenesisSector />
        {/if}
      </div>

      <div class="sector-wrapper" style:display={currentSector === 'Breach' ? 'flex' : 'none'}>
        <BreachSector 
          onopenreschedule={(task) => {
            forgeInitialTask = task;
            isRescheduleMode = true;
            isForgeOpen = true;
          }}
        />
      </div>

      <div class="sector-wrapper" style:display={currentSector === 'Arsenal' ? 'flex' : 'none'}>
        <ArsenalBoard 
          onweaponize={(card) => {
            forgeInitialTask = card;
            forgeInitialDesignation = card.title;
            isForgeOpen = true;
          }}
          onopenforge={(task) => {
            forgeInitialTask = task;
            isForgeOpen = true;
          }}
        />
      </div>

      <div class="sector-wrapper" style:display={currentSector === 'Archive' ? 'flex' : 'none'}>
        <ArchiveSector />
      </div>

      <!-- Other sector stubs display a subtle maintenance panel -->
      {#if !['Execution', 'Chronos', 'Genesis', 'Breach', 'Arsenal', 'Archive'].includes(currentSector)}
        <div class="maintenance-view">
          <div class="maintenance-box">
            <h2 class="maintenance-title font-outfit">SECTOR ACCESS UNDER DEVELOPMENT</h2>
            <p class="maintenance-subtitle font-inter">EXTERNAL SUB-LINK &bull; SECTOR PROTOCOLS ARE CURRENTLY LOCKED BY COMMAND AUTHORITY</p>
          </div>
        </div>
      {/if}
    </main>

    <TaskForgeButton onclick={() => {
      forgeInitialDesignation = '';
      isForgeOpen = true;
    }} />
    
    <TaskForgeModal 
      isOpen={isForgeOpen} 
      initialDesignation={forgeInitialDesignation}
      initialTask={forgeInitialTask}
      isRescheduleMode={isRescheduleMode}
      onclose={() => {
        isForgeOpen = false;
        forgeInitialDesignation = '';
        forgeInitialTask = null;
        isRescheduleMode = false;
      }} 
    />

    <HubModal isOpen={isHubOpen} onclose={() => isHubOpen = false} />
  </div>
  <ShieldSentinel />
  <DeepFocusOverlay />
  <CommandPalette bind:isOpen={isPaletteOpen} onsectorchange={(s) => currentSector = s} />
    
  <!-- Global Dropping Notification Alerts -->
  <div class="global-notifications-container">
    {#each $notifications as notification (notification.id)}
      <div 
        class="notification-alert {notification.type === 'success' ? 'victory-alert' : 'abort-alert'}" 
        in:fly={{ y: -50, x: 30, duration: 450, easing: backOut }}
        out:fade={{ duration: 200, easing: quintOut }}
      >
        <div class="notification-icon">
          {#if notification.type === 'success'}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          {:else}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          {/if}
        </div>
        <div class="notification-content">
          <span class="noti-title font-outfit">{notification.title}</span>
          <span class="noti-desc font-inter">{notification.desc}</span>
        </div>
      </div>
    {/each}
  </div>

  <NeuralUplink 
    isModalOpen={$isNeuralUplinkOpen} 
    toggleModal={() => $isNeuralUplinkOpen = !$isNeuralUplinkOpen} 
    pastLogs={$neuralUplinkLogs}
    onCommitSuccess={loadNeuralUplinkLogs} 
  />

  <!-- Decoupled Developer Panel Modals (Mounted at root level to prevent transform containing block scrollbar leaks) -->
  <DevPopup
    isOpen={isDevPopupOpen}
    buttonName={devPopupName}
    onClose={() => isDevPopupOpen = false}
  />

  <RigorePopup
    isOpen={isRigorePopupOpen}
    onClose={() => isRigorePopupOpen = false}
  />

  <MementoPopup
    isOpen={isMementoPopupOpen}
    onClose={() => isMementoPopupOpen = false}
  />

  <ReasonPopup
    isOpen={isReasonPopupOpen}
    onClose={() => isReasonPopupOpen = false}
  />

  <MentalSkillsPopup
    isOpen={isMentalSkillsPopupOpen}
    onClose={() => isMentalSkillsPopupOpen = false}
  />

  {#if $activeStrategizeTask}
    <StrategizeModal
      taskId={$activeStrategizeTask.id}
      taskTitle={$activeStrategizeTask.title}
      onClose={() => {
        if ($onNoteSavedCallback) $onNoteSavedCallback();
        activeStrategizeTask.set(null);
        onNoteSavedCallback.set(null);
      }}
      onSave={() => {
        if ($onNoteSavedCallback) $onNoteSavedCallback();
      }}
    />
  {/if}

  <SynthDeleteConfirmation
    isOpen={$isPurgeModalOpen}
    mission={$taskToPurge}
    onConfirm={confirmSynthPurge}
    onCancel={cancelSynthPurge}
  />

  {#if isInfinityRunning}
    <!-- Infinity expansion effect centered at click coordinates -->
    <div 
      class="infinity-click-overlay" 
      style="left: {infinityX}px; top: {infinityY}px;"
      transition:fade={{ duration: 150 }}
    >
      <div class="infinity-symbol-glow">
        <svg class="infinity-svg" viewBox="15 15 75 35">
          <path class="infinity-path-glow" d="M32 18 C24.4 18 18 24.4 18 32 C18 39.6 24.4 46 32 46 C39.6 46 47.2 39.6 52.8 32 C58.4 24.4 66 18 73.6 18 C81.2 18 87.6 24.4 87.6 32 C87.6 39.6 81.2 46 73.6 46 C66 46 58.4 39.6 52.8 32 C47.2 24.4 39.6 18 32 18 Z" />
          <path class="infinity-path" d="M32 18 C24.4 18 18 24.4 18 32 C18 39.6 24.4 46 32 46 C39.6 46 47.2 39.6 52.8 32 C58.4 24.4 66 18 73.6 18 C81.2 18 87.6 24.4 87.6 32 C87.6 39.6 81.2 46 73.6 46 C66 46 58.4 39.6 52.8 32 C47.2 24.4 39.6 18 32 18 Z" />
        </svg>
      </div>
      <div class="infinity-ring ring-1"></div>
      <div class="infinity-ring ring-2"></div>
      <div class="infinity-math-ring"></div>
    </div>
  {/if}

  {#if isHollowPurpleRunning}
    <!-- Fullscreen Gojo Satoru Hollow Purple Kyoshiki Murasaki Animation Overlay -->
    <div class="hollow-purple-overlay" transition:fade={{ duration: 250 }}>
      <!-- Red energy sphere charging (Aka) -->
      <div class="energy-orb energy-red"></div>
      <!-- Blue energy sphere charging (Ao) -->
      <div class="energy-orb energy-blue"></div>
      <!-- Colliding and merging fusion core -->
      <div class="energy-fusion">
        <div class="lightning-strike"></div>
        <div class="lightning-strike-alt"></div>
      </div>
      <!-- Exploding massive purple shockwave ring -->
      <div class="fusion-shockwave"></div>
    </div>
  {/if}

  {#if isMouseStationary && showSixEyes && !isInfinityRunning && !isHollowPurpleRunning && !isSukunaDomainActive && !isMentalSkillsPopupOpen}
    <!-- Gojo Satoru Six Eyes cursor projection -->
    <div 
      class="six-eyes-cursor" 
      style="left: {cursorX}px; top: {cursorY}px;"
      transition:fade={{ duration: 250 }}
    >
      <div class="six-eyes-pair">
        <!-- Left eye unit -->
        <div class="six-eye-unit">
          <div class="six-eye-eyebrow left-eyebrow"></div>
          <div class="six-eye-wrapper">
            <div class="six-eye-orb left-eye">
              <div class="six-eye-iris">
                <div class="crystalline-reflection reflection-1"></div>
                <div class="crystalline-reflection reflection-2"></div>
                <div class="crystalline-stars"></div>
                <div class="six-eye-pupil-glow"></div>
              </div>
              <div class="six-eye-highlight"></div>
            </div>
            <svg class="six-eye-contour-svg" viewBox="0 0 60 42" fill="none">
              <path class="eyelash-top-curve" d="M 3,21 C 15,3 45,3 57,21" />
              <path class="eyelash-bottom-curve" d="M 3,21 C 15,39 45,39 57,21" />
            </svg>
          </div>
        </div>
        <!-- Right eye unit -->
        <div class="six-eye-unit">
          <div class="six-eye-eyebrow right-eyebrow"></div>
          <div class="six-eye-wrapper">
            <div class="six-eye-orb right-eye">
              <div class="six-eye-iris">
                <div class="crystalline-reflection reflection-1"></div>
                <div class="crystalline-reflection reflection-2"></div>
                <div class="crystalline-stars"></div>
                <div class="six-eye-pupil-glow"></div>
              </div>
              <div class="six-eye-highlight"></div>
            </div>
            <svg class="six-eye-contour-svg" viewBox="0 0 60 42" fill="none">
              <path class="eyelash-top-curve" d="M 3,21 C 15,3 45,3 57,21" />
              <path class="eyelash-bottom-curve" d="M 3,21 C 15,39 45,39 57,21" />
            </svg>
          </div>
        </div>
      </div>
      <div class="six-eyes-aura"></div>
      <div class="six-eyes-label font-mono">SIX EYES DETECTED</div>
    </div>
  {/if}
{/if}

<style>
  .cyber-environment {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: -1;
    overflow: hidden;
    background: #020205;
  }

  .ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(160px);
    opacity: 0.35;
    animation: floatOrb 30s infinite alternate ease-in-out;
  }

  .orb-1 { 
    width: 80vw; height: 80vh; 
    background: radial-gradient(circle, var(--primary-accent), transparent); 
    top: -30%; left: -20%; 
  }
  
  .orb-2 { 
    width: 70vw; height: 70vh; 
    background: radial-gradient(circle, var(--tertiary-accent), transparent); 
    bottom: -30%; right: -20%; 
    animation-delay: -7s; 
  }
  
  .orb-3 { 
    width: 60vw; height: 60vh; 
    background: radial-gradient(circle, var(--secondary-accent), transparent); 
    top: 40%; left: 40%; 
    animation-delay: -15s; 
    opacity: 0.15;
  }

  .cyber-grid {
    position: absolute; 
    top: 0; left: 0; right: 0; bottom: 0;
    background-image:
      linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px);
    background-size: 80px 80px;
    transform: perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px);
    transform-origin: center top;
    opacity: 0.3;
    animation: gridMove 25s linear infinite;
  }

  @keyframes floatOrb {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    100% { transform: translate(150px, 100px) scale(1.2) rotate(10deg); }
  }

  @keyframes gridMove {
    0% { transform: perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px); }
    100% { transform: perspective(1000px) rotateX(60deg) translateY(-20px) translateZ(-200px); }
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background-image: radial-gradient(circle at 50% 120%, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
    overflow: hidden;
    position: relative;
  }

  .main-viewport {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0; /* Removed padding to allow full-screen sector deployment */
    overflow: hidden;
    min-height: 0;
    position: relative;
    z-index: 1;
  }

  .sector-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
  }

  /* Maintenance View Upgrades */
  .maintenance-view {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    width: 100%;
    height: 100%;
  }

  .maintenance-box {
    text-align: center;
    max-width: 600px;
  }

  .maintenance-title {
    margin-bottom: 16px;
    background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.5) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .maintenance-subtitle {
    margin: 0;
  }




  /* Boot Terminal Master Polish */
  .boot-terminal {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: #010103;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    overflow: hidden;
  }

  .boot-grid-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image: 
      linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
    background-size: 30px 30px;
    opacity: 0.5;
  }

  .boot-ambient-orb {
    position: absolute;
    width: 60vw; height: 60vh;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%);
    filter: blur(100px);
    animation: floatOrb 20s infinite alternate ease-in-out;
  }

  .boot-content-wrapper {
    position: relative;
    width: 850px;
    z-index: 10;
    transition: width 0.4s ease;
  }

  .boot-content-wrapper.has-error {
    width: 850px;
  }

  .boot-content {
    background: rgba(13, 16, 36, 0.65);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border: 2px solid rgba(139, 92, 246, 0.45);
    border-radius: 64px;
    padding: 40px 48px;
    box-shadow: 
      0 50px 100px rgba(0, 0, 0, 0.8),
      inset 0 0 30px rgba(139, 92, 246, 0.15);
    position: relative;
    overflow-x: hidden;
    overflow-y: hidden;
    width: 850px;
    height: 620px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    transition: width 0.4s ease, height 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, border-radius 0.4s ease;
  }

  .boot-content.has-error {
    border-color: rgba(239, 68, 68, 0.65);
    border-radius: 48px;
    box-shadow: 
      0 50px 100px rgba(239, 68, 68, 0.25),
      inset 0 0 35px rgba(239, 68, 68, 0.15);
    width: 850px;
    height: 680px; /* Compact height to guarantee scrollbar activation and fit smaller screens */
    max-height: 95vh;
    padding: 28px 40px;
    animation: alert-border-pulse 3s infinite alternate ease-in-out;
  }

  @keyframes alert-border-pulse {
    0% { border-color: rgba(239, 68, 68, 0.45); box-shadow: 0 50px 100px rgba(239, 68, 68, 0.15), inset 0 0 25px rgba(239, 68, 68, 0.1); }
    100% { border-color: rgba(239, 68, 68, 0.8); box-shadow: 0 50px 100px rgba(239, 68, 68, 0.3), inset 0 0 35px rgba(239, 68, 68, 0.25); }
  }

  .boot-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .boot-icon-container {
    padding: 12px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 16px;
    border: 1px solid rgba(139, 92, 246, 0.2);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
    flex-shrink: 0;
  }

  .boot-header:hover .boot-icon-container {
    transform: scale(1.1) rotate(12deg);
    filter: drop-shadow(0 0 14px rgba(139, 92, 246, 0.9));
  }

  .boot-icon {
    animation: fui-icon-float 4s ease-in-out infinite;
    transform-origin: center;
  }

  .boot-content.has-error .boot-icon {
    animation: fui-icon-float-error 2.5s ease-in-out infinite;
  }

  @keyframes fui-icon-float {
    0% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.2)); }
    50% { transform: translateY(-5px) scale(1.05) rotate(4deg); filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.6)); }
    100% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.2)); }
  }

  @keyframes fui-icon-float-error {
    0% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.3)); }
    50% { transform: translateY(-7px) scale(1.08) rotate(-5deg); filter: drop-shadow(0 0 18px rgba(239, 68, 68, 0.85)); }
    100% { transform: translateY(0) scale(1) rotate(0deg); filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.3)); }
  }

  .boot-title {
    font-size: 42px;
    font-weight: 950;
    letter-spacing: 0.35em;
    background: linear-gradient(90deg, #fff 0%, #8b5cf6 30%, #06b6d4 55%, #ec4899 80%, #fff 100%);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 5s linear infinite;
    margin: 0;
    line-height: 1;
    transition: letter-spacing 0.4s ease, transform 0.4s ease;
  }

  @keyframes chroma-title-flow {
    0%   { background-position: 0% center; }
    100% { background-position: 300% center; }
  }

  .boot-header:hover .boot-title {
    letter-spacing: 0.42em;
    transform: translateX(4px);
  }

  .fui-label {
    font-size: 13px;
    font-weight: 950;
    letter-spacing: 0.18em;
    background: linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 4s linear infinite;
  }

  .boot-status-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: var(--secure-status);
    border-radius: 50%;
    box-shadow: 0 0 15px var(--secure-status);
    animation: pulse-glow 2s infinite alternate ease-in-out;
  }

  .boot-logs {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex-grow: 1;
    justify-content: center;
    min-height: 0; /* Crucial: allows the flex container to shrink below its content height and trigger scrolling */
  }

  .boot-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .boot-card.pending {
    opacity: 0.35;
    border-color: rgba(255, 255, 255, 0.02);
  }
  .boot-card.pending:hover {
    opacity: 0.5;
    transform: translateY(-2px);
  }
  .boot-card.running {
    background: rgba(6, 182, 212, 0.05);
    border-color: rgba(6, 182, 212, 0.35);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
  }
  .boot-card.running:hover {
    transform: translateY(-2px);
    border-color: rgba(6, 182, 212, 0.6);
    box-shadow: 0 0 25px rgba(6, 182, 212, 0.25);
  }
  .boot-card.ok {
    background: rgba(16, 185, 129, 0.04);
    border-color: rgba(16, 185, 129, 0.3);
  }
  .boot-card.ok:hover {
    transform: translateY(-2px);
    border-color: rgba(16, 185, 129, 0.55);
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.2);
  }

  .boot-card-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .step-icon-box {
    width: 42px; height: 42px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.3);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
  }

  .boot-card.pending .step-icon-box {
    animation: pending-breathing 4s infinite alternate ease-in-out;
  }

  @keyframes pending-breathing {
    0% { opacity: 0.25; filter: brightness(0.6); }
    100% { opacity: 0.55; filter: brightness(1); }
  }

  .step-icon-box.active {
    background: var(--primary-accent);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 0 24px var(--primary-glow);
    animation: icon-spin-pulse 1.2s ease-in-out infinite alternate;
  }

  @keyframes icon-spin-pulse {
    0%   { transform: scale(1) rotate(-8deg); box-shadow: 0 0 15px rgba(139,92,246,0.5); }
    100% { transform: scale(1.1) rotate(8deg); box-shadow: 0 0 30px rgba(139,92,246,1); }
  }

  .step-icon-box.ok {
    background: #10b981;
    color: #fff;
    border-color: transparent;
    box-shadow: 0 0 22px rgba(16, 185, 129, 0.6);
    animation: icon-ok-bounce 0.5s cubic-bezier(0.16, 1, 0.3, 1) both, verified-pulse 2s infinite alternate ease-in-out 0.5s;
  }

  @keyframes icon-ok-bounce {
    0%   { transform: scale(0.7); opacity: 0; }
    60%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes verified-pulse {
    0% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); transform: scale(1); }
    100% { box-shadow: 0 0 22px rgba(16, 185, 129, 0.75); transform: scale(1.05); }
  }

  .step-title {
    font-size: 22px;
    font-weight: 950;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 1);
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    transition: all 0.3s ease;
  }

  .boot-card.running .step-title {
    background: linear-gradient(90deg, #06b6d4, #8b5cf6, #06b6d4);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 2.5s linear infinite;
  }
  .boot-card.ok .step-title {
    background: linear-gradient(90deg, #10b981, #34d399, #10b981);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 3s linear infinite;
  }

  .status-ok {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: 2.5px;
    background: linear-gradient(90deg, #10b981, #34d399, #10b981);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 2.5s linear infinite;
    filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
  }

  .boot-card.error {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
  }
  .boot-card.error:hover {
    transform: translateY(-2px);
    border-color: rgba(239, 68, 68, 0.6);
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.25);
  }
  .step-icon-box.error-icon {
    background: rgba(239, 68, 68, 0.2) !important;
    color: #ef4444 !important;
    border-color: #ef4444 !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
    animation: threat-glitch-blink 0.4s infinite alternate ease-in-out;
  }

  @keyframes threat-glitch-blink {
    0% { opacity: 0.75; transform: scale(0.96); box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
    100% { opacity: 1; transform: scale(1.06); box-shadow: 0 0 20px rgba(239, 68, 68, 0.85); }
  }
  .status-error {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    font-weight: 950;
    letter-spacing: 2.5px;
    background: linear-gradient(90deg, #ef4444, #f87171, #ef4444);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-title-flow 2.5s linear infinite;
    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
  }
  .status-pending {
    font-family: 'Outfit', sans-serif;
    color: rgba(255, 255, 255, 0.85);
    font-size: 16px;
    font-weight: 950;
    letter-spacing: 2px;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
  }

  .loading-bar-container {
    width: 120px;
    height: 5px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    overflow: hidden;
  }

  .loading-bar-fill {
    height: 100%;
    width: 45%;
    background: linear-gradient(90deg, #8b5cf6, #06b6d4, #8b5cf6);
    background-size: 200% auto;
    box-shadow: 0 0 10px var(--primary-glow);
    animation: loadingMove 1s infinite ease-in-out, chroma-title-flow 2s linear infinite;
  }

  @keyframes loadingMove {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(250%); }
  }

  .boot-footer-telemetry {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .boot-content.has-error .boot-logs {
    justify-content: flex-start;
    overflow-y: hidden; /* Disable scrolling on the entire loading screen */
    padding-right: 0;
    margin-right: 0;
    gap: 10px;
    height: auto; /* Allow auto height on boot-logs */
  }

  .boot-content.has-error .boot-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  :global(.boot-error-troubleshoot::-webkit-scrollbar) {
    width: 10px !important; /* Thicker scrollbar */
  }
  :global(.boot-error-troubleshoot::-webkit-scrollbar-track) {
    background: rgba(0, 0, 0, 0.3) !important; /* Dark tech track */
    border-radius: 12px !important;
    border: 1px solid rgba(239, 68, 68, 0.15) !important;
    margin-top: 24px !important;
    margin-bottom: 24px !important;
  }
  :global(.boot-error-troubleshoot::-webkit-scrollbar-thumb) {
    background: rgba(239, 68, 68, 0.75) !important; /* Highly visible neon-red */
    border-radius: 5px !important;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5) !important;
    border: 1px solid rgba(13, 16, 36, 0.8) !important;
  }
  :global(.boot-error-troubleshoot::-webkit-scrollbar-thumb:hover) {
    background: #ef4444 !important; /* Bright red on hover */
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.85) !important;
  }

  .boot-card.compact {
    padding: 8px 18px;
    border-radius: 16px;
  }

  .boot-card.compact .step-icon-box {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  .boot-card.compact .step-icon-box svg {
    width: 15px;
    height: 15px;
  }

  .boot-card.compact .step-title {
    font-size: 15px;
    font-weight: 950;
  }

  .boot-ambient-orb.has-error {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.16), transparent 70%);
    animation: floatOrb 12s infinite alternate ease-in-out;
  }

  /* Detailed Cyberpunk FUI Error Box */
  .boot-error-troubleshoot {
    margin-top: 10px;
    border: 1.5px solid rgba(239, 68, 68, 0.45);
    background: rgba(18, 3, 6, 0.8);
    border-radius: 24px;
    box-shadow: 
      0 15px 40px rgba(239, 68, 68, 0.2),
      inset 0 0 25px rgba(239, 68, 68, 0.1);
    overflow-x: hidden;
    overflow-y: scroll; /* Enable scrolling inside the red error box */
    height: 290px; /* Constrain height to fit inside the 680px modal space */
    animation: error-glow-slide 0.50s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes error-glow-slide {
    0% { transform: translateY(12px); opacity: 0; filter: blur(4px); }
    100% { transform: translateY(0); opacity: 1; filter: blur(0); }
  }

  .error-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(239, 68, 68, 0.12);
    padding: 12px 20px;
    border-bottom: 1px solid rgba(239, 68, 68, 0.25);
  }

  .danger-tag {
    font-size: 11px;
    font-weight: 950;
    color: #fca5a5;
    letter-spacing: 2px;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }

  .telemetry-stamp {
    font-size: 10px;
    font-weight: 950;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1.5px;
  }

  .error-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
  }

  .error-icon-desc {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .alert-symbol {
    flex-shrink: 0;
    margin-top: 2px;
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));
    animation: alert-icon-pulse 1.5s infinite alternate ease-in-out;
  }

  @keyframes alert-icon-pulse {
    0% { opacity: 0.7; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1.05); }
  }

  .error-text {
    margin: 0;
    font-size: 13.5px;
    font-weight: 950;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
  }

  .realignment-block {
    background: rgba(245, 158, 11, 0.05);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 14px;
    padding: 14px 18px;
  }

  .realignment-label {
    display: block;
    font-size: 11.5px;
    font-weight: 950;
    color: #f59e0b;
    letter-spacing: 1.5px;
    margin-bottom: 6px;
    text-shadow: 0 0 6px rgba(245, 158, 11, 0.35);
  }

  .realignment-desc {
    margin: 0;
    font-size: 13px;
    font-weight: 950;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
  }

  .diagnostic-telemetry {
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    padding-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .diag-line {
    font-size: 11px;
    display: flex;
    gap: 8px;
  }

  .diag-line .lbl {
    color: rgba(255, 255, 255, 0.35);
    font-weight: 950;
  }

  .diag-line .val {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 950;
  }

  :global(.diag-line .val.compromised) {
    color: #fca5a5;
    font-weight: 900;
  }

  .error-actions {
    padding: 0 20px 20px;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap; /* Prevent button clipping or text overflow by wrapping actions if container shrinks */
    gap: 12px;
  }

  .btn-action {
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    color: white;
    padding: 12px 22px;
    border-radius: 14px;
    font-size: 11.5px;
    font-weight: 950;
    letter-spacing: 1px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .btn-retry {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    border-color: rgba(239, 68, 68, 0.45);
    box-shadow: 
      0 4px 15px rgba(239, 68, 68, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  .btn-retry:hover:not(:disabled) {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    box-shadow: 
      0 8px 25px rgba(239, 68, 68, 0.6),
      0 0 15px rgba(239, 68, 68, 0.35);
  }

  .btn-log {
    background: rgba(6, 182, 212, 0.1);
    border-color: rgba(6, 182, 212, 0.35);
    color: #22d3ee;
    box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.05);
  }
  .btn-log:hover {
    transform: translateY(-2px);
    background: rgba(6, 182, 212, 0.2);
    border-color: rgba(6, 182, 212, 0.6);
    box-shadow: 
      0 8px 25px rgba(6, 182, 212, 0.35),
      0 0 15px rgba(6, 182, 212, 0.2);
  }

  .btn-abort {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  .btn-abort:hover {
    transform: translateY(-2px);
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    box-shadow: 
      0 8px 25px rgba(239, 68, 68, 0.25),
      0 0 15px rgba(239, 68, 68, 0.15);
  }

  .btn-action:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .btn-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .retry-icon.spinning {
    animation: spin-retry 1s linear infinite;
  }

  @keyframes spin-retry {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .cursor-line {
    display: flex; align-items: center; gap: 8px;
  }

  .prompt {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    font-weight: 950;
    color: var(--primary-accent);
    text-shadow: 0 0 10px var(--primary-accent);
  }
  .cursor {
    font-size: 18px;
    font-weight: 950;
    animation: blink 0.8s infinite;
    color: var(--primary-accent);
    text-shadow: 0 0 10px var(--primary-accent);
  }

  @keyframes blink {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }

  .font-outfit {
    font-family: 'Outfit', sans-serif;
  }

  .font-inter {
    font-family: 'Inter', sans-serif;
  }

  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  /* Global Notifications Container and Alert Cards */
  .global-notifications-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 1000000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .notification-alert {
    width: 310px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    border-radius: 12px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-sizing: border-box;
    pointer-events: auto;
    will-change: transform, opacity;
  }

  .victory-alert {
    background: rgba(4, 16, 32, 0.95);
    border: 2px solid #00bcff;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 188, 255, 0.3);
  }

  .abort-alert {
    background: rgba(20, 2, 6, 0.95);
    border: 2px solid #ff2d55;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 45, 85, 0.3);
  }

  .notification-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    animation: iconPulseGlobal 2s infinite alternate;
  }

  .victory-alert .notification-icon {
    color: #00bcff;
  }

  .abort-alert .notification-icon {
    color: #ff2d55;
  }

  .notification-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 2px;
  }

  .noti-title {
    font-size: 11.5px;
    font-weight: 950;
    color: #ffffff;
    letter-spacing: 1.5px;
  }

  .noti-desc {
    font-size: 10.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: 0.5px;
  }

  @keyframes iconPulseGlobal {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.25); opacity: 1; }
  }

  /* HOLLOW PURPLE KYOSHIKI MURASAKI OVERLAY */
  .hollow-purple-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(4, 2, 8, 0.95);
    z-index: 10000000;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    animation: camera-shake-rumble 3.5s cubic-bezier(.36,.07,.19,.97) both;
  }

  /* Red energy sphere (Aka) charging from left side */
  .energy-red {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle, #ff0055 20%, #ff2d55 50%, transparent 70%);
    box-shadow: 0 0 50px #ff2d55, 0 0 100px #ff0055;
    animation: charge-red 1.8s forwards cubic-bezier(0.85, 0, 0.15, 1);
  }

  /* Blue energy sphere (Ao) charging from right side */
  .energy-blue {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle, #00d2ff 20%, #0072ff 50%, transparent 70%);
    box-shadow: 0 0 50px #0072ff, 0 0 100px #00d2ff;
    animation: charge-blue 1.8s forwards cubic-bezier(0.85, 0, 0.15, 1);
  }

  /* Fusion singularity forming at the center */
  .energy-fusion {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle, #ffffff 10%, #d500f9 40%, #7c4dff 70%, transparent 90%);
    box-shadow: 
      0 0 60px #d500f9,
      0 0 120px #7c4dff,
      0 0 180px rgba(124, 77, 255, 0.5),
      inset 0 0 30px #ffffff;
    opacity: 0;
    transform: scale(0.1);
    animation: fusion-implode-explode 2.0s 1.5s forwards cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Lightning cracking effects inside fusion core */
  .lightning-strike {
    position: absolute;
    width: 180px;
    height: 4px;
    background: #ffffff;
    box-shadow: 0 0 15px #d500f9, 0 0 5px #ffffff;
    transform: rotate(45deg);
    animation: lightning-flicker 0.2s infinite;
  }
  .lightning-strike-alt {
    position: absolute;
    width: 180px;
    height: 4px;
    background: #ffffff;
    box-shadow: 0 0 15px #7c4dff, 0 0 5px #ffffff;
    transform: rotate(-45deg);
    animation: lightning-flicker 0.15s infinite alternate;
  }

  /* Shockwave expanding out */
  .fusion-shockwave {
    position: absolute;
    border: 8px solid rgba(213, 0, 249, 0.8);
    border-radius: 50%;
    width: 100px;
    height: 100px;
    opacity: 0;
    transform: scale(0.1);
    box-shadow: 0 0 40px #7c4dff, inset 0 0 40px #d500f9;
    animation: shockwave-expand 1.3s 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
  }

  /* KEYFRAMES */
  @keyframes charge-red {
    0% {
      left: -20%;
      transform: scale(0.5) translateY(-30px);
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      left: 50%;
      transform: scale(1.1) translate(-50%, 0);
      opacity: 0.9;
    }
  }

  @keyframes charge-blue {
    0% {
      right: -20%;
      transform: scale(0.5) translateY(30px);
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    100% {
      right: 50%;
      transform: scale(1.1) translate(50%, 0);
      opacity: 0.9;
    }
  }

  @keyframes fusion-implode-explode {
    0% {
      opacity: 0;
      transform: scale(0.1) rotate(0deg);
    }
    20% {
      opacity: 1;
      transform: scale(1.3) rotate(180deg);
    }
    30% {
      /* Implosion phase */
      transform: scale(0.6) rotate(360deg);
      box-shadow: 0 0 30px #d500f9, 0 0 60px #7c4dff;
    }
    60% {
      /* Massive expansion surge */
      transform: scale(4) rotate(720deg);
      box-shadow: 
        0 0 100px #d500f9,
        0 0 200px #7c4dff,
        0 0 400px rgba(124, 77, 255, 0.8);
      opacity: 1;
    }
    100% {
      /* Absolute flash expansion */
      transform: scale(25);
      opacity: 0;
    }
  }

  @keyframes lightning-flicker {
    0%, 100% { opacity: 0; transform: scaleX(0.2) rotate(45deg); }
    50% { opacity: 1; transform: scaleX(1.2) rotate(45deg); }
  }

  @keyframes shockwave-expand {
    0% {
      opacity: 0.8;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(10);
      border-width: 1px;
    }
  }

  @keyframes camera-shake-rumble {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, -2px, 0); }
    40%, 60% { transform: translate3d(4px, 2px, 0); }
  }

  /* INFINITY CLICK OVERLAY CSS */
  .infinity-click-overlay {
    position: fixed;
    pointer-events: none;
    z-index: 9999999;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 400px;
    height: 400px;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }

  .infinity-ring {
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(0, 240, 255, 0.4);
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
    animation: ring-expand-decelerate 2.0s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
  }

  .ring-1 {
    animation-duration: 1.6s;
  }

  .ring-2 {
    animation-duration: 2.0s;
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
  }

  .infinity-math-ring {
    position: absolute;
    width: 140px;
    height: 140px;
    border: 1px dashed rgba(0, 240, 255, 0.25);
    border-radius: 50%;
    animation: math-spin 2.0s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .infinity-symbol-glow {
    width: 140px;
    height: 70px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: 10;
    animation: infinity-focus-implode 2.0s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }

  .infinity-svg {
    width: 100%;
    height: 100%;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .infinity-path {
    stroke: #ffffff;
    stroke-width: 3.5px;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    stroke-dasharray: 260;
    stroke-dashoffset: 260;
    animation: draw-infinity 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .infinity-path-glow {
    stroke: #00f0ff;
    stroke-width: 8px;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    filter: blur(4px);
    opacity: 0.8;
    stroke-dasharray: 260;
    stroke-dashoffset: 260;
    animation: draw-infinity 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes draw-infinity {
    0% {
      stroke-dashoffset: 260;
    }
    70% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }

  @keyframes ring-expand-decelerate {
    0% {
      width: 0;
      height: 0;
      opacity: 0.9;
    }
    100% {
      width: 380px;
      height: 380px;
      opacity: 0;
    }
  }

  @keyframes math-spin {
    0% {
      transform: rotate(0deg) scale(0.3);
      opacity: 0.8;
    }
    100% {
      transform: rotate(360deg) scale(1.8);
      opacity: 0;
    }
  }

  @keyframes infinity-focus-implode {
    0% {
      transform: scale(0.1) rotate(-180deg);
      opacity: 0;
      filter: blur(15px);
    }
    20% {
      transform: scale(1.3) rotate(15deg);
      opacity: 0.95;
      filter: blur(2px);
    }
    35% {
      transform: scale(1.0) rotate(0deg);
      opacity: 1;
      filter: blur(0);
    }
    75% {
      transform: scale(1.1) rotate(-5deg);
      opacity: 1;
      filter: blur(0);
    }
    100% {
      transform: scale(0.01) rotate(180deg);
      opacity: 0;
      filter: blur(10px);
    }
  }

  /* SIX EYES STATIONARY CURSOR CSS */
  .six-eyes-cursor {
    position: fixed;
    pointer-events: none;
    z-index: 10000000;
    transform: translate(-50%, -35px); /* Positioned slightly above the cursor */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }  .six-eyes-pair {
    display: flex;
    gap: 24px;
    filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.7));
  }

  .six-eye-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .six-eye-wrapper {
    position: relative;
    width: 60px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Thin white arched eyebrow representing Gojo's white eyebrows */
  .six-eye-eyebrow {
    width: 58px;
    height: 6px;
    border-top: 2.2px solid #ffffff;
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.95));
    opacity: 0.95;
    pointer-events: none;
  }

  .left-eyebrow {
    transform: rotate(-6deg) translateX(1px);
  }

  .right-eyebrow {
    transform: rotate(6deg) translateX(-1px);
  }

  .six-eye-orb {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 42px;
    background: #010103;
    /* Precise leaf/almond crop with sharp corners and height >= 70% width */
    clip-path: path('M 3 21 C 15 3 45 3 57 21 C 45 39 15 39 3 21 Z');
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: inset 0 0 12px rgba(56, 189, 248, 0.45);
  }

  /* Vector eyelash contours overlay */
  .six-eye-contour-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 60px;
    height: 42px;
    pointer-events: none;
    z-index: 10;
  }

  .eyelash-top-curve {
    stroke: #ffffff;
    stroke-width: 2.5px;
    stroke-linecap: round;
    fill: none;
    filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 5px rgba(56, 189, 248, 0.6));
  }

  .eyelash-bottom-curve {
    stroke: rgba(255, 255, 255, 0.65);
    stroke-width: 1.5px;
    stroke-linecap: round;
    fill: none;
    filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.4));
  }

  /* Sky-Blue glowing detailed iris */
  .six-eye-iris {
    position: relative;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: radial-gradient(circle, #ffffff 0%, #38bdf8 35%, #0369a1 75%, #021e3d 100%);
    box-shadow: 
      0 0 15px rgba(56, 189, 248, 0.85),
      inset 0 0 8px rgba(255, 255, 255, 0.65);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    animation: iris-pulse 2s infinite alternate ease-in-out;
    z-index: 2;
  }

  @keyframes iris-pulse {
    0% { transform: scale(1.0); }
    100% { transform: scale(1.06); }
  }

  /* Crystalline reflections representing cursed energy perception */
  .crystalline-reflection {
    position: absolute;
    background: rgba(255, 255, 255, 0.45);
    border-radius: 50%;
  }

  .reflection-1 {
    width: 11px;
    height: 4px;
    top: 6px;
    left: 6px;
    transform: rotate(-35deg);
  }

  .reflection-2 {
    width: 6px;
    height: 3px;
    bottom: 7px;
    right: 7px;
    transform: rotate(45deg);
  }

  /* Crystalline Stars representation inside Gojo's eyes */
  .crystalline-stars {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: radial-gradient(circle, #ffffff 1.2px, transparent 1.2px);
    background-size: 6px 6px;
    opacity: 0.4;
    animation: crystalline-twinkle 6s linear infinite;
  }

  @keyframes crystalline-twinkle {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Bright white pupil core glow */
  .six-eye-pupil-glow {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 8px #ffffff, 0 0 15px #ffffff;
    z-index: 4;
  }

  /* Extra glint overlay representing bright gaze */
  .six-eye-highlight {
    position: absolute;
    top: 5px;
    left: 13px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    filter: blur(0.5px);
    z-index: 6;
    pointer-events: none;
  }

  .six-eyes-aura {
    width: 90px;
    height: 8px;
    background: radial-gradient(ellipse, rgba(56, 189, 248, 0.35), transparent 75%);
    filter: blur(3px);
    margin-top: -2px;
    animation: aura-glow 2.5s infinite alternate ease-in-out;
  }

  .six-eyes-label {
    font-size: 8px;
    color: rgba(56, 189, 248, 0.7);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 0 4px rgba(56, 189, 248, 0.4);
    margin-top: -2px;
    font-weight: bold;
  }

  @keyframes crystalline-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes aura-glow {
    0% { opacity: 0.3; transform: scaleX(0.8); }
    100% { opacity: 0.9; transform: scaleX(1.2); }
  }
</style>
>
