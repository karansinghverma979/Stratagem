<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { AntaryamiState, updateConfig } from '../../../../core/store';
  import { AudioEngine } from '../../../../core/audio-engine';
  import GenesisToggle from '../GenesisToggle.svelte';

  const handleToggle = (key: string, newValue: boolean) => {
    AntaryamiState.update(state => ({ ...state, [key]: newValue }));
    updateConfig(key, newValue);
    AudioEngine.play('switch-flip');
  };

  const handleVolumeChange = (newVolume: number) => {
    AntaryamiState.update(state => ({ ...state, audioVolume: newVolume }));
    updateConfig('audioVolume', newVolume);
    AudioEngine.play('ui-click');
  };

  const handleThemeChange = (newTheme: string) => {
    AntaryamiState.update(state => ({ ...state, audioTheme: newTheme }));
    updateConfig('audioTheme', newTheme);
    setTimeout(() => {
      AudioEngine.play('success');
    }, 50);
  };

  // Header hover state
  let isHeaderHovered = $state(false);

  // Nude mode unlock and remaining time derivation (includes local testing bypass via localStorage)
  const isNudeModeUnlocked = $derived(
    ($AntaryamiState.notecardsActiveSeconds || 0) >= 21600 ||
    (!$AntaryamiState.isPackaged && (
      $AntaryamiState.nudeBypassAllowed ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('aigirl_nude_test_bypass') === 'true')
    ))
  );

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Open directory locations for NoteCards and Developer portraits
  async function openDeveloperFolder() {
    try {
      AudioEngine.play('ui-click');
      const res = await window.stratagemAPI.devScanImages();
      if (res.success && res.path) {
        await window.osAPI.openInExplorer(res.path);
      }
    } catch (e) {
      console.error('Failed to open developer images folder:', e);
    }
  }

  async function openNoteCardsFolder() {
    try {
      AudioEngine.play('ui-click');
      const res = await window.stratagemAPI.aigirlScanFolderFiles('NoteCards');
      if (res.success && res.path) {
        await window.osAPI.openInExplorer(res.path);
      }
    } catch (e) {
      console.error('Failed to open NoteCards images folder:', e);
    }
  }

  // Developer contact popup states
  let activeContactPopup = $state<string | null>(null);
  let activeContactValue = $state('');
  let isCopied = $state(false);

  const openContactPopup = (type: string) => {
    AudioEngine.play('data-decode');
    activeContactPopup = type;
    if (type === 'GitHub') {
      activeContactValue = $AntaryamiState.githubUrl || 'https://github.com/karansinghverma979/';
    } else if (type === 'Email') {
      activeContactValue = $AntaryamiState.emailAddress || 'karansinghverma979@gmail.com';
    } else if (type === 'LinkedIn') {
      activeContactValue = $AntaryamiState.linkedinUrl || 'https://www.linkedin.com/in/karansinghverma979/';
    }
    isCopied = false;
  };

  const closeContactPopup = () => {
    AudioEngine.play('ui-click');
    activeContactPopup = null;
    isCopied = false;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(activeContactValue);
      isCopied = true;
      AudioEngine.play('success');
      setTimeout(() => {
        isCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };
</script>

<div class="settings-panel glass-container" in:fade={{ duration: 120 }} out:fade={{ duration: 60 }}>
  <!-- Top Tech Header (Original sizes restored) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="panel-header" onmouseenter={() => { isHeaderHovered = true; AudioEngine.play('ui-hover'); }} onmouseleave={() => isHeaderHovered = false}>
    <div class="live-icon settings-icon" class:acquired={isHeaderHovered}>
      <svg viewBox="0 0 24 24" class="svg-anim">
        <!-- Common Center Point Group -->
        <g class="orbital-system-root">
          <!-- Outer Gear Ring with 90-deg orbital jump -->
          <g class="gear-group gear-1-orbit">
            <circle cx="12" cy="7" r="5" fill="none" stroke="#ffd700" stroke-width="1.8" stroke-dasharray="2 1.5" class="spin-cw-slow" />
            <circle cx="12" cy="7" r="1.5" fill="#ffd700" opacity="0.6" />
          </g>
          <!-- Inner Utility Ring with 90-deg orbital jump (opposite) -->
          <g class="gear-group gear-2-orbit">
            <circle cx="12" cy="17" r="4.5" fill="none" stroke="#00ffff" stroke-width="1.5" stroke-dasharray="1.5 1" class="spin-ccw-slow" />
            <circle cx="12" cy="17" r="1.2" fill="#00ffff" opacity="0.6" />
          </g>
        </g>
        <!-- Static Center Core Axis -->
        <circle cx="12" cy="12" r="1" fill="#ffffff" opacity="0.4" />
      </svg>
    </div>
    
    <!-- Title Group -->
    <div class="title-group-animated" class:acquired={isHeaderHovered}>
      <div class="title-fui-shell">
        <h1 class="forge-title font-outfit">SYSTEM PARAMETERS</h1>
      </div>
    </div>
  </div>

  <div class="settings-content">
    <!-- Row 1: Audio parameters -->
    <div class="setting-group-card">
      <div class="card-header-row">
        <GenesisToggle 
          checked={$AntaryamiState.audioEnabled} 
          label="GLOBAL SYSTEM AUDIO ENGINE" 
          onchange={(val) => handleToggle('audioEnabled', val)}
        />
      </div>
      
      {#if $AntaryamiState.audioEnabled}
        <div class="audio-sliders-container" transition:fade={{ duration: 150 }}>
          <div class="slider-wrapper">
            <div class="slider-header">
              <span class="slider-label font-mono">CORE VOLUME OUT:</span>
              <span class="slider-value font-mono">{Math.round(($AntaryamiState.audioVolume || 0) * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={$AntaryamiState.audioVolume || 0} 
              oninput={(e) => handleVolumeChange(parseFloat(e.currentTarget.value))}
              class="volume-slider-bar" 
            />
          </div>

          <div class="theme-selection-wrapper">
            <span class="selection-label font-mono">SOUND LOG MATRIX THEME:</span>
            <div class="theme-pill-grid">
              <button 
                class="theme-pill btn-cyber" 
                class:active={$AntaryamiState.audioTheme === 'cyberpunk' || !$AntaryamiState.audioTheme} 
                onclick={() => handleThemeChange('cyberpunk')}
              >
                CYBERPUNK
              </button>
              <button 
                class="theme-pill btn-retro" 
                class:active={$AntaryamiState.audioTheme === 'retro'} 
                onclick={() => handleThemeChange('retro')}
              >
                RETRO
              </button>
              <button 
                class="theme-pill btn-tactic" 
                class:active={$AntaryamiState.audioTheme === 'tactical'} 
                onclick={() => handleThemeChange('tactical')}
              >
                TACTICAL
              </button>
              <button 
                class="theme-pill btn-indus" 
                class:active={$AntaryamiState.audioTheme === 'industrial'} 
                onclick={() => handleThemeChange('industrial')}
              >
                INDUSTRIAL
              </button>
              <button 
                class="theme-pill btn-neural" 
                class:active={$AntaryamiState.audioTheme === 'neural'} 
                onclick={() => handleThemeChange('neural')}
              >
                NEURAL
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Row 2: Security & Lockouts -->
    <div class="security-grid-row">
      <!-- Deep Focus -->
      <div class="setting-group-card half-card">
        <GenesisToggle 
          checked={$AntaryamiState.deepFocusMode} 
          label="QUANTUM ISOLATION LOCK" 
          onchange={(val) => handleToggle('deepFocusMode', val)}
        />
        <p class="card-caption">Quantum sandbox isolation mode.</p>
      </div>

      <!-- Auto Launch -->
      <div class="setting-group-card half-card">
        <GenesisToggle 
          checked={$AntaryamiState.appLaunchOnStartup || false} 
          label="SYSTEM AUTO-LAUNCH PROTOCOL" 
          onchange={(val) => handleToggle('appLaunchOnStartup', val)}
        />
        <p class="card-caption">Execute boot sequence on startup.</p>
      </div>
    </div>

    <!-- Row 3: Companion folder settings -->
    <div class="setting-group-card" class:locked-card={!isNudeModeUnlocked && !$AntaryamiState.aigirlNudityEnabled}>
      <div class="card-header-row">
        <GenesisToggle 
          checked={$AntaryamiState.aigirlNudityEnabled || false} 
          label="SYNTHETIC COMPANION NUDITY INTERFACE" 
          disabled={!isNudeModeUnlocked && !$AntaryamiState.aigirlNudityEnabled}
          onchange={(val) => handleToggle('aigirlNudityEnabled', val)}
        />
        {#if $AntaryamiState.aigirlNudityEnabled}
          <span class="timer-countdown font-mono text-danger animate-pulse">
            LIMIT: {formatTime($AntaryamiState.nudeModeRemainingSeconds || 0)}
          </span>
        {:else if !isNudeModeUnlocked}
          <span class="unlock-progress font-mono text-warning">
            LOCKED: {formatTime($AntaryamiState.notecardsActiveSeconds || 0)} / 360:00
          </span>
        {:else}
          <span class="unlock-progress font-mono text-success">
            UNLOCKED
          </span>
        {/if}
      </div>
      <p class="card-caption">
        {#if $AntaryamiState.aigirlNudityEnabled}
          Classified Nudity telemetry active. Auto-reversion in {formatTime($AntaryamiState.nudeModeRemainingSeconds || 0)}.
        {:else if !isNudeModeUnlocked}
          Requires 360 mins of standard companion NoteCards engagement to authorize (Current: {formatTime($AntaryamiState.notecardsActiveSeconds || 0)} / 360:00).
        {:else}
          Tactical authorization verified. Companion nudity interface is ready for activation.
        {/if}
      </p>
    </div>

    <!-- Row 4: Strategic & Files Communications Portals (Curved heavy rounded square buttons) -->
    <div class="developer-contact-row">
      <button class="contact-btn github-btn" onclick={() => openContactPopup('GitHub')} title="Open GitHub Project Link">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </button>

      <button class="contact-btn email-btn" onclick={() => openContactPopup('Email')} title="Open Developer Email">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l12-9.725v15.438h-24v-15.438l12 9.725z"/>
        </svg>
      </button>

      <button class="contact-btn linkedin-btn" onclick={() => openContactPopup('LinkedIn')} title="Open LinkedIn Profile">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      </button>

      <button class="contact-btn notecards-folder-btn" onclick={openNoteCardsFolder} title="Open Standard Companion Images Folder">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM6 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM1.5 9V6a3 3 0 0 1 3-3h5.679a3 3 0 0 1 2.227.99l1.4 1.55a1 1 0 0 0 .742.33H19.5a3 3 0 0 1 3 3v.68c-.89-.43-1.9-.68-3-.68h-15a5.006 5.006 0 0 0-5 5Z"/>
        </svg>
      </button>

      <button class="contact-btn dev-folder-btn" onclick={openDeveloperFolder} title="Open Developer Portraits Folder">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 2H5C3.343 2 2 3.343 2 5v14c0 1.657 1.343 3 3 3h14c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3ZM12 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm6 12H6v-.5c0-2.5 4-3.5 6-3.5s6 1 6 3.5v.5Z"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<!-- Beautiful animated liquid glass popup modal -->
{#if activeContactPopup}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="liquid-glass-popup-backdrop" onclick={closeContactPopup} transition:fade={{ duration: 200 }}>
    <div class="liquid-glass-popup" onclick={(e) => e.stopPropagation()} transition:scale={{ duration: 300, start: 0.9, easing: cubicOut }}>
      <div class="popup-liquid-blob blob-a"></div>
      <div class="popup-liquid-blob blob-b"></div>
      <div class="popup-glow"></div>
      <button class="popup-close-btn" onclick={closeContactPopup}>×</button>
      <h2 class="popup-title font-outfit">{activeContactPopup.toUpperCase()} SYSTEM CHANNEL</h2>
      
      <div class="popup-content-box">
        <span class="popup-url font-mono select-all">{activeContactValue}</span>
      </div>

      <div class="popup-actions-row">
        <button class="popup-action-btn font-outfit" class:copied={isCopied} onclick={copyToClipboard}>
          {#if isCopied}
            ✓ MERGE COPIED TO INTEL
          {:else}
            📋 COPY CHANNEL ADDRESS
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-panel {
    width: 100%;
    height: 100%;
    padding: 30px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 34px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      0 12px 30px rgba(0, 0, 0, 0.75);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    height: 60px;
    box-sizing: border-box;
    padding: 0 0 16px 0;
    margin: 0;
    position: relative;
    user-select: none;
    outline: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  @keyframes gradientFlow {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
  }

  @keyframes sheenSweep {
    0% { transform: translateX(-150%) skewX(-25deg); }
    100% { transform: translateX(150%) skewX(-25deg); }
  }

  .live-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 6px var(--glow-color, #ffd700));
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
  }
  .live-icon:hover {
    transform: scale(1.2) rotate(-90deg);
    filter: drop-shadow(0 0 15px #ffd700) drop-shadow(0 0 25px #ffb800);
  }
  .live-icon.acquired {
    transform: scale(1.15) rotate(-45deg);
    filter: drop-shadow(0 0 15px #ffd700) drop-shadow(0 0 25px #ffb800);
  }

  .settings-icon {
    --glow-color: #ffd700;
  }

  .svg-anim {
    width: 100%;
    height: 100%;
  }

  .spin-cw-slow {
    transform-origin: 9px 9px;
    animation: spinCW 6s linear infinite;
  }

  .spin-ccw-slow {
    transform-origin: 15px 15px;
    animation: spinCCW 5s linear infinite;
  }

  @keyframes spinCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spinCCW {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  /* 90-degree Orbital Intervals from Common Center (12, 12) */
  @keyframes orbitalSystemJump {
    0%, 20% { transform: rotate(0deg); }
    25%, 45% { transform: rotate(90deg); }
    50%, 70% { transform: rotate(180deg); }
    75%, 95% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }

  .orbital-system-root {
    transform-origin: 12px 12px;
    animation: orbitalSystemJump 12s cubic-bezier(0.65, 0, 0.35, 1) infinite;
  }

  .gear-1-orbit { transform-origin: 12px 12px; }
  .gear-2-orbit { transform-origin: 12px 12px; }

  /* Title Group (Adjacent to Scope, Frameless, Underlined Laser Sweep) */
  .title-group-animated {
    display: flex;
    align-items: center;
  }
  .title-fui-shell {
    position: relative;
    padding: 2px 0 6px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .forge-title {
    font-size: 38px;
    font-weight: 950;
    color: #fff;
    margin: 0;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 8s linear infinite, glow-breath 5s infinite alternate ease-in-out;
    transition: all 0.3s var(--ease-fui);
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  .title-group-animated.acquired .forge-title {
    background: linear-gradient(90deg, #fff, var(--critical-alert), var(--warning-amber), #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 2.5s linear infinite, title-alert-pulse 0.6s infinite alternate ease-in-out;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.45);
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes title-alert-pulse {
    0% { filter: drop-shadow(0 0 8px rgba(255, 45, 85, 0.4)); }
    100% { filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.75)); }
  }

  @keyframes chroma-loop { 
    from { background-position: 0% center; } 
    to { background-position: 200% center; } 
  }


  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    overflow-y: hidden;
    margin-top: 24px;
  }

  .setting-group-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.01);
  }

  .setting-group-card:hover {
    background: rgba(139, 92, 246, 0.04);
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 
      inset 0 0 20px rgba(139, 92, 246, 0.05),
      0 10px 30px rgba(0, 0, 0, 0.6);
  }

  .security-grid-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .half-card {
    min-height: 72px;
    justify-content: center;
  }

  .card-caption {
    margin: 2px 0 0 0;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
    padding-left: 64px;
  }

  .audio-sliders-container {
    padding-left: 64px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .slider-wrapper {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    letter-spacing: 0.05em;
  }

  .slider-label {
    color: rgba(255, 255, 255, 0.35);
  }

  .slider-value {
    color: #ffd700;
    font-weight: bold;
  }

  .volume-slider-bar {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    outline: none;
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;
  }

  .volume-slider-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffd700;
    box-shadow: 0 0 10px #ffd700;
    cursor: pointer;
    transition: transform 0.1s ease, background-color 0.1s ease;
  }

  .volume-slider-bar::-webkit-slider-thumb:hover {
    transform: scale(1.25);
    background: #ffffff;
    box-shadow: 0 0 12px #ffffff;
  }

  .theme-selection-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .selection-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.05em;
  }

  .theme-pill-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .theme-pill {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    letter-spacing: 0.05em;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .theme-pill:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  .theme-pill.active {
    color: #fff;
    font-weight: bold;
  }

  .theme-pill.btn-cyber.active {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  }

  .theme-pill.btn-retro.active {
    background: rgba(236, 72, 153, 0.2);
    border-color: #ec4899;
    box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
  }

  .theme-pill.btn-tactic.active {
    background: rgba(6, 182, 212, 0.2);
    border-color: #06b6d4;
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
  }

  .theme-pill.btn-indus.active {
    background: rgba(249, 115, 22, 0.2);
    border-color: #f97316;
    box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);
  }

  .theme-pill.btn-neural.active {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  }


  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    position: relative;
  }

  .notecards-folder-btn:hover {
    border-color: #00ffff;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.35);
  }

  .dev-folder-btn:hover {
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.35);
  }

  .locked-card {
    border-color: rgba(239, 68, 68, 0.15) !important;
    background: rgba(239, 68, 68, 0.01) !important;
  }

  .locked-card:hover {
    border-color: rgba(239, 68, 68, 0.35) !important;
    background: rgba(239, 68, 68, 0.03) !important;
    box-shadow: 
      inset 0 0 20px rgba(239, 68, 68, 0.05),
      0 10px 30px rgba(0, 0, 0, 0.6) !important;
  }

  .timer-countdown {
    font-size: 11px;
    font-weight: 950;
    color: #ef4444;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.7);
    background: rgba(239, 68, 68, 0.18);
    padding: 3px 9px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.45);
    letter-spacing: 0.5px;
  }

  .unlock-progress {
    font-size: 11px;
    font-weight: 950;
    color: #f59e0b;
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
    background: rgba(245, 158, 11, 0.12);
    padding: 3px 9px;
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    letter-spacing: 0.5px;
  }

  .text-danger {
    color: #ef4444 !important;
  }
  .text-warning {
    color: #f59e0b !important;
  }
  .text-success {
    color: #10b981 !important;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }

  .animate-pulse {
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Strategic contact portals styling */
  .developer-contact-row {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 6px;
    width: 100%;
    align-items: center;
    flex-shrink: 0;
  }
  
  .contact-btn {
    width: 48px;
    height: 48px;
    border-radius: 14px; /* curved heavy rounded corner square */
    background: rgba(255, 255, 255, 0.03);
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
  }
  
  .contact-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -150%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transform: skewX(-25deg);
    transition: 0.6s;
  }
  
  .contact-btn:hover::before {
    left: 150%;
  }

  .contact-btn:hover {
    color: #ffffff;
    transform: scale(1.08) translateY(-2px);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  
  .github-btn:hover {
    border-color: #a78bfa;
    box-shadow: 0 0 20px rgba(167, 139, 250, 0.3);
  }
  
  .email-btn:hover {
    border-color: #38bdf8;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
  }
  
  .linkedin-btn:hover {
    border-color: #0284c7;
    box-shadow: 0 0 20px rgba(2, 132, 199, 0.3);
  }

  /* Liquid Glass Popup styles */
  .liquid-glass-popup-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(4, 2, 14, 0.7);
    backdrop-filter: blur(16px) saturate(1.8);
    -webkit-backdrop-filter: blur(16px) saturate(1.8);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .liquid-glass-popup {
    background: rgba(12, 8, 28, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 30px;
    width: 480px;
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(40px) saturate(2);
    -webkit-backdrop-filter: blur(40px) saturate(2);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.2),
      0 24px 80px rgba(0, 0, 0, 0.95), 
      0 0 50px rgba(139, 92, 246, 0.15);
    z-index: 1;
  }

  /* Liquid Glass morphing blobs inside popup background */
  .popup-liquid-blob {
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    mix-blend-mode: screen;
    filter: blur(35px);
    opacity: 0.35;
    pointer-events: none;
    z-index: -1;
  }

  .popup-liquid-blob.blob-a {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 80%);
    top: -50px;
    left: -50px;
    animation: popupBlobFloatA 10s infinite alternate ease-in-out;
  }

  .popup-liquid-blob.blob-b {
    background: radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, transparent 80%);
    bottom: -50px;
    right: -50px;
    animation: popupBlobFloatB 12s infinite alternate ease-in-out;
  }

  @keyframes popupBlobFloatA {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    100% { transform: translate(40px, 30px) scale(1.2) rotate(180deg); }
  }

  @keyframes popupBlobFloatB {
    0% { transform: translate(0, 0) scale(1.2) rotate(0deg); }
    100% { transform: translate(-30px, -40px) scale(0.9) rotate(-180deg); }
  }

  .popup-glow {
    position: absolute;
    top: -50px;
    width: 200px;
    height: 100px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
    pointer-events: none;
  }

  .popup-close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .popup-close-btn:hover {
    color: #ff2d55;
  }

  .popup-title {
    margin: 0 0 20px 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
    text-align: center;
  }

  .popup-content-box {
    width: 100%;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    text-align: center;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .popup-url {
    font-size: 14px;
    font-weight: 700;
    color: #00ffff;
    letter-spacing: 0.5px;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
    word-break: break-all;
    user-select: all;
  }

  .popup-actions-row {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .popup-action-btn {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    border-radius: 12px;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    padding: 12px 28px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2);
  }

  .popup-action-btn:hover {
    border-color: #00ff9f;
    box-shadow: 0 0 20px rgba(0, 255, 159, 0.4);
    transform: translateY(-1px);
  }

  .popup-action-btn.copied {
    border-color: #00ff9f;
    background: rgba(0, 255, 159, 0.15);
    color: #00ff9f;
    box-shadow: 0 0 20px rgba(0, 255, 159, 0.3);
    text-shadow: 0 0 8px rgba(0, 255, 159, 0.5);
  }
</style>
