<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';


  // Header hover state
  let isHeaderHovered = $state(false);
  function handleHeaderMouseEnter() {
    isHeaderHovered = true;
    AudioEngine.play('ui-hover');
  }
  function handleHeaderMouseLeave() {
    isHeaderHovered = false;
  }

  // Automatic slideshow variables
  let imageFiles = $state<string[]>([]);
  let activeImageIndex = $state(0);
  let activeImageBase64 = $state('');
  let autoChangeIntervalId: any = null;

  async function loadImagesList() {
    try {
      const res = await window.stratagemAPI.devScanImages();
      if (res.success && res.files && res.files.length > 0) {
        const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
        imageFiles = res.files.filter(file => {
          const ext = '.' + file.split('.').pop()?.toLowerCase();
          return imgExts.includes(ext) && !file.startsWith('.');
        });
        
        if (imageFiles.length > 0) {
          if (activeImageIndex >= imageFiles.length) {
            activeImageIndex = 0;
          }
          await loadActiveImage();
        } else {
          activeImageBase64 = '';
        }
      } else {
        imageFiles = [];
        activeImageBase64 = '';
      }
    } catch (e) {
      console.error('Failed to scan dev images:', e);
    }
  }

  async function loadActiveImage() {
    if (imageFiles.length === 0) return;
    const fileName = imageFiles[activeImageIndex];
    try {
      const res = await window.stratagemAPI.devGetImageData(fileName);
      if (res.success && res.data) {
        activeImageBase64 = res.data;
      }
    } catch (e) {
      console.error('Failed to get dev image data:', e);
    }
  }

  async function handleImageClick() {
    AudioEngine.play('data-lock');
    await advanceImage();
  }

  async function advanceImage() {
    if (imageFiles.length === 0) return;
    activeImageIndex = (activeImageIndex + 1) % imageFiles.length;
    await loadActiveImage();
    resetAutoTimer();
  }

  function resetAutoTimer() {
    if (autoChangeIntervalId) {
      clearInterval(autoChangeIntervalId);
    }
    autoChangeIntervalId = setInterval(() => {
      advanceImage();
    }, 9000);
  }

  // Dynamic Memento Mori Age computation from birthdate: 18-AUG-2005
  const birthDate = new Date(2005, 7, 18); // August 18, 2005
  let mementoAge = $derived.by(() => {
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    // Convert completed months to ongoing month (the month that is currently "going")
    return { years, months: months + 1 };
  });

  function handleButtonClick(name: string) {
    AudioEngine.play('success');
    window.dispatchEvent(new CustomEvent('dev-open-popup', { detail: { type: 'dev', name } }));
  }

  function handlePanelClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Only trigger Hollow Purple in the actual empty background space.
    // Exclude buttons, input fields, links, any text headings, paragraphs, spans, and their container zones.
    const isInteractiveOrText = target.closest(
      'button, input, select, textarea, a, [role="button"], ' +
      'h1, h2, h3, h4, h5, h6, p, span, ' +
      '.dev-portrait-img, .portrait-ring-container, .omni-scope-terminal, ' +
      '.memento-mori-container, .ostinato-rigore-container, .dev-buttons-row'
    );
    if (isInteractiveOrText) return;

    AudioEngine.play('data-lock');
    window.dispatchEvent(new CustomEvent('dev-trigger-hollow-purple', {
      detail: { x: e.clientX, y: e.clientY }
    }));
  }

  onMount(async () => {
    await loadImagesList();
    resetAutoTimer();

    const handleRefresh = async () => {
      await loadImagesList();
    };
    window.addEventListener('dev-refresh-asset', handleRefresh);

    return () => {
      window.removeEventListener('dev-refresh-asset', handleRefresh);
      if (autoChangeIntervalId) {
        clearInterval(autoChangeIntervalId);
      }
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="developer-panel glass-container" in:fade={{ duration: 120 }} out:fade={{ duration: 60 }} onclick={handlePanelClick}>
  <!-- Top Tech Header -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="panel-header" onmouseenter={handleHeaderMouseEnter} onmouseleave={handleHeaderMouseLeave}>
    <!-- OMNI-SCOPE v6.0 reticle -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div 
      class="omni-scope-terminal"
      class:acquired={isHeaderHovered}
      role="button"
      tabindex="0"
      onclick={() => AudioEngine.play('success')}
    >
      <!-- Mechanical Outer Chassis -->
      <div class="scope-chassis">
        <div class="chassis-segment top"></div><div class="chassis-segment right"></div>
        <div class="chassis-segment bottom"></div><div class="chassis-segment left"></div>
      </div>

      <!-- Kinetic Data Rings -->
      <div class="scope-data-rings">
        <div class="data-ring ring-cyan"></div>
        <div class="data-ring ring-violet"></div>
      </div>

      <!-- High-Clarity Reticle System -->
      <div class="scope-reticle-core">
        <div class="lens-glint-effect"></div>
        <svg class="reticle-svg" width="100" height="100" viewBox="0 0 100 100" fill="none">
          <!-- SVG Gradient Definitions -->
          <defs>
            <linearGradient id="forge-primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--primary-accent)" />
              <stop offset="100%" stop-color="var(--secondary-accent)" />
            </linearGradient>
            <linearGradient id="forge-utilityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--tertiary-accent)" />
              <stop offset="100%" stop-color="var(--secure-status)" />
            </linearGradient>
            <linearGradient id="forge-warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--warning-amber)" />
              <stop offset="100%" stop-color="var(--secondary-accent)" />
            </linearGradient>
            <linearGradient id="forge-alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--critical-alert)" />
              <stop offset="100%" stop-color="var(--secondary-accent)" />
            </linearGradient>

            <linearGradient id="forge-spotlightNorthGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
              <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="forge-spotlightSouthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
              <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="forge-spotlightWestGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
              <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="forge-spotlightEastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
              <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
            </linearGradient>

            <linearGradient id="forge-brightCrossGrad" x1="-286" y1="50" x2="386" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="0" />
              <stop offset="42%" stop-color="var(--tertiary-accent)" stop-opacity="0.8" />
              <stop offset="50%" stop-color="#ffffff" stop-opacity="1" />
              <stop offset="58%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--primary-accent)" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- "+" Targeting crosshair spans 400px -->
          <g class="massive-plus-crosshair">
            <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#forge-utilityGrad)" stroke-width="0.75" class="plus-line plus-horizontal" />
            <line x1="-286" y1="43" x2="-286" y2="57" stroke="url(#forge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-left" />
            <line x1="386" y1="43" x2="386" y2="57" stroke="url(#forge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-right" />

            <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#forge-utilityGrad)" stroke-width="0.75" class="plus-line plus-vertical" />
            <line x1="43" y1="-286" x2="57" y2="-286" stroke="url(#forge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-top" />
            <line x1="43" y1="386" x2="57" y2="386" stroke="url(#forge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-bottom" />
          </g>

          <!-- Spotlight beams -->
          <g class="spotlight-breath-wrapper">
            <line x1="50" y1="50" x2="50" y2="-454" stroke="url(#forge-spotlightNorthGrad)" class="spotlight-beam beam-north" />
            <line x1="50" y1="50" x2="50" y2="386" stroke="url(#forge-spotlightSouthGrad)" class="spotlight-beam beam-south" />
            <line x1="50" y1="50" x2="-454" y2="50" stroke="url(#forge-spotlightWestGrad)" class="spotlight-beam beam-west" />
            <line x1="50" y1="50" x2="386" y2="50" stroke="url(#forge-spotlightEastGrad)" class="spotlight-beam beam-east" />
          </g>

          <!-- Rotating perpendicular crossing lines -->
          <g class="rotating-crossing-lines-group">
            <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#forge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
            <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#forge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
          </g>

          <!-- Concentric broken rings -->
          <g class="outer-ring-breath-wrapper">
            <circle cx="50" cy="50" r="38" stroke="url(#forge-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
          </g>

          <g class="inner-ring-breath-wrapper">
            <circle cx="50" cy="50" r="23" stroke="url(#forge-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
          </g>

          <!-- Sliding mechanical crosshairs -->
          <line x1="50" y1="4" x2="50" y2="18" stroke="url(#forge-primaryGrad)" class="crosshair-line line-top" />
          <line x1="50" y1="96" x2="50" y2="82" stroke="url(#forge-primaryGrad)" class="crosshair-line line-bottom" />
          <line x1="4" y1="50" x2="18" y2="50" stroke="url(#forge-primaryGrad)" class="crosshair-line line-left" />
          <line x1="96" y1="50" x2="82" y2="50" stroke="url(#forge-primaryGrad)" class="crosshair-line line-right" />

          <!-- Dynamic center threat icon - Nominal green shield -->
          <path d="M 45,44 L 50,41 L 55,44 L 55,49 C 55,53 50,56 50,56 C 50,56 45,53 45,49 Z" stroke="url(#forge-utilityGrad)" stroke-width="3" fill="rgba(0, 255, 159, 0.12)" class="center-lock-icon" />

          <!-- Center laser locking dot -->
          <circle cx="50" cy="50" r="2.5" fill="var(--secure-status)" class="reticle-laser-dot" />
        </svg>
      </div>

      <div class="scope-vignette-overlay"></div>
    </div>

    <!-- Title Group -->
    <div class="title-group-animated" class:acquired={isHeaderHovered}>
      <div class="title-fui-shell">
        <h1 class="forge-title font-outfit">DEVELOPER SCHEMATIC</h1>
      </div>
    </div>
  </div>

  <div class="developer-center-stage">
    <!-- Volumetric holographic background glow -->
    <div class="backdrop-glow"></div>
    
    <!-- Responsive Portrait Stage Wrapper covering 90% of available height -->
    <div class="portrait-stage">
      <!-- Memento Mori Container (Left Side) -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="memento-mori-container" 
        onmouseenter={() => AudioEngine.play('ui-hover')} 
        onclick={() => { AudioEngine.play('success'); window.dispatchEvent(new CustomEvent('dev-open-popup', { detail: { type: 'memento' } })); }}
        role="button"
        tabindex="0"
      >
        <div class="memento-text default font-outfit">
          <div>MEMENTO</div>
          <div>MORI</div>
        </div>
        <div class="memento-text hover-state font-outfit">
          <div>{mementoAge.years} {mementoAge.years === 1 ? 'YEAR' : 'YEARS'}</div>
          <div>{mementoAge.months} {mementoAge.months === 1 ? 'MONTH' : 'MONTHS'}</div>
        </div>
      </div>

      <!-- Ostinato Rigore Container (Right Side) -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="ostinato-rigore-container" 
        onmouseenter={() => AudioEngine.play('ui-hover')} 
        onclick={() => { AudioEngine.play('success'); window.dispatchEvent(new CustomEvent('dev-open-popup', { detail: { type: 'rigore' } })); }}
        role="button"
        tabindex="0"
      >
        <div class="rigore-text default font-outfit">
          <div>OSTINATO</div>
          <div>RIGORE</div>
        </div>
        <div class="rigore-text hover-state font-outfit">
          <div>RIGOROUS</div>
          <div>PERSISTENCE</div>
        </div>
      </div>

      <!-- Dynamic Slideshow Portrait Ring -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="portrait-ring-container" onclick={handleImageClick}>
        <!-- Conic/Linear Gradient Flowing Rings -->
        <div class="portrait-ring-gradient outer"></div>
        <div class="portrait-ring-gradient middle"></div>
        
        <!-- Orbiting Tech Ring -->
        <div class="portrait-orbit-ring"></div>
        <div class="portrait-lens-glint"></div>
        
        <!-- Inner circular portrait image -->
        <div class="portrait-mask-circle">
          {#if activeImageBase64}
            <img src={activeImageBase64} alt="Developer Avatar" class="dev-portrait-img" />
          {:else}
            <div class="dev-portrait-placeholder font-mono">NO_DATA</div>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="name-display-container">
      <h2 class="dev-master-name font-outfit" onmouseenter={() => AudioEngine.play('data-lock')}>KARAN SINGH VERMA</h2>
    </div>
    
    <div class="tagline-container">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <p 
        class="dev-tagline font-outfit" 
        onclick={() => {
          AudioEngine.play('success');
          window.dispatchEvent(new CustomEvent('dev-open-popup', { detail: { type: 'reason' } }));
        }}
        onmouseenter={() => AudioEngine.play('ping')}
      >
        Irrational frenzy controlled by reason and self-reflection.
      </p>
    </div>

    <!-- 5 Sovereign Operator Buttons Grid (Default placeholder, hover styling) -->
    <div class="dev-buttons-row">
      {#each ['ADHIPATI', 'ANTARYAMI', 'JIGYASHU', 'BHAKTA', 'SHAVA'] as btnName}
        <button 
          type="button" 
          class="cyber-dev-btn btn-{btnName.toLowerCase()}" 
          onclick={() => handleButtonClick(btnName)}
          onmouseenter={() => AudioEngine.play('ui-hover')}
        >
          <span class="btn-text">{btnName}</span>
        </button>
      {/each}
    </div>
  </div>

</div>

<style>
  .developer-panel {
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
    padding: 0 35% 16px 0;
    margin: 0;
    position: relative;
    user-select: none;
    outline: none;
  }

  /* OMNI-SCOPE v6.0 (ULTIMATE SURGICAL OPTICS) */
  .omni-scope-terminal {
    width: 52px; height: 52px; position: relative;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 80%);
    border-radius: 50%;
    transform: translateZ(0);
    cursor: pointer;
    border: 2px solid rgba(139, 92, 246, 0.25);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.08), inset 0 0 8px rgba(139, 92, 246, 0.15);
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: visible !important;
  }

  .omni-scope-terminal.acquired {
    border-color: #ef4444;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2);
    background: radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 80%);
    transform: scale(1.15);
  }

  /* Chassis Segments */
  .scope-chassis {
    position: absolute;
    width: 100%;
    height: 100%;
    animation: chassis-spin 40s linear infinite, chassis-pulse 3s infinite alternate ease-in-out;
    overflow: visible !important;
  }
  .chassis-segment { position: absolute; background: rgba(139, 92, 246, 0.45); transition: all 0.5s var(--ease-fui); }
  .chassis-segment.top, .chassis-segment.bottom { width: 10px; height: 2px; left: 50%; transform: translateX(-50%); }
  .chassis-segment.left, .chassis-segment.right { width: 2px; height: 10px; top: 50%; transform: translateY(-50%); }
  .chassis-segment.top { top: -2px; } .chassis-segment.bottom { bottom: -2px; }
  .chassis-segment.left { left: -2px; } .chassis-segment.right { right: -2px; }

  @keyframes chassis-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes chassis-pulse {
    0% { transform: scale(1); opacity: 0.85; }
    100% { transform: scale(1.04); opacity: 1; }
  }

  .acquired .chassis-segment {
    background: var(--critical-alert);
    box-shadow: 0 0 8px var(--critical-alert);
  }
  .acquired .scope-chassis {
    animation-duration: 8s;
  }

  /* Kinetic Data Rings */
  .scope-data-rings { position: absolute; width: 100%; height: 100%; }
  .data-ring { position: absolute; border-radius: 50%; border-width: 1px; border-style: solid; opacity: 0.5; transition: all 0.5s var(--ease-fui); }

  .ring-cyan {
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    border-color: #06b6d4; border-style: dashed;
    animation: data-ring-breath-a 6s ease-in-out infinite alternate;
  }
  .ring-violet {
    top: 6px; left: 6px; right: 6px; bottom: 6px;
    border-color: #8b5cf6; border-style: dotted;
    animation: data-ring-breath-b 4s ease-in-out infinite alternate-reverse;
  }

  @keyframes data-ring-breath-a { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.2; } 100% { transform: scale(1.05) rotate(90deg); opacity: 0.6; } }
  @keyframes data-ring-breath-b { 0% { transform: scale(1.1) rotate(0deg); opacity: 0.5; } 100% { transform: scale(0.8) rotate(-180deg); opacity: 0.3; } }

  .acquired .ring-cyan { border-color: var(--critical-alert); animation-duration: 1.8s; }
  .acquired .ring-violet { border-color: var(--secondary-accent); animation-duration: 1.2s; }

  /* Reticle System */
  .scope-reticle-core { position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; overflow: visible !important; }

  .lens-glint-effect {
    position: absolute; width: 36px; height: 36px;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%, transparent 55%, rgba(255,255,255,0.06) 100%);
    border-radius: 50%; pointer-events: none;
    z-index: 6;
    transition: all 0.3s var(--ease-fui);
  }
  .acquired .lens-glint-effect {
    transform: rotate(180deg);
    background: linear-gradient(135deg, rgba(255, 45, 85, 0.25) 0%, transparent 40%, transparent 60%, rgba(6, 182, 212, 0.15) 100%);
  }

  .reticle-svg {
    width: 52px;
    height: 52px;
    overflow: visible !important;
    filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4));
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .plus-line {
    stroke-width: 0.75px;
    opacity: 0.45;
    transition: all 0.25s var(--ease-fui);
  }
  .plus-horizontal {
    stroke-dasharray: 40 360;
    animation: laser-slide-horizontal 3.5s linear infinite;
  }
  .plus-vertical {
    stroke-dasharray: 40 360;
    animation: laser-slide-vertical 3.5s linear infinite;
  }
  .plus-tick {
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    opacity: 0.55;
  }

  .acquired .plus-line {
    opacity: 0.85;
    stroke: url(#forge-alertGrad) !important;
    stroke-width: 1.2px;
  }
  .acquired .plus-tick {
    stroke: url(#forge-alertGrad) !important;
    opacity: 0.9;
  }

  .acquired .tick-left { transform: translateX(15px); }
  .acquired .tick-right { transform: translateX(-15px); }
  .acquired .tick-top { transform: translateY(15px); }
  .acquired .tick-bottom { transform: translateY(-15px); }

  @keyframes laser-slide-horizontal {
    0% { stroke-dashoffset: 400; }
    100% { stroke-dashoffset: -400; }
  }
  @keyframes laser-slide-vertical {
    0% { stroke-dashoffset: -400; }
    100% { stroke-dashoffset: 400; }
  }

  /* SPOTLIGHT BEAMS */
  .spotlight-breath-wrapper {
    transform-origin: center;
    animation: spotlight-sweep 3.2s infinite alternate ease-in-out;
    pointer-events: none;
  }
  .acquired .spotlight-breath-wrapper {
    animation: spotlight-sweep-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }
  .spotlight-beam {
    stroke-width: 1.2px;
    filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.7));
    opacity: 0.75;
    transition: all 0.25s var(--ease-fui);
  }
  .acquired .spotlight-beam {
    stroke-width: 2.2px;
    filter: drop-shadow(0 0 15px rgba(255, 45, 85, 0.95));
    stroke: url(#forge-alertGrad) !important;
  }

  @keyframes spotlight-sweep {
    0% { transform: scale(0.04); opacity: 0.1; }
    100% { transform: scale(1.35); opacity: 0.9; }
  }
  @keyframes spotlight-sweep-fast {
    0% { transform: scale(0.12); opacity: 0.25; }
    100% { transform: scale(1.45); opacity: 1; }
  }

  /* ROTATING CROSSING LINES */
  .rotating-crossing-lines-group {
    transform-origin: center;
    animation: stepped-radar-spin 8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
  }
  .acquired .rotating-crossing-lines-group {
    animation: stepped-radar-spin-fast 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite !important;
  }
  .rotating-cross-line {
    stroke-width: 0.5px;
    filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 2px #ffffff);
    opacity: 0.85;
    transition: all 0.25s var(--ease-fui);
    pointer-events: none;
  }
  .acquired .rotating-cross-line {
    stroke-width: 0.8px;
    filter: drop-shadow(0 0 12px rgba(255, 45, 85, 0.95)) drop-shadow(0 0 4px #ffffff);
    opacity: 1;
  }

  @keyframes stepped-radar-spin {
    0%, 18% { transform: rotate(0deg); }
    25%, 43% { transform: rotate(90deg); }
    50%, 68% { transform: rotate(180deg); }
    75%, 93% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes stepped-radar-spin-fast {
    0%, 12% { transform: rotate(0deg); }
    25%, 37% { transform: rotate(90deg); }
    50%, 62% { transform: rotate(180deg); }
    75%, 87% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
  }

  .outer-ring-breath-wrapper {
    transform-origin: center;
    animation: ring-breath-outer-opposite 3.2s infinite alternate ease-in-out;
  }
  .acquired .outer-ring-breath-wrapper {
    animation: ring-breath-outer-opposite-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }
  .outer-broken-ring {
    transform-origin: center;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: spin-cw-auto 20s linear infinite;
  }
  .acquired .outer-broken-ring {
    animation: spin-cw-fast 4s linear infinite !important;
    stroke: url(#forge-alertGrad) !important;
    stroke-width: 5.5px;
  }

  .inner-ring-breath-wrapper {
    transform-origin: center;
    animation: ring-breath-inner-opposite 3.2s infinite alternate ease-in-out;
  }
  .acquired .inner-ring-breath-wrapper {
    animation: ring-breath-inner-opposite-fast 1.3s infinite alternate cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  }
  .inner-broken-ring {
    transform-origin: center;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: spin-ccw-auto 12s linear infinite;
  }
  .acquired .inner-broken-ring {
    animation: spin-ccw-fast 2.5s linear infinite !important;
    stroke: url(#forge-alertGrad) !important;
    stroke-width: 4.5px;
  }

  /* Sliding crosshair line animations */
  .crosshair-line {
    stroke-width: 3.5px;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .acquired .crosshair-line {
    stroke: url(#forge-alertGrad) !important;
    stroke-width: 4px;
  }
  .acquired .line-top { transform: translateY(6px); }
  .acquired .line-bottom { transform: translateY(-6px); }
  .acquired .line-left { transform: translateX(6px); }
  .acquired .line-right { transform: translateX(-6px); }

  .center-lock-icon {
    transform-origin: center;
    opacity: 0.7;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: auto-oscillate 4s ease-in-out infinite alternate, icon-scale-glow 2s infinite alternate ease-in-out;
  }
  .acquired .center-lock-icon {
    opacity: 1;
    transform: scale(1.15) rotate(0deg) !important;
    filter: drop-shadow(0 0 12px currentColor) !important;
    animation: icon-scale-glow 0.8s infinite alternate ease-in-out !important;
  }
  @keyframes icon-scale-glow {
    0% { filter: brightness(0.9) drop-shadow(0 0 1px currentColor); }
    100% { filter: brightness(1.3) drop-shadow(0 0 5px currentColor); }
  }
  @keyframes auto-oscillate {
    0% { transform: scale(0.85) rotate(-6deg); }
    100% { transform: scale(0.85) rotate(6deg); }
  }

  .reticle-laser-dot {
    transition: all 0.25s var(--ease-fui);
    filter: drop-shadow(0 0 5px var(--secure-status));
  }
  .acquired .reticle-laser-dot {
    fill: var(--critical-alert);
    filter: drop-shadow(0 0 10px var(--critical-alert));
    transform: scale(1.3);
  }

  @keyframes spin-cw-auto { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-ccw-auto { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes spin-cw-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-ccw-fast { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  
  @keyframes ring-breath-outer-opposite {
    0% { transform: scale(1.16); opacity: 0.75; }
    100% { transform: scale(0.86); opacity: 1; }
  }
  @keyframes ring-breath-inner-opposite {
    0% { transform: scale(1.22); opacity: 0.7; }
    100% { transform: scale(0.8); opacity: 0.95; }
  }
  @keyframes ring-breath-outer-opposite-fast {
    0% { transform: scale(0.9); }
    100% { transform: scale(0.65); }
  }
  @keyframes ring-breath-inner-opposite-fast {
    0% { transform: scale(0.82); }
    100% { transform: scale(0.55); }
  }

  .scope-vignette-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; box-shadow: inset 0 0 20px rgba(0,0,0,1); pointer-events: none; }

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





  .developer-center-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    position: relative;
    width: 100%;
    height: 100%;
    gap: 12px;
    z-index: 10;
    overflow: hidden;
  }

  .backdrop-glow {
    position: absolute;
    width: 600px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 75%);
    filter: blur(50px);
    z-index: -1;
    pointer-events: none;
    animation: glow-pulse 5s infinite alternate ease-in-out;
  }

  @keyframes glow-pulse {
    0% { transform: scale(1) translateY(0); opacity: 0.7; }
    100% { transform: scale(1.15) translateY(-5px); opacity: 0.95; filter: blur(70px); }
  }

  .portrait-stage {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    position: relative;
  }

  .memento-mori-container {
    position: absolute;
    left: 60px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    cursor: pointer;
    z-index: 20;
    pointer-events: auto;
    user-select: none;
    width: max-content;
    background: transparent;
    border: none;
    outline: none;
  }

  .memento-text {
    font-family: 'Outfit', sans-serif;
    font-size: 64px;
    font-weight: 999;
    line-height: 0.95;
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .memento-text.default {
    color: rgba(255, 255, 255, 0.22);
    opacity: 0.15;
    display: block;
    text-transform: uppercase;
    
    /* 8-DIRECTIONAL CSS TEXT SHADOW BOLD SIMULATION FOR EXTRA WEIGHT */
    text-shadow: 
      0.8px 0 0 rgba(255, 255, 255, 0.22),
      -0.8px 0 0 rgba(255, 255, 255, 0.22),
      0 0.8px 0 rgba(255, 255, 255, 0.22),
      0 -0.8px 0 rgba(255, 255, 255, 0.22),
      0.6px 0.6px 0 rgba(255, 255, 255, 0.22),
      -0.6px -0.6px 0 rgba(255, 255, 255, 0.22),
      0.6px -0.6px 0 rgba(255, 255, 255, 0.22),
      -0.6px 0.6px 0 rgba(255, 255, 255, 0.22),
      0 0 1px rgba(255, 255, 255, 0.08);
  }

  .memento-text.hover-state {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.95) translateY(5px);
    width: max-content;
    text-transform: uppercase;
    
    /* SHARP CONSTANT GRADIENT FLOW + SLICING SHEEN */
    background: linear-gradient(
      120deg,
      #ff2d55 0%,
      #ff2d55 35%,
      #ffffff 50%,
      #00ffff 65%,
      #00ffff 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    
    /* SMOOTH SHAPE BOLD FILTER SIMULATION */
    filter: 
      drop-shadow(0.5px 0 0 rgba(255, 45, 85, 0.8))
      drop-shadow(-0.5px 0 0 rgba(255, 45, 85, 0.8))
      drop-shadow(0 0 15px rgba(255, 45, 85, 0.65));
  }

  .memento-mori-container:hover .memento-text.default {
    opacity: 0;
    transform: scale(1.05) translateY(-5px);
    pointer-events: none;
  }

  .memento-mori-container:hover .memento-text.hover-state {
    opacity: 1;
    transform: scale(1) translateY(0);
    pointer-events: auto;
    animation: text-sheen 2.5s linear infinite;
  }

  /* OSTINATO RIGORE (Right Side) */
  .ostinato-rigore-container {
    position: absolute;
    right: 60px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    cursor: pointer;
    z-index: 20;
    pointer-events: auto;
    user-select: none;
    width: max-content;
    text-align: right;
    background: transparent;
    border: none;
    outline: none;
  }

  .rigore-text {
    font-family: 'Outfit', sans-serif;
    font-size: 64px;
    font-weight: 999;
    line-height: 0.95;
    letter-spacing: 2px;
    text-transform: uppercase;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .rigore-text.default {
    color: rgba(255, 255, 255, 0.22);
    opacity: 0.15;
    display: block;
    text-transform: uppercase;
    
    /* 8-DIRECTIONAL CSS TEXT SHADOW BOLD SIMULATION FOR EXTRA WEIGHT */
    text-shadow: 
      0.8px 0 0 rgba(255, 255, 255, 0.22),
      -0.8px 0 0 rgba(255, 255, 255, 0.22),
      0 0.8px 0 rgba(255, 255, 255, 0.22),
      0 -0.8px 0 rgba(255, 255, 255, 0.22),
      0.6px 0.6px 0 rgba(255, 255, 255, 0.22),
      -0.6px -0.6px 0 rgba(255, 255, 255, 0.22),
      0.6px -0.6px 0 rgba(255, 255, 255, 0.22),
      -0.6px 0.6px 0 rgba(255, 255, 255, 0.22),
      0 0 1px rgba(255, 255, 255, 0.08);
  }

  .rigore-text.hover-state {
    position: absolute;
    top: 0;
    right: 0;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.95) translateY(5px);
    width: max-content;
    text-align: right;
    text-transform: uppercase;
    
    /* ULTRA GRADIENT POLISHED TEXT WITH SLICING LIGHT EFFECT */
    background: linear-gradient(
      120deg,
      #00ffff 0%,
      #8b5cf6 30%,
      #ffffff 45%,
      #ffffff 55%,
      #8b5cf6 70%,
      #00ffff 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    
    /* SMOOTH SHAPE BOLD FILTER SIMULATION */
    filter: 
      drop-shadow(0.5px 0 0 rgba(6, 182, 212, 0.8))
      drop-shadow(-0.5px 0 0 rgba(6, 182, 212, 0.8))
      drop-shadow(0 0 15px rgba(6, 182, 212, 0.65));
  }

  .ostinato-rigore-container:hover .rigore-text.default {
    opacity: 0;
    transform: scale(1.05) translateY(-5px);
    pointer-events: none;
  }

  .ostinato-rigore-container:hover .rigore-text.hover-state {
    opacity: 1;
    transform: scale(1) translateY(0);
    pointer-events: auto;
    animation: text-sheen 2.5s linear infinite;
  }

  @keyframes text-sheen {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }

  .portrait-ring-container {
    height: 80%;
    aspect-ratio: 1;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 5;
    transform: translateY(16px);
  }

  .portrait-ring-container:hover {
    transform: translateY(16px) scale(1.06);
    box-shadow: 0 0 35px rgba(6, 182, 212, 0.4);
  }

  /* Portrait stage ring gradients container */
  .portrait-ring-gradient {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease, filter 0.4s ease;
  }

  /* Outer Ring (conic/linear neon gradient flowing CW) */
  .portrait-ring-gradient.outer {
    top: -16px;
    left: -16px;
    right: -16px;
    bottom: -16px;
    border: 3px solid transparent;
    background: linear-gradient(rgba(3, 4, 8, 0.95), rgba(3, 4, 8, 0.95)) padding-box,
                linear-gradient(90deg, #06b6d4, #8b5cf6, #d946ef, #06b6d4) border-box;
    background-size: 200% auto;
    animation: rotateCW 18s linear infinite;
  }

  /* Middle Ring (opposite rotation CCW, different gradient colors) */
  .portrait-ring-gradient.middle {
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border: 2px solid transparent;
    background: linear-gradient(rgba(3, 4, 8, 0.95), rgba(3, 4, 8, 0.95)) padding-box,
                linear-gradient(-90deg, #a78bfa, #ec4899, #00ffff, #a78bfa) border-box;
    background-size: 200% auto;
    animation: rotateCCW 12s linear infinite;
  }

  .portrait-orbit-ring {
    position: absolute;
    top: -24px;
    left: -24px;
    right: -24px;
    bottom: -24px;
    border-radius: 50%;
    border: 1.5px dashed rgba(6, 182, 212, 0.3);
    animation: rotateCW 24s linear infinite;
    transition: all 0.5s ease;
  }

  /* HOVER MUTATIONS: INCREASED ROTATION RATE & COLOR TRANSFORMATION */
  
  .portrait-ring-container:hover .portrait-ring-gradient.outer {
    animation-duration: 3s;
    background: linear-gradient(rgba(3, 4, 8, 0.5), rgba(3, 4, 8, 0.5)) padding-box,
                linear-gradient(90deg, #ff2d55, #ff9500, #ffcc00, #ff2d55) border-box;
    background-size: 200% auto;
    filter: drop-shadow(0 0 25px rgba(255, 45, 85, 0.85));
    transform: scale(1.04);
  }

  .portrait-ring-container:hover .portrait-ring-gradient.middle {
    animation-duration: 2s;
    background: linear-gradient(rgba(3, 4, 8, 0.5), rgba(3, 4, 8, 0.5)) padding-box,
                linear-gradient(-90deg, #00ffaa, #00bcff, #ff00ff, #00ffaa) border-box;
    background-size: 200% auto;
    filter: drop-shadow(0 0 20px rgba(0, 255, 170, 0.75));
    transform: scale(0.96);
  }

  .portrait-ring-container:hover .portrait-orbit-ring {
    animation-duration: 4s;
    border-color: rgba(255, 45, 85, 0.7);
    border-style: solid;
    top: -30px;
    left: -30px;
    right: -30px;
    bottom: -30px;
    filter: drop-shadow(0 0 12px rgba(255, 45, 85, 0.5));
  }

  .portrait-lens-glint {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 40%, transparent 60%, rgba(255, 255, 255, 0.05) 100%);
    z-index: 3;
    pointer-events: none;
    transition: all 0.4s ease;
  }

  .portrait-ring-container:hover .portrait-lens-glint {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, transparent 50%);
  }

  .portrait-mask-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    border: 2.5px solid rgba(139, 92, 246, 0.45);
    background: #030408;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
    transition: border-color 0.4s ease;
    z-index: 2;
  }

  .portrait-ring-container:hover .portrait-mask-circle {
    border-color: #ff2d55;
  }

  @keyframes rotateCW {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes rotateCCW {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }

  .dev-portrait-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(1.05) contrast(1.05);
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .portrait-ring-container:hover .dev-portrait-img {
    transform: scale(1.08);
  }

  .dev-portrait-placeholder {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.22);
    letter-spacing: 2px;
  }

  .name-display-container {
    display: flex;
    align-items: center;
    gap: 20px;
    position: relative;
  }

  .dev-master-name {
    font-size: 96px;
    font-weight: 950;
    letter-spacing: 8px;
    margin: 0;
    color: #fff;
    text-transform: uppercase;
    background: linear-gradient(90deg, #fff, #c084fc, #06b6d4, #ff2d55, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: master-chroma 5s linear infinite;
    text-shadow: 0 0 25px rgba(139, 92, 246, 0.15);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    position: relative;
    user-select: none;
  }

  .dev-master-name:hover {
    transform: scale(1.05);
    text-shadow: 
      0 0 35px rgba(139, 92, 246, 0.7),
      0 0 15px rgba(6, 182, 212, 0.5);
    animation: master-chroma 2s linear infinite;
  }

  @keyframes master-chroma {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }

  .tagline-container {
    width: 100%;
    max-width: none;
    text-align: center;
    padding: 0 24px;
    white-space: nowrap;
    overflow: visible;
  }

  .dev-tagline {
    font-size: 32px;
    font-weight: 950;
    line-height: 1.6;
    letter-spacing: 2.5px;
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), #a78bfa, #06b6d4, rgba(255, 255, 255, 0.9));
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: tagline-chroma 8s linear infinite;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    text-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
  }

  .dev-tagline:hover {
    color: #fff;
    transform: translateY(-3px) scale(1.02);
    background: linear-gradient(90deg, #00ffff, #fff, #ec4899);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 25px rgba(0, 255, 255, 0.6);
  }

  @keyframes tagline-chroma {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }

  .dev-buttons-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 15px;
    width: 100%;
    max-width: 900px;
    z-index: 5;
  }

  .cyber-dev-btn {
    background: transparent;
    padding: 14px 16px;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    
    /* DEFAULT PLACEHOLDER STATES WITH DECREASED OPACITY/VISIBILITY DIRECTLY */
    border: 1px dashed rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.22);
    opacity: 0.30;
  }

  .cyber-dev-btn:hover {
    opacity: 1;
  }

  .btn-shava {
    grid-column: span 4;
  }

  /* Slicing Light Effect pseudo-element */
  .cyber-dev-btn::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    );
    transform: skewX(-25deg);
    pointer-events: none;
    z-index: 1;
  }

  .cyber-dev-btn:hover::after {
    animation: sheen-sweep 1.5s infinite;
  }

  .btn-text {
    font-family: 'Outfit', sans-serif;
    font-size: 24px;
    font-weight: 950;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    display: block;
    line-height: 1;
    padding: 0;
    width: 100%;
    text-align: center;
    z-index: 2;
  }

  @keyframes sheen-sweep {
    0% { left: -150%; }
    100% { left: 150%; }
  }

  @keyframes btn-gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* HOVER STYLINGS BY THEME COLOR SEQUENCE (FIRE, WATER, AIR, SOLID, VOID) */

  .btn-adhipati:hover {
    border: 1.5px solid #ef4444;
    color: #ffffff;
    background: linear-gradient(90deg, #ef4444, #ff6b6b, #ef4444);
    background-size: 200% auto;
    animation: btn-gradient-flow 2s linear infinite;
    box-shadow: 
      0 0 20px rgba(239, 68, 68, 0.45),
      inset 0 0 10px rgba(239, 68, 68, 0.25);
    transform: translateY(-2px);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
  }

  .btn-antaryami:hover {
    border: 1.5px solid #06b6d4;
    color: #ffffff;
    background: linear-gradient(90deg, #06b6d4, #3b82f6, #06b6d4);
    background-size: 200% auto;
    animation: btn-gradient-flow 2s linear infinite;
    box-shadow: 
      0 0 20px rgba(6, 182, 212, 0.45),
      inset 0 0 10px rgba(6, 182, 212, 0.25);
    transform: translateY(-2px);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
  }

  .btn-jigyashu:hover {
    border: 1.5px solid #a78bfa;
    color: #ffffff;
    background: linear-gradient(90deg, #a78bfa, #c084fc, #a78bfa);
    background-size: 200% auto;
    animation: btn-gradient-flow 2s linear infinite;
    box-shadow: 
      0 0 20px rgba(167, 139, 250, 0.45),
      inset 0 0 10px rgba(167, 139, 250, 0.25);
    transform: translateY(-2px);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
  }

  .btn-bhakta:hover {
    border: 1.5px solid #f59e0b;
    color: #ffffff;
    background: linear-gradient(90deg, #f59e0b, #eab308, #f59e0b);
    background-size: 200% auto;
    animation: btn-gradient-flow 2s linear infinite;
    box-shadow: 
      0 0 20px rgba(245, 158, 11, 0.45),
      inset 0 0 10px rgba(245, 158, 11, 0.25);
    transform: translateY(-2px);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
  }

  .btn-shava:hover {
    border: 1.5px solid #ffffff;
    color: #ffffff;
    background: #000000;
    box-shadow: 
      0 0 20px rgba(255, 255, 255, 0.35),
      inset 0 0 10px rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
  }
</style>
