<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';

  let props = $props<{
    isOpen: boolean;
    mission: any;
    onConfirm: () => void;
    onCancel: () => void;
  }>();

  let timeLeft = $state(10);
  let isConfirmed = $state(false);
  let timerInterval: any = null;

  // 565.48 is circumference of r=90 circle
  let offset = $derived(565.48 - (timeLeft / 10) * 565.48);

  $effect(() => {
    if (props.isOpen) {
      timeLeft = 10;
      isConfirmed = false;
      AudioEngine.play('critical_breach');

      timerInterval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          if (timeLeft <= 3) {
            AudioEngine.play('alarm_warning');
          } else {
            AudioEngine.play('click');
          }
        } else {
          clearInterval(timerInterval);
        }
      }, 1000);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    }
  });

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  function handleAuthorize() {
    isConfirmed = true;
    AudioEngine.play('critical_breach');
    props.onConfirm();
  }
</script>

{#if props.isOpen}
  <div class="confirm-overlay" onclick={(e) => { if (e.target === e.currentTarget && !isConfirmed) props.onCancel(); }} role="presentation" transition:fade={{ duration: 200 }}>
    
    <!-- Top-Right Dropping Notification Alert -->
    {#if isConfirmed}
      <div class="notification-alert abort-alert" transition:fly={{ y: -50, x: 30, duration: 400 }}>
        <div class="notification-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div class="notification-content">
          <span class="noti-title font-outfit">COGNITIVE PURGE</span>
          <span class="noti-desc font-inter">Thread Purge Executed</span>
        </div>
      </div>
    {/if}

    <div class="confirm-modal abort-themed" class:is-confirmed={isConfirmed} onclick={(e) => e.stopPropagation()} role="presentation" transition:fly={{ y: 40, duration: 250 }}>
      
      <div class="chromatic-aura-edge"></div>
      <div class="celestial-glass-finish"></div>

      <div class="popup-container">
        
        <!-- Rotating Ring Counter & Inside Countdown -->
        <div class="ring-container">
          <div class="reticle-bg-rotate"></div>
          <div class="reticle-bg-rotate-ccw"></div>
          
          <div class="radar-crosshair horiz"></div>
          <div class="radar-crosshair vert"></div>
          
          <svg class="pulse-ring" width="220" height="220" viewBox="0 0 220 220">
            <defs>
              <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255, 45, 85, 0.25)" />
                <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>
            
            <circle cx="110" cy="110" r="100" fill="url(#ringGlow)" />
            <circle cx="110" cy="110" r="90" stroke="rgba(255, 255, 255, 0.03)" stroke-width="8" fill="none" />
            <circle 
              cx="110" 
              cy="110" 
              r="90" 
              class="progress-circle" 
              style="stroke-dashoffset: {offset}; stroke-dasharray: 565.48;"
              stroke="#ff2d55"
              stroke-width="10"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
          <div class="nuke-countdown font-outfit" class:critical={timeLeft <= 3}>{timeLeft}</div>
        </div>

        <!-- Warning Text Card with Breathing Animation -->
        <div class="warning-zone">
          <div class="warning-header font-outfit">SYNTHESIS PURGE ENFORCED</div>
          <p class="warning-text font-inter">
            WARNING: PURGING A SYNTHESIZING THREAD IS IRREVERSIBLE. NO DATA BACKUP EXISTS. ALL INTEL AND PROGRESS WILL BE PERMANENTLY ERASED.
          </p>
        </div>

        <!-- Actions -->
        <div class="actions-zone">
          <button 
            class="btn-authorize font-outfit" 
            disabled={timeLeft > 0} 
            onclick={handleAuthorize}
          >
            <svg class="btn-icon shutter-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke-linecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round"/>
            </svg>
            <span class="btn-text">CONFIRM DELETE</span>
          </button>
          
          <button class="btn-dismiss font-outfit" onclick={props.onCancel}>
            <svg class="btn-icon slide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="btn-text">DISMISS</span>
          </button>
        </div>

      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay {
    position: fixed;
    top: 80px; /* Offset matching navbar */
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(9px);
    -webkit-backdrop-filter: blur(9px);
    background: radial-gradient(circle at center, rgba(8, 1, 3, 0.96) 0%, rgba(0, 0, 0, 0.99) 100%);
    padding: 0;
    box-sizing: border-box;
    pointer-events: auto;
    will-change: opacity;
  }

  .confirm-modal {
    width: 90%;
    max-width: 560px;
    height: auto;
    background: linear-gradient(-45deg, #030102, #140206, #070103, #1c0309, #030102);
    background-size: 400% 400%;
    border: 3px solid rgba(255, 45, 85, 0.95);
    border-radius: 48px;
    box-shadow: 
      0 30px 100px rgba(0, 0, 0, 0.98), 
      0 0 50px rgba(255, 45, 85, 0.45),
      inset 0 0 50px rgba(255, 45, 85, 0.08);
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    padding: 44px 40px;
    transition: all 0.5s ease-in-out;
    animation: confirmBgFlow 80s ease infinite;
    will-change: transform, opacity;
  }

  .confirm-modal.is-confirmed {
    transform: translateY(80px);
    opacity: 0;
    pointer-events: none;
  }

  @keyframes confirmBgFlow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .chromatic-aura-edge {
    position: absolute;
    inset: 0;
    border: 6px solid rgba(255, 45, 85, 0.22);
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

  .popup-container {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
  }

  .ring-container {
    position: relative;
    width: 100%;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28px;
  }

  .reticle-bg-rotate {
    position: absolute;
    width: 216px;
    height: 216px;
    border: 2px dashed rgba(255, 45, 85, 0.18);
    border-radius: 50%;
    animation: spinCW 25s linear infinite;
    pointer-events: none;
    z-index: 1;
  }
  
  .reticle-bg-rotate-ccw {
    position: absolute;
    width: 196px;
    height: 196px;
    border: 1.5px dotted rgba(255, 45, 85, 0.25);
    border-radius: 50%;
    animation: spinCCW 15s linear infinite;
    pointer-events: none;
    z-index: 1;
  }

  @keyframes spinCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes spinCCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }

  .radar-crosshair {
    position: absolute;
    background: rgba(255, 45, 85, 0.12);
    pointer-events: none;
    z-index: 2;
  }
  .radar-crosshair.horiz {
    width: 226px;
    height: 1px;
  }
  .radar-crosshair.vert {
    width: 1px;
    height: 226px;
  }

  .pulse-ring {
    transform: rotate(-90deg);
    position: relative;
    z-index: 3;
  }

  .progress-circle {
    fill: none;
    stroke-dasharray: 565.48;
    transition: stroke-dashoffset 1s linear;
  }

  .nuke-countdown {
    position: absolute;
    font-size: 56px;
    color: #ffffff !important;
    text-shadow: 0 0 25px rgba(255, 255, 255, 0.7), 0 0 12px rgba(255, 45, 85, 0.5) !important;
    font-weight: 950 !important;
    z-index: 5;
    transition: all 0.3s ease;
  }

  .nuke-countdown.critical {
    color: #ff2d55 !important;
    text-shadow: 0 0 25px rgba(255, 45, 85, 0.85) !important;
    animation: warningFlash 0.5s infinite alternate;
  }

  @keyframes warningFlash {
    from { opacity: 0.5; }
    to { opacity: 1; }
  }

  .warning-zone {
    width: 100%;
    background: rgba(30, 0, 8, 0.75);
    border: 2.5px solid #ff2d55;
    box-shadow: 0 0 20px rgba(255, 45, 85, 0.25);
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 32px;
    box-sizing: border-box;
    text-align: center;
    animation: warningCardPulse 3s infinite alternate ease-in-out;
  }

  @keyframes warningCardPulse {
    0% {
      border-color: rgba(255, 45, 85, 0.45);
      box-shadow: 0 0 10px rgba(255, 45, 85, 0.1);
    }
    100% {
      border-color: #ff2d55;
      box-shadow: 0 0 25px rgba(255, 45, 85, 0.45);
    }
  }

  .warning-header {
    font-size: 10px;
    font-weight: 900;
    color: #ff2d55;
    letter-spacing: 1px;
    margin-bottom: 8px;
    text-shadow: 0 0 6px rgba(255, 45, 85, 0.45);
  }

  .warning-text {
    font-size: 14px;
    font-weight: 800;
    color: #ffffff;
    margin: 0;
    line-height: 1.5;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #ffffff 0%, #ff2d55 25%, #a855f7 50%, #ff2d55 75%, #ffffff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: textGradientFlow 4s linear infinite;
  }

  .actions-zone {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .btn-authorize {
    width: 100%;
    height: 56px;
    border-radius: 12px;
    background: rgba(32, 4, 12, 0.85);
    border: 2px solid #ff2d55;
    color: #ffffff;
    cursor: pointer;
    font-weight: 999;
    font-size: 15px;
    letter-spacing: 2px;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    box-shadow: 0 0 15px rgba(255, 45, 85, 0.4);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    -webkit-text-stroke: 0.8px currentColor;
    text-shadow: 0 0 8px rgba(255, 45, 85, 0.85);
  }

  .btn-authorize:hover:not(:disabled) {
    background: rgba(53, 6, 20, 0.95);
    box-shadow: 0 0 25px rgba(255, 45, 85, 0.6);
    transform: translateY(-2px);
  }

  .btn-authorize:active:not(:disabled) {
    transform: scale(0.97);
  }

  .btn-authorize:disabled {
    background: rgba(255, 45, 85, 0.15) !important;
    border: 1.5px solid rgba(255, 45, 85, 0.2) !important;
    color: rgba(255, 255, 255, 0.25) !important;
    cursor: not-allowed;
    box-shadow: none !important;
    transform: none !important;
    -webkit-text-stroke: 0px transparent;
  }

  .btn-icon {
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  .shutter-icon {
    animation: iconShudder 2.5s infinite ease-in-out;
  }

  @keyframes iconShudder {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: rotate(5deg) scale(1.25); opacity: 1; filter: drop-shadow(0 0 4px #ff2d55); }
  }

  .btn-authorize::after {
    content: '';
    position: absolute;
    top: 0; left: -150%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
    transform: skewX(-25deg);
    transition: none;
  }

  .btn-authorize:not(:disabled)::after {
    animation: sliceLightSweep 3s infinite ease-in-out;
  }

  @keyframes sliceLightSweep {
    0% { left: -150%; }
    50% { left: 150%; }
    100% { left: 150%; }
  }

  .btn-dismiss {
    width: 100%;
    height: 52px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    font-weight: 999;
    font-size: 13px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    -webkit-text-stroke: 0.8px currentColor;
  }

  .btn-dismiss:hover {
    border-color: #ff2d55;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.18);
  }

  .btn-dismiss:hover .slide-icon {
    transform: translateX(-4px);
  }

  .btn-dismiss::after {
    content: '';
    position: absolute;
    top: 0; left: -150%; width: 40%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transform: skewX(-25deg);
  }

  .btn-dismiss:hover::after {
    animation: sliceLightSweepDismiss 2.2s ease-in-out;
  }

  @keyframes sliceLightSweepDismiss {
    0% { left: -150%; }
    100% { left: 150%; }
  }

  .notification-alert {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 10000;
    width: 310px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    border-radius: 12px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-sizing: border-box;
  }

  .abort-alert {
    background: rgba(20, 2, 6, 0.95);
    border: 2px solid #ff2d55;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 45, 85, 0.3);
  }

  .notification-icon {
    color: #ff2d55;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    animation: iconPulse 2s infinite alternate;
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

  @keyframes textGradientFlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  @keyframes iconPulse {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.25); opacity: 1; }
  }

  .font-outfit { font-family: 'Outfit', sans-serif; font-weight: 950; }
  .font-inter { font-family: 'Inter', sans-serif; font-weight: 700; }
  :global(.font-mono) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>
