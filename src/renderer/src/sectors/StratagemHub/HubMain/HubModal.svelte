<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import NukeProtocol from '../Nuke/NukeProtocol.svelte';
  import NeuralLinkStation from '../NeuralLink/NeuralLinkStation.svelte';
  import { AudioEngine } from '../../../core/audio-engine.js';
  import { triggerShield } from '../../../core/shield-store.js';
  import { 
    executionTasks, 
    breachedTasks, 
    rawIntelTasks, 
    synthesizingTasks, 
    weaponizedTasks, 
    archivedTasks,
    syncAntaryami
  } from '../../../core/store.js';

  let { isOpen = false, onclose } = $props();

  let isNukeOpen = $state(false);
  let isNeuralOpen = $state(false);
  let neuralMode = $state('MERGE'); // 'MERGE' or 'OVERWRITE'
  let dbPath = $state('C:/Users/karan/AppData/Roaming/n0-furnace/stratagem_intel.db');
  let copied = $state(false);
  let jsonExportState = $state('IDLE'); // 'IDLE', 'PROCESSING', 'SUCCESS', 'FAILED'
  let dbExportState = $state('IDLE');
  let dbImportState = $state('IDLE');
  let overwriteImportState = $state('IDLE');
  let dbSize = $state('0.05 MB');
  let diagnosticState = $state('IDLE'); // 'IDLE', 'PROCESSING', 'SUCCESS', 'FAILED'

  const playAudio = (track: string) => {
    AudioEngine.play(track);
  };

  const runDiagnostic = async () => {
    if (diagnosticState !== 'IDLE') return;
    diagnosticState = 'PROCESSING';
    playAudio('success');
    triggerShield('DIAGNOSTIC ENGAGED: SCANNING DATABASE CORE...', 'SUCCESS', 2000);
    
    try {
      await syncAntaryami();
      await fetchDbSize();
      
      const result = await window.stratagemAPI.runDiagnostics();
      
      // Add artificial delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (result && result.success) {
        diagnosticState = 'SUCCESS';
        triggerShield('DIAGNOSTIC OPTIMAL: 0 DISCREPANCIES FOUND', 'SUCCESS', 4000);
        // import addNotification from store.js if needed or window.stratagemAPI.addNotification? Wait, is addNotification imported in HubModal? Let's check!
        const { addNotification } = await import('../../../core/store');
        addNotification('DIAGNOSTIC OPTIMAL', 'Database integrity and table schemas are fully verified and healthy.', 'success');
      } else {
        diagnosticState = 'FAILED';
        triggerShield(`DIAGNOSTIC EXCEPTION: ${result.error || 'FAILED'}`, 'CRITICAL', 4000);
        const { addNotification } = await import('../../../core/store');
        addNotification(
          'DIAGNOSTIC EXCEPTION DETECTED',
          `Core check failed: ${result.message || 'Unknown database issue'}. Check database file mounts immediately.`,
          'error'
        );
      }
    } catch (err: any) {
      diagnosticState = 'FAILED';
      triggerShield('DIAGNOSTIC BRIDGE EXCEPTION', 'CRITICAL', 4000);
      try {
        const { addNotification } = await import('../../../core/store');
        addNotification('DIAGNOSTIC EXCEPTION DETECTED', `Core check failed: ${err.message || err}`, 'error');
      } catch (e) {}
    }
    
    setTimeout(() => {
      diagnosticState = 'IDLE';
    }, 4000);
  };

  const systemOverwrite = async () => {
    neuralMode = 'OVERWRITE';
    isNeuralOpen = true;
  };

  const handleExportDB = async () => {
    try {
      playAudio('ui-click');
      dbExportState = 'PROCESSING';
      const response = await window.osAPI.exportDatabase();
      if (response && response.success) {
        dbExportState = 'SUCCESS';
        playAudio('success');
        triggerShield('COGNITIVE CORE EXPORTED SUCCESSFULLY', 'SUCCESS', 4000);
        setTimeout(() => {
          dbExportState = 'IDLE';
        }, 3000);
      } else if (response && response.message === 'ABORTED') {
        dbExportState = 'FAILED';
        playAudio('ui-click');
        triggerShield('EXPORT PROTOCOL ABORTED', 'TACTICAL', 3000);
        setTimeout(() => {
          dbExportState = 'IDLE';
        }, 2000);
      } else {
        dbExportState = 'FAILED';
        playAudio('fail');
        triggerShield(`EXPORT FAILED: ${response.error || 'UNKNOWN ERROR'}`, 'CRITICAL', 4000);
        setTimeout(() => {
          dbExportState = 'IDLE';
        }, 3000);
      }
    } catch (e: any) {
      dbExportState = 'FAILED';
      playAudio('fail');
      triggerShield(`EXPORT CRITICAL ERROR: ${e.message}`, 'CRITICAL', 4000);
      setTimeout(() => {
        dbExportState = 'IDLE';
      }, 3000);
    }
  };

  const handleExportJSON = async () => {
    try {
      playAudio('ui-click');
      jsonExportState = 'PROCESSING';
      const response = await window.osAPI.exportDatabaseJSON();
      if (response && response.success) {
        jsonExportState = 'SUCCESS';
        playAudio('success');
        triggerShield('INTELLIGENCE MATRIX EXPORTED SUCCESSFULLY', 'SUCCESS', 4000);
        setTimeout(() => {
          jsonExportState = 'IDLE';
        }, 3000);
      } else if (response && response.message === 'ABORTED') {
        jsonExportState = 'FAILED';
        playAudio('ui-click');
        triggerShield('JSON EXPORT PROTOCOL ABORTED', 'TACTICAL', 3000);
        setTimeout(() => {
          jsonExportState = 'IDLE';
        }, 2000);
      } else {
        jsonExportState = 'FAILED';
        playAudio('fail');
        triggerShield(`JSON EXPORT FAILED: ${response.error || 'UNKNOWN ERROR'}`, 'CRITICAL', 4000);
        setTimeout(() => {
          jsonExportState = 'IDLE';
        }, 3000);
      }
    } catch (e: any) {
      jsonExportState = 'FAILED';
      playAudio('fail');
      triggerShield(`JSON EXPORT CRITICAL ERROR: ${e.message}`, 'CRITICAL', 4000);
      setTimeout(() => {
        jsonExportState = 'IDLE';
      }, 3000);
    }
  };

  const initiateNeuralMerge = async () => {
    neuralMode = 'MERGE';
    isNeuralOpen = true;
  };

  const fetchDbSize = async () => {
    try {
      if (window.stratagemAPI && window.stratagemAPI.getDatabaseSize) {
        dbSize = await window.stratagemAPI.getDatabaseSize();
      }
    } catch (e) {
      console.error('[HubModal] Failed to get db size:', e);
    }
  };

  const copyToClipboard = async () => {
    try {
      playAudio('ui-click');
      await navigator.clipboard.writeText(dbPath);
      copied = true;
      triggerShield('INTEL PATH COPIED TO SECURE CLIPBOARD', 'SUCCESS', 2000);
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (e: any) {
      playAudio('fail');
      triggerShield(`CLIPBOARD ERROR: ${e.message}`, 'CRITICAL', 4000);
    }
  };

  const verifyMount = async () => {
    try {
      playAudio('ui-click');
      if (window.osAPI && window.osAPI.openInExplorer) {
        await window.osAPI.openInExplorer(dbPath);
        triggerShield('EXPLORER LAUNCHED AT DATABASE LOCATION', 'SUCCESS', 2000);
      } else {
        triggerShield('DATABASE MOUNT STABLE', 'SUCCESS', 2000);
      }
    } catch (e: any) {
      playAudio('fail');
      triggerShield(`MOUNT ACCESS EXCEPTION: ${e.message}`, 'CRITICAL', 4000);
    }
  };

  onMount(async () => {
    try {
      if (window.stratagemAPI && window.stratagemAPI.getDatabasePath) {
        dbPath = await window.stratagemAPI.getDatabasePath();
      }
      await fetchDbSize();
    } catch (e) {
      console.error('[HubModal] Failed to get database path:', e);
    }
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="hub-backdrop" onclick={onclose} role="presentation" transition:fade={{ duration: 250, easing: quintOut }}>

    <!-- Modal Container -->
    <div class="hub-container" onclick={(e) => e.stopPropagation()} role="presentation" in:scale={{ duration: 400, start: 0.94, easing: quintOut }} out:scale={{ duration: 300, start: 0.96, opacity: 0, easing: quintOut }}>
      
      <!-- Decorative corners (wings) -->
      <div class="wing tl"></div>
      <div class="wing tr"></div>
      <div class="wing bl"></div>
      <div class="wing br"></div>

      <!-- Header -->
      <header class="hub-header">
        <div class="header-left">
          <!-- Highly detailed, smooth animated Database Core SVG -->
          <svg class="header-icon" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 18px #8b5cf6); flex-shrink: 0;">
            <style>
              @keyframes core-chassis-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              @keyframes core-chassis-spin-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
              @keyframes scan-laser { 0%, 100% { transform: translateY(0px); opacity: 0.3; } 50% { transform: translateY(22px); opacity: 1; filter: drop-shadow(0 0 8px #00ff9f); } }
              @keyframes led-blink { 0%, 100% { fill: #00ff9f; opacity: 1; } 50% { fill: #06b6d4; opacity: 0.6; } }
              @keyframes led-blink-alt { 0%, 100% { fill: #ec4899; opacity: 0.5; } 50% { fill: #f59e0b; opacity: 1; } }
              .icon-outer-ring { animation: core-chassis-spin 16s linear infinite; transform-origin: center; }
              .icon-inner-bracket { animation: core-chassis-spin-reverse 10s linear infinite; transform-origin: center; }
              .icon-scan-line { animation: scan-laser 2.2s ease-in-out infinite; }
              .led-1 { animation: led-blink 1s infinite alternate; }
              .led-2 { animation: led-blink-alt 1.2s infinite alternate; }
            </style>
            
            <!-- Outer Glowing Circle with brackets -->
            <circle class="icon-outer-ring" cx="32" cy="32" r="29" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="16 8 4 8" stroke-linecap="round"/>
            <circle class="icon-outer-ring" cx="32" cy="32" r="26" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2 6" stroke-linecap="round"/>
            
            <!-- Core mainframe unit -->
            <g transform="translate(18, 14)">
              <!-- Server Unit Background Frame -->
              <rect x="0" y="0" width="28" height="34" rx="4" fill="rgba(13, 15, 30, 0.9)" stroke="#8b5cf6" stroke-width="2" />
              
              <!-- Racks -->
              <rect x="3" y="4" width="22" height="6" rx="2" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" stroke-width="1.5" />
              <circle class="led-1" cx="7" cy="7" r="1.5" fill="#00ff9f" />
              <rect x="12" y="6" width="10" height="2" rx="1" fill="#ffffff" opacity="0.8" />
              
              <rect x="3" y="14" width="22" height="6" rx="2" fill="rgba(236, 72, 153, 0.15)" stroke="#ec4899" stroke-width="1.5" />
              <circle class="led-2" cx="7" cy="17" r="1.5" fill="#ec4899" />
              <rect x="12" y="16" width="10" height="2" rx="1" fill="#ffffff" opacity="0.8" />
              
              <rect x="3" y="24" width="22" height="6" rx="2" fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" stroke-width="1.5" />
              <circle class="led-1" cx="7" cy="27" r="1.5" fill="#00ff9f" />
              <rect x="12" y="26" width="10" height="2" rx="1" fill="#ffffff" opacity="0.8" />
              
              <!-- Animated Scanning Laser Line -->
              <line class="icon-scan-line" x1="-2" y1="4" x2="30" y2="4" stroke="#00ff9f" stroke-width="2" stroke-linecap="round" />
            </g>
            
            <!-- Inner framing brackets -->
            <path class="icon-inner-bracket" d="M12 20 A 20 20 0 0 1 52 20" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="10 5" stroke-linecap="round" />
            <path class="icon-inner-bracket" d="M12 44 A 20 20 0 0 0 52 44" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="10 5" stroke-linecap="round" />
          </svg>
          <h2 class="font-outfit uppercase header-glow">DATABASE STATION</h2>
        </div>

        <div class="header-actions">
          <button class="nuke-trigger-btn font-outfit shine-slash-effect" onclick={() => { playAudio('ui-click'); isNukeOpen = true; }}>
            NUKE STORAGE
          </button>
          <button class="nuke-trigger-btn close-btn font-outfit shine-slash-effect" onclick={onclose} aria-label="Close Hub">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Asymmetric 2-Column Layout -->
      <div class="hub-grid">
        <!-- LEFT COLUMN -->
        <div class="hub-col hub-col-left">
          <!-- Panel 1: Cognitive State -->
        <section class="grid-panel panel-blue">
          <div class="panel-header-wrap">
            <!-- High-Fidelity Animated Database SVG -->
            <svg class="panel-icon blue-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <style>
                @keyframes db-scan { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(8px); opacity: 1; filter: drop-shadow(0 0 10px #60a5fa); } }
                @keyframes disk-pulse { 0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px transparent); } 50% { opacity: 1; filter: drop-shadow(0 0 8px #3b82f6); } }
                .db-scanner { animation: db-scan 2.5s ease-in-out infinite; }
                .disk-1 { animation: disk-pulse 2s infinite 0s; }
                .disk-2 { animation: disk-pulse 2s infinite 0.6s; }
                .disk-3 { animation: disk-pulse 2s infinite 1.2s; }
              </style>
              <ellipse cx="12" cy="5" rx="8" ry="3" stroke="#3b82f6" stroke-width="2" class="disk-1" fill="rgba(59, 130, 246, 0.1)"/>
              <path d="M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="#3b82f6" stroke-width="2" class="disk-2" fill="rgba(59, 130, 246, 0.05)"/>
              <path d="M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" stroke="#3b82f6" stroke-width="2" class="disk-3" fill="rgba(59, 130, 246, 0.05)"/>
              <path d="M4 15v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4" stroke="#3b82f6" stroke-width="2" class="disk-1" fill="rgba(59, 130, 246, 0.1)"/>
              <line class="db-scanner" x1="2" y1="8" x2="22" y2="8" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <h3 class="panel-title font-outfit">COGNITIVE STATE</h3>
          </div>
          <div class="panel-body panel-blue-body">
            <div class="input-group" style="margin-top: 10px;">
              <label for="db-mount-path-input" class="field-label" style="cursor: default;">
                DATABASE MOUNT PATH
              </label>
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <div onclick={copyToClipboard} class="clipboard-cursor" title="Click to copy path">
                {#if copied}
                  <input id="db-mount-path-input" type="text" value="[ COPIED TO SECURE CLIPBOARD ]" class="tactical-input db-input font-mono copied-text clipboard-cursor" readonly />
                {:else}
                  <input id="db-mount-path-input" type="text" bind:value={dbPath} class="tactical-input db-input font-mono clipboard-cursor" readonly />
                {/if}
              </div>
            </div>
            <!-- Shifted down with margin-top: auto -->
            <button class="panel-btn blue-btn db-action-btn font-outfit shine-slash-effect" onclick={verifyMount}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: middle;">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              Open File Location
            </button>
          </div>
        </section>

          <!-- Panel 3: Intelligence Metrics -->
        <section class="grid-panel panel-amber">
          <div class="panel-header-wrap">
            <!-- High-Fidelity Animated Metrics Chart SVG -->
            <svg class="panel-icon amber-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <style>
                @keyframes bar-bounce-1 { 0%, 100% { transform: scaleY(0.4); opacity: 0.7; } 50% { transform: scaleY(1); opacity: 1; filter: drop-shadow(0 0 8px #f59e0b); } }
                @keyframes bar-bounce-2 { 0%, 100% { transform: scaleY(0.8); opacity: 0.9; filter: drop-shadow(0 0 4px #f59e0b); } 50% { transform: scaleY(0.3); opacity: 0.5; } }
                @keyframes bar-bounce-3 { 0%, 100% { transform: scaleY(0.5); opacity: 0.8; } 50% { transform: scaleY(0.9); opacity: 1; filter: drop-shadow(0 0 8px #f59e0b); } }
                .bar-1 { animation: bar-bounce-1 1.2s ease-in-out infinite; transform-origin: bottom; }
                .bar-2 { animation: bar-bounce-2 1.4s ease-in-out infinite; transform-origin: bottom; }
                .bar-3 { animation: bar-bounce-3 1.1s ease-in-out infinite; transform-origin: bottom; }
                .metric-base { stroke: rgba(245, 158, 11, 0.3); stroke-width: 2.5; stroke-linecap: round; }
              </style>
              <!-- Background tracks -->
              <line x1="6" y1="20" x2="6" y2="4" class="metric-base" />
              <line x1="12" y1="20" x2="12" y2="4" class="metric-base" />
              <line x1="18" y1="20" x2="18" y2="4" class="metric-base" />
              <!-- Active animated bars -->
              <line x1="6" y1="20" x2="6" y2="10" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" class="bar-1" />
              <line x1="12" y1="20" x2="12" y2="4" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" class="bar-2" />
              <line x1="18" y1="20" x2="18" y2="12" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" class="bar-3" />
            </svg>
            <h3 class="panel-title font-outfit">INTELLIGENCE METRICS</h3>
          </div>
          <div class="panel-body font-inter">
            <div class="metrics-grid" class:diagnosing={diagnosticState === 'PROCESSING'}>
              <div class="metric-row-split">
                <div class="metric-half">
                  <span class="m-label" style="color: #3b82f6;">EXEC</span>
                  <span class="m-val font-mono" style="color: #3b82f6;">{$executionTasks.length}</span>
                </div>
                <div class="metric-half">
                  <span class="m-label" style="color: #ef4444;">BREACH</span>
                  <span class="m-val font-mono" style="color: #ef4444;">{$breachedTasks.length}</span>
                </div>
              </div>
              <div class="metric-row-split">
                <div class="metric-half">
                  <span class="m-label" style="color: #8b5cf6;">ARSENAL</span>
                  <span class="m-val font-mono" style="color: #8b5cf6;">{$rawIntelTasks.length + $synthesizingTasks.length + $weaponizedTasks.length}</span>
                </div>
                <div class="metric-half">
                  <span class="m-label" style="color: rgba(255, 255, 255, 0.45);">ARCHIVE</span>
                  <span class="m-val font-mono" style="color: rgba(255, 255, 255, 0.45);">{$archivedTasks.length}</span>
                </div>
              </div>
              <div class="metric-row db-size-row">
                <span class="m-label" style="color: #06b6d4;">TOTAL PAYLOAD SIZE</span>
                <span class="m-val font-mono glow-cyan" style="color: #06b6d4;">{dbSize}</span>
              </div>
            </div>
            <button 
              class="panel-btn diagnostic-btn font-outfit stateful-btn shine-slash-effect" 
              class:processing={diagnosticState === 'PROCESSING'}
              class:success={diagnosticState === 'SUCCESS'}
              class:failed={diagnosticState === 'FAILED'}
              onclick={runDiagnostic}
            >
              {#if diagnosticState === 'PROCESSING'}
                <span class="loading-spin-white"></span>
                [ SYNCING METRICS... ]
              {:else if diagnosticState === 'SUCCESS'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
                [ HEALTH OPTIMAL ]
              {:else if diagnosticState === 'FAILED'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                [ DIAGNOSTIC FAILED ]
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: middle;">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
                </svg>
                RUN DIAGNOSTIC OPTIMIZATION
              {/if}
            </button>
          </div>
        </section>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="hub-col hub-col-right">
          <!-- Panel 2: Export Protocols -->
        <section class="grid-panel panel-pink">
          <div class="panel-header-wrap">
            <!-- High-Fidelity Animated Export SVG -->
            <svg class="panel-icon pink-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <style>
                @keyframes export-pulse { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-4px); opacity: 0; } }
                @keyframes export-glow { 0%, 100% { filter: drop-shadow(0 0 5px #ec4899); } 50% { filter: drop-shadow(0 0 15px #ec4899); } }
                .exp-arrow { animation: export-pulse 1.5s ease-out infinite; }
                .exp-base { animation: export-glow 2.5s ease-in-out infinite; }
              </style>
              <path class="exp-base" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline class="exp-arrow" points="16 8 12 4 8 8" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <line class="exp-arrow" x1="12" y1="4" x2="12" y2="16" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="19" r="2" fill="#ec4899" />
            </svg>
            <h3 class="panel-title font-outfit">EXPORT PROTOCOLS</h3>
          </div>
          <div class="panel-body flex-col-btn">
            <p class="font-inter telemetry-paragraph" style="color: #f472b6; text-shadow: 0 0 10px rgba(244, 114, 182, 0.5); border-left-color: #f472b6;">
              Extract the primary intelligence core for secure backup. Synthesize raw operational data for external parsing.
            </p>
            <button 
              class="panel-btn pink-btn font-outfit stateful-btn shine-slash-effect" 
              class:processing={dbExportState === 'PROCESSING'} 
              class:success={dbExportState === 'SUCCESS'} 
              class:failed={dbExportState === 'FAILED'} 
              onclick={handleExportDB}
            >
              {#if dbExportState === 'PROCESSING'}
                <span class="loading-spin-white"></span>
                [ EXTRACTING CORE... ]
              {:else if dbExportState === 'SUCCESS'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
                [ EXTRACTION SUCCESS ]
              {:else if dbExportState === 'FAILED'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                [ EXTRACTION FAILED ]
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  <polyline points="12 14 16 10 20 14"></polyline>
                  <line x1="16" y1="20" x2="16" y2="10"></line>
                </svg>
                DEPLOY CORE EXTRACTION (.DB)
              {/if}
            </button>
            <button 
              class="panel-btn json-btn font-outfit stateful-btn shine-slash-effect" 
              class:processing={jsonExportState === 'PROCESSING'} 
              class:success={jsonExportState === 'SUCCESS'} 
              class:failed={jsonExportState === 'FAILED'} 
              onclick={handleExportJSON}
            >
              {#if jsonExportState === 'PROCESSING'}
                <span class="loading-spin-white"></span>
                [ SYNTHESIZING... ]
              {:else if jsonExportState === 'SUCCESS'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
                [ SYNTHESIS SUCCESS ]
              {:else if jsonExportState === 'FAILED'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                [ SYNTHESIS FAILED ]
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M10 13l-2 2 2 2"></path>
                  <path d="M14 13l2 2-2 2"></path>
                </svg>
                INITIATE DATA SYNTHESIS (.JSON)
              {/if}
            </button>
          </div>
        </section>

          <!-- Panel 4: Import Protocols -->
        <section class="grid-panel panel-teal">
          <div class="panel-header-wrap">
            <!-- High-Fidelity Animated Import SVG -->
            <svg class="panel-icon teal-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <style>
                @keyframes import-pulse { 0% { transform: translateY(-4px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                @keyframes import-glow { 0%, 100% { filter: drop-shadow(0 0 5px #14b8a6); } 50% { filter: drop-shadow(0 0 15px #14b8a6); } }
                .imp-arrow { animation: import-pulse 1.5s ease-out infinite; }
                .imp-base { animation: import-glow 2.5s ease-in-out infinite; }
              </style>
              <path class="imp-base" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#14b8a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline class="imp-arrow" points="8 11 12 15 16 11" stroke="#0d9488" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <line class="imp-arrow" x1="12" y1="15" x2="12" y2="3" stroke="#0d9488" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="19" r="2" fill="#14b8a6" />
            </svg>
            <h3 class="panel-title font-outfit">IMPORT PROTOCOLS</h3>
          </div>
          <div class="panel-body flex-col-btn">
            <p class="font-inter telemetry-paragraph">
              Neural Merge integrates external data without loss. Overwrite permanently replaces the active core matrix.
            </p>
            <button 
              class="panel-btn teal-btn font-outfit stateful-btn shine-slash-effect"
              class:processing={dbImportState === 'PROCESSING'} 
              class:success={dbImportState === 'SUCCESS'} 
              class:failed={dbImportState === 'FAILED'} 
              onclick={initiateNeuralMerge}
            >
              {#if dbImportState === 'PROCESSING'}
                <span class="loading-spin-white"></span>
                [ INITIALIZING LINK... ]
              {:else if dbImportState === 'SUCCESS'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
                [ LINK ENGAGED ]
              {:else if dbImportState === 'FAILED'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                [ IMPORT FAILED ]
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; display:inline-block; vertical-align:middle;">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                IMPORT NEURAL MERGE (.DB)
              {/if}
            </button>
            <button 
              class="panel-btn overwrite-btn font-outfit stateful-btn shine-slash-effect"
              class:processing={overwriteImportState === 'PROCESSING'} 
              class:success={overwriteImportState === 'SUCCESS'} 
              class:failed={overwriteImportState === 'FAILED'} 
              onclick={systemOverwrite}
            >
              {#if overwriteImportState === 'PROCESSING'}
                <span class="loading-spin-white"></span>
                [ OVERWRITING VAULT... ]
              {:else if overwriteImportState === 'SUCCESS'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <path d="M20 6L9 17L4 12"/>
                </svg>
                [ OVERWRITE COMPLETED ]
              {:else if overwriteImportState === 'FAILED'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align:middle;">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                [ OVERWRITE FAILED ]
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; display:inline-block; vertical-align:middle;">
                  <path d="M12 2L2 7l10 15 10-15-10-5z" stroke="currentColor" stroke-width="2" />
                  <path d="M12 6v6" stroke="currentColor" stroke-width="2" />
                  <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                </svg>
                SYSTEM OVERWRITE MATRIX
              {/if}
            </button>
          </div>
        </section>
        </div>
      </div>

    </div>
  </div>
{/if}

<!-- Sub-protocols overlay rendering -->
{#if isNukeOpen}
  <NukeProtocol onclose={() => isNukeOpen = false} currentDbSize={dbSize} />
{/if}

{#if isNeuralOpen}
  <NeuralLinkStation mode={neuralMode} onclose={() => isNeuralOpen = false} />
{/if}

<style>
  .hub-backdrop {
    position: fixed;
    top: 80px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    background: rgb(2, 1, 14);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    overflow: hidden;
    will-change: opacity;
  }

  .hub-container {
    position: relative;
    width: 1078px;
    height: 798px;
    padding: 24px 48px 32px 48px;
    background: rgba(13, 16, 36, 0.95);
    border: 3px solid #8b5cf6;
    border-radius: 64px;
    box-shadow: 0 0 50px rgba(139, 92, 246, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    transform: scale(0.88);
    will-change: transform, opacity;
  }

  /* Header style */
  .hub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 10px;
    margin-bottom: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
  }

  .header-icon {
    filter: drop-shadow(0 0 15px var(--primary-accent));
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
  }

  .header-left:hover .header-icon {
    transform: scale(1.12) rotate(15deg);
    filter: drop-shadow(0 0 25px #06b6d4) drop-shadow(0 0 12px #8b5cf6) !important;
  }

  h2.header-glow {
    font-family: 'Outfit', sans-serif !important;
    font-size: 38px !important;
    font-weight: 950 !important;
    margin: 0;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 8s linear infinite, glow-breath 5s infinite alternate ease-in-out;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
    text-transform: uppercase;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), letter-spacing 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease;
  }

  .header-left:hover h2.header-glow {
    transform: scale(1.03) translateX(4px);
    letter-spacing: 5px;
    filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.8));
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes chroma-loop { 
    from { background-position: 0% center; } 
    to { background-position: 200% center; } 
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  /* Nuke & Close Button Styles */
  .nuke-trigger-btn {
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%) !important;
    border: 1.5px solid rgba(239, 68, 68, 0.6) !important;
    color: #ffffff !important;
    cursor: pointer !important;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4) !important;
    height: 48px;
    padding: 0 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1.5px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    position: relative;
    overflow: hidden;
  }

  .nuke-trigger-btn:hover {
    filter: brightness(1.2) !important;
    box-shadow: 0 0 35px rgba(239, 68, 68, 0.7) !important;
    transform: translateY(-2px);
  }

  .close-btn {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 48px !important;
    height: 48px !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .close-btn:hover {
    transform: rotate(90deg) !important;
  }

  /* Asymmetric Column Layout */
  .hub-grid {
    display: flex;
    gap: 24px;
    flex-grow: 1;
    min-height: 0;
  }

  .hub-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 1;
    min-width: 0;
  }

  .hub-col-left > section:nth-child(1) { flex: 0.82; }
  .hub-col-left > section:nth-child(2) { flex: 1.18; }
  .hub-col-right > section { flex: 1; }

  .grid-panel {
    position: relative;
    background: rgba(8, 10, 22, 0.88);
    border-radius: 24px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    gap: 16px;
    box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
  }

  .grid-panel:hover {
    transform: translateY(-4px);
  }

  .panel-header-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 2;
  }

  .panel-icon {
    flex-shrink: 0;
  }

  .blue-icon { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8)); }
  .pink-icon { filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.8)); }
  .amber-icon { filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)); }
  .teal-icon { filter: drop-shadow(0 0 10px rgba(20, 184, 166, 0.8)); }

  .panel-title {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1.5px;
    margin: 0;
  }

  .panel-body {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    gap: 12px;
    flex-grow: 1;
    position: relative;
    z-index: 2;
  }

  .panel-blue-body {
    justify-content: flex-start !important;
    gap: 8px !important;
  }

  /* Tiny Colorful Clipboard Cursor */
  .clipboard-cursor {
    cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'><rect x='5' y='4' width='14' height='17' rx='2' fill='%231e293b' stroke='%233b82f6' stroke-width='2'/><path d='M9 2h6v4H9z' fill='%238b5cf6' stroke='%238b5cf6' stroke-linejoin='round'/><path d='M8 10h8M8 14h5' stroke='%2300ff9f' stroke-width='2' stroke-linecap='round'/></svg>") 12 12, pointer !important;
  }

  .telemetry-paragraph {
    font-size: 13px;
    line-height: 1.6;
    color: #2dd4bf;
    margin: 0 0 4px 0;
    border-left: 3.5px solid #14b8a6;
    padding-left: 12px;
    text-align: left;
    font-weight: 900;
  }

  .diagnostic-btn {
    background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%) !important;
    border: 1.5px solid #a5f3fc !important;
    color: #ffffff !important;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.75) !important;
    margin-top: auto;
  }
  .diagnostic-btn:hover {
    background: linear-gradient(135deg, #2dd4bf 0%, #34d399 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(6, 182, 212, 0.95) !important;
  }

  /* Stateful buttons */
  .stateful-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    /* Side Lighting Specular Highlight (from Nuke window style) */
    background-image: linear-gradient(115deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
  }

  .stateful-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 4px; height: 100%;
    background: rgba(255, 255, 255, 0.4);
    filter: blur(2px);
    opacity: 0.8;
    z-index: 3;
    pointer-events: none;
  }

  .stateful-btn.processing {
    border-color: rgba(255, 255, 255, 0.9) !important;
    color: #ffffff !important;
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1) !important;
    animation: btn-processing-pulse 1s infinite alternate;
  }

  .stateful-btn.processing::after {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 200%; height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0) 40%, 
      rgba(255, 255, 255, 0.2) 50%, 
      rgba(255, 255, 255, 0) 60%, 
      transparent 100%);
    animation: smooth-sweep 2s infinite linear;
    z-index: 1;
  }

  @keyframes smooth-sweep {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(50%); }
  }

  @keyframes btn-processing-pulse {
    from { filter: brightness(1); }
    to { filter: brightness(1.3); }
  }

  .stateful-btn.success {
    background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
    border-color: #34d399 !important;
    color: #ffffff !important;
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.7) !important;
    animation: success-ping 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes success-ping {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); transform: scale(1); }
    50% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .stateful-btn.failed {
    background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%) !important;
    border-color: #fca5a5 !important;
    color: #ffffff !important;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.7) !important;
    animation: fail-shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes fail-shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }

  .stateful-btn > * {
    position: relative;
    z-index: 2;
  }

  /* Scoped panel highlights and glowing borders (Brightened for high visibility) */
  .panel-blue {
    border: 1.5px solid rgba(59, 130, 246, 0.8);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
  }
  .panel-blue .panel-title { color: #51a2ff; text-shadow: 0 0 12px rgba(59, 130, 246, 0.75); }
  .panel-blue:hover {
    border-color: rgba(59, 130, 246, 1) !important;
    box-shadow: 0 0 35px rgba(59, 130, 246, 0.5) !important;
  }

  .panel-pink {
    border: 1.5px solid rgba(236, 72, 153, 0.8);
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.25);
  }
  .panel-pink .panel-title { color: #ff6ebb; text-shadow: 0 0 12px rgba(236, 72, 153, 0.75); }
  .panel-pink:hover {
    border-color: rgba(236, 72, 153, 1) !important;
    box-shadow: 0 0 35px rgba(236, 72, 153, 0.5) !important;
  }

  .panel-amber {
    border: 1.5px solid rgba(245, 158, 11, 0.8);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
  }
  .panel-amber .panel-title { color: #fba91a; text-shadow: 0 0 12px rgba(245, 158, 11, 0.75); }
  .panel-amber:hover {
    border-color: rgba(245, 158, 11, 1) !important;
    box-shadow: 0 0 35px rgba(245, 158, 11, 0.5) !important;
  }

  .panel-teal {
    border: 1.5px solid rgba(20, 184, 166, 0.8);
    box-shadow: 0 0 20px rgba(20, 184, 166, 0.25);
  }
  .panel-teal .panel-title { color: #2dd4bf; text-shadow: 0 0 12px rgba(20, 184, 166, 0.75); }
  .panel-teal:hover {
    border-color: rgba(20, 184, 166, 1) !important;
    box-shadow: 0 0 35px rgba(20, 184, 166, 0.5) !important;
  }

  /* Input and fields styling */
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .field-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
  }

  .db-input {
    height: 54px !important;
    font-size: 15px !important;
    font-weight: 900 !important;
  }

  .db-action-btn {
    margin-top: auto !important;
  }

  .tactical-input {
    width: 100%;
    height: 40px;
    padding: 0 16px;
    background: rgba(5, 6, 12, 0.95);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    border-radius: 8px;
    color: #ffffff;
    font-size: 12px;
    outline: none;
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.8), 0 0 10px rgba(139, 92, 246, 0.1);
    box-sizing: border-box;
  }

  .copied-text {
    color: #10b981 !important;
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.85) !important;
    background: rgba(16, 185, 129, 0.15) !important;
    border-color: rgba(16, 185, 129, 0.6) !important;
    text-align: center;
    font-weight: 900;
  }

  /* Button matrix styling */
  .panel-btn {
    height: 48px;
    border-radius: 8px;
    border: none;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    position: relative;
    overflow: hidden;
  }

  .blue-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
    border: 1.5px solid #93c5fd !important;
    color: #ffffff !important;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.7) !important;
    width: 100%;
  }
  .blue-btn:hover {
    background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.95) !important;
  }

  .flex-col-btn {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    justify-content: center;
  }

  .pink-btn {
    background: linear-gradient(135deg, #ec4899 0%, #be185d 100%) !important;
    border: 1.5px solid #fbcfe8 !important;
    color: #ffffff !important;
    box-shadow: 0 0 25px rgba(236, 72, 153, 0.8) !important;
  }
  .pink-btn:hover {
    background: linear-gradient(135deg, #f472b6 0%, #db2777 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 35px rgba(236, 72, 153, 0.95) !important;
  }

  .json-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
    border: 1.5px solid #7dd3fc !important;
    color: #ffffff !important;
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.8) !important;
  }
  .json-btn:hover {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 35px rgba(56, 189, 248, 0.95) !important;
  }

  .teal-btn {
    background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%) !important;
    border: 1.5px solid #99f6e4 !important;
    color: #ffffff !important;
    box-shadow: 0 0 20px rgba(20, 184, 166, 0.75) !important;
    width: 100%;
  }
  .teal-btn:hover {
    background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(20, 184, 166, 0.95) !important;
  }

  .overwrite-btn {
    background: linear-gradient(135deg, #f87171 0%, #dc2626 100%) !important;
    border: 1.5px solid #fee2e2 !important;
    color: #ffffff !important;
    width: 100%;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.8) !important;
  }
  .overwrite-btn:hover {
    background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.95) !important;
  }

  /* Volumetric diagonal shine slash hover effect */
  .shine-slash-effect::after {
    content: '';
    position: absolute;
    top: 0; left: -150%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
    transform: skewX(-20deg);
    transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    z-index: 1;
  }
  .shine-slash-effect:hover::after {
    left: 150%;
  }

  /* Metrics rows and split columns */
  .metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .metric-row-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .metric-row, .metric-half {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .metric-row:hover, .metric-half:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }

  /* Diagnostic Sync Animations - Text ONLY */
  .metrics-grid.diagnosing .m-val {
    animation: data-cipher 0.15s infinite;
    color: #00ff9f !important;
    text-shadow: 0 0 15px rgba(0, 255, 159, 0.8);
  }

  .metrics-grid.diagnosing .m-label {
    animation: label-flicker 0.4s infinite alternate;
    color: #ffffff !important;
    opacity: 0.8;
  }

  @keyframes data-cipher {
    0% { opacity: 1; transform: translateY(0) translateX(0); filter: blur(0px); }
    25% { opacity: 0.6; transform: translateY(-1px) translateX(1px); filter: blur(1px); }
    50% { opacity: 1; transform: translateY(1px) translateX(-1px) scale(1.02); filter: blur(0px) hue-rotate(45deg); }
    75% { opacity: 0.8; transform: translateY(0) translateX(1px); filter: blur(0.5px); }
    100% { opacity: 1; transform: translateY(0) translateX(0); filter: blur(0px); }
  }

  @keyframes label-flicker {
    0% { text-shadow: 0 0 4px rgba(255,255,255,0.4); opacity: 0.7; }
    100% { text-shadow: 0 0 12px rgba(255,255,255,1); opacity: 1; }
  }

  .m-label {
    font-weight: 950 !important;
    font-size: 12px;
    letter-spacing: 1.5px;
  }

  .m-val {
    font-weight: 950 !important;
    font-size: 17px;
  }

  .glow-cyan {
    text-shadow: 0 0 12px rgba(6, 182, 212, 0.9);
    font-weight: 950 !important;
  }

  .loading-spin-white {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s infinite linear;
  }

  .font-outfit { font-family: 'Outfit', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Decorative elements matching forge window style */
  .wing {
    position: absolute;
    width: 100px;
    height: 100px;
    border: 5px solid rgba(139, 92, 246, 0.65);
    border-radius: 32px;
    opacity: 0.25;
    pointer-events: none;
    transition: 1s;
    z-index: 2;
  }
  .tl { top: -30px; left: -30px; border-right: 0; border-bottom: 0; }
  .tr { top: -30px; right: -30px; border-left: 0; border-bottom: 0; }
  .bl { bottom: -30px; left: -30px; border-right: 0; border-top: 0; }
  .br { bottom: -30px; right: -30px; border-left: 0; border-top: 0; }</style>
