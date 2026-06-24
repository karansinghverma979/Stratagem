<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { AudioEngine } from '../../../core/audio-engine';

  let { onpurgecomplete } = $props();

  let progress = tweened(0, {
    duration: 2500,
    easing: cubicOut
  });

  let isHolding = $state(false);
  let isPurged = $state(false);

  const startPurge = () => {
    if (isPurged) return;
    isHolding = true;
    AudioEngine.play('warning-hold');
    
    progress.set(100).then(() => {
      if (isHolding) {
        isPurged = true;
        isHolding = false;
        AudioEngine.play('purge-success');
        if (onpurgecomplete) onpurgecomplete();
      }
    });
  };

  const cancelPurge = () => {
    if (isPurged) return;
    isHolding = false;
    // Snap back to 0 rapidly
    progress.set(0, { duration: 300 });
  };
</script>

<div class="breach-filter-bar">
  <!-- Left Side: Counter Badge -->
  <div class="counter-badge font-outfit">
    <span class="pulse-dot"></span>
    TOTAL BREACHES: 3
  </div>

  <!-- Right Side: Custom Hold to Purge Button -->
  <button 
    class="purge-btn font-outfit" 
    class:holding={isHolding} 
    class:purged={isPurged}
    onmousedown={startPurge}
    onmouseup={cancelPurge}
    onmouseleave={cancelPurge}
    ontouchstart={startPurge}
    ontouchend={cancelPurge}
  >
    <!-- Progress fill layer -->
    <div class="progress-fill" style="width: {$progress}%;"></div>
    
    <span class="btn-text">
      {#if isPurged}
        PURGE PROTOCOL COMPLETE
      {:else if isHolding}
        PURGING SECTOR...
      {:else}
        HOLD TO PURGE QUARANTINE
      {/if}
    </span>
  </button>
</div>

<style>
  .breach-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 10px rgba(239, 68, 68, 0.05);
    font-family: 'Inter', sans-serif;
  }

  /* Left Side Counter */
  .counter-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    color: #ef4444;
    letter-spacing: 1px;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background-color: #ef4444;
    border-radius: 50%;
    box-shadow: 0 0 8px #ef4444;
    animation: beaconPulse 1s infinite alternate;
  }

  /* Purge Button */
  .purge-btn {
    position: relative;
    width: 220px;
    height: 34px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 4px;
    color: #ef4444;
    cursor: pointer;
    overflow: hidden;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    outline: none;
    transition: all 0.3s ease;
  }

  .purge-btn:hover {
    border-color: #ef4444;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #ef4444;
    opacity: 0.8;
    z-index: 1;
  }

  .btn-text {
    position: relative;
    z-index: 2;
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .purge-btn.purged {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    color: #10b981;
    cursor: not-allowed;
  }

  .purge-btn.purged .btn-text {
    color: #10b981;
    text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }

  @keyframes beaconPulse {
    from { opacity: 0.4; }
    to { opacity: 1; }
  }
</style>
