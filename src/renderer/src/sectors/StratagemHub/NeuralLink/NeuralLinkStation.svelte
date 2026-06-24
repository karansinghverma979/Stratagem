<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { AudioEngine } from '../../../core/audio-engine.js';
  import { triggerShield } from '../../../core/shield-store.js';
  import { archivedTasks, syncAntaryami, addNotification } from '../../../core/store.js';

  let { onclose, mode = 'MERGE' } = $props();

  const playAudio = (track: string) => {
    AudioEngine.play(track);
  };

  // Svelte 5 reactive array
  let steps = $state([
    { text: 'PROTOCOL ENGAGED', status: 'success', type: 'mode', reason: 'STATION MODE INITIALIZED' },
    { text: 'Awaiting user source selection...', status: 'idle', type: 'folder', reason: '' },
    { text: 'Validating source schema integrity...', status: 'idle', type: 'shield', reason: '' },
    { text: 'Analyzing database payload...', status: 'idle', type: 'database', reason: '' },
    { text: 'Synchronizing neural path registries...', status: 'idle', type: 'sync', reason: '' },
    { text: 'Neural Integration Successful.', status: 'idle', type: 'rocket', reason: '' },
  ]);

  let activeStepIndex = $state(-1);
  let importCompleted = $state(false);
  let importSuccess = $state(false);
  let hasFailed = $state(false);
  let isStopped = $state(false);
  let selectedFileName = $state('');
  let selectedFilePath = $state('');
  let showConfirm = $state(false);
  let isImporting = $state(false);

  let previousCount = $state(0);
  let incomingCount = $state(0); 
  let breakdown = $state<Record<string, number>>({});
  let reconstitutedCount = $derived(mode === 'OVERWRITE' ? incomingCount : previousCount + incomingCount);

  // Animated numbers
  let displayPrev = $state(0);
  let displayInc = $state(0);
  let displayTotal = $state(0);

  let listViewport: HTMLElement | null = $state(null);

  // Auto-scroll logic
  $effect(() => {
    if (steps.length && listViewport) {
      listViewport.scrollTop = listViewport.scrollHeight;
    }
  });

  const animateValue = (start: number, end: number, duration: number, setter: (v: number) => void) => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setter(Math.floor(progress * (end - start) + start));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };

  const updateStep = (index: number, status: string, text?: string, reason: string = '') => {
    if (steps[index]) {
      steps[index].status = status;
      if (text) steps[index].text = text;
      steps[index].reason = reason;
      activeStepIndex = index;
    }
  };

  const initiateScan = async () => {
    try {
      playAudio('ui-click');
      updateStep(1, 'waiting', 'Awaiting secure source selection...');
      
      const response = await window.stratagemAPI.validateDatabaseSource();
      
      if (response && response.success) {
        selectedFileName = response.filePath.split(/[\\\/]/).pop();
        selectedFilePath = response.filePath;
        incomingCount = response.missionCount || 0;
        breakdown = response.breakdown || {};
        
        updateStep(1, 'success', `Source Identified: ${selectedFileName}`);
        updateStep(2, 'pending');
        await new Promise(r => setTimeout(r, 800));
        updateStep(2, 'success');
        updateStep(3, 'pending');
        await new Promise(r => setTimeout(r, 1000));
        updateStep(3, 'success', `Payload Analyzed: ${incomingCount} Records`);
        playAudio('success');
        
        showConfirm = true;
      } else if (response && response.message === 'ABORTED') {
        updateStep(1, 'failed', undefined, 'USER ABORTED SOURCE SELECTION');
        addNotification('SOURCE SELECTION ABORTED', 'Operation alignment canceled by user.', 'info');
        hasFailed = true;
        isStopped = true;
      } else {
        updateStep(1, 'failed', undefined, `VALIDATION FAILED: ${response.error}`);
        playAudio('fail');
        addNotification('SCHEMA INTEGRITY FAILURE', `Integrity check failed: ${response.error || 'Unknown schema issue'}`, 'error');
        hasFailed = true;
        isStopped = true;
      }
    } catch (e: any) {
      updateStep(activeStepIndex, 'failed', undefined, `EXCEPTION: ${e.message}`);
      playAudio('fail');
      addNotification('SCAN BRIDGE FAULT', `Operation exception: ${e.message}`, 'error');
      hasFailed = true;
      isStopped = true;
    }
  };

  const executeIntegration = async () => {
    try {
      isImporting = true;
      showConfirm = false;
      playAudio('ui-click');
      
      updateStep(4, 'pending');
      const response = await window.stratagemAPI.importDatabaseFromPath(selectedFilePath, mode);
      
      if (response && response.success) {
        await syncAntaryami();
        await new Promise(r => setTimeout(r, 1500));
        updateStep(4, 'success');
        updateStep(5, 'success');
        addNotification(
          'INTEGRATION SUCCESSFUL',
          `Neural link integrated successfully. Mode: ${mode}, Imported: ${incomingCount} records.`,
          'success'
        );
        
        importSuccess = true;
        importCompleted = true;
        
        animateValue(0, previousCount, 1000, v => displayPrev = v);
        animateValue(0, incomingCount, 1000, v => displayInc = v);
        animateValue(0, reconstitutedCount, 1200, v => displayTotal = v);

        playAudio('success');
        triggerShield('NEURAL CORE RECONSTITUTED', 'SUCCESS', 4000);
      } else {
        updateStep(4, 'failed', undefined, `INTEGRATION ERROR: ${response.error}`);
        playAudio('fail');
        addNotification('INTEGRATION FAILED', `Database synchronization failed: ${response.error}`, 'error');
        hasFailed = true;
        isStopped = true;
      }
    } catch (e: any) {
      updateStep(4, 'failed', undefined, `CRITICAL EXCEPTION: ${e.message}`);
      playAudio('fail');
      addNotification('INTEGRATION CRITICAL FAILURE', `Bridge exception: ${e.message}`, 'error');
      hasFailed = true;
      isStopped = true;
    } finally {
      isImporting = false;
    }
  };

  const abortSync = () => {
    playAudio('ui-click');
    showConfirm = false;
    hasFailed = true;
    isStopped = true;
    updateStep(activeStepIndex, 'failed', undefined, 'SYNC ABORTED BY OPERATOR');
  };

  onMount(() => {
    steps[0].text = `${mode} PROTOCOL ENGAGED`;
    steps[4].text = mode === 'OVERWRITE' ? 'Executing core overwrite matrix...' : 'Synchronizing neural path registries...';

    const unsubArchive = archivedTasks.subscribe(tasks => {
      previousCount = tasks.length;
      displayPrev = tasks.length;
    });

    const bootTimer = setTimeout(() => {
      initiateScan();
    }, 1000);

    return () => {
      unsubArchive();
      clearTimeout(bootTimer);
    };
  });
</script>

<div class="neural-overlay" transition:fade={{ duration: 300, easing: quintOut }}>
  <div class="neural-ambient-glow"></div>

  <div class="neural-container" in:scale={{ duration: 450, start: 0.95, opacity: 0, easing: quintOut }} out:scale={{ duration: 300, start: 0.97, opacity: 0, easing: quintOut }}>
    
    <header class="header-section">
      <div class="header-left-block">
        <div class="main-icon-container" 
          class:state-success={importSuccess} 
          class:state-failed={hasFailed || isStopped}
          class:state-active={!importCompleted && !hasFailed && !isStopped}
        >
          <svg class="neural-core-svg" width="52" height="52" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="core-outer" cx="12" cy="12" r="11" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 2"/>
            <path class="core-hex" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <circle class="core-inner" cx="12" cy="12" r="4" fill="currentColor"/>
            <g class="core-rotator">
              <path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </g>
          </svg>
          <div class="icon-aura"></div>
        </div>
        <div class="title-block">
          <span class="eyebrow-text font-outfit">SYSTEM PERSISTENCE LAYER</span>
          <h1 class="main-title font-outfit title-anim">NEURAL LINK STATION</h1>
        </div>
      </div>
      
      <button 
        class="kinetic-red-btn font-outfit" 
        class:active={isStopped || hasFailed}
        disabled={!isStopped && !hasFailed}
        onclick={onclose}
      >
        <div class="btn-lighting"></div>
        {#if isStopped || hasFailed}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          EXIT STATION
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          ABORT PROTOCOL
        {/if}
      </button>
    </header>

    <div class="separator-line"></div>

    <div class="station-layout">
      <main class="status-list-viewport" bind:this={listViewport}>
        <div class="status-list">
          {#each steps as step, i}
            {#if step.status !== 'idle'}
              <div 
                class="status-row" 
                class:row-pending={step.status === 'pending'}
                class:row-waiting={step.status === 'waiting'}
                class:row-success={step.status === 'success'}
                class:row-failed={step.status === 'failed'}
                class:mode-active={step.type === 'mode'}
                transition:fly={{ y: 20, duration: 400 }}
              >
                <div class="row-glow"></div>
                <div class="left-accent"></div>
                <div class="row-content">
                  <div class="row-icon">
                    {#if step.type === 'mode'}<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    {:else if step.type === 'chip'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>
                    {:else if step.type === 'folder'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    {:else if step.type === 'shield'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    {:else if step.type === 'database'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                    {:else if step.type === 'sync'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:active-spin={step.status === 'pending'}><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                    {:else if step.type === 'rocket'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 22 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/></svg>
                    {/if}
                  </div>
                  <div class="row-text-block">
                    <span class="step-text font-outfit final-vibrant-text">{step.text}</span>
                    {#if step.reason}<span class="step-reason font-mono">{step.reason}</span>{/if}
                  </div>
                </div>
                <div class="row-status">
                  {#if step.status === 'success'}<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
                  {:else if step.status === 'failed'}<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {:else}<div class="mini-loader" class:waiting={step.status === 'waiting'} style="width: 18px; height: 18px;"></div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </main>

      <!-- POINT 4: THE ULTIMATE SHINY CRYSTAL POPUP - RE-OVERHAUL -->
      {#if showConfirm}
        <div class="ultimate-modal-layer" transition:fade={{ duration: 250, easing: quintOut }}>
          <!-- background blurred area increased by 40% over last (Approx 450px Gaussian blur) -->
          <div class="digital-void-backdrop-max"></div>
          
          <div class="crystal-command-dialog-wide" in:scale={{ duration: 450, start: 0.93, opacity: 0, easing: quintOut }} out:scale={{ duration: 300, start: 0.95, opacity: 0, easing: quintOut }}>
            <div class="crystal-glass-overlay"></div>
            <div class="crystal-neon-stroke"></div>
            
            <header class="crystal-header">
              <div class="crystal-icon-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M12 2s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M12 8v4M12 16h.01" stroke-width="3"/>
                </svg>
                <div class="pulse-aura"></div>
              </div>
              <div class="crystal-titles">
                <span class="c-eyebrow-glow font-outfit">INTELLIGENCE SYNC AUTHORIZATION</span>
                <!-- One better word: SYNCHRONIZE -->
                <h2 class="c-title-peak font-outfit">SYNCHRONIZE</h2>
              </div>
            </header>

            <div class="crystal-grid-peak">
              <!-- Inline format: Icon | Count | Label -->
              <div class="c-peak-row theme-p" transition:fly={{ x: -20, delay: 100 }}>
                <div class="p-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
                <span class="p-count font-mono">{breakdown['EXECUTION'] || 0}</span>
                <span class="p-label">EXECUTION</span>
                <div class="p-line"></div>
              </div>
              <div class="c-peak-row theme-c" transition:fly={{ x: 20, delay: 200 }}>
                <div class="p-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg></div>
                <span class="p-count font-mono">{breakdown['BREACH'] || 0}</span>
                <span class="p-label">BREACH</span>
                <div class="p-line"></div>
              </div>
              <div class="c-peak-row theme-v" transition:fly={{ x: -20, delay: 300 }}>
                <div class="p-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                <span class="p-count font-mono">{(breakdown['RAW_INTEL'] || 0) + (breakdown['SYNTHESIZING'] || 0) + (breakdown['WEAPONIZED'] || 0)}</span>
                <span class="p-label">ARSENAL</span>
                <div class="p-line"></div>
              </div>
              <div class="c-peak-row theme-g" transition:fly={{ x: 20, delay: 400 }}>
                <div class="p-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                <span class="p-count font-mono">{(breakdown['VICTORY'] || 0) + (breakdown['ABORTED'] || 0)}</span>
                <span class="p-label">ARCHIVE</span>
                <div class="p-line"></div>
              </div>
            </div>

            <div class="crystal-actions-row">
              <button class="c-btn-abort-nuke font-outfit" onclick={abortSync}>
                <div class="btn-slash-shine"></div>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                ABORT
              </button>
              <button class="c-btn-authorize-peak font-outfit" onclick={executeIntegration}>
                <div class="btn-slash-shine"></div>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                AUTHORIZE
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="separator-line"></div>

    <footer class="station-footer">
      <div class="reconstitute-readout">
        <div class="r-item">
          <span class="r-label">LOCAL ASSETS</span>
          <span class="r-val font-mono color-white">{displayPrev}</span>
        </div>
        <div class="r-divider">
          <div class="r-icon-box">
            {#if mode === 'MERGE'}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {:else}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
            {/if}
          </div>
        </div>
        <div class="r-item">
          <span class="r-label">INCOMING</span>
          <span class="r-val font-mono color-cyan">{displayInc}</span>
        </div>
        <div class="r-total-box">
          <span class="r-label">TOTAL MATRIX</span>
          <span class="r-val-glow font-mono color-violet">{displayTotal}</span>
        </div>
      </div>

      <button 
        class="reboot-btn-blue font-outfit" 
        disabled={!importSuccess} 
        onclick={() => { playAudio('success'); window.location.reload(); }}
      >
        <div class="btn-cyan-glow"></div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/>
        </svg>
        SYSTEM REBOOT
      </button>
    </footer>

  </div>
</div>

<style>
  .neural-overlay {
    position: fixed;
    top: 80px; left: 0; width: 100vw; height: calc(100vh - 80px);
    background: rgba(0, 0, 0, 0.98);
    display: flex; align-items: center; justify-content: center;
    z-index: 12000;
    will-change: opacity;
  }

  .neural-ambient-glow {
    position: absolute;
    width: 100%; height: 100%;
    background: 
      radial-gradient(circle at 10% 10%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
      radial-gradient(circle at 90% 90%, rgba(6, 182, 212, 0.12) 0%, transparent 40%),
      radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 80%);
    pointer-events: none;
  }

  .neural-container {
    width: 1056px;
    height: 788px;
    background: linear-gradient(165deg, #080911 0%, #010103 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.4);
    border-radius: 44px;
    padding: 24px 56px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 150px rgba(0, 0, 0, 0.9);
    position: relative;
    overflow: hidden;
    transform: scale(0.88);
    will-change: transform, opacity;
  }

  .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 4px; }
  .header-left-block { display: flex; align-items: center; gap: 32px; }
  
  .main-icon-container {
    width: 80px; height: 80px;
    background: rgba(255, 255, 255, 0.02);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    position: relative;
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .icon-aura {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 20px; filter: blur(25px); opacity: 0;
    transition: all 0.8s ease;
  }

  .state-active { color: #8b5cf6; border-color: rgba(139, 92, 246, 0.4); }
  .state-active .icon-aura { background: rgba(139, 92, 246, 0.2); opacity: 0.5; }
  .state-success { color: #06b6d4; border-color: rgba(6, 182, 212, 0.5); }
  .state-success .icon-aura { background: rgba(6, 182, 212, 0.25); opacity: 0.6; }
  .state-failed { color: #ff0000; border-color: rgba(255, 0, 0, 0.5); }
  .state-failed .icon-aura { background: rgba(255, 0, 0, 0.25); opacity: 0.6; }

  .neural-core-svg { filter: drop-shadow(0 0 12px currentColor); }
  .core-rotator { animation: spin-slow 15s linear infinite; transform-origin: center; }
  @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .title-block { display: flex; flex-direction: column; }
  .eyebrow-text { font-size: 10px; font-weight: 950; color: #8b5cf6; letter-spacing: 5px; margin-bottom: 4px; text-transform: uppercase; }
  .main-title { font-size: 34px; font-weight: 950; color: #fff; margin: 0; letter-spacing: 1.5px; }
  .title-anim { background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shine 10s linear infinite; }
  @keyframes shine { to { background-position: 200% center; } }

  .kinetic-red-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 220px; height: 56px; border-radius: 12px;
    border: 1.5px solid rgba(239, 68, 68, 0.15);
    font-size: 13px; font-weight: 950; letter-spacing: 1px;
    background: rgba(239, 68, 68, 0.04);
    color: rgba(239, 68, 68, 0.3);
    cursor: not-allowed; position: relative; overflow: hidden;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .kinetic-red-btn.active {
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
    border-color: #ef4444; color: #fff; cursor: pointer;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
  }

  .kinetic-red-btn.active:hover {
    background: #ff0000; border-color: #ff0000;
    box-shadow: 0 0 50px rgba(255, 0, 0, 0.8);
    transform: translateY(-4px) scale(1.04);
  }

  .btn-lighting {
    position: absolute; top: 0; left: 0; width: 4px; height: 100%;
    background: rgba(255, 255, 255, 0.4); filter: blur(2px); opacity: 0;
  }
  .active .btn-lighting { opacity: 1; }

  .station-layout { flex-grow: 1; min-height: 0; margin-bottom: 20px; display: flex; flex-direction: column; position: relative; }
  
  .status-list-viewport { flex-grow: 1; overflow-y: auto; padding-right: 12px; scroll-behavior: smooth; }
  .status-list-viewport::-webkit-scrollbar { width: 5px; }
  .status-list-viewport::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.25); border-radius: 10px; }

  .status-list { display: flex; flex-direction: column; gap: 10px; }
  
  .status-row {
    background: rgba(255, 255, 255, 0.012); border: 1.5px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px; padding: 18px 32px; 
    display: flex; align-items: center; justify-content: space-between;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden;
  }

  .row-glow {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0.02), transparent);
    opacity: 0; transition: 0.4s;
  }
  .status-row:hover .row-glow { opacity: 1; }

  .mode-active {
    background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.35);
    box-shadow: inset 0 0 25px rgba(139, 92, 246, 0.05);
  }
  .mode-active .step-text { color: #8b5cf6; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5)); }

  .row-pending { background: rgba(139, 92, 246, 0.06); border-color: rgba(139, 92, 246, 0.25); }
  .row-waiting { background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.25); }
  .row-success { background: rgba(6, 182, 212, 0.03); border-color: rgba(6, 182, 212, 0.15); }
  .row-failed { background: rgba(255, 0, 0, 0.06); border-color: rgba(255, 0, 0, 0.3); }

  .status-row:hover { transform: translateX(12px); border-color: rgba(255, 255, 255, 0.1); }

  .left-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #222; transition: all 0.5s; }
  .row-pending .left-accent { background: #8b5cf6; box-shadow: 0 0 20px #8b5cf6; }
  .row-waiting .left-accent { background: #f59e0b; box-shadow: 0 0 20px #f59e0b; }
  .row-success .left-accent { background: #06b6d4; box-shadow: 0 0 20px #06b6d4; }
  .row-failed .left-accent { background: #ff0000; box-shadow: 0 0 20px #ff0000; }

  .row-content { display: flex; align-items: center; gap: 24px; flex: 1; }
  .row-icon { color: #8b5cf6; opacity: 0.9; }
  .row-success .row-icon { color: #06b6d4; }
  .row-failed .row-icon { color: #ff0000; }

  .row-text-block { display: flex; flex-direction: column; gap: 1px; }
  
  .final-vibrant-text {
    font-size: 17px; font-weight: 950; letter-spacing: 0.5px;
    background: linear-gradient(90deg, #e2e8f0, #8b5cf6, #06b6d4, #e2e8f0);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: vibrant-scroll 8s linear infinite;
  }
  @keyframes vibrant-scroll { to { background-position: 300% center; } }

  .step-reason { font-size: 9px; color: #ef4444; font-weight: 950; text-transform: uppercase; letter-spacing: 1px; }

  .mini-loader { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .mini-loader.waiting { border-top-color: #f59e0b; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .row-status { display: flex; align-items: center; justify-content: center; width: 40px; }
  .row-success .row-status { color: #06b6d4; filter: drop-shadow(0 0 10px #06b6d4); }
  .row-failed .row-status { color: #ff0000; filter: drop-shadow(0 0 10px #ff0000); }

  /* POINT 4: THE ULTIMATE PEAK POPUP DESIGN */
  .ultimate-modal-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    z-index: 500;
  }

  /* Full screen blur area increase by 50% (Approx 675px Gaussian blur) */
  .digital-void-backdrop-max {
    position: absolute; top: -200px; left: -200px; right: -200px; bottom: -200px;
    background: radial-gradient(circle at center, rgba(139, 92, 246, 0.5) 0%, rgba(0, 0, 0, 1) 100%);
    backdrop-filter: blur(675px) saturate(2.5);
    z-index: -1;
  }

  .crystal-command-dialog-wide {
    width: 580px; 
    background: rgba(10, 11, 25, 0.96);
    border: 1.5px solid rgba(139, 92, 246, 0.8);
    border-radius: 36px; padding: 48px;
    box-shadow: 0 100px 200px rgba(0, 0, 0, 1), 0 0 50px rgba(139, 92, 246, 0.2);
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; gap: 40px;
    animation: crystal-breathing 6s infinite alternate ease-in-out;
  }
  @keyframes crystal-breathing { from { transform: scale(1); } to { transform: scale(1.03); } }

  .crystal-glass-overlay {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.04) 100%);
    pointer-events: none; z-index: 2;
  }

  .crystal-neon-stroke {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    border: 2px solid #8b5cf6; border-radius: 36px; opacity: 0.5;
    animation: stroke-glow 2s infinite alternate;
  }
  @keyframes stroke-glow { from { opacity: 0.3; filter: blur(2px); } to { opacity: 0.8; filter: blur(10px); } }

  .crystal-header { display: flex; align-items: center; gap: 24px; position: relative; z-index: 5; }
  .crystal-icon-pulse {
    width: 72px; height: 72px; background: rgba(139, 92, 246, 0.2);
    border: 2px solid #8b5cf6; border-radius: 22px;
    display: flex; align-items: center; justify-content: center;
    color: #8b5cf6; position: relative;
    box-shadow: 0 0 25px #8b5cf6;
  }
  .pulse-aura { position: absolute; width: 100%; height: 100%; border: 2px solid #8b5cf6; border-radius: 22px; animation: aura-ring 3s infinite; }
  @keyframes aura-ring { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }

  .crystal-titles { display: flex; flex-direction: column; }
  .c-eyebrow-glow { font-size: 11px; font-weight: 950; color: #8b5cf6; letter-spacing: 5px; text-shadow: 0 0 10px #8b5cf6; }
  
  /* Point 1 & 4: Peaked Synchronize title with animations and gradient */
  .c-title-peak { 
    font-size: 42px; font-weight: 950; margin: 0; letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: vibrant-peak-scroll 6s linear infinite, peak-flicker 4s infinite alternate;
  }
  @keyframes vibrant-peak-scroll { to { background-position: 300% center; } }
  @keyframes peak-flicker { 0% { filter: brightness(1); opacity: 1; } 50% { filter: brightness(1.2); opacity: 0.95; } 100% { filter: brightness(1.1); opacity: 1; } }

  /* Point 3 & 4: Inline grid with massive same-size font */
  .crystal-grid-peak { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 5; }
  .c-peak-row {
    background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px; padding: 16px 24px; display: flex; align-items: center;
    gap: 20px; transition: all 0.4s; position: relative;
  }
  .c-peak-row:hover { transform: translateX(10px) scale(1.02); border-color: rgba(255,255,255,0.15); }

  .p-icon { opacity: 1; filter: drop-shadow(0 0 8px currentColor); animation: p-icon-vibe 3s infinite alternate; }
  @keyframes p-icon-vibe { from { transform: scale(1); } to { transform: scale(1.1); } }

  /* Same massive font size for counts and labels with gradient effect */
  .p-count, .p-label { font-size: 24px; font-weight: 950; line-height: 1; }
  .p-label { opacity: 0.8; letter-spacing: 1.5px; }

  .theme-p { color: #ff4b4b; }
  .theme-c { color: #00f2ff; }
  .theme-v { color: #ff00ff; }
  .theme-g { color: #00ffa3; }

  /* Gradient effects for peak rows */
  .theme-p .p-count { background: linear-gradient(to right, #fff, #ff4b4b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .theme-c .p-count { background: linear-gradient(to right, #fff, #00f2ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .theme-v .p-count { background: linear-gradient(to right, #fff, #ff00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .theme-g .p-count { background: linear-gradient(to right, #fff, #00ffa3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

  .p-line { position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: currentColor; transition: width 0.4s; opacity: 0.6; }
  .c-peak-row:hover .p-line { width: 100%; }

  .crystal-actions-row { display: flex; gap: 20px; position: relative; z-index: 5; margin-top: 12px; }
  
  /* Point 2: Abort button matches Nuke Storage button design */
  .c-btn-abort-nuke {
    flex: 1; height: 68px; border-radius: 18px;
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
    color: #ffffff; font-size: 15px; font-weight: 950; letter-spacing: 3px;
    cursor: pointer; transition: all 0.4s; display: flex; align-items: center; justify-content: center;
    border: 2px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
    position: relative; overflow: hidden;
  }
  .c-btn-abort-nuke:hover { transform: translateY(-5px); box-shadow: 0 20px 50px rgba(239, 68, 68, 0.7); filter: brightness(1.2); }

  .c-btn-authorize-peak {
    flex: 1; height: 68px; background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%);
    border: 2px solid rgba(255, 255, 255, 0.25); border-radius: 18px;
    color: #fff; font-size: 15px; font-weight: 950; letter-spacing: 3px;
    cursor: pointer; position: relative; overflow: hidden;
    box-shadow: 0 15px 35px rgba(6, 182, 212, 0.4); transition: all 0.4s;
    display: flex; align-items: center; justify-content: center;
  }
  .c-btn-authorize-peak:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 25px 60px rgba(6, 182, 212, 0.7); filter: brightness(1.2); }
  
  .btn-slash-shine {
    position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%);
    animation: slash-sweep 2.5s infinite;
  }
  @keyframes slash-sweep { from { left: -100%; } to { left: 100%; } }

  .separator-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent); margin-bottom: 24px; }

  .station-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 2px; }
  
  .reconstitute-readout { display: flex; align-items: center; gap: 48px; }
  .r-item { display: flex; flex-direction: column; gap: 8px; }
  .r-label { font-size: 11px; font-weight: 950; color: #64748b; letter-spacing: 1.5px; }
  .r-val { font-size: 38px; font-weight: 950; line-height: 1; }
  
  .r-divider { display: flex; align-items: center; justify-content: center; width: 72px; }
  .r-icon-box { 
    width: 56px; height: 56px; background: rgba(139, 92, 246, 0.08); 
    border: 2.5px solid rgba(139, 92, 246, 0.35); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #8b5cf6; filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4));
    transition: all 0.6s;
  }
  
  .r-total-box { display: flex; flex-direction: column; gap: 8px; padding-left: 48px; border-left: 2px solid rgba(255,255,255,0.1); }
  .r-val-glow { font-size: 50px; font-weight: 950; line-height: 1; text-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }

  .color-white { color: #fff; }
  .color-cyan { color: #06b6d4; text-shadow: 0 0 15px rgba(6, 182, 212, 0.3); }
  .color-violet { color: #8b5cf6; text-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }

  .reboot-btn-blue {
    width: 240px; height: 64px; border-radius: 100px;
    background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%);
    color: #fff; font-size: 15px; font-weight: 950; letter-spacing: 2px; border: none; cursor: pointer;
    box-shadow: 0 15px 40px rgba(6, 182, 212, 0.3); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
  }

  .reboot-btn-blue:disabled { opacity: 0.12; cursor: not-allowed; box-shadow: none; filter: grayscale(1); }
  
  .reboot-btn-blue:hover:not(:disabled) { 
    background: #ff0000;
    box-shadow: 0 0 70px rgba(255, 0, 0, 1);
    transform: translateY(-8px) scale(1.06);
  }

  .btn-cyan-glow { position: absolute; top: 0; left: 0; width: 8px; height: 100%; background: rgba(255, 255, 255, 0.6); filter: blur(4px); opacity: 0.7; }

  .font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  .font-outfit { font-family: 'Outfit', sans-serif; }
</style>
