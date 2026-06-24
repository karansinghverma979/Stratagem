<script lang="ts">
  import { fade } from 'svelte/transition';
  import { AntaryamiState } from '../core/store';
  import { chronosStore, chronosProgress } from '../core/chronos-store';
  import { AudioEngine } from '../core/audio-engine';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  let strokeDashoffset = $derived(circumference * (1 - $chronosProgress));

  let showKeyAlert = $state(false);
  let alertTimeout: any = null;

  let lastFailSoundTime = 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Intercept all keyboard events to enforce isolation
    e.preventDefault();
    e.stopPropagation();

    // Trigger warning sound with throttle to avoid audio queue explosion on held keydown repeat storms
    const now = Date.now();
    if (now - lastFailSoundTime > 450) {
      AudioEngine.play('fail');
      lastFailSoundTime = now;
    }
    showKeyAlert = true;
    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
      showKeyAlert = false;
    }, 1800);
  };

  const blockContext = (e: MouseEvent) => {
    e.preventDefault();
  };

  $effect(() => {
    const isLocked = $AntaryamiState.deepFocusMode && $chronosStore.isRunning;
    if (isLocked) {
      window.addEventListener('keydown', handleKeyDown, { capture: true });
      window.addEventListener('contextmenu', blockContext, { capture: true });
      if (typeof window !== 'undefined' && window.osAPI) {
        window.osAPI.setAlwaysOnTop(true);
        window.osAPI.setKiosk(true);
      }
    } else {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', blockContext, { capture: true });
      if (typeof window !== 'undefined' && window.osAPI) {
        window.osAPI.setAlwaysOnTop(false);
        window.osAPI.setKiosk(false);
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', blockContext, { capture: true });
      if (typeof window !== 'undefined' && window.osAPI) {
        window.osAPI.setAlwaysOnTop(false);
        window.osAPI.setKiosk(false);
      }
    };
  });
</script>

{#if $AntaryamiState.deepFocusMode && $chronosStore.isRunning}
  <div class="deep-focus-overlay" transition:fade={{ duration: 300 }}>
    <!-- Volumetric FUI Background -->
    <div class="lockout-vignette"></div>
    <div class="lockout-grid"></div>
    <div class="lockout-border-glow"></div>
    <div class="scanlines"></div>

    <!-- Header warning -->
    <header class="lockout-header font-outfit">
      <div class="alert-banner">
        <svg class="warning-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>QUANTUM ISOLATION LOCKOUT ACTIVE</span>
      </div>
      <p class="alert-subtitle font-mono">ALL APPLICATIVE BYPASS PORTS LOCKOUT // STANDBY FOR CHRONOS REALIGNMENT</p>
    </header>

    <!-- Side Telemetry Bars -->
    <div class="telemetry-bar-left font-mono">
      <span>COGNITIVE.PROT: ENGAGED</span>
      <span>OS.LOCKOUT: TRUE</span>
      <span>KIOSK_MODE: ACTIVE</span>
      <span>SEC_ZONE: CHRONOS</span>
      <div class="telemetry-divider"></div>
      <span>SYS.INTEG: 100%</span>
      <span>0x8F9B2 >> LOCKED</span>
    </div>

    <div class="telemetry-bar-right font-mono">
      <span>GRID: 29.88.A</span>
      <span>THREAD: COGNITIVE</span>
      <span>BYPASS_RESTRICTION: MAX</span>
      <span>AUDIO_SYN: STABLE</span>
      <div class="telemetry-divider"></div>
      <span>THRT.ANLYS: NOMINAL</span>
      <span>SYS.BOOT.OK</span>
    </div>

    <!-- Giant Center Ring Clock -->
    <div class="center-lockout-clock">
      <div class="pulse-indicator font-mono">ISOLATION LEVEL: ABSOLUTE</div>

      <div class="svg-ring-container">
        <!-- Rotating scopes and SVG path -->
        <svg class="lockout-ring-svg" width="490" height="490" viewBox="0 0 300 300">
          <defs>
            <linearGradient id="lockoutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#b91c1c" />
            </linearGradient>
            <filter id="lockoutGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- Outer tick marks and scope rings -->
          <circle cx="150" cy="150" r="144" stroke="rgba(239, 68, 68, 0.12)" stroke-width="1.5" stroke-dasharray="3 6" fill="none" class="rotating-scope-fast" />
          <circle cx="150" cy="150" r="138" stroke="rgba(239, 68, 68, 0.05)" stroke-width="1" fill="none" />
          
          <!-- Background Track -->
          <circle cx="150" cy="150" r="130" stroke="rgba(239, 68, 68, 0.05)" stroke-width="10" fill="none" />

          <!-- Progress Ring -->
          <circle
            cx="150"
            cy="150"
            r="130"
            stroke="url(#lockoutGradient)"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray={circumference}
            stroke-dashoffset={strokeDashoffset}
            fill="none"
            filter="url(#lockoutGlow)"
            transform="rotate(-90 150 150)"
            class="progress-circle"
          />
        </svg>

        <div class="lockout-time-display font-outfit">
          {formatTime($chronosStore.timeLeft)}
        </div>
      </div>
    </div>

    <!-- Glitch Keyboard Block Alert Dialog -->
    {#if showKeyAlert}
      <div class="key-intercept-modal font-outfit" transition:fade={{ duration: 150 }}>
        <div class="alert-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="alert-text-group">
          <span class="alert-title">COGNITIVE BYPASS BLOCKED</span>
          <span class="alert-desc">STANDARD KEYBOARD INPUT INTERCEPTED BY CHRONOS SYSTEM LOCKOUT</span>
        </div>
      </div>
    {/if}

    <!-- Footer warning info -->
    <footer class="lockout-footer font-mono">
      <span>DO NOT ATTEMPT TO EXIT OR FORCE SHUTDOWN. HARVESTING COGNITIVE FOCUS FLOWS.</span>
      <span class="flashing-tag">FOCUS INDEX SECURED &bull; NO ESCAPE BYPASS</span>
    </footer>
  </div>
{/if}

<style>
  .deep-focus-overlay * {
    font-weight: 950 !important;
  }

  .deep-focus-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #030105;
    pointer-events: auto; /* block clicks underneath */
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 40px 60px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .lockout-vignette {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(8, 6, 12, 0.98);
    z-index: 1;
  }

  .lockout-grid {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image:
      linear-gradient(rgba(239, 68, 68, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(239, 68, 68, 0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.6;
    z-index: 1;
  }

  .lockout-border-glow {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    border: 3px solid rgba(239, 68, 68, 0.15);
    box-shadow: inset 0 0 60px rgba(239, 68, 68, 0.1);
    z-index: 2;
    pointer-events: none;
    animation: borderPulse 4s infinite alternate ease-in-out;
  }

  @keyframes borderPulse {
    0% { border-color: rgba(239, 68, 68, 0.15); box-shadow: inset 0 0 40px rgba(239, 68, 68, 0.05); }
    100% { border-color: rgba(239, 68, 68, 0.35); box-shadow: inset 0 0 100px rgba(239, 68, 68, 0.2); }
  }

  .scanlines {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.2) 50%);
    background-size: 100% 4px;
    opacity: 0.25;
    z-index: 2;
  }

  .lockout-header {
    position: relative;
    z-index: 3;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px; /* Increased vertical gap */
    margin-top: 20px; /* Increased margin top */
  }

  .alert-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1.5px solid rgba(239, 68, 68, 0.4);
    color: #ef4444;
    padding: 12px 28px;
    border-radius: 4px;
    font-size: 18px; /* Increased font size */
    font-weight: 950 !important;
    letter-spacing: 0.15em;
    text-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.2);
  }

  .warning-icon {
    animation: warning-flash 1s infinite alternate;
  }

  @keyframes warning-flash {
    0% { opacity: 0.4; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1.05); }
  }

  .alert-subtitle {
    font-size: 13px; /* Increased font size */
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.7); /* Brighter for visibility */
    letter-spacing: 0.12em;
  }

  /* Side Telemetries */
  .telemetry-bar-left, .telemetry-bar-right {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12.5px; /* Increased font size */
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.6); /* Brighter for readability */
    z-index: 3;
    letter-spacing: 0.08em;
  }

  .telemetry-bar-left {
    left: 60px;
    text-align: left;
  }

  .telemetry-bar-right {
    right: 60px;
    text-align: right;
  }

  .telemetry-divider {
    height: 1px;
    background: rgba(239, 68, 68, 0.3);
    margin: 8px 0;
    width: 60px;
  }
  .telemetry-bar-right .telemetry-divider {
    align-self: flex-end;
  }

  /* Center Clock Area */
  .center-lockout-clock {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .pulse-indicator {
    font-size: 14px; /* Increased font size */
    font-weight: 950 !important;
    color: #ef4444;
    letter-spacing: 0.18em;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 6px 16px;
    border-radius: 2px;
    margin-bottom: 24px;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    animation: alert-flash 2s infinite ease-in-out;
  }

  @keyframes alert-flash {
    50% { opacity: 0.4; }
  }

  .svg-ring-container {
    position: relative;
    width: 490px;
    height: 490px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lockout-ring-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .progress-circle {
    transition: stroke-dashoffset 0.35s linear;
  }

  .lockout-time-display {
    font-size: 110px; /* Slightly decreased countdown size */
    font-weight: 950 !important;
    color: #ffffff;
    text-shadow: 0 0 45px rgba(239, 68, 68, 0.6);
  }

  .rotating-scope-fast {
    transform-origin: 150px 150px;
    animation: rotate-scope 12s linear infinite;
  }

  @keyframes rotate-scope {
    100% { transform: rotate(360deg); }
  }

  /* Glitch Keyboard Alert */
  .key-intercept-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(18, 2, 4, 0.96);
    border: 2px solid #ef4444;
    border-radius: 8px;
    padding: 24px 32px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 1000000;
    box-shadow: 0 0 50px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2);
    animation: glitchIn 0.15s ease-out;
  }

  @keyframes glitchIn {
    0% { transform: translate(-50%, -45%) scale(0.9); opacity: 0; filter: hue-rotate(90deg); }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: hue-rotate(0deg); }
  }

  .alert-icon-box {
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
    animation: alert-icon-shake 0.4s infinite alternate;
  }

  @keyframes alert-icon-shake {
    0% { transform: scale(0.95) rotate(-5deg); }
    100% { transform: scale(1.05) rotate(5deg); }
  }

  .alert-text-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 4px;
  }

  .alert-title {
    font-size: 16px; /* Increased font size */
    font-weight: 950 !important;
    color: #ffffff;
    letter-spacing: 0.1em;
  }

  .alert-desc {
    font-size: 12px; /* Increased font size */
    font-weight: 900 !important;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.05em;
  }

  .lockout-footer {
    position: relative;
    z-index: 3;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px; /* Increased font size */
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.5); /* Brighter for readability */
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }

  .flashing-tag {
    color: rgba(239, 68, 68, 0.9); /* Brighter */
    text-shadow: 0 0 5px rgba(239, 68, 68, 0.4);
    animation: flashText 1.5s infinite ease-in-out;
  }

  @keyframes flashText {
    50% { opacity: 0.2; }
  }

  .font-outfit {
    font-family: 'Outfit', sans-serif;
  }

  .font-mono {
    font-family: 'Share Tech Mono', monospace;
  }
</style>
