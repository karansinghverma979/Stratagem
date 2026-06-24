<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';

  interface Props {
    isOpen: boolean;
    buttonName: string;
    onClose: () => void;
  }

  let { isOpen, buttonName, onClose } = $props<Props>();

  // Philosophy content for each button type
  const devDetails: Record<string, {
    title: string;
    alias: string;
    element: string;
    description: string;
    coordinates: string;
    themeClass: string;
  }> = {
    ADHIPATI: {
      title: 'ADHIPATI',
      alias: 'SUPREME SOVEREIGN OVERLORD',
      element: 'FIRE (KINETIC EXPANSION & THERMAL OVERRIDE)',
      description: 'The Prime Sovereign. Governing core execution pipelines, high-threat prioritization matrix, and kinetic process deployment. Represents relentless thermal drive controlled by strategic willpower.',
      coordinates: 'SECTOR_CORE // LAT_45.82_N // LON_102.19_E',
      themeClass: 'theme-fire'
    },
    ANTARYAMI: {
      title: 'ANTARYAMI',
      alias: 'INFINITE INNER WITNESS',
      element: 'WATER (FLUID DATA FLOW & RELATION STREAMS)',
      description: 'The Omnipresent State Synchronizer. Monitoring relational database changes, thread pooling, and system-wide reactive state variables. Represents infinite fluidity and adaptive data streams.',
      coordinates: 'SECTOR_SYNC // LAT_12.92_N // LON_77.59_E',
      themeClass: 'theme-water'
    },
    JIGYASHU: {
      title: 'JIGYASHU',
      alias: 'KINETIC INTEL SEARCH VECTOR',
      element: 'AIR (COGNITIVE ATMOSPHERE & COMPILER SWAY)',
      description: 'The Seeker of Diagnostics. Inspecting telemetry layers, compiling user feedback logs, and routing diagnostic vectors. Represents atmospheric wind sways and cognitive curiosity.',
      coordinates: 'SECTOR_INTEL // LAT_28.61_N // LON_77.20_E',
      themeClass: 'theme-air'
    },
    BHAKTA: {
      title: 'BHAKTA',
      alias: 'SOLID INTEGRITY GUARDIAN',
      element: 'SOLID (EARTHEN CACHE & SECURITY LOCKOUT)',
      description: 'The Devoted Foundation. Enforcing encryption safety protocols, hardware locking limits, and deep focus isolation cages. Represents absolute solid-state persistence and unyielding containment.',
      coordinates: 'SECTOR_SHIELD // LAT_37.77_N // LON_122.41_W',
      themeClass: 'theme-solid'
    },
    SHAVA: {
      title: 'SHAVA',
      alias: 'VOID PURGE TERMINATOR',
      element: 'VOID (SHADOW ABSORPTION & PROCESS DISSISSIPATION)',
      description: 'The Transcendent Vacuum. Handling system-wide nuke purges, garbage collection culling, and emergency memory dumps. Represents shadow processes dissolved into the background space.',
      coordinates: 'SECTOR_VOID // LAT_00.00_N // LON_00.00_W',
      themeClass: 'theme-void'
    }
  };

  const details = $derived(devDetails[buttonName] || devDetails['ADHIPATI']);

  function handleClose() {
    AudioEngine.play('fail');
    onClose();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="popup-overlay" transition:fade={{ duration: 180 }} onclick={handleClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="popup-card glass-container {details.themeClass}" 
      transition:fly={{ y: 25, duration: 250 }} 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <!-- Cybernetic Glowing Orbs -->
      <div class="glow-orb orb-primary"></div>
      <div class="glow-orb orb-secondary"></div>

      <header class="popup-header">
        <div class="header-led"></div>
        <div class="title-group">
          <h2 class="popup-title font-outfit">{details.title}</h2>
          <span class="popup-alias font-mono">{details.alias}</span>
        </div>
      </header>

      <main class="popup-content">
        <p class="popup-description font-outfit-body">{details.description}</p>
      </main>

      <footer class="popup-footer" style="justify-content: center;">
        <button class="dismiss-btn" onclick={handleClose} onmouseenter={() => AudioEngine.play('ui-hover')}>
          ACKNOWLEDGE PROTOCOL
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .popup-overlay {
    position: fixed;
    top: 80px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    background: rgba(2, 2, 6, 0.85);
    backdrop-filter: blur(12px);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    will-change: opacity;
  }

  .popup-card {
    width: 95%;
    max-width: 760px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    background: linear-gradient(135deg, rgba(12, 10, 24, 0.96) 0%, rgba(6, 4, 12, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 28px;
    box-shadow: 
      inset 0 1px 2px rgba(255, 255, 255, 0.1),
      0 24px 60px rgba(0, 0, 0, 0.95);
    padding: 32px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    will-change: transform, opacity;
  }

  .popup-card::-webkit-scrollbar {
    display: none;
  }

  /* COLOR THEMES FOR CARD BORDERS & GLOWS */
  .theme-fire {
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(239, 68, 68, 0.05),
      0 0 35px rgba(239, 68, 68, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #ef4444;
    --theme-glow: rgba(239, 68, 68, 0.45);
    --theme-gradient-end: #f97316;
  }

  .theme-water {
    border-color: rgba(6, 182, 212, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(6, 182, 212, 0.05),
      0 0 35px rgba(6, 182, 212, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #06b6d4;
    --theme-glow: rgba(6, 182, 212, 0.45);
    --theme-gradient-end: #8b5cf6;
  }

  .theme-air {
    border-color: rgba(167, 139, 250, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(167, 139, 250, 0.05),
      0 0 35px rgba(167, 139, 250, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #a78bfa;
    --theme-glow: rgba(167, 139, 250, 0.45);
    --theme-gradient-end: #ec4899;
  }

  .theme-solid {
    border-color: rgba(245, 158, 11, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(245, 158, 11, 0.05),
      0 0 35px rgba(245, 158, 11, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #f59e0b;
    --theme-glow: rgba(245, 158, 11, 0.45);
    --theme-gradient-end: #ef4444;
  }

  .theme-void {
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(255, 255, 255, 0.05),
      0 0 35px rgba(255, 255, 255, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #ffffff;
    --theme-glow: rgba(255, 255, 255, 0.45);
    --theme-gradient-end: #a1a1aa;
  }

  /* Volumetric backglows inside the cards */
  .glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(50px);
    opacity: 0.18;
    pointer-events: none;
    z-index: 0;
  }
  .orb-primary {
    width: 250px;
    height: 250px;
    background: var(--theme-color, #8b5cf6);
    top: -10%;
    right: -10%;
  }
  .orb-secondary {
    width: 180px;
    height: 180px;
    background: #000;
    bottom: -5%;
    left: -5%;
  }

  /* HEADER */
  .popup-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    position: relative;
    z-index: 2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
  }

  .header-led {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--theme-color, #8b5cf6);
    box-shadow: 0 0 8px var(--theme-color, #8b5cf6);
    margin-top: 22px;
    animation: led-pulse 2s infinite ease-in-out;
    transition: all 0.3s ease;
  }

  .header-led:hover {
    transform: scale(1.5);
    box-shadow: 0 0 24px var(--theme-color, #8b5cf6), 0 0 12px var(--theme-color, #8b5cf6), 0 0 6px var(--theme-color, #8b5cf6);
    filter: brightness(1.3);
    cursor: pointer;
  }

  @keyframes led-pulse {
    0% {
      box-shadow: 0 0 8px var(--theme-color, #8b5cf6), 0 0 2px var(--theme-color, #8b5cf6);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 18px var(--theme-color, #8b5cf6), 0 0 8px var(--theme-color, #8b5cf6), 0 0 4px var(--theme-color, #8b5cf6);
      transform: scale(1.25);
    }
    100% {
      box-shadow: 0 0 8px var(--theme-color, #8b5cf6), 0 0 2px var(--theme-color, #8b5cf6);
      transform: scale(1);
    }
  }

  .title-group {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 2px;
  }

  .popup-title {
    font-size: 42px;
    font-weight: 950;
    letter-spacing: 4px;
    color: #fff;
    margin: 0;
    text-transform: uppercase;
    background: linear-gradient(
      120deg,
      var(--theme-color, #8b5cf6) 0%,
      var(--theme-color, #8b5cf6) 30%,
      #ffffff 45%,
      #ffffff 55%,
      var(--theme-gradient-end, #ec4899) 70%,
      var(--theme-color, #8b5cf6) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: text-sheen 2.5s linear infinite;
    filter: drop-shadow(0 0 15px var(--theme-glow, rgba(139, 92, 246, 0.45)));
  }

  @keyframes text-sheen {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }

  .popup-alias {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* CONTENT */
  .popup-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .popup-description.font-outfit-body {
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    word-spacing: 1.5px;
    letter-spacing: 0.5px;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.1);
  }

  /* FOOTER */
  .popup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 2;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 16px;
  }

  .dismiss-btn {
    background: var(--theme-color, #8b5cf6);
    border: none;
    color: #ffffff;
    font-family: 'Outfit', sans-serif;
    font-weight: 900;
    font-size: 11px;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: all 0.2s ease;
    box-shadow: 0 0 15px var(--theme-glow, rgba(139, 92, 246, 0.35));
    text-transform: uppercase;
  }

  .dismiss-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 25px var(--theme-glow, rgba(139, 92, 246, 0.5));
    filter: brightness(1.15);
  }
</style>
