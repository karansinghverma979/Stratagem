<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { AudioEngine } from '../../../core/audio-engine.js';
  import { triggerShield } from '../../../core/shield-store.js';
  import { executionTasks, breachedTasks, archivedTasks, arsenalTasks, syncAntaryami, purgeDatabase } from '../../../core/store.js';

  let { onclose, currentDbSize = '0.00 KB' } = $props();

  let timer = $state(60);
  let timerId: any = null;

  // Real-Time Snapshot State
  let activeCount = $state(0);
  let breachCount = $state(0);
  let archiveCount = $state(0);

  // Live Purge Telemetry State
  let sectorsPurged = $state(0);
  let dataSizeErased = $state(0.00);
  let purgeStatus = $state('WAITING FOR COMMAND AUTHORITY');
  let purgeStarted = $state(false);
  let purgeComplete = $state(false);

  // Computed Values
  let totalCount = $derived(activeCount + breachCount + archiveCount);
  let dbSizeString = $derived(String(currentDbSize || '0.00 KB'));
  let dbSizeNum = $derived(parseFloat(dbSizeString.split(' ')[0]) || 0);
  let dbSizeUnit = $derived(dbSizeString.split(' ')[1] || 'KB');
  let totalPayload = $derived(dbSizeNum);
  const calcDataErased = (count) => totalCount > 0 ? (count / totalCount) * totalPayload : 0;
  
  // Precision Synced Offset for Circle (440 is the path length)
  let offset = $derived(440 - (timer / 60) * 440);

  const playAudio = (track: string) => {
    AudioEngine.play(track);
  };

  const handlePurge = async () => {
    try {
      playAudio('critical-warning');
      purgeStarted = true;
      triggerShield('CRITICAL PROTOCOL: DEEP SYSTEM PURGE ENGAGED', 'CRITICAL', 5000);

      // Erasure staggered sequence
      purgeStatus = 'STATUS: ERASING ACTIVE SECTORS';
      await new Promise(r => setTimeout(r, 800));
      sectorsPurged = activeCount;
      dataSizeErased = calcDataErased(activeCount);

      purgeStatus = 'STATUS: ERASING BREACH ZONE';
      await new Promise(r => setTimeout(r, 800));
      sectorsPurged = activeCount + breachCount;
      dataSizeErased = calcDataErased(activeCount + breachCount);

      purgeStatus = 'STATUS: DECRYPTING ARCHIVE VAULT';
      await new Promise(r => setTimeout(r, 800));
      purgeStatus = 'STATUS: PURGING SYSTEM HISTORY';
      await new Promise(r => setTimeout(r, 800));
      sectorsPurged = totalCount;
      dataSizeErased = totalPayload;

      purgeStatus = 'STATUS: CLEARING SQLITE MEMORY PERSISTENCE';
      await new Promise(r => setTimeout(r, 800));

      // Trigger SQLite Purge
      await purgeDatabase();

      // Conclude sequence
      purgeStatus = 'STATUS: DEEP SYSTEM PURGE COMPLETE';
      
      // Reset live snapshot data to reflect successful erasure
      activeCount = 0;
      breachCount = 0;
      archiveCount = 0;
      
      purgeComplete = true;
      playAudio('success');
      triggerShield('TACTICAL DATABASE PURGED SUCCESSFULLY', 'SUCCESS', 4000);

    } catch (e: any) {
      purgeStatus = `STATUS: PURGE ERROR - ${e.message || 'FAILED'}`;
      playAudio('fail');
      triggerShield(`CRITICAL ERASURE FAILED: ${e.message}`, 'CRITICAL', 4000);
    }
  };

  const handleReboot = () => {
    playAudio('success');
    window.location.reload();
  };

  onMount(async () => {
    playAudio('warning');
    // Fetch fresh database states
    await syncAntaryami();

    // Subscribe to counts
    let execLength = 0;
    let arsenalLength = 0;
    const unsubExec = executionTasks.subscribe(tasks => {
      execLength = tasks.length;
      activeCount = execLength + arsenalLength;
    });
    const unsubArsenal = arsenalTasks.subscribe(tasks => {
      arsenalLength = tasks.length;
      activeCount = execLength + arsenalLength;
    });
    const unsubBreach = breachedTasks.subscribe(tasks => breachCount = tasks.length);
    const unsubArchive = archivedTasks.subscribe(tasks => archiveCount = tasks.length);

    // Safeguard Countdown Timer
    timerId = setInterval(() => {
      if (timer > 0) {
        timer -= 1;
        playAudio('tick');
        if (timer === 10) {
          playAudio('critical-warning');
        }
      } else {
        clearInterval(timerId);
      }
    }, 1000);

    return () => {
      unsubExec();
      unsubArsenal();
      unsubBreach();
      unsubArchive();
      if (timerId) clearInterval(timerId);
    };
  });

  onDestroy(() => {
    if (timerId) clearInterval(timerId);
  });
</script>

<div class="nuke-overlay" transition:fade={{ duration: 250, easing: quintOut }}>
  <!-- Maximum display surrounding blur layer -->
  <div class="nuke-ambient-red-glow"></div>
  
  <!-- Modal Panel -->
  <div 
    class="nuke-panel" 
    class:dump-active={purgeStarted && !purgeComplete}
    in:scale={{ duration: 450, start: 0.94, opacity: 0, easing: quintOut }}
    out:scale={{ duration: 300, start: 0.96, opacity: 0, easing: quintOut }}
  >
    <header class="nuke-header">
      <div class="header-left">
        <svg class="header-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--critical-alert)" stroke-width="3"/>
          <path d="M12 8V13M12 16.5H12.01" stroke="var(--critical-alert)" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <h2 class="font-outfit text-glow-red header-text">CRITICAL PURGE DETECTED</h2>
      </div>
    </header>

    <div class="nuke-content">
      <p class="nuke-subtitle font-inter">
        You are about to permanently erase all cognitive sectors. This action is irreversible.
      </p>

      <!-- Real-Time Snapshot Card -->
      <section class="snapshot-card">
        <span class="card-label font-outfit">CURRENT SECTOR SNAPSHOT</span>
        <div class="snapshot-grid">
          <div class="col">
            <span class="col-lbl font-inter">ACTIVE</span>
            <span class="col-val blue-txt">{activeCount}</span>
          </div>
          <div class="col">
            <span class="col-lbl font-inter">BREACH</span>
            <span class="col-val red-txt">{breachCount}</span>
          </div>
          <div class="col">
            <span class="col-lbl font-inter">ARCHIVE</span>
            <span class="col-val font-mono muted-txt">{archiveCount}</span>
          </div>
          <div class="col">
            <span class="col-lbl font-inter">PAYLOAD</span>
            <span class="col-val font-mono orange-txt payload-val">{totalPayload.toFixed(2)} {dbSizeUnit}</span>
          </div>
        </div>
      </section>

      <!-- 60-Second Safeguard (Precision Synced) -->
      <div class="ring-container">
        <svg class="pulse-ring" width="170" height="170" viewBox="0 0 180 180">
          <defs>
            <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(239, 68, 68, 0.15)" />
              <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
            </radialGradient>
          </defs>
          
          <circle cx="90" cy="90" r="80" fill="url(#ringGlow)" />
          <circle cx="90" cy="90" r="70" stroke="rgba(255, 255, 255, 0.05)" stroke-width="8" fill="none" />
          <circle 
            cx="90" 
            cy="90" 
            r="70" 
            class="progress-circle" 
            style="stroke-dashoffset: {offset};"
            stroke="var(--critical-alert)"
            stroke-width="8"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
        <div class="nuke-countdown font-outfit" class:disengaged={timer === 0}>{timer}</div>
      </div>

      <div class="badge-row">
        {#if timer > 0}
          <div class="safeguard-capsule active font-inter">NEURAL SAFEGUARD ACTIVE</div>
        {:else}
          <div class="safeguard-capsule disengaged font-inter">SAFEGUARD DISENGAGED</div>
        {/if}
      </div>

      <!-- Live Purge Telemetry Card - Single Line Status -->
      <section class="telemetry-card">
        <span class="card-label font-outfit">LIVE PURGE TELEMETRY</span>
        <div class="telemetry-rows font-mono">
          <div class="telemetry-row">
            <span class="t-lbl">SECTORS PURGED:</span>
            <span class="t-val" class:glow={sectorsPurged > 0}>{sectorsPurged}</span>
          </div>
          <div class="telemetry-row">
            <span class="t-lbl">DATA SIZE ERASED:</span>
            <span class="t-val" class:glow={dataSizeErased > 0}>{dataSizeErased.toFixed(2)} {dbSizeUnit}</span>
          </div>
          <div class="telemetry-row status-inline">
            <span class="t-lbl">STATUS:</span>
            <span class="t-val status-val-inline" class:active-erasing={purgeStarted && !purgeComplete} class:success={purgeComplete}>{purgeStatus}</span>
          </div>
        </div>
      </section>

      <!-- Footer Buttons - High Fidelity & Kinetic -->
      {#if !purgeStarted}
        <div class="actions-row">
          <button class="btn abort-btn font-outfit" onclick={() => { playAudio('ui-click'); onclose(); }}>
            ABORT
          </button>
          <button 
            class="btn purge-btn font-outfit" 
            disabled={timer > 0} 
            onclick={handlePurge}
          >
            PURGE STORAGE
          </button>
        </div>
      {:else}
        <div class="actions-row reboot-row" transition:fade={{ duration: 200 }}>
          <button 
            class="btn reboot-btn font-outfit" 
            disabled={!purgeComplete} 
            onclick={handleReboot}
          >
            REBOOT SYSTEM
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .nuke-overlay {
    position: fixed;
    top: 80px; left: 0;
    width: 100vw; height: calc(100vh - 80px);
    background: #000000; /* Pure Black Core */
    display: flex; align-items: center; justify-content: center;
    z-index: 11000;
    will-change: opacity;
  }

  .nuke-ambient-red-glow {
    position: absolute;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: radial-gradient(circle at center, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 60%, transparent 100%);
    backdrop-filter: blur(200px); /* Extreme surrounding blur covering whole display */
    -webkit-backdrop-filter: blur(200px);
    z-index: -1;
  }

  .nuke-panel {
    position: relative;
    width: 520px; /* Increased width to fit payload value cleanly */
    background: rgba(18, 5, 8, 0.98); /* Red-tinted dark background */
    border: 2.5px solid #ef4444; /* Application themed bright red border */
    border-radius: 44px; /* Application themed rounded corners */
    box-shadow: 0 40px 100px rgba(0, 0, 0, 1), 0 0 50px rgba(239, 68, 68, 0.35); /* Brightened glow */
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.05s ease;
    will-change: transform, opacity;
  }

  /* Universal Text Boldness (No white hover glow on text) */
  .nuke-overlay * {
    font-weight: 950 !important;
    font-size: 1.05em;
    transition: all 0.3s var(--ease-fui);
  }

  /* High-Fidelity White Hover Glow on countdown only */
  .nuke-countdown:hover {
    color: #fff !important;
    text-shadow: 0 0 40px rgba(255, 255, 255, 0.8) !important;
    transform: scale(1.05);
  }

  .nuke-header {
    display: flex; justify-content: center; align-items: center;
    padding-bottom: 4px; margin-bottom: 20px;
    position: relative; z-index: 3;
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  
  h2 {
    font-size: 1.6rem !important;
    color: #ff5a5a !important;
    margin: 0;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.75) !important;
    text-transform: uppercase;
  }

  .nuke-content {
    display: flex; flex-direction: column; gap: 18px;
    text-align: center; position: relative; z-index: 3;
  }

  .nuke-subtitle {
    font-size: 13px; line-height: 1.5;
    color: rgba(239, 68, 68, 0.7) !important;
    margin: 0 auto;
    pointer-events: none;
  }

  .snapshot-card, .telemetry-card {
    background: rgba(255, 255, 255, 0.04) !important;
    border: 1px solid rgba(239, 68, 68, 0.25) !important;
    border-radius: 16px !important; /* Slightly more rounded to match themed panel */
    padding: 12px 16px;
    display: flex; flex-direction: column; gap: 12px;
  }

  .card-label {
    font-size: 13px; font-weight: 900;
    letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.45);
    text-align: left;
  }

  .snapshot-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
  }

  .col {
    display: flex; flex-direction: column; gap: 4px;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(239, 68, 68, 0.25) !important;
    border-radius: 12px !important;
    box-sizing: border-box;
    padding: 10px 4px;
  }

  .col-lbl { font-size: 10px; color: rgba(255, 255, 255, 0.35); }
  .col-val { font-size: 17px !important; }
  .payload-val { font-size: 15px !important; white-space: nowrap; }

  .blue-txt { color: #3b82f6; }
  .red-txt { color: #ef4444; }
  .muted-txt { color: rgba(255, 255, 255, 0.55); }
  .orange-txt { color: #f59e0b; }

  .ring-container {
    position: relative; width: 170px; height: 170px;
    margin: 0 auto; display: flex; align-items: center; justify-content: center;
  }

  .pulse-ring { transform: rotate(-90deg); }
  :global(.track-circle) { stroke: rgba(239, 68, 68, 0.05); stroke-width: 8px; fill: none; }
  .progress-circle {
    stroke: #ef4444; stroke-width: 8px; stroke-linecap: round;
    stroke-dasharray: 440; fill: none; transition: stroke-dashoffset 1s linear;
  }

  .nuke-countdown {
    position: absolute; font-size: 60px;
    color: #ffffff !important; text-shadow: 0 0 25px rgba(255, 255, 255, 0.6) !important;
  }

  .nuke-countdown.disengaged { color: #ef4444 !important; animation: flash 0.5s infinite alternate; }

  .badge-row { display: flex; justify-content: center; margin-top: -8px; }

  /* Neural Safeguard - Enhanced High Curve Hover */
  .safeguard-capsule {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 8px 36px; border-radius: 100px;
    font-size: 13.5px; font-weight: 950 !important; letter-spacing: 0.15em;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    cursor: pointer;
  }

  .safeguard-capsule:hover {
    transform: translateY(-2px);
    filter: brightness(1.2);
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
  }

  .safeguard-capsule.active {
    background: linear-gradient(135deg, #ec4899, #8b5cf6, #0ea5e9);
    background-size: 200% 200%;
    animation: gradientShift 6s ease infinite;
    color: #fff !important;
  }

  .safeguard-capsule.disengaged {
    background: linear-gradient(90deg, #ef4444, #991b1b);
    border-color: #ef4444;
    color: #fff !important;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
  }

  .telemetry-rows { display: flex; flex-direction: column; gap: 8px; }
  .telemetry-row { display: flex; justify-content: space-between; font-size: 12px; }

  .status-inline {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 8px; margin-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Status Row - High-Contrast Color Coding */
  .status-val-inline {
    color: #f59e0b; /* Vivid Amber */
    font-size: 11px; letter-spacing: 0.5px;
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
    text-align: right;
  }

  .status-val-inline.active-erasing {
    color: #ff2d55 !important; /* Intense Tactical Red */
    text-shadow: 0 0 20px rgba(255, 45, 85, 0.8) !important;
    animation: flash 0.4s infinite alternate;
  }

  .status-val-inline.success {
    color: #00ff9f !important; /* Hyper Green */
    text-shadow: 0 0 20px rgba(0, 255, 159, 0.8) !important;
  }

  .t-lbl { color: rgba(255, 255, 255, 0.35); font-weight: 700; }
  .t-val { color: rgba(255, 255, 255, 0.7); font-weight: 950; }
  .t-val.glow { color: #ef4444; text-shadow: 0 0 8px rgba(239, 68, 68, 0.7); }

  .actions-row { display: flex; gap: 16px; width: 100%; margin-top: 8px; }

  /* Kinetic Button Styling - Intensified Highlighting & Hover */
  .btn {
    flex: 1; height: 48px; border-radius: 12px;
    font-size: 14px; letter-spacing: 2px;
    cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none; border: 1.5px solid rgba(255, 255, 255, 0.15);
    position: relative; overflow: hidden;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.02);
    filter: brightness(1.25);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.4);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .btn:active:not(:disabled) { transform: translateY(0px) scale(0.98); }

  .btn::after {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
  }

  .btn:hover::after { left: 100%; }

  .abort-btn {
    background: linear-gradient(90deg, #444 0%, #222 100%) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
  }

  .abort-btn:hover {
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.45) !important;
  }

  .purge-btn:not(:disabled) {
    background: linear-gradient(90deg, #ff5a5a 0%, #dc2626 100%);
    color: #ffffff;
    border-color: #fca5a5 !important;
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.45);
  }

  .purge-btn:disabled { background: #401010 !important; color: rgba(255,255,255,0.2) !important; cursor: not-allowed; }

  .reboot-btn {
    background: linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%) !important;
    border-color: #0ea5e9 !important;
    color: #ffffff !important;
    width: 100%;
  }

  .dump-active { animation: dumpShake 0.08s infinite; }
  @keyframes dumpShake { 0%, 100% { transform: translate(1px, 1px); } 50% { transform: translate(-1px, -1px); } }
  @keyframes flash { from { opacity: 0.4; } to { opacity: 1; } }
  @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

  .font-outfit { font-family: 'Outfit', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>
