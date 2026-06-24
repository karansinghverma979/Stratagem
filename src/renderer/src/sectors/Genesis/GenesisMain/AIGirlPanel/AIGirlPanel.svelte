<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';
  import { AntaryamiState } from '../../../../core/store';
  import Nudity from './Nudity/Nudity.svelte';
  import NoteCards from './NoteCards/NoteCards.svelte';


  // Particle Effect Interface
  interface ParticleEffect {
    id: number;
    x: number;
    y: number;
    type: 'heart' | 'lips' | 'sparkle' | 'kiss';
    size: number;
    rotation: number;
    vx: number;
    vy: number;
    opacity: number;
  }

  // Active state variables (image state lives inside Nudity/NoteCards sub-components)
  
  let clickParticles = $state<ParticleEffect[]>([]);
  let particleIdCounter = 0;

  let currentEmote = $state('neutral');
  let adaptedColor = $state('139, 92, 246');
  let isGlitching = $state(false);
  let isReacting = $state(false); // Tap bounce trigger
  let isHeaderHovered = $state(false);

  // Mouse Parallax coordinates
  let mouseX = $state(0);
  let mouseY = $state(0);
  let targetX = 0;
  let targetY = 0;
  let animationFrameId: number;

  let activeModeRef = $state<any>(null);

  // Safe sound wrapper
  function playSound(soundName: string) {
    try {
      AudioEngine.play(soundName);
    } catch (err) {
      console.warn('AudioEngine play failed:', err);
    }
  }

  // Spawn visual particle effect (hearts, lips, sparkles, kisses) on click
  function spawnParticles(clientX: number, clientY: number) {
    const types: ('heart' | 'lips' | 'sparkle' | 'kiss')[] = ['heart', 'lips', 'sparkle', 'kiss'];
    const newParticles: ParticleEffect[] = [];
    
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 5.0;
      newParticles.push({
        id: particleIdCounter++,
        x: clientX,
        y: clientY,
        type: types[Math.floor(Math.random() * types.length)],
        size: 0.3 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.0, // upward float bias
        opacity: 1
      });
    }

    const wasEmpty = clickParticles.length === 0;
    clickParticles = [...clickParticles, ...newParticles];
    
    if (wasEmpty) {
      requestAnimationFrame(updateParticles);
    }
  }

  function updateParticles() {
    clickParticles = clickParticles
      .map(p => {
        return {
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.08, // gravity downward acceleration
          rotation: p.rotation + (p.vx * 2),
          opacity: p.opacity - 0.02
        };
      })
      .filter(p => p.opacity > 0);

    if (clickParticles.length > 0) {
      requestAnimationFrame(updateParticles);
    }
  }

  // Handle companion interaction click — called by child sub-components after they've handled image/audio
  async function handleCompanionClick(e: MouseEvent) {
    // Click reaction animations disabled for instant static changes
    isReacting = false;
    isGlitching = false;

    // Theme is updated dynamically via the onThemeChange callback when the next image loads.

    // Spawn visual particle burst on click (nudity mode only shows particles; notecards can skip)
    if ($AntaryamiState.aigirlNudityEnabled) {
      const rect = e.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : { left: 0, top: 0 };
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      spawnParticles(clickX, clickY);
    }
  }

  // Parallax mouse tracking handlers
  function handleMouseMove(e: MouseEvent) {
    const rect = e.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    targetX = (x / rect.width) - 0.5;
    targetY = (y / rect.height) - 0.5;
  }

  function updateParallax() {
    mouseX += (targetX - mouseX) * 0.08;
    mouseY += (targetY - mouseY) * 0.08;
    animationFrameId = requestAnimationFrame(updateParallax);
  }



  onMount(() => {
    updateParallax();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
  });
</script>

<!-- SVG wind sway filter vectors -->
<svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
  <defs>
    <filter id="valkyrie-wind-sway" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.005 0.015" numOctaves="2" result="noise">
        <animate attributeName="baseFrequency" dur="12s" keyTimes="0;0.5;1" values="0.005 0.015; 0.007 0.035; 0.005 0.015" repeatCount="indefinite" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
</svg>

<div 
  class="ai-girl-panel glass-container active-state-{currentEmote}" 
  class:nude-active={$AntaryamiState.aigirlNudityEnabled}
  style="--custom-adapted-rgb: {adaptedColor}"
  in:fade={{ duration: 120 }} 
  out:fade={{ duration: 60 }}
>
  <!-- Top Tech Header -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="panel-header" 
    onmouseenter={() => { isHeaderHovered = true; playSound('ui-hover'); }} 
    onmouseleave={() => isHeaderHovered = false}
  >
    <div 
      class="live-icon aigirl-icon" 
      class:acquired={isHeaderHovered}
      class:valiant-state={currentEmote === 'happy'} 
      class:challenge-state={currentEmote === 'angry'}
    >
      <svg viewBox="0 0 100 100" class="svg-anim">
        <defs>
          <linearGradient id="ring-grad-aigirl" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00ffff" />
            <stop offset="50%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>
        
        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ring-grad-aigirl)" stroke-width="3" stroke-dasharray="15 30 10 5" class="spin-cw-slow" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0, 255, 255, 0.45)" stroke-width="2.5" stroke-dasharray="2 6" class="spin-ccw-slow" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(139, 92, 246, 0.3)" stroke-width="5" stroke-dasharray="100 20" class="spin-cw-fast" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" stroke-dasharray="1 10" class="spin-ccw-slow" />

        <g class="pumping-bio-heart">
          <path d="M 37 18 Q 36 28 39 34 L 45 32 Q 41 24 42 18 Z" fill="#22a6b3" />
          <path d="M 40 70 Q 42 76 45 80 L 49 76 Q 47 72 45 68 Z" fill="#22a6b3" opacity="0.8" />
          <path d="M 64 36 L 73 34 L 72 39 L 64 41 Z" fill="#b33939" />
          <path d="M 65 44 L 74 46 L 73 50 L 64 47 Z" fill="#b33939" />
          <path d="M 46 32 C 45 20, 56 12, 64 16 C 68 18, 70 24, 66 34 C 64 38, 58 40, 52 35 Z" fill="#ff6b6b" />
          <path d="M 52 16 L 50 8 C 50 6, 52 6, 53 8 L 55 15 Z" fill="#ff6b6b" />
          <path d="M 58 15 L 59 7 C 59 5, 61 5, 62 7 L 61 16 Z" fill="#ff6b6b" />
          <path d="M 63 17 L 67 9 C 67 7, 69 7, 70 9 L 66 19 Z" fill="#ff6b6b" />
          <path d="M 44 32 C 48 30, 56 28, 58 35 C 60 40, 55 45, 48 44 Z" fill="#22a6b3" />
          <path d="M 48 34 C 36 34, 25 42, 28 56 C 30 68, 44 76, 50 82 C 51 82, 53 78, 56 72 C 60 62, 64 50, 62 44 C 60 38, 54 34, 48 34 Z" fill="#e01e5a" />
        </g>
      </svg>
    </div>
    
    <div class="title-group-animated" class:acquired={isHeaderHovered}>
      <div class="title-fui-shell">
        <h1 class="forge-title font-outfit">SYNTHETIC COMPANION</h1>
      </div>
    </div>
  </div>

  <!-- Interactive Stage: Rebuilt layout centering the anime companion and adding background node canvas -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="interactive-stage" 
    onmousemove={handleMouseMove} 
    role="presentation"
  >
    <!-- Flowing morphing ambient glow blobs -->
    <div class="ambient-glow-blobs">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="blob blob-4"></div>
    </div>

    <!-- Dynamic polished digital patterns overlay layer (peer to prevent blur inheritance) -->
    <div class="blob-grid-pattern"></div>



    <!-- Mode Sub-Component Mount: Nudity or NoteCards based on settings toggle -->
    {#if $AntaryamiState.aigirlNudityEnabled}
      <Nudity
        bind:this={activeModeRef}
        currentEmote={currentEmote}
        isGlitching={isGlitching}
        isReacting={isReacting}
        onThemeChange={(theme) => currentEmote = theme}
        onColorChange={(rgb) => adaptedColor = rgb}
        onCompanionClick={handleCompanionClick}
      />
    {:else}
      <NoteCards
        bind:this={activeModeRef}
        currentEmote={currentEmote}
        isGlitching={isGlitching}
        isReacting={isReacting}
        onThemeChange={(theme) => currentEmote = theme}
        onColorChange={(rgb) => adaptedColor = rgb}
        onCompanionClick={handleCompanionClick}
      />
    {/if}

    <!-- Floating Interaction Particle Effects Render Layer (parent-scoped) -->
    <div class="particle-overlay" aria-hidden="true">
      {#each clickParticles as p (p.id)}
        <div 
          class="float-particle p-type-{p.type}"
          style="left: {p.x}px; top: {p.y}px; transform: translate(-50%, -50%) rotate({p.rotation}deg) scale({p.size}); opacity: {p.opacity};"
        >
          {#if p.type === 'heart'}
            <svg viewBox="0 0 100 100" class="svg-p pink-glow">
              <path d="M 50 20 C 35 0 0 0 0 35 C 0 55 35 80 50 90 C 65 80 100 55 100 35 C 100 0 65 0 50 20 Z" fill="#ec4899" />
            </svg>
          {:else if p.type === 'lips'}
            <svg viewBox="0 0 100 100" class="svg-p red-glow">
              <path d="M 10 50 Q 30 25 50 40 Q 70 25 90 50 Q 70 75 50 65 Q 30 75 10 50 Z" fill="#ef4444" />
              <path d="M 10 52 Q 30 55 50 52 Q 70 55 90 52 Q 70 50 50 50 Q 30 50 10 52 Z" fill="#991b1b" />
            </svg>
          {:else if p.type === 'sparkle'}
            <svg viewBox="0 0 100 100" class="svg-p gold-glow">
              <path d="M 50 0 L 62 38 L 100 50 L 62 62 L 50 100 L 38 62 L 0 50 L 38 38 Z" fill="#fbbf24" />
            </svg>
          {:else}
            <svg viewBox="0 0 100 100" class="svg-p magenta-glow">
              <path d="M 30 40 C 20 25 0 25 0 45 C 0 60 25 75 30 80 C 35 75 60 60 60 45 C 60 25 40 25 30 40 Z" fill="#d946ef" />
              <path d="M 70 20 C 62 10 48 10 48 24 C 48 34 66 44 70 48 C 74 44 92 34 92 24 C 92 10 78 10 70 20 Z" fill="#ec4899" transform="scale(0.7) translate(30, 20)" />
            </svg>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Base Container Layout */
  .ai-girl-panel {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    
    /* Dynamic adapted RGB configuration */
    --adapted-rgb: var(--custom-adapted-rgb, var(--active-bg-rgb, 139, 92, 246));
    
    background: linear-gradient(135deg, rgba(12, 8, 28, 0.95) 0%, rgba(var(--adapted-rgb), 0.08) 50%, rgba(6, 6, 16, 0.98) 100%);
    border: 1px solid rgba(var(--adapted-rgb), 0.25);
    border-radius: 34px;
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    box-shadow: 
      inset 0 1px 2px rgba(var(--adapted-rgb), 0.25),
      0 16px 45px rgba(0, 0, 0, 0.85);
    position: relative;
    overflow: hidden;
    transition: border-color 0.8s cubic-bezier(0.16, 1, 0.3, 1);

    /* Dynamic organic ambient color states */
    --blob-color-1: rgba(var(--adapted-rgb), 0.28);
    --blob-color-2: rgba(var(--adapted-rgb), 0.18);
    --blob-color-3: rgba(var(--adapted-rgb), 0.12);
    --blob-color-4: rgba(var(--adapted-rgb), 0.22);

    --active-bg-rgb: 139, 92, 246;
    --telemetry-glow-color: #a78bfa;
  }

  /* Override red border when nudity mode is active */
  .ai-girl-panel.nude-active {
    --adapted-rgb: var(--custom-adapted-rgb, 139, 92, 246);
    border: 1px solid rgba(var(--adapted-rgb), 0.22) !important;
    box-shadow: 
      inset 0 1px 2px rgba(var(--adapted-rgb), 0.22),
      0 16px 45px rgba(0, 0, 0, 0.85) !important;
  }

  .ai-girl-panel.active-state-angry { 
    --blob-color-1: rgba(239, 68, 68, 0.35);
    --blob-color-2: rgba(220, 38, 38, 0.22);
    --blob-color-3: rgba(139, 92, 246, 0.15);
    --blob-color-4: rgba(185, 28, 28, 0.2);
    --active-bg-rgb: 239, 68, 68;
    --telemetry-glow-color: #fca5a5;
  }
  .ai-girl-panel.active-state-tactical { 
    --blob-color-1: rgba(6, 182, 212, 0.35);
    --blob-color-2: rgba(8, 145, 178, 0.22);
    --blob-color-3: rgba(139, 92, 246, 0.18);
    --blob-color-4: rgba(2, 132, 199, 0.25);
    --active-bg-rgb: 6, 182, 212;
    --telemetry-glow-color: #67e8f9;
  }
  .ai-girl-panel.active-state-happy { 
    --blob-color-1: rgba(34, 197, 94, 0.32);
    --blob-color-2: rgba(21, 128, 61, 0.22);
    --blob-color-3: rgba(139, 92, 246, 0.15);
    --blob-color-4: rgba(101, 163, 13, 0.2);
    --active-bg-rgb: 34, 197, 94;
    --telemetry-glow-color: #86efac;
  }
  .ai-girl-panel.active-state-empathy { 
    --blob-color-1: rgba(236, 72, 153, 0.35);
    --blob-color-2: rgba(219, 39, 119, 0.25);
    --blob-color-3: rgba(6, 182, 212, 0.18);
    --blob-color-4: rgba(244, 63, 94, 0.2);
    --active-bg-rgb: 236, 72, 153;
    --telemetry-glow-color: #fbcfe8;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    height: 60px;
    box-sizing: border-box;
    padding: 0 0 16px 0;
    margin: 30px 30px 0 30px;
    position: relative;
    user-select: none;
    outline: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .live-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 6px var(--glow-color, rgba(139, 92, 246, 0.6)));
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
  }

  .live-icon:hover {
    transform: scale(1.15);
    filter: drop-shadow(0 0 12px #ec4899);
  }

  .aigirl-icon {
    --glow-color: rgba(139, 92, 246, 0.6);
  }

  .aigirl-icon.valiant-state {
    --glow-color: rgba(34, 197, 94, 0.7);
  }

  .aigirl-icon.challenge-state {
    --glow-color: rgba(255, 59, 48, 0.7);
  }

  .spin-cw-slow {
    transform-origin: 50px 50px;
    animation: spinCW 20s linear infinite;
  }

  .spin-ccw-slow {
    transform-origin: 50px 50px;
    animation: spinCCW 15s linear infinite;
  }

  .spin-cw-fast {
    transform-origin: 50px 50px;
    animation: spinCW 6s linear infinite;
  }

  .pumping-bio-heart {
    transform-origin: 50px 50px;
    animation: pumpHeartBio 1.2s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  @keyframes pumpHeartBio {
    0% { transform: scale(0.9); }
    15% { transform: scale(1.05); }
    30% { transform: scale(0.95); }
    45% { transform: scale(1.1); }
    70% { transform: scale(0.9); }
    100% { transform: scale(0.9); }
  }

  @keyframes spinCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spinCCW {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

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
    font-size: 38px; /* Recovered larger size from developer panel */
    font-weight: 950;
    color: #fff;
    margin: 0;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
    animation: chroma-loop 8s linear infinite, glow-breath 5s infinite alternate ease-in-out;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes chroma-loop { 
    from { background-position: 0% center; } 
    to { background-position: 200% center; } 
  }

  /* Center stage layout centering anime companion in open space */
  .interactive-stage {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    border-radius: 0 0 32px 32px;
  }

  :global(.character-viewport) {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    cursor: pointer;
  }



  /* Simple clean image presentations in original rich colors (supports JPG, PNG, GIF of all shapes) */
  :global(.full-body-avatar) {
    position: relative;
    max-width: 75%;
    max-height: 95%;
    width: auto;
    height: auto;
    object-fit: contain;
    pointer-events: auto;
    display: block;
    margin: 0 auto;
    animation: breathing 4.5s ease-in-out infinite alternate;
    z-index: 2;
    filter: drop-shadow(0 0 25px rgba(var(--active-bg-rgb), 0.25)) drop-shadow(0 0 2px rgba(var(--active-bg-rgb), 0.45));
    transition: none !important;
  }

  /* Breathing loop */
  @keyframes breathing {
    0% {
      transform: scale(1) translateY(0);
    }
    100% {
      transform: scale(1.015) translateY(-3px);
    }
  }

  /* Recoil animation */
  :global(.recoil-active .full-body-avatar) {
    animation: physicallyRecoil 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.25);
  }

  @keyframes physicallyRecoil {
    0% { transform: scale(1) translate3d(0, 0, 0); }
    15% { transform: scale(0.96) translate3d(0, 10px, -20px) rotate(-1deg); }
    40% { transform: scale(1.03) translate3d(0, -12px, 30px) rotate(1.5deg); }
    70% { transform: scale(0.99) translate3d(0, 2px, -5px); }
    100% { transform: scale(1) translate3d(0, 0, 0); }
  }

  /* Glitch controller filters */
  :global(.glitch-active .full-body-avatar) {
    animation: glitchAnimation 0.15s steps(2) infinite;
    filter: hue-rotate(90deg) contrast(150%) brightness(120%) drop-shadow(0 0 20px rgba(0,255,255,1)) !important;
  }

  @keyframes glitchAnimation {
    0% { transform: translate(3px, 1px) skewX(2deg); clip-path: inset(10% 0 30% 0); }
    50% { transform: translate(-2px, -3px) skewX(-3deg); clip-path: inset(40% 0 10% 0); }
    100% { transform: translate(1px, 2px) skewX(1deg); clip-path: inset(5% 0 80% 0); }
  }



  /* Particle effects overlay layer (parent-scoped, sits above sub-component) */
  .particle-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 20;
    overflow: hidden;
  }



  /* Interaction floating particle effects */
  .float-particle {
    position: absolute;
    width: 44px;
    height: 44px;
    pointer-events: none;
    z-index: 15;
    will-change: transform, left, top, opacity;
  }

  .svg-p {
    width: 100%;
    height: 100%;
  }

  .pink-glow { filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.85)); }
  .red-glow { filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.85)); }
  .gold-glow { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.85)); }
  .magenta-glow { filter: drop-shadow(0 0 8px rgba(217, 70, 239, 0.85)); }

  .font-outfit { font-family: 'Outfit', sans-serif; }

  /* Flowing morphing ambient glow blobs */
  .ambient-glow-blobs {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    opacity: 0.9;
    background: 
      radial-gradient(circle at 35% 65%, rgba(var(--active-bg-rgb), 0.18), transparent 60%),
      radial-gradient(circle at 75% 35%, rgba(var(--active-bg-rgb), 0.12), transparent 50%),
      rgba(6, 4, 12, 0.55);
    background-size: 200% 200%;
    filter: blur(8px);
    animation: flow-matter 15s infinite alternate ease-in-out;
    transition: background 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Dynamic polished digital patterns overlay layer */
  .blob-grid-pattern {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 20px 20px, 20px 20px;
    background-position: center center;
    z-index: 1;
    pointer-events: none;
    opacity: 0.9;
    transition: background-image 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes flow-matter {
    0% { background-position: 0% 0%; }
    100% { background-position: 100% 100%; }
  }

  /* Glassmorphic sheen overlay */
  .ambient-glow-blobs::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.01) 40%,
      rgba(0, 0, 0, 0.2) 100%
    );
    z-index: 2;
    pointer-events: none;
  }

  /* Cyberpunk analog/digital grain texture overlay */
  .ambient-glow-blobs::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    z-index: 3;
    pointer-events: none;
  }

  .blob {
    position: absolute;
    mix-blend-mode: screen;
    filter: blur(12px);
    transition: background 1.6s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, border-radius;
  }

  .blob-1 {
    width: 460px;
    height: 460px;
    background: radial-gradient(circle, var(--blob-color-1) 0%, rgba(var(--active-bg-rgb), 0.05) 50%, transparent 80%);
    top: -8%;
    left: -5%;
    animation: liquidFlow1 24s infinite alternate ease-in-out;
  }

  .blob-2 {
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, var(--blob-color-2) 0%, rgba(var(--active-bg-rgb), 0.05) 50%, transparent 80%);
    bottom: -12%;
    right: -8%;
    animation: liquidFlow2 28s infinite alternate ease-in-out;
  }

  .blob-3 {
    width: 390px;
    height: 390px;
    background: radial-gradient(circle, var(--blob-color-3) 0%, rgba(var(--active-bg-rgb), 0.05) 50%, transparent 80%);
    top: 20%;
    right: 15%;
    animation: liquidFlow3 20s infinite alternate ease-in-out;
  }

  .blob-4 {
    width: 440px;
    height: 440px;
    background: radial-gradient(circle, var(--blob-color-4) 0%, rgba(var(--active-bg-rgb), 0.05) 50%, transparent 80%);
    bottom: 15%;
    left: 20%;
    animation: liquidFlow4 26s infinite alternate ease-in-out;
  }

  @keyframes liquidFlow1 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
    50% { transform: translate(60px, 40px) scale(1.15) rotate(180deg); border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
    100% { transform: translate(-40px, 80px) scale(0.9) rotate(360deg); border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
  }

  @keyframes liquidFlow2 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
    50% { transform: translate(-80px, -60px) scale(0.85) rotate(-180deg); border-radius: 45% 55% 35% 65% / 40% 60% 40% 60%; }
    100% { transform: translate(30px, 20px) scale(1.1) rotate(-360deg); border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
  }

  @keyframes liquidFlow3 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); border-radius: 35% 65% 50% 50% / 50% 35% 65% 50%; }
    50% { transform: translate(50px, -80px) scale(1.2) rotate(120deg); border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%; }
    100% { transform: translate(-50px, 40px) scale(0.95) rotate(240deg); border-radius: 35% 65% 50% 50% / 50% 35% 65% 50%; }
  }

  @keyframes liquidFlow4 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%; }
    50% { transform: translate(-30px, 60px) scale(0.9) rotate(-120deg); border-radius: 40% 60% 60% 40% / 40% 50% 50% 60%; }
    100% { transform: translate(60px, -30px) scale(1.15) rotate(-240deg); border-radius: 50% 50% 30% 70% / 50% 60% 40% 50%; }
  }
</style>
