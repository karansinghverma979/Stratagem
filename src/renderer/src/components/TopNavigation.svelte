<script lang="ts">
  import { onMount } from 'svelte';
  import { AudioEngine } from '../core/audio-engine.js';
  import { triggerShield } from '../core/shield-store.js';

  let { currentSector = $bindable('Execution'), onsectorchange, onlogoclick, hasBreached = true } = $props();
  const sectors = ['Execution', 'Arsenal', 'Breach', 'Archive', 'Chronos', 'Genesis'];

  onMount(() => {
    if (window.osAPI && window.osAPI.onResizeAttempt) {
      const unsub = window.osAPI.onResizeAttempt(() => {
        console.log('[Dimension Lock] Window resize attempt blocked.');
      });
      return unsub;
    }
  });

  const closeWindow = () => {
    try {
      AudioEngine.play('shutdown');
      triggerShield('SYSTEM SHUTDOWN INITIATED', 'CRITICAL', 1500);
      setTimeout(() => {
        if (window.osAPI && window.osAPI.closeWindow) {
          window.osAPI.closeWindow();
        } else {
          console.log('Shutdown completion fallback');
        }
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };


</script>

<header class="top-bar">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_to_interactive_role, a11y_interactive_supports_focus -->
  <div class="logo-container" onclick={onlogoclick} role="button" tabindex="0">
    <div class="logo-icon">
      <svg class="masterpiece-logo" width="54" height="54" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="stratagem-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff2a2a">
              <animate attributeName="stop-color" values="#ff2a2a; #ff007b; #ff2a2a" dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stop-color="#ff7b00">
              <animate attributeName="stop-color" values="#ff7b00; #ffb700; #ff7b00" dur="5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          
          <linearGradient id="stratagem-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff007b">
              <animate attributeName="stop-color" values="#ff007b; #9d00ff; #ff007b" dur="7s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stop-color="#ff2a2a" />
          </linearGradient>

          <filter id="hyper-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="ray-grad-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="transparent" />
            <stop offset="20%" stop-color="rgba(255,255,255,0)" />
            <stop offset="50%" stop-color="rgba(255,255,255,0.8)" />
            <stop offset="80%" stop-color="rgba(255,255,255,0)" />
            <stop offset="100%" stop-color="transparent" />
          </linearGradient>
          <linearGradient id="ray-grad-h" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="transparent" />
            <stop offset="20%" stop-color="rgba(255,255,255,0)" />
            <stop offset="50%" stop-color="rgba(255,255,255,0.8)" />
            <stop offset="80%" stop-color="rgba(255,255,255,0)" />
            <stop offset="100%" stop-color="transparent" />
          </linearGradient>
        </defs>

        <!-- Outer Orbit 1 -->
        <circle class="orbit-ring fast-ring" cx="50" cy="50" r="42" stroke="url(#stratagem-grad-1)" stroke-width="2.5" stroke-dasharray="15 35" fill="none" opacity="0.9" />
        <!-- Outer Orbit 2 -->
        <circle class="orbit-ring slow-ring" cx="50" cy="50" r="34" stroke="url(#stratagem-grad-2)" stroke-width="2" stroke-dasharray="50 15 5 15" fill="none" opacity="0.75" />
        
        <!-- Core Gem -->
        <g class="core-gem" filter="url(#hyper-glow)">
          <path d="M50 12 L82 50 L50 88 L18 50 Z" fill="url(#stratagem-grad-1)" opacity="0.85" />
          <path d="M50 24 L72 50 L50 76 L28 50 Z" fill="url(#stratagem-grad-2)" opacity="0.95" />
          
          <!-- Perpendicular Tactical Crosshairs -->
          <line x1="50" y1="-200" x2="50" y2="300" stroke="url(#ray-grad-v)" stroke-width="0.8" pointer-events="none" />
          <line x1="-200" y1="50" x2="300" y2="50" stroke="url(#ray-grad-h)" stroke-width="0.8" pointer-events="none" />
        </g>
        
        <!-- Inner Energy Node -->
        <circle class="pulse-node" cx="50" cy="50" r="7" fill="#ffffff" />
      </svg>
    </div>
    <span class="logo-text">STRATAGEM</span>
  </div>

  <nav class="sectors-tabs">
    {#each sectors as sector}
      <button 
        class="tab-btn" 
        class:active={currentSector === sector}
        class:breach-alert={sector === 'Breach' && hasBreached}
        onclick={() => {
          currentSector = sector;
          if (onsectorchange) onsectorchange(sector);
          AudioEngine.play('ui-click');
        }}
      >
        {#if sector === 'Execution'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        {:else if sector === 'Arsenal'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-7.88 2.5 2.5 0 0 1 2.46-6.06zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-7.88 2.5 2.5 0 0 0-2.46-6.06z"/>
          </svg>
        {:else if sector === 'Breach'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/>
          </svg>
        {:else if sector === 'Archive'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
          </svg>
        {:else if sector === 'Chronos'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        {:else if sector === 'Genesis'}
          <svg class="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M2 12h4"/><path d="m7.8 7.8-2.9-2.9"/>
          </svg>
        {/if}
        <span class="tab-label">{sector.toUpperCase()}</span>
      </button>
    {/each}
  </nav>

  <div class="window-controls">

    <button class="control-btn close nuke-style" onclick={closeWindow} title="Shutdown Sequence">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</header>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80px; /* Scaled up for more presence */
    padding: 0 24px;
    background: linear-gradient(180deg, rgba(10, 12, 24, 0.9) 0%, rgba(2, 2, 5, 1) 100%);
    backdrop-filter: blur(50px) saturate(220%);
    -webkit-backdrop-filter: blur(50px) saturate(220%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    user-select: none;
    box-shadow: 0 15px 60px rgba(0, 0, 0, 0.9);
    position: relative;
    z-index: 1000;
    box-sizing: border-box;
  }

  .top-bar::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 1.5px;
    background: linear-gradient(90deg, transparent, var(--primary-accent), var(--secondary-accent), var(--tertiary-accent), transparent);
    opacity: 0.7;
  }

  .logo-container {
    display: flex;
    align-items: center;
    gap: 14px;
    -webkit-app-region: no-drag;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* The visual animations are isolated to the children so they don't affect layout sizing */
  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 12px var(--secondary-glow));
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease;
    animation: logo-oscillation 3s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  }

  .logo-container:hover .logo-icon {
    animation: logo-oscillation 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
    filter: drop-shadow(0 0 25px rgba(0, 163, 255, 1)) drop-shadow(0 0 35px rgba(255, 0, 128, 0.8)) brightness(1.3);
  }

  @keyframes logo-oscillation {
    0%, 20%, 80%, 100% { transform: scale(1) rotate(0deg); }
    40% { transform: scale(1.1) rotate(-180deg); }
    60% { transform: scale(1.1) rotate(180deg); }
  }

  .logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 950;
    font-size: 22px; /* Slightly upscaled */
    letter-spacing: 0.25em;
    background: linear-gradient(90deg, var(--secondary-accent), var(--primary-accent), #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px var(--primary-glow));
    text-transform: uppercase;
    transition: filter 0.4s ease;
    position: relative;
    display: inline-block;
    animation: logo-breathe 5s ease-in-out infinite;
  }

  @keyframes logo-breathe {
    0%, 100% { 
      filter: drop-shadow(0 0 10px var(--primary-glow)) brightness(1);
      opacity: 0.85;
    }
    50% { 
      filter: drop-shadow(0 0 22px var(--primary-glow)) brightness(1.2);
      opacity: 1;
    }
  }

  @keyframes logo-slice {
    0% { clip-path: inset(20% 0 80% 0); transform: translate(-4px, 0); opacity: 0.7; }
    1% { clip-path: inset(60% 0 10% 0); transform: translate(4px, 0); opacity: 0.7; }
    2% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, 0); opacity: 0.7; }
    3% { clip-path: inset(80% 0 5% 0); transform: translate(2px, 0); opacity: 0.7; }
    4% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
    100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); opacity: 0; }
  }

  .logo-container:hover .logo-text {
    filter: drop-shadow(0 0 20px rgba(255, 123, 0, 1)) drop-shadow(0 0 35px rgba(255, 0, 128, 0.8)) brightness(1.2);
  }

  .sectors-tabs {
    display: flex;
    align-items: center;
    gap: 15px; /* Slightly increased gap between buttons */
    height: 100%;
    -webkit-app-region: no-drag;
    margin: 0 0 0 15px; /* Distance finely adjusted */
    flex: 1;
    justify-content: flex-start; /* Locks the tabs closer to the left side */
    overflow: visible;
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 13px 24px; /* Very slightly decreased padding */
    background: rgba(20, 22, 40, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 100px;
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Outfit', sans-serif;
    font-weight: 950 !important;
    font-size: 15.2px; /* Very slightly decreased font size */
    text-transform: uppercase;
    letter-spacing: 0.12em;
    cursor: pointer;
    transition: all 0.4s var(--ease-fui);
    outline: none;
    -webkit-app-region: no-drag;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .tab-btn:hover {
    color: #ffffff;
    background: rgba(139, 92, 246, 0.25);
    border-color: rgba(139, 92, 246, 0.7);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.4);
  }

  .tab-btn.active {
    color: #ffffff;
    background: linear-gradient(135deg, #ec4899, #8b5cf6, #0ea5e9);
    background-size: 200% 200%;
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 
      0 15px 40px rgba(0, 0, 0, 0.7), 
      0 0 35px rgba(139, 92, 246, 0.9),
      inset 0 0 12px rgba(255, 255, 255, 0.5);
    animation: gradientShift 6s ease infinite;
    transform: scale(1.06);
    z-index: 2;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .tab-btn.active::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: sweep 4s infinite linear;
    z-index: 1;
  }

  @keyframes sweep {
    0% { left: -100%; }
    40% { left: 100%; }
    100% { left: 100%; }
  }

  .tab-label {
    position: relative;
    z-index: 2;
    font-weight: 950 !important;
  }

  .tab-icon {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
  }

  .tab-btn.active .tab-icon {
    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 1));
    stroke-width: 3.5;
  }

  .tab-btn.breach-alert {
    border-color: var(--critical-alert) !important;
    color: #fff !important;
    background: rgba(255, 45, 85, 0.35);
    box-shadow: 0 0 30px rgba(255, 45, 85, 0.8);
  }

  .window-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    -webkit-app-region: no-drag;
    flex-shrink: 0;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px; /* Upscaled */
    height: 40px; /* Upscaled */
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all var(--anim-fast);
    outline: none;
    -webkit-app-region: no-drag;
  }

  .control-btn:hover {
    color: #ffffff;
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.15);
  }

  :global(.control-btn.maximize:hover) {
    border-color: var(--tertiary-accent);
    box-shadow: 0 0 25px var(--tertiary-glow);
    color: var(--tertiary-accent);
  }

  /* Solid Nuke Styled Close Button */
  .control-btn.close.nuke-style {
    background: linear-gradient(90deg, #ef4444 0%, #991b1b 100%);
    border: 2px solid #ef4444;
    color: #ffffff;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .control-btn.close.nuke-style:hover {
    filter: brightness(1.25);
    box-shadow: 0 0 35px rgba(239, 68, 68, 0.9);
    transform: rotate(90deg) scale(1.15);
  }

  .tab-icon {
    transition: transform 0.4s var(--ease-fui), filter 0.4s var(--ease-fui);
  }
  .tab-btn:hover .tab-icon {
    transform: translateY(-3px) scale(1.15) rotate(5deg);
    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.9));
  }
  .tab-btn.active .tab-icon {
    animation: icon-pulse 2.5s infinite ease-in-out;
  }
  @keyframes icon-pulse {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)); }
    50% { transform: scale(1.2); filter: drop-shadow(0 0 25px rgba(255, 255, 255, 1)); }
  }

  .masterpiece-logo {
    filter: drop-shadow(0 0 20px rgba(255, 42, 42, 0.6));
    overflow: visible;
  }
  .orbit-ring.fast-ring {
    transform-origin: 50px 50px;
    animation: spin-cw 6s linear infinite;
  }
  .orbit-ring.slow-ring {
    transform-origin: 50px 50px;
    animation: spin-ccw 14s linear infinite;
  }
  .core-gem {
    transform-origin: 50px 50px;
    animation: gem-breathe 4s ease-in-out infinite;
  }
  .pulse-node {
    transform-origin: 50px 50px;
    animation: node-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    filter: drop-shadow(0 0 12px #ffffff);
  }
  @keyframes spin-cw { 100% { transform: rotate(360deg); } }
  @keyframes spin-ccw { 100% { transform: rotate(-360deg); } }
  @keyframes gem-breathe { 
    0%, 100% { transform: scale(0.95); filter: drop-shadow(0 0 12px #ff2a2a); } 
    50% { transform: scale(1.06); filter: drop-shadow(0 0 25px #ff7b00); } 
  }
  @keyframes node-pulse {
    0%, 100% { transform: scale(0.7); opacity: 0.7; }
    50% { transform: scale(1.4); opacity: 1; }
  }

</style>


