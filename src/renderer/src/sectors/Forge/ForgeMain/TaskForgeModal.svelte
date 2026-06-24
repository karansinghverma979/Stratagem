<script lang="ts">
  // System synchronization cache-bust
  import { onMount, tick } from 'svelte';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine.js';
  import {
    executionTasks, breachedTasks, rawIntelTasks,
    synthesizingTasks, weaponizedTasks, archivedTasks,
    syncAntaryami, closeTaskViewTrigger, addNotification,
    insertMission, updateMissionDetails, rescheduleMission
  } from '../../../core/store.js';
  import { triggerShield } from '../../../core/shield-store.js';
  import TemporalNexus from '../ForgeCalendar/TemporalNexus.svelte';
  import StrategizeModal from '../../Arsenal/ArsenalMain/StrategizeModal.svelte';

  let { isOpen = false, onclose, initialDesignation = '', initialTask = null, isRescheduleMode = false } = $props();

  // State Variables
  let missionDesignation = $state('');
  let deadline = $state('');
  let threatLevel = $state('MED');
  let classificationInput = $state('');
  let classifications = $state<string[]>([]);
  let isNexusOpen = $state(false);
  let showStrategize = $state(false);

  const openStrategize = (e: MouseEvent) => {
    e.stopPropagation();
    if (!initialTask) {
      AudioEngine.play('fail');
      triggerShield('INTEL REQUIRES ACTIVE TASK', 'WARNING', 3000);
      return;
    }
    AudioEngine.play('ui-click');
    showStrategize = true;
  };

  // Dynamic date formatter to convert standard YYYY-MM-DD to tactical DD-MM-YYYY format
  const formatDeadlineDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };
  let validationError = $state('');
  let tagError = $state('');
  let isProcessing = $state(false);
  let isBooted = $state(false);
  let inputEl: HTMLInputElement | null = $state(null);
  let overlayEl: HTMLDivElement | null = $state(null);

  // Tag suggestions alignment state
  let registryInputEl = $state<HTMLInputElement | null>(null);
  let registryFlowContainerEl = $state<HTMLDivElement | null>(null);
  let registryBoxEl = $state<HTMLDivElement | null>(null);
  let portalLeftOffset = $state(0);
  let portalPointerOffset = $state(20);

  // Registry scroll tracking state
  let registryScrollLeft = $state(0);
  let registryScrollWidth = $state(0);
  let registryClientWidth = $state(0);

  let showLeftScroll = $derived(registryScrollLeft > 5);
  let showRightScroll = $derived(registryScrollLeft < registryScrollWidth - registryClientWidth - 5);

  let showSearchPortal = $derived.by(() => {
    const query = classificationInput.trim().toUpperCase().replace(/#/g, '');
    if (!query || classifications.length >= 8) return false;

    // Robust case-insensitive check
    if (classifications.map(c => c.trim().toUpperCase()).includes(query)) {
      return false;
    }

    // Show if there are matches OR if it's a new unrecognized tag
    const hasMatches = filteredTags.length > 0;
    const isNewTag = !existingTags.includes(query);

    return hasMatches || isNewTag;
  });

  // Performance optimization: Cache the canvas context to prevent lag on every keystroke
  let measurementContext: CanvasRenderingContext2D | null = null;
  const getTextWidth = (text: string, font: string) => {
    if (!measurementContext) {
      const canvas = document.createElement('canvas');
      measurementContext = canvas.getContext('2d');
    }
    if (measurementContext) {
      measurementContext.font = font;
      return measurementContext.measureText(text).width;
    }
    return 0;
  };

  // Dynamically scale the input box width to prevent internal text scrolling
  let dynamicInputWidth = $derived(
    Math.max(
      360, // Minimum width to fully show the "APPEND DATA RECORD" placeholder at 19px
      getTextWidth(classificationInput, '950 19px Outfit') + 80 // Add some buffer for caret and margins
    )
  );

  const updateRegistryScrollState = () => {
    if (registryFlowContainerEl) {
      registryScrollLeft = registryFlowContainerEl.scrollLeft;
      registryScrollWidth = registryFlowContainerEl.scrollWidth;
      registryClientWidth = registryFlowContainerEl.clientWidth;
    }
  };

  const updatePortalPosition = () => {
    if (registryInputEl && registryBoxEl) {
      // Measure typed text width to dynamically track the blinking cursor position
      const textWidth = getTextWidth(classificationInput, '950 19px Outfit');

      // Use exact screen coordinates to prevent margin/padding/scroll bugs
      const inputRect = registryInputEl.getBoundingClientRect();
      const boxRect = registryBoxEl.getBoundingClientRect();

      // Calculate precise visual location of the blinking cursor relative to the registry box
      // padding-left is essentially 0 because of margin: 0 24px in the CSS
      const cursorX = (inputRect.left - boxRect.left) + textWidth;

      const boxWidth = registryBoxEl.clientWidth;
      const portalWidth = 480; // Upgraded width

      // The pointer is typically centered or set at an offset. Let's aim to put the portal
      // so the cursor is exactly above the default pointer position (say 24px from left).
      const desiredPortalLeft = cursorX - 24;

      // Hard clamp the portal body so it never visually spills outside the boundaries of the input box
      portalLeftOffset = Math.max(0, Math.min(desiredPortalLeft, boxWidth - portalWidth));

      // Shift the holographic pointer physically along the bottom edge of the portal
      // so it always stays locked directly onto the exact pixel of the cursor
      portalPointerOffset = cursorX - portalLeftOffset;

      // Ensure the pointer itself doesn't fly off the physical edges of the portal box
      portalPointerOffset = Math.max(16, Math.min(portalPointerOffset, portalWidth - 32));
    }
  };

  const handleRegistryScroll = () => {
    updateRegistryScrollState();
    updatePortalPosition();
  };

  const scrollRegistry = (direction: 'left' | 'right') => {
    if (registryFlowContainerEl) {
      const amount = 150;
      const target = direction === 'left'
        ? Math.max(0, registryFlowContainerEl.scrollLeft - amount)
        : Math.min(registryScrollWidth - registryClientWidth, registryFlowContainerEl.scrollLeft + amount);

      registryFlowContainerEl.scrollTo({
        left: target,
        behavior: 'smooth'
      });
      playAudio('ui-click');
    }
  };

  const handleWindowResize = () => {
    updatePortalPosition();
    updateRegistryScrollState();
  };

  $effect(() => {
    // depend on classifications and classificationInput to trigger position and scroll update
    const _ = classifications;
    const __ = classificationInput;
    tick().then(() => {
      updateRegistryScrollState();
      updatePortalPosition();
    });
  });

  // Long Drag-to-Clear state variables
  let isMouseDown = $state(false);
  let startX = $state(0);
  let lastX = $state(0);
  let shakeOffsetX = $state(0);
  let dragProgress = $derived(deadline && isMouseDown ? Math.min(Math.abs(shakeOffsetX) / 75, 1) : 0);

  const handleMouseDown = (e: MouseEvent) => {
    isMouseDown = true;
    startX = e.clientX;
    lastX = e.clientX;
    shakeOffsetX = 0;
  };

  const handleButtonMouseMove = (e: MouseEvent) => {
    if (!isMouseDown) return;
    const currentX = e.clientX;

    // Direct physical 1:1 drag offset
    shakeOffsetX = currentX - startX;

    // Trigger reset if dragged past 75px boundary (long drag)
    if (deadline && Math.abs(shakeOffsetX) > 75) {
      deadline = '';
      playAudio('fail'); // Mechanical release sound
      triggerShield('TEMPORAL ANCHOR DISCONNECTED', 'WARNING', 3000);
      isMouseDown = false;
      shakeOffsetX = 0;
    }

    lastX = currentX;
  };

  const handleMouseUp = () => {
    isMouseDown = false;
    shakeOffsetX = 0;
  };

  const handleButtonClick = () => {
    // Only open calendar nexus if drag offset was negligible (stable click)
    if (Math.abs(shakeOffsetX) < 8) {
      playAudio('ui-click');
      isNexusOpen = true;
    }
    shakeOffsetX = 0;
  };

  // Scope Target Lock Hover State
  let isScopeHovered = $state(false);

  const handleScopeMouseEnter = () => {
    isScopeHovered = true;
    playAudio('data-decode');
  };

  const handleScopeMouseLeave = () => {
    isScopeHovered = false;
  };

  // Mouse tilt tracking for Gorgeous 3D effect
  let tiltX = $state(0);
  let tiltY = $state(0);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isOpen || isNexusOpen) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    tiltX = ((clientX / innerWidth) - 0.5) * 5;
    tiltY = ((clientY / innerHeight) - 0.5) * -5;
  };

  // Mission Name Collision Check reactively derived
  let allMissionTitles = $derived.by(() => {
    const all = [
      ...$executionTasks, ...$breachedTasks, ...$rawIntelTasks,
      ...$synthesizingTasks, ...$weaponizedTasks, ...$archivedTasks
    ];
    return all.map(m => m.title.toUpperCase());
  });

  // For Tag Live Search - reactively derived from synchronized stores
  // For Tag Live Search - reactively derived from synchronized stores
  let existingTags = $derived.by(() => {
    const all = [
      ...$executionTasks, ...$breachedTasks, ...$rawIntelTasks,
      ...$synthesizingTasks, ...$weaponizedTasks, ...$archivedTasks
    ];
    const tags = new Set<string>();
    
    // Grab saved custom tags from localStorage so they are permanently remembered
    try {
      const saved = JSON.parse(localStorage.getItem('custom_forge_tags') || '[]');
      saved.forEach((t: string) => tags.add(t));
    } catch(e) {}

    all.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(t => tags.add(t.replace('#', '').toUpperCase()));
      }
      if (m.classifications && Array.isArray(m.classifications)) {
        m.classifications.forEach(c => tags.add(c.toUpperCase()));
      }
    });
    return Array.from(tags);
  });

  let filteredTags = $derived(classificationInput
    ? existingTags.filter(t => t.includes(classificationInput.toUpperCase()) && !classifications.includes(t))
    : []
  );

  $effect(() => {
    if (isOpen) {
      if (initialTask) {
        missionDesignation = initialTask.title;
        threatLevel = initialTask.priority || initialTask.tags[1] || 'MED';
        classifications = (initialTask.tags || []).filter((t: string) => t !== 'RAW' && t !== 'SYNTH' && t !== 'WEAPON');
      } else {
        missionDesignation = initialDesignation;
        threatLevel = 'MED';
        classifications = [];
      }
      validationError = '';
      tagError = '';
      setTimeout(() => isBooted = true, 50);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', handleWindowResize);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleWindowResize);
      };
    } else {
      isBooted = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleWindowResize);
    }
  });

  let hasTyping = $derived(missionDesignation.length > 0);

  const scrollToEnd = (smooth = false) => {
    if (registryFlowContainerEl) {
      registryFlowContainerEl.scrollTo({
        left: registryFlowContainerEl.scrollWidth,
        behavior: smooth ? 'smooth' : 'auto'
      });
      if (smooth) {
        setTimeout(updatePortalPosition, 300);
      } else {
        updatePortalPosition();
      }
    }
  };

  const changeThreatLevel = (level: string) => {
    if (isRescheduleMode) {
      triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
      playAudio('fail');
      return;
    }
    threatLevel = level;
    playAudio('ui-click');
  };

  const addClassification = (tag?: string) => {
    if (isRescheduleMode) {
      triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
      playAudio('fail');
      return;
    }
    const rawVal = (tag || classificationInput).trim().toUpperCase();
    if (!rawVal) return;

    // Strip '#', don't use it
    const val = rawVal.replace(/#/g, '');
    if (!val) return;

    if (classifications.length >= 8) {
      tagError = 'MAXIMUM TAG SIZE REACHED (MAX 8)';
      playAudio('fail');
      setTimeout(() => tagError = '', 3000);
      return;
    }

    if (classifications.includes(val)) {
      tagError = 'DUPLICATE TAG';
      playAudio('fail');
      setTimeout(() => tagError = '', 3000);
      return;
    }

    classifications = [...classifications, val];
    
    // Save to localStorage for permanent tag matching
    try {
      const saved = JSON.parse(localStorage.getItem('custom_forge_tags') || '[]');
      if (!saved.includes(val)) {
        saved.push(val);
        localStorage.setItem('custom_forge_tags', JSON.stringify(saved));
      }
    } catch(e) {}
    classificationInput = '';
    tagError = '';
    playAudio('ui-click');
    tick().then(() => scrollToEnd(true));
  };

  const removeClassification = (index: number) => {
    if (isRescheduleMode) {
      triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
      playAudio('fail');
      return;
    }
    classifications = classifications.filter((_, i) => i !== index);
    playAudio('ui-click');
  };

  const getTagColorClass = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 5;
    return `tag-preset-${index}`;
  };

  $effect(() => {
    if (classificationInput.includes('#')) {
      classificationInput = classificationInput.replace(/#/g, '');
    }
  });

  const handleRegistryKeyDown = (e: KeyboardEvent) => {
    if (classifications.length >= 8) {
      const isControlKey = e.key.length > 1 && e.key !== 'Enter' && e.key !== ' ' && e.key !== ',';
      if (!isControlKey) {
        e.preventDefault();
        tagError = 'MAXIMUM TAG SIZE REACHED (MAX 8)';
        playAudio('fail');
        setTimeout(() => tagError = '', 3000);
        return;
      }
    }

    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      if (e.key === ' ' || e.key === ',') {
        e.preventDefault();
      }
      addClassification();
    }
  };

  const playAudio = (track: string) => {
    AudioEngine.play(track);
  };

  let routingStatus = $derived(isRescheduleMode ? (deadline ? 'EXECUTION' : 'BREACH') : (deadline ? 'EXECUTION' : 'ARSENAL'));

  const initiateMission = async () => {
    if (!missionDesignation.trim()) {
      validationError = 'VALID DESIGNATION REQUIRED';
      playAudio('fail');
      return;
    }

    const titleUpper = missionDesignation.trim().toUpperCase();
    const isCollision = allMissionTitles.includes(titleUpper) && (!initialTask || titleUpper !== initialTask.title.toUpperCase());
    if (isCollision) {
      validationError = 'IDENTITY COLLISION';
      playAudio('fail');
      return;
    }

    if (isRescheduleMode && (!deadline || deadline.trim() === '' || deadline.trim() === 'NO DEADLINE')) {
      validationError = 'VALID DEADLINE REQUIRED FOR RE-ALIGNMENT';
      triggerShield('RE-ALIGNMENT REQUIRES ACTIVE TEMPORAL BOUNDARY', 'WARNING', 3000);
      playAudio('fail');
      return;
    }

    isProcessing = true;
    validationError = '';

    try {
      if (window.stratagemAPI) {
        if (isRescheduleMode) {
          const dlVal = deadline.trim();
          await rescheduleMission(initialTask.id, dlVal);
          playAudio('success');
          triggerShield(`RE-ALIGNED: ${missionDesignation.trim().toUpperCase()}`, 'SUCCESS', 4500);
          addNotification('TACTICAL RE-ALIGNMENT REGISTERED', `The mission "${missionDesignation.trim().toUpperCase()}" has been successfully re-aligned to ${formatDeadlineDate(deadline)}`, 'success');
          closeTaskViewTrigger.update(n => n + 1);
        } else if (initialTask) {
          // Weaponize / Update existing mission details using dedicated transactional API
          const dlVal = deadline.trim();
          const origStatus = initialTask.status || 'RAW_INTEL';
          await updateMissionDetails(
            initialTask.id,
            missionDesignation.trim(),
            classifications.join(','),
            threatLevel,
            dlVal || 'NO DEADLINE',
            origStatus
          );
          
          playAudio('success');
          triggerShield(`WEAPONIZED: ${missionDesignation.trim().toUpperCase()}`, 'SUCCESS', 4500);
          addNotification('TACTICAL PROTOCOL RECALIBRATED', `Details for mission "${missionDesignation.trim().toUpperCase()}" were successfully saved to SQLite database`, 'success');
        } else {
          // Create new mission
          await insertMission({
            title: missionDesignation.trim(),
            temporal_boundary: deadline.trim() || 'NO DEADLINE',
            threat_level: threatLevel,
            status: deadline ? 'EXECUTION' : 'RAW_INTEL',
            classifications: classifications.join(',')
          });

          playAudio('success');
          triggerShield(`FORGED: ${missionDesignation.trim().toUpperCase()}`, 'SUCCESS', 4500);
          addNotification('COVERT OPERATION AUTHORIZED', `New tactical mission thread "${missionDesignation.trim().toUpperCase()}" successfully forged in sector database`, 'success');
        }
        await syncAntaryami();
      }
    } catch (e: any) {
      console.error('[Forge] Initiation Error:', e);
      addNotification('DATABASE SYNC FAILURE', `An unexpected error occurred: ${e.message || e}`, 'error');
    } finally {
      isProcessing = false;
      missionDesignation = '';
      deadline = '';
      threatLevel = 'MED';
      classifications = [];
      onclose();
    }
  };

  const getHighlightedText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.toUpperCase()})`, 'gi'));
    return parts.map(part =>
      part.toUpperCase() === query.toUpperCase()
        ? `<span class="overlord-match">${part}</span>`
        : part
    ).join('');
  };
</script>

{#if isOpen}
  <div class="forge-overlord-root" transition:fade={{ duration: 300 }}>
    <div class="vertical-alignment-guide"></div>

    <div class="overlord-forge-station"
         class:reveal={isBooted}
         class:nexus-active={isNexusOpen}
         style="transform: perspective(3000px) rotateX({tiltY}deg) rotateY({tiltX}deg) scale({isBooted ? 0.88 : 0.84})"
    >
      <div class="chromatic-aura-edge"></div>
      <div class="celestial-glass-finish"></div>

      <div class="wing tl"></div><div class="wing tr"></div>
      <div class="wing bl"></div><div class="wing br"></div>

      <!-- Symmetrical Inline Header -->
      <header class="master-command-header" id="forge-modal-unique-header">
        <div class="header-inline-container">
          <div class="header-left-nexus">
            <!-- OMNI-SCOPE v6.0 reticle -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="omni-scope-terminal"
                 class:acquired={isScopeHovered}
                 onmouseenter={handleScopeMouseEnter}
                 onmouseleave={handleScopeMouseLeave}
                 role="button"
                 tabindex="0"
                 onclick={() => playAudio('success')}
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
                    <linearGradient id="taskforge-primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--primary-accent)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>
                    <linearGradient id="taskforge-utilityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" />
                      <stop offset="100%" stop-color="var(--secure-status)" />
                    </linearGradient>
                    <linearGradient id="taskforge-warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--warning-amber)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>
                    <linearGradient id="taskforge-alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="var(--critical-alert)" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" />
                    </linearGradient>

                    <linearGradient id="taskforge-spotlightNorthGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="taskforge-spotlightSouthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="taskforge-spotlightWestGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="taskforge-spotlightEastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="1" />
                      <stop offset="35%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--secondary-accent)" stop-opacity="0" />
                    </linearGradient>

                    <linearGradient id="taskforge-brightCrossGrad" x1="-286" y1="50" x2="386" y2="50" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="var(--tertiary-accent)" stop-opacity="0" />
                      <stop offset="42%" stop-color="var(--tertiary-accent)" stop-opacity="0.8" />
                      <stop offset="50%" stop-color="#ffffff" stop-opacity="1" />
                      <stop offset="58%" stop-color="var(--primary-accent)" stop-opacity="0.8" />
                      <stop offset="100%" stop-color="var(--primary-accent)" stop-opacity="0" />
                    </linearGradient>
                  </defs>

                  <!-- "+" Targeting crosshair spans 400px -->
                  <g class="massive-plus-crosshair">
                    <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-horizontal" />
                    <line x1="-286" y1="43" x2="-286" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-left" />
                    <line x1="386" y1="43" x2="386" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-right" />

                    <line x1="50" y1="-286" x2="50" y2="1200" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-vertical" />
                    <line x1="43" y1="-286" x2="57" y2="-286" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-top" />
                    <line x1="43" y1="1200" x2="57" y2="1200" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-bottom" />
                  </g>

                  <!-- Spotlight beams -->
                  <g class="spotlight-breath-wrapper">
                    <line x1="50" y1="50" x2="50" y2="-454" stroke="url(#taskforge-spotlightNorthGrad)" class="spotlight-beam beam-north" />
                    <line x1="50" y1="50" x2="50" y2="1200" stroke="url(#taskforge-spotlightSouthGrad)" class="spotlight-beam beam-south" />
                    <line x1="50" y1="50" x2="-454" y2="50" stroke="url(#taskforge-spotlightWestGrad)" class="spotlight-beam beam-west" />
                    <line x1="50" y1="50" x2="386" y2="50" stroke="url(#taskforge-spotlightEastGrad)" class="spotlight-beam beam-east" />
                  </g>

                  <!-- Rotating perpendicular crossing lines -->
                  <g class="rotating-crossing-lines-group">
                    <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                    <line x1="50" y1="-286" x2="50" y2="1200" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                  </g>

                  <!-- Concentric broken rings -->
                  <g class="outer-ring-breath-wrapper">
                    <circle cx="50" cy="50" r="38" stroke="url(#taskforge-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
                  </g>

                  <g class="inner-ring-breath-wrapper">
                    <circle cx="50" cy="50" r="23" stroke="url(#taskforge-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
                  </g>

                  <!-- Sliding mechanical crosshairs -->
                  <line x1="50" y1="4" x2="50" y2="18" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-top" />
                  <line x1="50" y1="96" x2="50" y2="82" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-bottom" />
                  <line x1="4" y1="50" x2="18" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-left" />
                  <line x1="96" y1="50" x2="82" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-right" />

                  <!-- Dynamic center threat icon -->
                  {#if threatLevel === 'LOW'}
                    <path d="M 45,44 L 50,41 L 55,44 L 55,49 C 55,53 50,56 50,56 C 50,56 45,53 45,49 Z" stroke="url(#taskforge-utilityGrad)" stroke-width="3" fill="rgba(0, 255, 159, 0.12)" class="center-lock-icon" />
                  {:else if threatLevel === 'MED'}
                    <path d="M 50,41 L 59,50 L 50,59 L 41,50 Z" stroke="url(#taskforge-warningGrad)" stroke-width="3" fill="rgba(255, 184, 0, 0.12)" class="center-lock-icon" />
                  {:else}
                    <g class="center-lock-icon">
                      <path d="M 44,44 L 56,56 M 56,44 L 44,56" stroke="url(#taskforge-alertGrad)" stroke-width="3" />
                      <circle cx="50" cy="50" r="5" fill="rgba(255, 45, 85, 0.2)" stroke="url(#taskforge-alertGrad)" stroke-width="3" class="center-danger-lock-circle" />
                    </g>
                  {/if}

                  <!-- Center laser locking dot -->
                  <circle cx="50" cy="50" r="2.5" fill="var(--secure-status)" class="reticle-laser-dot" />
                </svg>
              </div>

              <div class="scope-vignette-overlay"></div>
            </div>

            <!-- Stable Title Group -->
            <div class="title-group-animated" class:acquired={isScopeHovered}>
               <div class="title-fui-shell">
                  <h1 class="forge-title font-outfit">
                    {#if isRescheduleMode}
                      REALIGN STATION
                    {:else if initialTask}
                      CALIBRATION STATION
                    {:else}
                      FORGE STATION
                    {/if}
                  </h1>
                  <div class="title-laser-bar">
                    <div class="laser-pulse"></div>
                  </div>
               </div>
            </div>
            </div>

          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="assignment-matrix-module" 
            class:exec-mode={routingStatus === 'EXECUTION'}
            class:breach-mode={routingStatus === 'BREACH'}
            onclick={openStrategize}
            style="cursor: pointer;"
            title="Open Intel File"
          >
            <div class="module-glow"></div>
            <div class="glass-reflection-glint"></div>

            <div class="module-left-flex">
              <div class="module-transform-icon">
                {#if routingStatus === 'EXECUTION'}
                  <svg class="icon-exec-cyber" width="48" height="48" viewBox="0 0 100 100" fill="none">
                    <!-- Double outer plasma discharge halos / electric arcs -->
                    <path d="M 15,10 C 2,30 2,70 15,90" stroke="var(--tertiary-accent)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 6" class="thunder-halo halo-left" />
                    <path d="M 85,10 C 98,30 98,70 85,90" stroke="var(--tertiary-accent)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 6" class="thunder-halo halo-right" />

                    <!-- Outer glowing thunderbolt chassis -->
                    <polygon points="55,6 18,52 48,52 35,94 82,44 50,44" fill="rgba(6, 182, 212, 0.08)" stroke="var(--tertiary-accent)" stroke-width="5" stroke-linejoin="round" class="cyber-thunderbolt" />
                    <!-- Inner hot-white active core -->
                    <polyline points="52,14 28,48 48,48 38,82 72,48 50,48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="thunderbolt-core" />
                    <!-- Symmetrical side energy sparks/discharge indicators -->
                    <path d="M 12,40 L 4,44 M 88,60 L 96,56 M 16,68 L 10,74 M 84,32 L 90,26" stroke="var(--tertiary-accent)" stroke-width="4" stroke-linecap="round" class="thunderbolt-sparks" />
                  </svg>
                {:else if routingStatus === 'BREACH'}
                  <svg class="icon-breach-cyber" width="48" height="48" viewBox="0 0 100 100" fill="none">
                    <polygon points="50,12 88,82 12,82" fill="rgba(255, 45, 85, 0.08)" stroke="var(--critical-alert)" stroke-width="4.5" stroke-linejoin="round" class="cyber-hazard-triangle" />
                    <line x1="50" y1="36" x2="50" y2="60" stroke="#ffffff" stroke-width="5" stroke-linecap="round" class="hazard-bar" />
                    <circle cx="50" cy="70" r="3" fill="#ffffff" class="hazard-dot" />
                    <path d="M 28,68 L 22,74 M 72,68 L 78,74 M 40,28 L 34,22 M 60,28 L 66,22" stroke="var(--critical-alert)" stroke-width="3" stroke-linecap="round" class="hazard-sparks" />
                  </svg>
                {:else}
                  <svg class="icon-ars-cyber" width="48" height="48" viewBox="0 0 100 100" fill="none">
                    <defs>
                      <radialGradient id="brainGlowGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="var(--secondary-accent)" stop-opacity="0.32" />
                        <stop offset="65%" stop-color="var(--primary-accent)" stop-opacity="0.14" />
                        <stop offset="100%" stop-color="var(--primary-accent)" stop-opacity="0.04" />
                      </radialGradient>
                    </defs>
                    <!-- Left Hemisphere Bubbly Organic Contour (Closed along central vertical fissure line) -->
                    <path d="M 46,15 C 38,13 34,16 34,22 C 28,21 24,26 24,32 C 16,30 14,40 16,48 C 14,56 16,64 22,68 C 20,76 28,82 36,82 C 42,82 46,80 46,78 Z" fill="url(#brainGlowGrad)" stroke="var(--primary-accent)" stroke-width="4.5" stroke-linejoin="round" class="brain-lobe" />

                    <!-- Left Internal Sulci Curves (Starting exactly at the outer bubble junctions, very clean) -->
                    <path d="M 34,22 C 34,28 40,28 46,32" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />
                    <path d="M 24,32 C 30,36 34,44 46,48" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />
                    <path d="M 22,68 C 28,66 36,72 46,74" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />

                    <!-- Right Hemisphere Bubbly Organic Contour (Closed along central vertical fissure line) -->
                    <path d="M 54,15 C 62,13 66,16 66,22 C 72,21 76,26 76,32 C 84,30 86,40 84,48 C 86,56 84,64 78,68 C 80,76 72,82 64,82 C 58,82 54,80 54,78 Z" fill="url(#brainGlowGrad)" stroke="var(--primary-accent)" stroke-width="4.5" stroke-linejoin="round" class="brain-lobe" />

                    <!-- Right Internal Sulci Curves (Starting exactly at the outer bubble junctions, very clean) -->
                    <path d="M 66,22 C 66,28 60,28 54,32" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />
                    <path d="M 76,32 C 70,36 66,44 54,48" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />
                    <path d="M 78,68 C 72,66 64,72 54,74" stroke="var(--primary-accent)" stroke-width="3" stroke-linecap="round" class="brain-internal" />

                    <!-- Dotted synaptic corpus callosum linkages bridging the vertical fissure -->
                    <line x1="46" y1="36" x2="54" y2="36" stroke="var(--secondary-accent)" stroke-width="3.5" stroke-dasharray="2 2" class="corpus-callosum" />
                    <line x1="46" y1="52" x2="54" y2="52" stroke="var(--secondary-accent)" stroke-width="3.5" stroke-dasharray="2 2" class="corpus-callosum" />
                    <line x1="46" y1="68" x2="54" y2="68" stroke="var(--secondary-accent)" stroke-width="3.5" stroke-dasharray="2 2" class="corpus-callosum" />

                    <!-- Trailing electricity currents traversing both hemispheres -->
                    <path d="M 20,28 C 16,40 24,56 46,56" stroke="var(--secondary-accent)" stroke-linecap="round" class="electricity-trail" />
                    <path d="M 80,28 C 84,40 76,56 54,56" stroke="var(--secondary-accent)" stroke-linecap="round" class="electricity-trail" />

                    <!-- Glowing, pulsing active synaptic data node circles (staggered) -->
                    <!-- Left synapses -->
                    <circle cx="38" cy="24" r="3" fill="#ffffff" class="synapse-node s-node-1" />
                    <circle cx="28" cy="40" r="2.5" fill="var(--secondary-accent)" class="synapse-node s-node-2" />
                    <circle cx="36" cy="56" r="3" fill="#ffffff" class="synapse-node s-node-3" />
                    <circle cx="30" cy="68" r="2.5" fill="var(--secondary-accent)" class="synapse-node s-node-4" />
                    <!-- Right synapses (symmetrical) -->
                    <circle cx="62" cy="24" r="3" fill="#ffffff" class="synapse-node s-node-1-r" />
                    <circle cx="72" cy="40" r="2.5" fill="var(--secondary-accent)" class="synapse-node s-node-2-r" />
                    <circle cx="64" cy="56" r="3" fill="#ffffff" class="synapse-node s-node-3-r" />
                    <circle cx="70" cy="68" r="2.5" fill="var(--secondary-accent)" class="synapse-node s-node-4-r" />
                  </svg>
                {/if}
              </div>

              <div class="module-text-block">
                <span class="m-label font-outfit">INTELLIGENCE SOURCE</span>
                <span class="m-val font-outfit mode-chroma">{routingStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="overlord-operational-matrix">
        <!-- MISSION DESIGNATION -->
        <div class="matrix-unit">
          <div class="unit-label-row">
            <div class="u-icon-orb-animated"
                 class:error-empty={validationError === 'VALID DESIGNATION REQUIRED'}
                 class:error-collision={validationError === 'IDENTITY COLLISION'}
            >
              <svg class="orb-pulsar-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="9" class="orb-orbit-ring" />
                <circle cx="12" cy="12" r="4" fill="currentColor" class="orb-core-pulse" />
              </svg>
            </div>
            <label for="mission-designation-input" class="u-label-text font-outfit input-label-chroma">MISSION DESIGNATION</label>
            <div class="u-slasher cyan-beam"></div>
          </div>

          <div class="terminal-shell-premium"
               class:has-empty-error={validationError === 'VALID DESIGNATION REQUIRED'}
               class:has-collision-error={validationError === 'IDENTITY COLLISION'}
               class:has-typing={missionDesignation.length > 0}
          >
            <!-- Dynamic Status / Typing Icon -->
            <div class="input-dynamic-status-icon">
              {#if validationError === 'VALID DESIGNATION REQUIRED'}
                <!-- High-fidelity warning shield icon -->
                <svg class="icon-error-shake-pulse warning-color" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(245, 158, 11, 0.12)" class="error-shield-path" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke-linecap="round" />
                  <circle cx="12" cy="16" r="1.25" fill="currentColor" />
                </svg>
              {:else if validationError === 'IDENTITY COLLISION'}
                <!-- High-fidelity warning collision hazard icon -->
                <svg class="icon-error-shake-pulse danger-color" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="9" stroke-dasharray="4 4" />
                  <path d="M8 8l8 8M16 8l-8 8" class="danger-cross-path" />
                </svg>
              {:else if missionDesignation.length > 0}
                <div class="omni-scope-terminal mini-scope"
                     class:acquired={hasTyping}
                     in:scale={{ duration: 300, start: 0.5 }}
                     out:scale={{ duration: 200 }}
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
                      <!-- "+" Targeting crosshair spans 400px -->
                      <g class="massive-plus-crosshair">
                        <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-horizontal" />
                        <line x1="-286" y1="43" x2="-286" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-left" />
                        <line x1="386" y1="43" x2="386" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-right" />

                        <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-vertical" />
                        <line x1="43" y1="-286" x2="57" y2="-286" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-top" />
                        <line x1="43" y1="386" x2="57" y2="386" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-bottom" />
                      </g>

                      <!-- Spotlight beams -->
                      <g class="spotlight-breath-wrapper">
                        <line x1="50" y1="50" x2="50" y2="-454" stroke="url(#taskforge-spotlightNorthGrad)" class="spotlight-beam beam-north" />
                        <line x1="50" y1="50" x2="50" y2="386" stroke="url(#taskforge-spotlightSouthGrad)" class="spotlight-beam beam-south" />
                        <line x1="50" y1="50" x2="-454" y2="50" stroke="url(#taskforge-spotlightWestGrad)" class="spotlight-beam beam-west" />
                        <line x1="50" y1="50" x2="386" y2="50" stroke="url(#taskforge-spotlightEastGrad)" class="spotlight-beam beam-east" />
                      </g>

                      <!-- Rotating perpendicular crossing lines -->
                      <g class="rotating-crossing-lines-group">
                        <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                        <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                      </g>

                      <!-- Concentric broken rings -->
                      <g class="outer-ring-breath-wrapper">
                        <circle cx="50" cy="50" r="38" stroke="url(#taskforge-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
                      </g>

                      <g class="inner-ring-breath-wrapper">
                        <circle cx="50" cy="50" r="23" stroke="url(#taskforge-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
                      </g>

                      <!-- Sliding mechanical crosshairs -->
                      <line x1="50" y1="4" x2="50" y2="18" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-top" />
                      <line x1="50" y1="96" x2="50" y2="82" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-bottom" />
                      <line x1="4" y1="50" x2="18" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-left" />
                      <line x1="96" y1="50" x2="82" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-right" />

                      <!-- Dynamic center threat icon -->
                      {#if threatLevel === 'LOW'}
                        <path d="M 45,44 L 50,41 L 55,44 L 55,49 C 55,53 50,56 50,56 C 50,56 45,53 45,49 Z" stroke="url(#taskforge-utilityGrad)" stroke-width="3" fill="rgba(0, 255, 159, 0.12)" class="center-lock-icon" />
                      {:else if threatLevel === 'MED'}
                        <path d="M 50,41 L 59,50 L 50,59 L 41,50 Z" stroke="url(#taskforge-warningGrad)" stroke-width="3" fill="rgba(255, 184, 0, 0.12)" class="center-lock-icon" />
                      {:else}
                        <g class="center-lock-icon">
                          <path d="M 44,44 L 56,56 M 56,44 L 44,56" stroke="url(#taskforge-alertGrad)" stroke-width="3" />
                          <circle cx="50" cy="50" r="5" fill="rgba(255, 45, 85, 0.2)" stroke="url(#taskforge-alertGrad)" stroke-width="3" class="center-danger-lock-circle" />
                        </g>
                      {/if}

                      <!-- Center laser locking dot -->
                      <circle cx="50" cy="50" r="2.5" fill="var(--secure-status)" class="reticle-laser-dot" />
                    </svg>
                  </div>

                  <div class="scope-vignette-overlay"></div>
                </div>
              {:else}
                <!-- Standby pulsing prompt chevrons -->
                <svg class="icon-standby-breath standby-color" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="7 17 12 12 7 7" class="chev-1" />
                  <polyline points="13 17 18 12 13 7" class="chev-2" />
                </svg>
              {/if}
            </div>

            <!-- Real input (invisible text, visible caret, scrolls in 1:1 sync with overlay) -->
            <input
              id="mission-designation-input"
              type="text"
              bind:this={inputEl}
              bind:value={missionDesignation}
              class="overlord-terminal-input font-outfit"
              class:alert-mode={validationError}
              class:has-content={missionDesignation.length > 0}
              readonly={isRescheduleMode}
              onclick={(e) => {
                if (isRescheduleMode) {
                  e.preventDefault();
                  triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
                }
              }}
              onkeydown={(e) => {
                if (isRescheduleMode) {
                  e.preventDefault();
                  triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
                }
              }}
              onscroll={(e) => { if (overlayEl) overlayEl.scrollLeft = e.target.scrollLeft; }}
              oninput={(e) => { validationError = ''; tick().then(() => { if (overlayEl) overlayEl.scrollLeft = e.target.scrollLeft; }); }}
            />

            <!-- Premium Visual Display Overlay (Fully click-through, horizontal scrolling locked in 1:1 sync) -->
            <div bind:this={overlayEl} class="overlord-input-overlay-display font-outfit">
              {#if missionDesignation}
                <span class="live-chroma-text font-outfit"
                      class:error-empty={validationError === 'VALID DESIGNATION REQUIRED'}
                      class:error-collision={validationError === 'IDENTITY COLLISION'}
                >
                  {missionDesignation}
                </span>
              {:else}
                <span class="live-placeholder font-outfit"
                      class:error-empty={validationError === 'VALID DESIGNATION REQUIRED'}
                      class:error-collision={validationError === 'IDENTITY COLLISION'}
                >
                  {validationError ? `>> IDENTITY FAILED: ${validationError}` : "AUTHORIZE MISSION IDENTITY SEQUENCE"}
                </span>
              {/if}
            </div>

            <!-- Kinetic Laser Underliner (Matches Header Alignment) -->
            <div class="terminal-laser-bar">
               <div class="laser-pulse"></div>
            </div>
          </div>
        </div>

        <div class="matrix-param-grid">
          <!-- TEMPORAL BOUNDARY -->
          <div class="matrix-unit half">
            <div class="unit-label-row">
              <div class="u-icon-orb-animated temporal-orb">
                <svg class="orb-pulsar-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle cx="12" cy="12" r="9" class="orb-orbit-ring temporal-spin" />
                  <path d="M12 6v6l3 1.5" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" class="chrono-needle-spin" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <label for="temporal-boundary-button" class="u-label-text font-outfit temporal-label-chroma">TEMPORAL BOUNDARY</label>
            </div>

            <button id="temporal-boundary-button" class="temporal-lock-btn font-outfit"
                    class:date-set={deadline !== ''}
                    onmousedown={handleMouseDown}
                    onmousemove={handleButtonMouseMove}
                    onmouseup={handleMouseUp}
                    onmouseleave={handleMouseUp}
                    onclick={handleButtonClick}
                    style="transform: translate3d({shakeOffsetX}px, 0, 0);
                           filter: brightness({1 + dragProgress * 0.45}) saturate({1 + dragProgress * 0.45});
                           transition: {isMouseDown ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s, border-color 0.3s, box-shadow 0.3s, filter 0.3s'}"
                    aria-label="Set Temporal Anchor">
              <!-- Slicing liquid sweep glint (exactly matching initiate and abort action buttons) -->
              <div class="btn-liquid-sweep"></div>

              <!-- High-fidelity tactical icon -->
              {#if deadline}
                <div class="deadline-indicator-icon scope-mode-wrapper" style="width: 38px; height: 38px; position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: visible;">
                  <!-- OMNI-SCOPE v6.0 reticle for deadline set state (perfectly scaled and centered) -->
                  <div class="omni-scope-terminal mini-scope"
                       class:acquired={deadline !== ''}
                       style="position: absolute; width: 80px; height: 80px; transform: scale(0.48); transform-origin: center; left: 50%; top: 50%; translate: -50% -50%; overflow: visible !important;"
                       in:scale={{ duration: 300, start: 0.5 }}
                       out:scale={{ duration: 200 }}
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
                        <!-- "+" Targeting crosshair spans 400px -->
                        <g class="massive-plus-crosshair">
                          <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-horizontal" />
                          <line x1="-286" y1="43" x2="-286" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-left" />
                          <line x1="386" y1="43" x2="386" y2="57" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-right" />

                          <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#taskforge-utilityGrad)" stroke-width="0.75" class="plus-line plus-vertical" />
                          <line x1="43" y1="-286" x2="57" y2="-286" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-top" />
                          <line x1="43" y1="386" x2="57" y2="386" stroke="url(#taskforge-utilityGrad)" stroke-width="1.5" class="plus-tick tick-bottom" />
                        </g>

                        <!-- Spotlight beams -->
                        <g class="spotlight-breath-wrapper">
                          <line x1="50" y1="50" x2="50" y2="-454" stroke="url(#taskforge-spotlightNorthGrad)" class="spotlight-beam beam-north" />
                          <line x1="50" y1="50" x2="50" y2="386" stroke="url(#taskforge-spotlightSouthGrad)" class="spotlight-beam beam-south" />
                          <line x1="50" y1="50" x2="-454" y2="50" stroke="url(#taskforge-spotlightWestGrad)" class="spotlight-beam beam-west" />
                          <line x1="50" y1="50" x2="386" y2="50" stroke="url(#taskforge-spotlightEastGrad)" class="spotlight-beam beam-east" />
                        </g>

                        <!-- Rotating perpendicular crossing lines -->
                        <g class="rotating-crossing-lines-group">
                          <line x1="-286" y1="50" x2="386" y2="50" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                          <line x1="50" y1="-286" x2="50" y2="386" stroke="url(#taskforge-brightCrossGrad)" stroke-width="0.5" class="rotating-cross-line" />
                        </g>

                        <!-- Concentric broken rings -->
                        <g class="outer-ring-breath-wrapper">
                          <circle cx="50" cy="50" r="38" stroke="url(#taskforge-primaryGrad)" stroke-width="4.5" stroke-dasharray="24 10" class="outer-broken-ring" />
                        </g>

                        <g class="inner-ring-breath-wrapper">
                          <circle cx="50" cy="50" r="23" stroke="url(#taskforge-utilityGrad)" stroke-width="3.5" stroke-dasharray="12 6" class="inner-broken-ring" />
                        </g>

                        <!-- Sliding mechanical crosshairs -->
                        <line x1="50" y1="4" x2="50" y2="18" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-top" />
                        <line x1="50" y1="96" x2="50" y2="82" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-bottom" />
                        <line x1="4" y1="50" x2="18" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-left" />
                        <line x1="96" y1="50" x2="82" y2="50" stroke="url(#taskforge-primaryGrad)" class="crosshair-line line-right" />

                        <!-- Dynamic center threat icon -->
                        {#if threatLevel === 'LOW'}
                          <path d="M 45,44 L 50,41 L 55,44 L 55,49 C 55,53 50,56 50,56 C 50,56 45,53 45,49 Z" stroke="url(#taskforge-utilityGrad)" stroke-width="3" fill="rgba(0, 255, 159, 0.12)" class="center-lock-icon" />
                        {:else if threatLevel === 'MED'}
                          <path d="M 50,41 L 59,50 L 50,59 L 41,50 Z" stroke="url(#taskforge-warningGrad)" stroke-width="3" fill="rgba(255, 184, 0, 0.12)" class="center-lock-icon" />
                        {:else}
                          <g class="center-lock-icon">
                            <path d="M 44,44 L 56,56 M 56,44 L 44,56" stroke="url(#taskforge-alertGrad)" stroke-width="3" />
                            <circle cx="50" cy="50" r="5" fill="rgba(255, 45, 85, 0.2)" stroke="url(#taskforge-alertGrad)" stroke-width="3" class="center-danger-lock-circle" />
                          </g>
                        {/if}

                        <!-- Center laser locking dot -->
                        <circle cx="50" cy="50" r="2.5" fill="var(--secure-status)" class="reticle-laser-dot" />
                      </svg>
                    </div>
                    <div class="scope-vignette-overlay"></div>
                  </div>
                </div>
              {:else}
                <!-- High-fidelity tactical cyber grid calendar icon (overhauled for extreme clarity & contrast) -->
                <svg class="deadline-indicator-icon calendar-mode" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5" width="18" height="15" rx="3" ry="3" fill="rgba(0, 243, 255, 0.12)" stroke="#00f3ff" stroke-width="2.5" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="#00f3ff" stroke-width="2" />
                  <path d="M 8,2 L 8,6" stroke="#ffffff" stroke-width="2.5" />
                  <path d="M 16,2 L 16,6" stroke="#ffffff" stroke-width="2.5" />
                  <circle cx="7.5" cy="13.5" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d1" />
                  <circle cx="12" cy="13.5" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d2" />
                  <circle cx="16.5" cy="13.5" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d3" />
                  <circle cx="7.5" cy="17" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d4" />
                  <circle cx="12" cy="17" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d5" />
                  <circle cx="16.5" cy="17" r="1.2" fill="#00ff9f" stroke="none" class="cal-dot d6" />
                </svg>
              {/if}

              <!-- Centered Readout Content -->
              <div class="btn-readout-content">
                <span class="readout-value">
                  {deadline ? formatDeadlineDate(deadline) : (isRescheduleMode ? 'NEW DEADLINE' : 'SET DEADLINE')}
                </span>
              </div>
            </button>
          </div>

          <!-- THREAT PRIORITY -->
          <div class="matrix-unit half">
            <div class="unit-label-row">
              <div class="u-icon-orb-animated threat-orb">
                <svg class="orb-pulsar-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle cx="12" cy="12" r="9" class="orb-orbit-ring threat-spin" />
                  <polygon points="12 5 6 16 18 16" stroke="currentColor" stroke-linejoin="round" stroke-width="2.5" class="threat-triangle-pulse" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                </svg>
              </div>
              <label for="threat-low-button" class="u-label-text font-outfit threat-label-chroma">THREAT PRIORITY</label>
            </div>
            <div class="overlord-priority-grid">
              <button id="threat-low-button" class="p-opt low font-outfit" class:active={threatLevel === 'LOW'} class:locked={isRescheduleMode} onclick={() => changeThreatLevel('LOW')}>LOW</button>
              <button class="p-opt med font-outfit" class:active={threatLevel === 'MED'} class:locked={isRescheduleMode} onclick={() => changeThreatLevel('MED')}>MED</button>
              <button class="p-opt high font-outfit" class:active={threatLevel === 'HIGH'} class:locked={isRescheduleMode} onclick={() => changeThreatLevel('HIGH')}>HIGH</button>
            </div>
          </div>
        </div>

        <!-- NEURAL REGISTRY -->
        <div class="matrix-unit" class:portal-open={classificationInput.trim() !== '' && classifications.length < 8}>
          <div class="unit-label-row">
            <div class="u-icon-orb-animated neural-orb">
              <svg class="orb-pulsar-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="9" class="orb-orbit-ring neural-spin" />
                <g class="neural-synapse-pulse">
                  <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2" />
                  <circle cx="8" cy="12" r="2.5" fill="currentColor" />
                  <circle cx="16" cy="12" r="2.5" fill="currentColor" />
                  <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                  <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 2" />
                  <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                </g>
              </svg>
            </div>
            <label for="neural-registry-input" class="u-label-text font-outfit neural-label-chroma">NEURAL REGISTRY</label>
            <div class="u-slasher violet-beam"></div>
            {#if tagError}<span class="overlord-error-log font-outfit" transition:slide={{ axis: 'x' }}>{tagError}</span>{/if}
          </div>
          <div bind:this={registryBoxEl} class="overlord-registry-box" class:has-capacity-error={tagError !== ''} class:portal-active={showSearchPortal}>
            <!-- Animated Scanner Sweep -->
            <div class="registry-laser-sweep"></div>

            <!-- Left scroll chevron (very low visibility, only shown when needed) -->
            {#if showLeftScroll}
              <button
                class="registry-scroll-btn scroll-btn-left"
                transition:fade={{ duration: 150 }}
                onclick={() => scrollRegistry('left')}
                aria-label="Scroll left"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="16 21 12 12 16 3" />
                </svg>
              </button>
            {/if}

            <div bind:this={registryFlowContainerEl} class="registry-flow-container" onscroll={handleRegistryScroll}>
              {#each classifications as tag, i}
                <div class="data-shard font-outfit {getTagColorClass(tag)}" transition:scale>
                  <div class="shard-glow-layer"></div>
                  <span>{tag}</span>
                  <button class="shard-close-btn"
                          onclick={(e) => { e.stopPropagation(); removeClassification(i); }}
                          onmouseenter={() => { if (!isRescheduleMode) playAudio('ui-hover'); }}
                          aria-label="Purge tag">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              {/each}
              <div class="input-registry-wrapper" style="width: {dynamicInputWidth}px; min-width: {dynamicInputWidth}px; flex: none;">
                <input
                  id="neural-registry-input"
                  bind:this={registryInputEl}
                  type="text"
                  bind:value={classificationInput}
                  placeholder={isRescheduleMode ? "CLASSIFICATIONS LOCKED" : (classifications.length === 0 ? "APPEND DATA RECORD" : classifications.length < 8 ? "+ ADD" : "MAX CLASSIFICATIONS")}
                  class="overlord-registry-input font-outfit"
                  class:locked={isRescheduleMode}
                  readonly={isRescheduleMode}
                  onfocus={(e) => {
                    if (isRescheduleMode) {
                      e.preventDefault();
                      triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
                      registryInputEl?.blur();
                    } else {
                      tick().then(updatePortalPosition);
                    }
                  }}
                  onclick={(e) => {
                    if (isRescheduleMode) {
                      e.preventDefault();
                      triggerShield('RE-ALIGNMENT MODE: Threat levels and parameters are locked.', 'WARNING', 3000);
                    }
                  }}
                  onkeydown={(e) => {
                    if (isRescheduleMode) {
                      e.preventDefault();
                    } else {
                      handleRegistryKeyDown(e);
                    }
                  }}
                  oninput={() => { if (!isRescheduleMode) tick().then(updatePortalPosition); }}
                />
              </div>
            </div>

            <!-- Right scroll chevron (very low visibility, only shown when needed) -->
            {#if showRightScroll}
              <button
                class="registry-scroll-btn scroll-btn-right"
                transition:fade={{ duration: 150 }}
                onclick={() => scrollRegistry('right')}
                aria-label="Scroll right"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="12 21 16 12 12 3" />
                </svg>
              </button>
            {/if}

            {#if showSearchPortal}
              <div class="overlord-search-portal" style="left: {portalLeftOffset}px; --pointer-left: {portalPointerOffset}px;" transition:fly={{ y: 20, duration: 400, opacity: 0 }}>
                {#if filteredTags.length > 0}
                  <div class="portal-header-legend font-outfit"><span class="legend-beacon"></span>AUTHORIZED CLASSIFICATIONS</div>
                  {#each filteredTags as tag}
                    <button class="font-outfit search-suggestion-item {getTagColorClass(tag)}" onclick={() => addClassification(tag)}>
                      <div class="suggestion-icon-shell">
                        <svg class="suggestion-add-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
                        </svg>
                      </div>
                      <span class="suggestion-text">{@html getHighlightedText(tag, classificationInput)}</span>
                    </button>
                  {/each}
                {/if}

                {#if !existingTags.includes(classificationInput.trim().toUpperCase()) && !classifications.includes(classificationInput.trim().toUpperCase())}
                  <div class="portal-header-legend new-record-legend font-outfit" style="{filteredTags.length > 0 ? 'margin-top: 8px;' : ''}"><span class="legend-beacon create-beacon"></span>UNRECOGNIZED SIGNATURE</div>
                  <button class="font-outfit search-suggestion-item create-new-item" onclick={() => addClassification(classificationInput.trim())}>
                    <div class="suggestion-icon-shell">
                      <svg class="suggestion-add-icon create-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                        <path d="M12 5v14M5 12h14" stroke-linecap="round" />
                      </svg>
                    </div>
                    <span class="suggestion-text new-text-chroma">FORGE: {classificationInput.trim().toUpperCase()}</span>
                  </button>
                {/if}
              </div>
            {/if}
        </div>
      </div>
    </div>

      <footer class="overlord-footer">
        <button class="overlord-action-btn abort-style font-outfit" onclick={onclose}>
          <div class="btn-liquid-sweep"></div>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 20px;">
             <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          ABORT PROTOCOL
        </button>
        <button class="overlord-action-btn launch-style font-outfit" disabled={isProcessing} onclick={initiateMission}>
          <div class="btn-liquid-sweep"></div>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 20px;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          INITIATE MISSION
        </button>
      </footer>

      <!-- Floating tactical backdrop under search window, covering entire modal container -->
      {#if showSearchPortal}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="overlord-portal-backdrop" transition:fade={{ duration: 200 }} onclick={() => classificationInput = ''} role="presentation"></div>
      {/if}
    </div>
  </div>

  <TemporalNexus
    isOpen={isNexusOpen}
    onclose={() => isNexusOpen = false}
    onconfirm={(date) => {
      deadline = date;
      isNexusOpen = false;
    }}
  />
{/if}

{#if showStrategize && initialTask}
  <StrategizeModal
    taskId={initialTask.id}
    taskTitle={initialTask.title}
    overCalibration={true}
    onClose={() => { showStrategize = false; }}
  />
{/if}

<style>
  .forge-overlord-root {
    position: fixed;
    top: 80px; left: 0; width: 100vw; height: calc(100vh - 80px);
    display: flex; align-items: center; justify-content: center;
    z-index: 12000;
    background: transparent;
    will-change: opacity;
  }

  /* Removed: pulsar-void, pulsar-core, void-ray, reactive-dust, overlord-blur-isolation
     — no longer rendered; the sector page provides the background context. */
  .overlord-blur-isolation { display: none; }

  /* Original design dimensions — uniform scale applied via inline transform */
  .overlord-forge-station {
    width: 1058px;
    height: 782px;
    background: linear-gradient(165deg, #0d1030 0%, #010103 100%);
    border: 3px solid rgba(139, 92, 246, 0.95);
    border-radius: 64px;
    padding: 36px 84px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 400px rgba(0, 0, 0, 1), inset 0 0 100px rgba(139, 92, 246, 0.05);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out, border-color 0.3s, box-shadow 0.3s;
    will-change: transform, opacity;
  }



  .overlord-forge-station.nexus-active {
    opacity: 0 !important;
    pointer-events: none;
    transform: perspective(3000px) rotateX(0deg) rotateY(0deg) scale(0.80) !important;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out;
  }

  .chromatic-aura-edge { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 6px solid rgba(6, 182, 212, 0.2); border-radius: 64px; pointer-events: none; z-index: 10; filter: blur(3px); }
  .celestial-glass-finish { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 10%, rgba(0,0,0,0.55) 100%); pointer-events: none; }

  .wing { position: absolute; width: 100px; height: 100px; border: 5px solid rgba(139, 92, 246, 0.7); border-radius: 32px; opacity: 0.15; pointer-events: none; transition: 1s; }
  .tl { top: -30px; left: -30px; border-right: 0; border-bottom: 0; }
  .tr { top: -30px; right: -30px; border-left: 0; border-bottom: 0; }
  .bl { bottom: -30px; left: -30px; border-right: 0; border-top: 0; }
  .br { bottom: -30px; right: -30px; border-left: 0; border-top: 0; }
  .reveal .wing { opacity: 0.4; transform: translate(15px, 15px); }

  /* Master Header Density Calibration */
  #forge-modal-unique-header.master-command-header { display: flex; align-items: center; margin-top: 12px; margin-bottom: 48px; position: relative; z-index: 100; }
  #forge-modal-unique-header .header-inline-container { display: flex; align-items: center; justify-content: space-between; gap: 32px; width: 100%; height: 80px; }
  #forge-modal-unique-header .header-left-nexus { display: flex; align-items: center; gap: 24px; flex-grow: 1; }

  .scope-rotating-chassis {
    position: absolute;
    width: 100%; height: 100%;
    animation: chassis-spin 20s linear infinite;
    display: flex; align-items: center; justify-content: center;
    overflow: visible !important;
    color: var(--primary-accent);
  }

  /* 4 LONG LIGHT RAYS AT 90 DEGREES */
  .scope-ray {
    position: absolute;
    background: linear-gradient(90deg, transparent, #fff, transparent);
    filter: drop-shadow(0 0 8px currentColor);
    opacity: 0.8;
    z-index: 1;
    pointer-events: none;
  }

  .ray-v { width: 1.5px; height: 400px; left: 50%; top: 50%; transform: translate(-50%, -50%); background: linear-gradient(180deg, transparent, #fff, transparent); }
  .ray-h { width: 400px; height: 1.5px; left: 50%; top: 50%; transform: translate(-50%, -50%); background: linear-gradient(90deg, transparent, #fff, transparent); }

  /* Individual ray shorthand for vertical line logic */
  .ray-n, .ray-s { width: 1.5px; height: 200px; left: 50%; transform: translateX(-50%); }
  .ray-n { bottom: 50%; background: linear-gradient(0deg, #fff, transparent); }
  .ray-s { top: 50%; background: linear-gradient(180deg, #fff, transparent); }

  .ray-w, .ray-e { width: 200px; height: 1.5px; top: 50%; transform: translateY(-50%); }
  .ray-w { right: 50%; background: linear-gradient(270deg, #fff, transparent); }
  .ray-e { left: 50%; background: linear-gradient(90deg, #fff, transparent); }

  .chassis-svg { color: currentColor; filter: drop-shadow(0 0 10px currentColor); }

  .scope-data-rings { position: absolute; width: 100%; height: 100%; }
  .ring-cyan { border: 1px dashed #06b6d4; border-radius: 50%; position: absolute; top: 4px; left: 4px; right: 4px; bottom: 4px; opacity: 0.4; animation: data-ring-breath-a 6s infinite alternate; }
  .ring-violet { border: 1px dotted #8b5cf6; border-radius: 50%; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; opacity: 0.4; animation: data-ring-breath-b 4s infinite alternate-reverse; }

  .scope-reticle-core { position: relative; z-index: 5; color: #fff; }
  .reticle-laser-dot { animation: laser-heartbeat 1.5s infinite alternate; filter: drop-shadow(0 0 8px currentColor); }

  /* VERTICAL ALIGNMENT GUIDE */
  .vertical-alignment-guide {
    position: absolute;
    top: 0; bottom: 0;
    left: 124px; /* Center-aligned with all scopes */
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(6, 182, 212, 0.25), transparent);
    z-index: 0;
    pointer-events: none;
  }

  /* OMNI-SCOPE v6.0 (ULTIMATE SURGICAL OPTICS) */
  .omni-scope-terminal {
    width: 60px; height: 60px; position: relative;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 80%);
    border-radius: 50%;
    transform: translateZ(0);
    cursor: pointer;
    border: 2.5px solid rgba(139, 92, 246, 0.25);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.08), inset 0 0 12px rgba(139, 92, 246, 0.15);
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: visible !important;
  }

  .omni-scope-terminal.acquired {
    border-color: #ef4444;
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2);
  }

  /* Specific header scoping lockdown to prevent any external interference */
  #forge-modal-unique-header .omni-scope-terminal {
    width: 80px !important;
    height: 80px !important;
    border: 2.5px solid rgba(139, 92, 246, 0.25) !important;
  }

  #forge-modal-unique-header .omni-scope-terminal.acquired {
    border-color: #ef4444 !important;
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2) !important;
  }

  @keyframes chassis-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes data-ring-breath-a { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.2; } 100% { transform: scale(1.05) rotate(90deg); opacity: 0.6; } }
  @keyframes data-ring-breath-b { 0% { transform: scale(1.1) rotate(0deg); opacity: 0.5; } 100% { transform: scale(0.8) rotate(-180deg); opacity: 0.3; } }
  @keyframes laser-heartbeat { from { transform: scale(0.8); opacity: 0.6; } to { transform: scale(1.2); opacity: 1; } }

  .omni-scope-terminal.acquired {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 80%);
    border-color: rgba(239, 68, 68, 0.85);
    transform: scale(1.22);
    box-shadow:
      0 0 35px rgba(239, 68, 68, 0.45),
      inset 0 0 25px rgba(239, 68, 68, 0.3),
      0 0 0 5px rgba(239, 68, 68, 0.08);
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
  .chassis-segment.top, .chassis-segment.bottom { width: 12px; height: 3px; left: 50%; transform: translateX(-50%); }
  .chassis-segment.left, .chassis-segment.right { width: 3px; height: 12px; top: 50%; transform: translateY(-50%); }
  .chassis-segment.top { top: -2px; } .chassis-segment.bottom { bottom: -2px; }
  .chassis-segment.left { left: -2px; } .chassis-segment.right { right: -2px; }
  @keyframes chassis-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @keyframes chassis-pulse {
    0% { transform: scale(1); opacity: 0.85; }
    100% { transform: scale(1.04); opacity: 1; }
  }

  .acquired .chassis-segment {
    background: var(--critical-alert);
    box-shadow: 0 0 10px var(--critical-alert);
  }
  .acquired .scope-chassis {
    animation-duration: 8s;
  }

  /* Kinetic Data Rings */
  .scope-data-rings { position: absolute; width: 100%; height: 100%; }
  .data-ring { position: absolute; border-radius: 50%; border-width: 1.5px; border-style: solid; opacity: 0.5; transition: all 0.5s var(--ease-fui); }

  .ring-cyan {
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    border-color: #06b6d4; border-style: dashed;
    animation: data-ring-breath-a 6s ease-in-out infinite alternate;
  }
  .ring-violet {
    top: 8px; left: 8px; right: 8px; bottom: 8px;
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
    position: absolute; width: 50px; height: 50px;
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
    width: 100%;
    height: 100%;
    overflow: visible !important;
    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4));
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  /* VERY THIN, TOO MUCH LONG "+" TARGETING CROSSHAIR HUD */
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
    stroke: url(#taskforge-alertGrad) !important;
    stroke-width: 1.2px;
  }

  .acquired .plus-tick {
    stroke: url(#taskforge-alertGrad) !important;
    opacity: 0.9;
  }

  /* Focus Scoping contractions sliding ticks inward */
  .acquired .tick-left { transform: translateX(25px); }
  .acquired .tick-right { transform: translateX(-25px); }
  .acquired .tick-top { transform: translateY(25px); }
  .acquired .tick-bottom { transform: translateY(-25px); }

  @keyframes laser-slide-horizontal {
    0% { stroke-dashoffset: 400; }
    100% { stroke-dashoffset: -400; }
  }

  @keyframes laser-slide-vertical {
    0% { stroke-dashoffset: -400; }
    100% { stroke-dashoffset: 400; }
  }

  /* SPOTLIGHT BEAMS (North, South, East, West) */
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
    filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.7));
    opacity: 0.75;
    transition: all 0.25s var(--ease-fui);
  }
  .acquired .spotlight-beam {
    stroke-width: 2.2px;
    filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.95));
    stroke: url(#taskforge-alertGrad) !important;
  }

  @keyframes spotlight-sweep {
    0% { transform: scale(0.04); opacity: 0.1; }
    100% { transform: scale(1.35); opacity: 0.9; }
  }

  @keyframes spotlight-sweep-fast {
    0% { transform: scale(0.12); opacity: 0.25; }
    100% { transform: scale(1.45); opacity: 1; }
  }

  /* TWO VERY THIN, EXTREMELY BRIGHT, LARGE ROTATING CROSSING LINES */
  .rotating-crossing-lines-group {
    transform-origin: center;
    animation: stepped-radar-spin 8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
  }
  .acquired .rotating-crossing-lines-group {
    animation: stepped-radar-spin-fast 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite !important;
  }

  .rotating-cross-line {
    stroke-width: 0.5px;
    filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 3px #ffffff);
    opacity: 0.85;
    transition: all 0.25s var(--ease-fui);
    pointer-events: none;
  }
  .acquired .rotating-cross-line {
    stroke-width: 0.8px;
    filter: drop-shadow(0 0 16px rgba(255, 45, 85, 0.95)) drop-shadow(0 0 5px #ffffff);
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
    stroke: url(#taskforge-alertGrad) !important;
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
    stroke: url(#taskforge-alertGrad) !important;
    stroke-width: 4.5px;
  }

  /* Sliding crosshair line animations */
  .crosshair-line {
    stroke-width: 3.5px;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .acquired .crosshair-line {
    stroke: url(#taskforge-alertGrad) !important;
    stroke-width: 4px;
  }
  .acquired .line-top { transform: translateY(10px); }
  .acquired .line-bottom { transform: translateY(-10px); }
  .acquired .line-left { transform: translateX(10px); }
  .acquired .line-right { transform: translateX(-10px); }

  /* Center Settings Icons */
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

  /* Auto Animation keyframe definitions */
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
  #forge-modal-unique-header .title-group-animated {
    display: flex;
    align-items: center;
  }
  #forge-modal-unique-header .title-fui-shell {
    position: relative;
    padding: 2px 0 6px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  #forge-modal-unique-header .forge-title {
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

  #forge-modal-unique-header .title-group-animated.acquired .forge-title {
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

  /* Bottom kinetic laser bar */
  .title-laser-bar {
    position: relative;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.45) 0%, rgba(6, 182, 212, 0.45) 100%);
    border-radius: 2px;
    margin-top: 4px;
    overflow: hidden;
    transition: all 0.3s var(--ease-fui);
  }

  .title-group-animated.acquired .title-laser-bar {
    background: linear-gradient(90deg, var(--critical-alert) 0%, var(--warning-amber) 100%);
    box-shadow: 0 0 8px var(--critical-alert);
  }

  .laser-pulse {
    position: absolute;
    top: 0;
    left: -50px;
    width: 40px;
    height: 100%;
    background: linear-gradient(90deg, transparent, #ffffff, transparent);
    animation: laser-sweep-pulse 2.5s infinite ease-in-out;
  }

  .title-group-animated.acquired .laser-pulse {
    animation-duration: 0.8s;
  }

  @keyframes laser-sweep-pulse {
    0% { left: -50px; }
    100% { left: 100%; }
  }

  /* Compact Assignment Module - Tactical Cyberpunk Reticle-linked Mini Card */
  .assignment-matrix-module {
    width: 250px;
    height: 66px;
    background: linear-gradient(135deg, rgba(20, 10, 45, 0.4) 0%, rgba(5, 2, 15, 0.85) 100%);
    border: 2px solid rgba(139, 92, 246, 0.6);
    border-radius: 16px;
    display: flex;
    align-items: center;
    padding: 0 18px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 20px rgba(139, 92, 246, 0.12),
      inset 0 0 12px rgba(139, 92, 246, 0.15);
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .assignment-matrix-module.exec-mode {
    border-color: #06b6d4;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(1, 4, 12, 0.9) 100%);
    box-shadow:
      0 0 25px rgba(6, 182, 212, 0.25),
      inset 0 0 15px rgba(6, 182, 212, 0.2);
  }

  .assignment-matrix-module:hover {
    transform: translateY(-4px) scale(1.025);
    border-color: rgba(167, 139, 250, 0.95);
    box-shadow:
      0 15px 35px rgba(139, 92, 246, 0.35),
      inset 0 0 15px rgba(139, 92, 246, 0.25);
  }

  .assignment-matrix-module.exec-mode:hover {
    border-color: rgba(34, 211, 238, 0.95);
    box-shadow:
      0 15px 35px rgba(6, 182, 212, 0.45),
      inset 0 0 20px rgba(6, 182, 212, 0.35);
  }

  /* Shifting atmosphere backglow */
  .module-glow {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 15% 50%, rgba(139, 92, 246, 0.18) 0%, transparent 60%);
    pointer-events: none;
    transition: background 0.5s ease;
    animation: aura-breath 6s ease-in-out infinite alternate;
  }
  .exec-mode .module-glow {
    background: radial-gradient(circle at 15% 50%, rgba(6, 182, 212, 0.25) 0%, transparent 65%);
  }

  @keyframes aura-breath {
    0% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  /* Glass gloss sweep reflection on hover */
  .glass-reflection-glint {
    position: absolute;
    top: 0; left: -150%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    transform: skewX(-20deg);
    pointer-events: none;
    z-index: 3;
    transition: 0.7s;
  }
  .assignment-matrix-module:hover .glass-reflection-glint {
    left: 150%;
  }

  .module-left-flex {
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 4;
  }

  .module-transform-icon {
    color: #8b5cf6;
    filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.5));
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .exec-mode .module-transform-icon {
    color: #06b6d4;
    filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.7));
  }

  /* Advanced Non-Rotating Cyber Execution Thunderbolt Animations */
  .icon-exec-cyber {
    overflow: visible !important;
  }

  .cyber-thunderbolt {
    transform-origin: 50px 50px;
    animation: thunder-roar 1.8s ease-in-out infinite;
  }

  .thunderbolt-core {
    transform-origin: 50px 50px;
    animation: core-flicker 1.8s ease-in-out infinite;
  }

  .thunderbolt-sparks {
    transform-origin: 50px 50px;
    animation: sparks-discharge 1.8s ease-in-out infinite;
  }

  /* Symmetrical Double Plasma Discharge Halos */
  .thunder-halo {
    transform-origin: 50px 50px;
    animation: halo-slide 1.2s linear infinite, halo-pulse 1.8s ease-in-out infinite;
  }

  @keyframes halo-slide {
    to { stroke-dashoffset: 40; }
  }

  @keyframes halo-pulse {
    0%, 55%, 100% {
      opacity: 0.35;
      stroke-width: 2px;
      filter: drop-shadow(0 0 2px var(--tertiary-glow));
    }
    58%, 63%, 69% {
      opacity: 1;
      stroke-width: 3.5px;
      filter: drop-shadow(0 0 15px var(--tertiary-accent)) drop-shadow(0 0 5px #ffffff) brightness(1.5);
    }
  }

  @keyframes thunder-roar {
    0%, 55%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 4px var(--tertiary-glow));
      stroke: var(--tertiary-accent);
      fill: rgba(6, 182, 212, 0.08);
    }
    58% {
      transform: scale(1.3);
      filter: drop-shadow(0 0 25px var(--tertiary-accent)) drop-shadow(0 0 8px #ffffff);
      stroke: #ffffff;
      fill: rgba(255, 255, 255, 0.4);
    }
    60% {
      transform: scale(0.9);
      filter: drop-shadow(0 0 2px var(--tertiary-glow));
      stroke: var(--tertiary-accent);
      fill: rgba(6, 182, 212, 0.04);
    }
    63% {
      transform: scale(1.2);
      filter: drop-shadow(0 0 20px var(--tertiary-accent)) drop-shadow(0 0 6px #ffffff);
      stroke: #ffffff;
      fill: rgba(255, 255, 255, 0.3);
    }
    66% {
      transform: scale(0.95);
      filter: drop-shadow(0 0 4px var(--tertiary-glow));
      stroke: var(--tertiary-accent);
      fill: rgba(6, 182, 212, 0.08);
    }
    69% {
      transform: scale(1.1);
      filter: drop-shadow(0 0 12px var(--tertiary-accent));
      stroke: #ffffff;
      fill: rgba(6, 182, 212, 0.2);
    }
    73% {
      transform: scale(1);
      filter: drop-shadow(0 0 4px var(--tertiary-glow));
      stroke: var(--tertiary-accent);
      fill: rgba(6, 182, 212, 0.08);
    }
  }

  @keyframes core-flicker {
    0%, 55%, 73%, 100% { opacity: 0.8; stroke-width: 2.5px; filter: drop-shadow(0 0 2px #ffffff); }
    25% { opacity: 0.4; }
    58%, 63%, 69% { opacity: 1; stroke-width: 4px; filter: drop-shadow(0 0 12px #ffffff); }
  }

  @keyframes sparks-discharge {
    0%, 55%, 73%, 100% { opacity: 0.3; transform: scale(0.95); stroke: var(--tertiary-accent); }
    58%, 63%, 69% { opacity: 1; transform: scale(1.3); stroke: #ffffff; filter: drop-shadow(0 0 8px var(--tertiary-accent)); }
  }

  /* Advanced Non-Rotating Cyber Neural Brain Animations */
  .icon-ars-cyber {
    overflow: visible !important;
  }

  .brain-lobe, .brain-internal {
    transform-origin: 50px 50px;
    animation: brain-breath 2.5s infinite alternate ease-in-out;
  }

  .corpus-callosum {
    animation: corpus-pulse 2.5s infinite alternate ease-in-out;
  }

  .electricity-trail {
    stroke-dasharray: 24 76;
    stroke-dashoffset: 0;
    animation: electricity-flow 1.4s linear infinite, electricity-pulse 2.5s ease-in-out infinite;
  }

  /* Active Synaptic Data Nodes */
  .synapse-node {
    animation: synapse-fire 1.5s infinite ease-in-out;
  }

  .s-node-1, .s-node-1-r { transform-origin: 38px 24px; animation-delay: 0.1s; }
  .s-node-2, .s-node-2-r { transform-origin: 28px 40px; animation-delay: 0.4s; }
  .s-node-3, .s-node-3-r { transform-origin: 36px 56px; animation-delay: 0.7s; }
  .s-node-4, .s-node-4-r { transform-origin: 30px 68px; animation-delay: 0.2s; }

  @keyframes synapse-fire {
    0%, 100% {
      transform: scale(0.6);
      opacity: 0.3;
      filter: drop-shadow(0 0 1px currentColor);
    }
    50% {
      transform: scale(1.4);
      opacity: 1;
      filter: drop-shadow(0 0 8px currentColor) brightness(1.4);
    }
  }

  @keyframes brain-breath {
    0% { transform: scale(0.94); filter: drop-shadow(0 0 2px var(--primary-glow)) brightness(0.85); }
    100% { transform: scale(1.04); filter: drop-shadow(0 0 12px var(--primary-accent)) brightness(1.15); }
  }

  @keyframes corpus-pulse {
    0% { opacity: 0.25; filter: drop-shadow(0 0 1px var(--secondary-glow)); }
    100% { opacity: 1; filter: drop-shadow(0 0 6px var(--secondary-accent)); }
  }

  @keyframes electricity-flow {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: -100; }
  }

  @keyframes electricity-pulse {
    0%, 100% { stroke-width: 2px; opacity: 0.5; filter: drop-shadow(0 0 2px var(--secondary-glow)); }
    50% { stroke-width: 3.5px; opacity: 1; filter: drop-shadow(0 0 12px var(--secondary-accent)) drop-shadow(0 0 4px #ffffff); }
  }

  .module-text-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .m-label {
    font-size: 8px;
    font-weight: 950;
    color: rgba(167, 139, 250, 0.6);
    letter-spacing: 2px;
    margin-bottom: 2px;
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.15);
    transition: color 0.5s ease;
  }
  .exec-mode .m-label {
    color: rgba(34, 211, 238, 0.6);
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.15);
  }

  .m-val {
    font-size: 21px;
    font-weight: 950;
    color: #fff;
    letter-spacing: 1.5px;
  }

  /* Smooth chroma-flow effect for active labels */
  .mode-chroma {
    background: linear-gradient(90deg, #ffffff 0%, #c084fc 40%, #8b5cf6 70%, #ffffff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 6s linear infinite;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
  }

  .exec-mode .mode-chroma {
    background: linear-gradient(90deg, #ffffff 0%, #22d3ee 40%, #06b6d4 70%, #ffffff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 4s linear infinite;
    text-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
  }

  .assignment-matrix-module.breach-mode {
    border-color: var(--critical-alert);
    background: linear-gradient(135deg, rgba(255, 45, 85, 0.25) 0%, rgba(1, 4, 12, 0.9) 100%);
    box-shadow:
      0 0 25px rgba(255, 45, 85, 0.25),
      inset 0 0 15px rgba(255, 45, 85, 0.2);
  }

  .assignment-matrix-module.breach-mode:hover {
    border-color: rgba(255, 100, 120, 0.95);
    box-shadow:
      0 15px 35px rgba(255, 45, 85, 0.45),
      inset 0 0 20px rgba(255, 45, 85, 0.35);
  }

  .breach-mode .module-glow {
    background: radial-gradient(circle at 15% 50%, rgba(255, 45, 85, 0.25) 0%, transparent 65%);
  }

  .breach-mode .module-transform-icon {
    color: var(--critical-alert);
    filter: drop-shadow(0 0 10px rgba(255, 45, 85, 0.7));
  }

  .breach-mode .m-label {
    color: rgba(255, 100, 120, 0.6);
    text-shadow: 0 0 8px rgba(255, 45, 85, 0.15);
  }

  .breach-mode .mode-chroma {
    background: linear-gradient(90deg, #ffffff 0%, #ff4d4d 40%, #ff2d55 70%, #ffffff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 4s linear infinite;
    text-shadow: 0 0 10px rgba(255, 45, 85, 0.2);
  }

  .icon-breach-cyber {
    overflow: visible !important;
    animation: breach-pulse-effect 1.8s infinite alternate ease-in-out;
  }

  .cyber-hazard-triangle {
    transform-origin: 50px 50px;
    animation: hazard-tremble 0.3s infinite linear;
  }

  .hazard-sparks {
    animation: sparks-discharge 1.8s ease-in-out infinite;
  }

  @keyframes hazard-tremble {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-0.5px, 0.5px) rotate(-0.2deg); }
    50% { transform: translate(0.5px, -0.5px) rotate(0.2deg); }
    75% { transform: translate(-0.5px, -0.5px) rotate(-0.2deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes breach-pulse-effect {
    0% { filter: drop-shadow(0 0 4px rgba(255, 45, 85, 0.5)); }
    100% { filter: drop-shadow(0 0 15px rgba(255, 45, 85, 0.9)); }
  }

  .p-opt.locked {
    opacity: 0.5;
    cursor: not-allowed !important;
  }

  .overlord-registry-input.locked {
    cursor: not-allowed !important;
  }



  /* Operational Matrix Gaps */
  .overlord-operational-matrix { flex: 1; display: flex; flex-direction: column; gap: 32px; position: relative; }
  .matrix-unit { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
  .matrix-unit.portal-open { z-index: 999990; } /* Escapes normal flow to overlay lower units */
  .unit-label-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 6px;
    position: relative;
  }

  .u-label-text {
    font-family: 'Outfit', sans-serif;
    font-size: 13.5px; /* Slightly increased from 12.5px */
    font-weight: 950;
    letter-spacing: 5px;
    text-transform: uppercase;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
    cursor: default;
  }

  .u-label-text:hover {
    transform: scale(1.04) translateY(-1px);
    filter: brightness(1.25);
  }

  /* 4 Header Label Chroma/Sharp Laser Slicing Light Sweeps */
  .input-label-chroma {
    background-image: linear-gradient(90deg, #06b6d4 0%, #8b5cf6 38%, #ffffff 48%, #ffffff 52%, #8b5cf6 62%, #06b6d4 100%);
    animation: chroma-loop 3.5s linear infinite;
    text-shadow: 0 0 15px rgba(6, 182, 212, 0.3);
  }

  .temporal-label-chroma {
    background-image: linear-gradient(90deg, #8b5cf6 0%, #c084fc 38%, #ffffff 48%, #ffffff 52%, #d946ef 62%, #8b5cf6 100%);
    animation: chroma-loop 3.5s linear infinite;
    text-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
  }

  .threat-label-chroma {
    background-image: linear-gradient(90deg, #ef4444 0%, #ff3b30 38%, #ffffff 48%, #ffffff 52%, #f59e0b 62%, #ef4444 100%);
    animation: chroma-loop 3.5s linear infinite;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
  }

  .neural-label-chroma {
    background-image: linear-gradient(90deg, #d946ef 0%, #06b6d4 38%, #ffffff 48%, #ffffff 52%, #8b5cf6 62%, #d946ef 100%);
    animation: chroma-loop 3.5s linear infinite;
    text-shadow: 0 0 15px rgba(217, 70, 239, 0.3);
  }

  /* Left Label Icon Orb - Pulsing Continuous Colorful Animations */
  .u-icon-orb-animated {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(10, 8, 20, 0.6);
    border: 2px solid rgba(139, 92, 246, 0.65);
    box-shadow:
      0 0 15px rgba(139, 92, 246, 0.2),
      inset 0 0 8px rgba(139, 92, 246, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: visible;
    color: #8b5cf6;
    animation: orb-color-sweep 8s linear infinite;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  /* Customized Parameter Orb Sweeps */
  .temporal-orb {
    animation: temporal-orb-sweep 6s linear infinite !important;
  }
  @keyframes temporal-orb-sweep {
    0%, 100% { border-color: rgba(139, 92, 246, 0.7); color: #8b5cf6; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5)); }
    50% { border-color: rgba(217, 70, 239, 0.7); color: #d946ef; filter: drop-shadow(0 0 8px rgba(217, 70, 239, 0.5)); }
  }

  .threat-orb {
    animation: threat-orb-sweep 5s linear infinite !important;
  }
  @keyframes threat-orb-sweep {
    0%, 100% { border-color: rgba(239, 68, 68, 0.75); color: #ef4444; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)); }
    50% { border-color: rgba(245, 158, 11, 0.75); color: #f59e0b; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)); }
  }

  .neural-orb {
    animation: neural-orb-sweep 7s linear infinite !important;
  }
  @keyframes neural-orb-sweep {
    0%, 100% { border-color: rgba(217, 70, 239, 0.7); color: #d946ef; filter: drop-shadow(0 0 8px rgba(217, 70, 239, 0.5)); }
    50% { border-color: rgba(6, 182, 212, 0.7); color: #06b6d4; filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.5)); }
  }

  /* Specific Parameter SVGs Animations */
  .chrono-needle-spin {
    transform-origin: 12px 12px;
    animation: spin-cw-fast 4s linear infinite;
  }
  .temporal-spin {
    transform-origin: 12px 12px;
    stroke-dasharray: 6 4;
    animation: spin-ccw-auto 8s linear infinite;
  }

  .threat-triangle-pulse {
    transform-origin: 12px 12.5px;
    animation: threat-warn-pulse 2.2s infinite alternate ease-in-out;
  }
  @keyframes threat-warn-pulse {
    0% { transform: scale(0.8) rotate(-4deg); opacity: 0.7; }
    100% { transform: scale(1.05) rotate(4deg); opacity: 1; }
  }
  .threat-spin {
    transform-origin: 12px 12px;
    stroke-dasharray: 4 6;
    animation: spin-cw-auto 6s linear infinite;
  }

  .neural-synapse-pulse {
    transform-origin: 12px 12px;
    animation: neural-pulse 2.5s infinite alternate ease-in-out;
  }
  @keyframes neural-pulse {
    0% { transform: scale(0.85); opacity: 0.6; }
    100% { transform: scale(1.1); opacity: 1; }
  }
  .neural-spin {
    transform-origin: 12px 12px;
    stroke-dasharray: 5 5;
    animation: spin-ccw-auto 10s linear infinite;
  }

  .u-icon-orb-animated.error-empty {
    border-color: #f59e0b !important;
    color: #f59e0b !important;
    box-shadow:
      0 0 20px rgba(245, 158, 11, 0.65),
      inset 0 0 10px rgba(245, 158, 11, 0.3) !important;
    animation: orb-flash-fast 0.4s infinite alternate ease-in-out !important;
  }

  .u-icon-orb-animated.error-collision {
    border-color: #ef4444 !important;
    color: #ef4444 !important;
    box-shadow:
      0 0 25px rgba(239, 68, 68, 0.85),
      inset 0 0 12px rgba(239, 68, 68, 0.4) !important;
    animation: orb-flash-fast 0.25s infinite alternate ease-in-out !important;
  }

  .orb-pulsar-svg {
    overflow: visible !important;
  }

  .orb-orbit-ring {
    transform-origin: 12px 12px;
    animation: spin-ccw-auto 8s linear infinite;
    stroke-dasharray: 8 6;
  }

  .orb-core-pulse {
    animation: core-pulsate 2s infinite alternate ease-in-out;
  }

  @keyframes core-pulsate {
    0% { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(1.15); opacity: 1; }
  }

  @keyframes orb-color-sweep {
    0%, 100% { border-color: rgba(139, 92, 246, 0.7); color: #8b5cf6; filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.4)); }
    33% { border-color: rgba(6, 182, 212, 0.7); color: #06b6d4; filter: drop-shadow(0 0 5px rgba(6, 182, 212, 0.4)); }
    66% { border-color: rgba(236, 72, 153, 0.7); color: #ec4899; filter: drop-shadow(0 0 5px rgba(236, 72, 153, 0.4)); }
  }

  @keyframes orb-flash-fast {
    0% { opacity: 0.4; filter: brightness(0.7); transform: scale(0.92); }
    100% { opacity: 1; filter: brightness(1.4); transform: scale(1.08); }
  }

  /* Premium Carbon Input Box Chassis - Increased height to 66px */
  .terminal-shell-premium {
    position: relative;
    width: 100%;
    height: 66px;
    border-radius: 33px;
    overflow: hidden;
    display: flex;
    align-items: center;
    background: rgba(4, 5, 12, 0.96);
    border: 2.5px solid rgba(139, 92, 246, 0.45);
    box-shadow:
      inset 0 0 30px rgba(139, 92, 246, 0.05),
      0 8px 32px rgba(0, 0, 0, 0.8);
    transition: all 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  /* Shaking states */
  .terminal-shell-premium.has-empty-error {
    border-color: #f59e0b !important;
    background: rgba(18, 12, 4, 0.98) !important;
    box-shadow:
      inset 0 0 25px rgba(245, 158, 11, 0.15),
      0 12px 40px rgba(245, 158, 11, 0.35) !important;
    animation: horizontal-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .terminal-shell-premium.has-collision-error {
    border-color: #ef4444 !important;
    background: rgba(22, 6, 8, 0.98) !important;
    box-shadow:
      inset 0 0 30px rgba(239, 68, 68, 0.2),
      0 12px 45px rgba(239, 68, 68, 0.5) !important;
    animation: horizontal-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both, glitch-flash 0.15s infinite alternate;
  }

  /* Shifting Typing highlight to glowing, color-shifting cybernetic gradient backglow */
  .terminal-shell-premium.has-typing {
    border-color: #8b5cf6;
    background: linear-gradient(135deg, rgba(20, 10, 45, 0.95) 0%, rgba(4, 5, 12, 0.98) 100%);
    box-shadow:
      0 0 30px rgba(139, 92, 246, 0.35),
      inset 0 0 25px rgba(139, 92, 246, 0.15),
      0 0 0 1px rgba(6, 182, 212, 0.25);
    animation: premium-chassis-pulse 3s infinite alternate ease-in-out;
  }

  .terminal-shell-premium.has-typing::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.08) 30%, rgba(139, 92, 246, 0.2) 50%, rgba(6, 182, 212, 0.08) 70%, transparent 100%);
    animation: chassis-laser-sweep 4s infinite linear;
    pointer-events: none;
    z-index: 4;
    border-radius: 33px;
  }

  @keyframes chassis-laser-sweep {
    0% { left: -100%; }
    100% { left: 200%; }
  }

  @keyframes premium-chassis-pulse {
    0% {
      border-color: rgba(139, 92, 246, 0.85);
      box-shadow:
        0 0 20px rgba(139, 92, 246, 0.25),
        inset 0 0 20px rgba(139, 92, 246, 0.1),
        0 0 8px rgba(6, 182, 212, 0.2);
    }
    100% {
      border-color: rgba(6, 182, 212, 0.85);
      box-shadow:
        0 0 35px rgba(6, 182, 212, 0.4),
        inset 0 0 25px rgba(6, 182, 212, 0.15),
        0 0 12px rgba(139, 92, 246, 0.35);
    }
  }

  @keyframes horizontal-shake {
    0%, 100% { transform: translateX(0); }
    15%, 45%, 75% { transform: translateX(-6px); }
    30%, 60%, 90% { transform: translateX(6px); }
  }

  @keyframes glitch-flash {
    0% { opacity: 0.92; filter: brightness(0.9); }
    100% { opacity: 1; filter: brightness(1.2); }
  }

  /* Dynamic interior icon styling - perfectly centered on the same vertical axis as the header scope */
  .input-dynamic-status-icon {
    position: absolute;
    left: 18px;
    width: 40px;
    height: 40px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.4s ease;
  }

  /* High fidelity targeting reticle animation inside input box */
  .icon-typing-double-spin {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spin-outer {
    transform-origin: 12px 12px;
    animation: target-spin-cw 3s linear infinite;
  }

  .spin-inner {
    transform-origin: 12px 12px;
    animation: target-spin-ccw 2s linear infinite;
  }

  /* Highly advanced Rainbow Quantum Decryption Grid Animations */
  .icon-typing-crypt-core {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible !important;
  }

  .grid-node {
    transform-origin: center;
    transition: all 0.3s ease;
  }

  .node-1 { transform-origin: 5.75px 5.75px; animation: node-pulse-1 1s infinite alternate ease-in-out; }
  .node-2 { transform-origin: 12px 5.75px; animation: node-pulse-2 1.2s infinite alternate ease-in-out; }
  .node-3 { transform-origin: 18.25px 5.75px; animation: node-pulse-3 0.8s infinite alternate ease-in-out; }
  .node-4 { transform-origin: 5.75px 12px; animation: node-pulse-4 1.1s infinite alternate ease-in-out; }
  .node-5 { transform-origin: 12px 12px; animation: node-pulse-5 0.7s infinite alternate ease-in-out; }
  .node-6 { transform-origin: 18.25px 12px; animation: node-pulse-6 1.3s infinite alternate ease-in-out; }
  .node-7 { transform-origin: 5.75px 18.25px; animation: node-pulse-7 0.9s infinite alternate ease-in-out; }
  .node-8 { transform-origin: 12px 18.25px; animation: node-pulse-8 1.1s infinite alternate ease-in-out; }
  .node-9 { transform-origin: 18.25px 18.25px; animation: node-pulse-9 0.8s infinite alternate ease-in-out; }

  @keyframes node-pulse-1 {
    0% { transform: scale(0.7); opacity: 0.4; filter: drop-shadow(0 0 1px #06b6d4); }
    100% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 6px #06b6d4) brightness(1.2); }
  }
  @keyframes node-pulse-2 {
    0% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 5px #8b5cf6) brightness(1.2); }
    100% { transform: scale(0.75); opacity: 0.5; filter: drop-shadow(0 0 1px #8b5cf6); }
  }
  @keyframes node-pulse-3 {
    0% { transform: scale(0.8); opacity: 0.5; filter: drop-shadow(0 0 2px #ec4899); }
    100% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 6px #ec4899) brightness(1.2); }
  }
  @keyframes node-pulse-4 {
    0% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 5px #fbbf24) brightness(1.2); }
    100% { transform: scale(0.7); opacity: 0.4; filter: drop-shadow(0 0 1px #fbbf24); }
  }
  @keyframes node-pulse-5 {
    0% { transform: scale(0.75); opacity: 0.4; filter: drop-shadow(0 0 2px #ffffff); }
    100% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 3px #06b6d4); }
  }
  @keyframes node-pulse-6 {
    0% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 6px #10b981) brightness(1.2); }
    100% { transform: scale(0.75); opacity: 0.5; filter: drop-shadow(0 0 1px #10b981); }
  }
  @keyframes node-pulse-7 {
    0% { transform: scale(0.7); opacity: 0.4; filter: drop-shadow(0 0 1px #ef4444); }
    100% { transform: scale(1.2); opacity: 1; filter: drop-shadow(0 0 6px #ef4444) brightness(1.2); }
  }
  @keyframes node-pulse-8 {
    0% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 5px #3b82f6) brightness(1.2); }
    100% { transform: scale(0.8); opacity: 0.5; filter: drop-shadow(0 0 1px #3b82f6); }
  }
  @keyframes node-pulse-9 {
    0% { transform: scale(0.8); opacity: 0.5; filter: drop-shadow(0 0 2px #d946ef); }
    100% { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 6px #d946ef) brightness(1.2); }
  }

  /* Pulse chevrons for standby chevrons */
  .icon-standby-breath .chev-1 {
    animation: chev-pulse-a 1.8s infinite alternate ease-in-out;
  }
  .icon-standby-breath .chev-2 {
    animation: chev-pulse-b 1.8s infinite alternate ease-in-out;
  }

  @keyframes chev-pulse-a {
    0% { opacity: 0.3; transform: translateX(-2px); }
    100% { opacity: 0.9; transform: translateX(1px); }
  }

  @keyframes chev-pulse-b {
    0% { opacity: 0.1; transform: translateX(-1px); }
    100% { opacity: 0.8; transform: translateX(2px); }
  }

  /* Pulse warning shields */
  .error-shield-path {
    animation: shield-stroke-glow 1.5s infinite alternate ease-in-out;
  }
  @keyframes shield-stroke-glow {
    0% { fill: rgba(245, 158, 11, 0.08); }
    100% { fill: rgba(245, 158, 11, 0.25); }
  }

  .icon-error-shake-pulse {
    animation: error-shake-pulse-anim 0.8s infinite alternate ease-in-out;
  }
  @keyframes error-shake-pulse-anim {
    0% { transform: scale(0.9); opacity: 0.7; }
    100% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 8px currentColor); }
  }

  .warning-color { color: #f59e0b; }
  .danger-color { color: #ef4444; }

  /* Blending dynamic status icon with the new active neon violet theme */
  .active-color { color: #8b5cf6; filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.6)); }
  .standby-color { color: rgba(139, 92, 246, 0.6); }

  /* Real input (invisible text, visible caret, scrolls reactively in 1:1 sync) - Height unified to 66px */
  .overlord-terminal-input {
    width: 100%;
    height: 66px;
    padding: 0 24px 0 76px; /* Synchronized for mini scope icon closer spacing */
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Share Tech Mono', monospace;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: 0px;
    text-transform: none; /* Allows symbols, numbers, and lowercase casing intact */
    box-sizing: border-box;
    z-index: 6; /* Placed above display overlay so select/cursor works */

    /* Make text fully invisible but let cursor blink */
    color: transparent !important;
    caret-color: #8b5cf6;
  }

  .terminal-shell-premium.has-empty-error .overlord-terminal-input {
    caret-color: #f59e0b;
  }

  .terminal-shell-premium.has-collision-error .overlord-terminal-input {
    caret-color: #ef4444;
  }

  /* Premium Visual Display Overlay (Aligned perfectly over transparent input, handles horizontal scrolling sync) */
  .overlord-input-overlay-display {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    align-items: center;
    padding: 0 24px 0 76px; /* Matches input padding */
    z-index: 5;
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
  }

  /* Mini Scope reticle styling - perfectly scaled and aligned on the same vertical axis */
  .omni-scope-terminal.mini-scope {
    position: absolute;
    width: 80px;
    height: 80px;
    transform: scale(0.5);
    transform-origin: center;
    cursor: default;
    pointer-events: none; /* Make click-through so user can click to focus input */
  }

  .omni-scope-terminal.mini-scope.acquired {
    transform: scale(0.61); /* 0.5 * 1.22 = 0.61 */
  }

  /* Kinetic Laser Underliner (Matching Header Alignment) */
  .terminal-laser-bar {
    position: absolute;
    bottom: 0;
    left: 76px; /* Aligns with start of text */
    right: 24px;
    height: 2px;
    background: rgba(139, 92, 246, 0.2);
    z-index: 10;
    overflow: hidden;
  }

  .terminal-shell-premium.has-empty-error .terminal-laser-bar { background: rgba(245, 158, 11, 0.3); }
  .terminal-shell-premium.has-collision-error .terminal-laser-bar { background: rgba(239, 68, 68, 0.3); }

  .terminal-laser-bar .laser-pulse {
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent);
    animation: laser-sweep-pulse 2.5s infinite ease-in-out;
  }

  .terminal-shell-premium.has-empty-error .laser-pulse {
    background: linear-gradient(90deg, transparent, #f59e0b, transparent);
  }
  .terminal-shell-premium.has-collision-error .laser-pulse {
    background: linear-gradient(90deg, transparent, #ef4444, transparent);
  }

  /* Live Chroma Gradient flow text - lowercase/symbols supported (no uppercase text-transform!) */
  .live-chroma-text {
    font-family: 'Share Tech Mono', monospace;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: 0px;
    white-space: nowrap;
    overflow: visible;
    display: inline-block;

    /* Flowing gradient */
    background: linear-gradient(90deg, #ffffff 0%, #c084fc 35%, #8b5cf6 65%, #ffffff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 5s linear infinite;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
  }

  .live-chroma-text.error-empty {
    background: none !important;
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
    color: #f59e0b;
    text-shadow: 0 0 15px rgba(245, 158, 11, 0.7);
  }

  .live-chroma-text.error-collision {
    background: none !important;
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
    color: #ef4444;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
  }

  /* Live placeholder styled identically to task name */
  .live-placeholder {
    font-family: 'Share Tech Mono', monospace;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: 0px;
    white-space: nowrap;
    overflow: visible;
    display: inline-block;
    color: rgba(255, 255, 255, 0.22);
    transition: all 0.3s ease;
  }

  .live-placeholder.error-empty {
    color: rgba(245, 158, 11, 0.85);
    text-shadow: 0 0 12px rgba(245, 158, 11, 0.45);
  }

  .live-placeholder.error-collision {
    color: rgba(239, 68, 68, 0.85);
    text-shadow: 0 0 12px rgba(239, 68, 68, 0.45);
  }

  .matrix-param-grid { display: flex; gap: 40px; }
  .half { flex: 1; }

  /* Point 7: Temporal Anchor FUI Readout Overhaul */
  .temporal-lock-btn {
    height: 58px !important; /* Exactly matching priority buttons */
    background: linear-gradient(90deg, #8b5cf6 0%, #3b0764 100%) !important;
    border: 3px solid #a78bfa !important; /* Continuous solid border, no fading */
    border-radius: 20px !important; /* Polished and sharp matched corners */
    padding: 0 20px 0 18.2px !important; /* Sub-pixel alignment: exactly 18.2px left padding */
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35);
  }

  /* Date Loaded Striking High-Visibility State */
  .temporal-lock-btn.date-set {
    background: linear-gradient(90deg, #ef4444 0%, #7f1d1d 100%) !important;
    border: 3px solid #f87171 !important; /* Continuous solid red/crimson border, no fading */
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
  }

  /* Override mini-scope color on active red deadline button to neon cyan for maximum contrast and visibility */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired {
    border-color: #00f3ff !important;
    background: #0b071e !important; /* Premium deep obsidian base to block out the red button gradient entirely */
    box-shadow: 0 0 25px rgba(0, 243, 255, 0.9), inset 0 0 15px rgba(0, 243, 255, 0.4) !important;
  }

  /* Chassis segments to bright glowing cyan */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired .chassis-segment {
    background: #00f3ff !important;
    box-shadow: 0 0 12px #00f3ff !important;
    opacity: 1 !important;
  }

  /* Data rings to cyan and violet (high visibility) */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired .ring-cyan {
    border-color: #00f3ff !important;
    opacity: 0.95 !important;
    filter: drop-shadow(0 0 4px #00f3ff) !important;
  }
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired .ring-violet {
    border-color: #c084fc !important;
    opacity: 0.85 !important;
    filter: drop-shadow(0 0 4px #c084fc) !important;
  }

  /* Plus crosshairs to cyan instead of alertGrad red, thickened for visual clarity */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.plus-line) {
    stroke: #00f3ff !important;
    stroke-width: 1.75px !important; /* Thickened from 0.75px */
    opacity: 1 !important;
    filter: drop-shadow(0 0 4px #00f3ff) !important;
  }
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.plus-tick) {
    stroke: #00f3ff !important;
    stroke-width: 2.5px !important; /* Thickened from 1.5px */
    opacity: 1 !important;
    filter: drop-shadow(0 0 4px #00f3ff) !important;
  }

  /* Spotlight beams to white-cyan gradient sweep, thickened for visual punch */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.spotlight-beam) {
    stroke-width: 3.5px !important;
    opacity: 0.95 !important;
    filter: drop-shadow(0 0 5px rgba(0, 243, 255, 0.6)) !important;
  }

  /* Spotlight beams, rotating crossing lines, broken rings, sliding mechanical crosshairs, threat icons, laser dot */
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.rotating-cross-line) {
    stroke: #ffffff !important; /* Glowing pure white crossing lines */
    stroke-width: 1.5px !important; /* Thickened from 0.5px */
    opacity: 1 !important;
    filter: drop-shadow(0 0 6px #00f3ff) !important;
  }

  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.outer-broken-ring) {
    stroke: #00f3ff !important;
    stroke-width: 6.5px !important; /* Thickened from 4.5px */
    opacity: 1 !important;
    filter: drop-shadow(0 0 5px rgba(0, 243, 255, 0.7)) !important;
  }

  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.inner-broken-ring) {
    stroke: #00ff9f !important; /* Searing lime-green inner broken ring */
    stroke-width: 5.5px !important; /* Thickened from 3.5px */
    opacity: 1 !important;
    filter: drop-shadow(0 0 5px rgba(0, 255, 159, 0.7)) !important;
  }

  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.crosshair-line) {
    stroke: #00f3ff !important;
    stroke-width: 3.5px !important; /* Thickened from 2px */
    opacity: 1 !important;
  }

  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.center-lock-icon) :global(path),
  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.center-lock-icon) :global(circle) {
    stroke: #00ff9f !important; /* Searing Neon Lime Green center settings icon */
    stroke-width: 4px !important;
    fill: rgba(0, 255, 159, 0.25) !important;
    filter: drop-shadow(0 0 6px #00ff9f) !important;
  }

  .temporal-lock-btn.date-set .omni-scope-terminal.mini-scope.acquired :global(.reticle-laser-dot) {
    fill: #ffffff !important; /* Pristine white hot core laser dot */
    r: 4 !important; /* Enlarged from 2.5 for supreme visibility */
    filter: drop-shadow(0 0 8px #00f3ff) !important;
  }

  .temporal-lock-btn:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: #c084fc !important; /* Glowing purple border on hover, NO white light highlight */
    background: linear-gradient(135deg, #a78bfa 0%, #5b21b6 45%, #2e1065 100%) !important;
    box-shadow: 0 15px 40px rgba(139, 92, 246, 0.75) !important; /* NO white inset shadow */
  }

  .temporal-lock-btn.date-set:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: #fca5a5 !important; /* Glowing red border on hover, NO white light highlight */
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 45%, #450a0a 100%) !important;
    box-shadow: 0 15px 40px rgba(239, 68, 68, 0.75) !important; /* NO white inset shadow */
  }

  .temporal-lock-btn:active {
    transform: translateY(-2px) scale(0.98);
  }

  .deadline-indicator-icon {
    transition: all 0.4s var(--ease-fui);
    flex-shrink: 0;
  }

  .deadline-indicator-icon.calendar-mode {
    filter: drop-shadow(0 0 5px rgba(0, 243, 255, 0.45));
  }

  .temporal-lock-btn:hover .calendar-mode {
    transform: scale(1.1);
    filter: drop-shadow(0 0 7px rgba(0, 243, 255, 0.8));
  }

  .temporal-lock-btn:hover .scope-mode-wrapper {
    transform: scale(1.08);
    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.7));
  }

  .temporal-lock-btn:hover .btn-liquid-sweep {
    left: 150%;
  }

  /* Mathematically Centered Readout - Bold Outfit Font Overlay */
  .btn-readout-content {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    margin-right: 51px; /* Symmetrical offset for perfectly centering the text inside the button physical body: 21px (left padding) + 38px (icon) + 12px (gap) = 71px space. Balanced by 20px (right padding) + 51px = 71px */
    pointer-events: none;
    z-index: 2;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .readout-value {
    font-family: 'Outfit', sans-serif;
    font-size: 25px; /* Increased font-size for high visibility without increasing button size */
    font-weight: 950;
    letter-spacing: 2px;
    color: #ffffff !important;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    /* High visibility contrast: no neon or white glow, just an ultra-sharp dark dropshadow */
    text-shadow: 0 3px 6px rgba(0, 0, 0, 0.9);
  }

  /* High-fidelity custom tactical grid calendar icon scan animations */
  @keyframes cal-dot-pulse {
    0%, 100% { opacity: 0.35; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.3); }
  }

  .cal-dot {
    animation: cal-dot-pulse 2s infinite ease-in-out;
    transform-origin: center;
  }

  /* Staggered digital matrix sweep delays */
  .d1 { animation-delay: 0.0s; transform-origin: 7.5px 13.5px; }
  .d2 { animation-delay: 0.2s; transform-origin: 12px 13.5px; }
  .d3 { animation-delay: 0.4s; transform-origin: 16.5px 13.5px; }
  .d4 { animation-delay: 0.6s; transform-origin: 7.5px 17px; }
  .d5 { animation-delay: 0.8s; transform-origin: 12px 17px; }
  .d6 { animation-delay: 1.0s; transform-origin: 16.5px 17px; }

  /* Interactive grid sweep acceleration on hover */
  .temporal-lock-btn:hover .cal-dot {
    animation-duration: 0.8s;
  }

  /* Center vertical rays alignment hover tracking animations */
  .temporal-lock-btn:hover .scope-mode-wrapper :global(.omni-scope-terminal) {
    transform: scale(0.56) !important; /* snappily expands the scale on hover */
  }

  /* Priority grid */
  .overlord-priority-grid { display: flex; gap: 14px; height: 58px; }

  .p-opt {
    position: relative;
    overflow: hidden;
    flex: 1;
    border-radius: 16px;
    font-weight: 950;
    font-family: 'Outfit', sans-serif;
    font-size: 16px; /* Increased font-size from 14px */
    letter-spacing: 3px;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none; /* Disable browser-default white/blue outlines completely */
    box-sizing: border-box;
  }

  /* Low (Green Profile) Solid Gradient Inactive */
  .p-opt.low {
    border: 2px solid #065f46;
    background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
    color: #a7f3d0;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4);
  }
  .p-opt.low:hover {
    border-color: #059669;
    background: linear-gradient(135deg, #059669 0%, #064e3b 100%);
    color: #ffffff;
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  /* Medium (Amber Profile) Solid Gradient Inactive */
  .p-opt.med {
    border: 2px solid #78350f;
    background: linear-gradient(135deg, #78350f 0%, #451a03 100%);
    color: #fde68a;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4);
  }
  .p-opt.med:hover {
    border-color: #d97706;
    background: linear-gradient(135deg, #d97706 0%, #78350f 100%);
    color: #ffffff;
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  /* High (Crimson Profile) Solid Gradient Inactive */
  .p-opt.high {
    border: 2px solid #7f1d1d;
    background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
    color: #fca5a5;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.4);
  }
  .p-opt.high:hover {
    border-color: #dc2626;
    background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%);
    color: #ffffff;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  /* Sleek interactive hover slicing sweep */
  .p-opt::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
    transform: skewX(-25deg);
    transition: 0.65s cubic-bezier(0.25, 0.8, 0.25, 1);
    pointer-events: none;
    z-index: 2;
  }
  .p-opt:hover::after {
    left: 150%;
  }

  /* Active Button Continuous Slicing Sweep */
  .p-opt.active::after {
    animation: active-button-slicing-sweep 3.5s infinite linear;
  }
  @keyframes active-button-slicing-sweep {
    0% { left: -150%; }
    40% { left: 150%; }
    100% { left: 150%; }
  }

  /* Active States - Intense Holographic Flare (Non-transparent) */
  .p-opt.active {
    transform: translateY(-4px);
    z-index: 3;
  }

  .p-opt.low.active {
    color: #ffffff;
    border-color: #34d399;
    background: linear-gradient(135deg, #10b981 0%, #047857 100%);
    box-shadow:
      0 0 35px rgba(16, 185, 129, 0.65),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(16, 185, 129, 0.6), 0 0 1px #ffffff;
  }

  .p-opt.med.active {
    color: #ffffff;
    border-color: #fbbf24;
    background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
    box-shadow:
      0 0 35px rgba(245, 158, 11, 0.65),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(245, 158, 11, 0.6), 0 0 1px #ffffff;
  }

  .p-opt.high.active {
    color: #ffffff;
    border-color: #f87171;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    box-shadow:
      0 0 45px rgba(239, 68, 68, 0.8),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(239, 68, 68, 0.6), 0 0 1px #ffffff;
  }

  /* Refractive Shards - Tactical Cyber Scoping Capsule Slot - Regular Box Form matching other inputs */
  .overlord-registry-box {
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.012) 0px, rgba(255, 255, 255, 0.012) 1px, transparent 1px, transparent 4px),
      linear-gradient(135deg, rgba(20, 10, 45, 0.2) 0%, rgba(5, 2, 15, 0.45) 100%);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 2px solid rgba(139, 92, 246, 0.45);
    border-radius: 33px; /* Regular Box Form with standard 33px rounded corners */
    padding: 0 32px; /* Increased horizontal padding for clean compact look */
    height: 66px;
    display: flex;
    align-items: center;
    position: relative;
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.55),
      inset 0 0 20px rgba(139, 92, 246, 0.06);
    box-sizing: border-box;
    margin-bottom: 0px;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    /* Removed overflow: hidden so floating suggestions list is visible! */
  }

  /* Neural Registry Scroll Buttons */
  .registry-scroll-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 32px; /* Standardize slightly wider click footprint */
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent !important; /* Force transparent backing matching box */
    border: none;
    color: #ffffff;
    cursor: pointer;
    z-index: 100;
    opacity: 0.3; /* Increased baseline visibility so it is not hidden in the borders */
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    padding: 0;
    outline: none;
    border-radius: 50%;
  }

  .scroll-btn-left {
    left: 2px; /* Placed extremely close to the left boundary */
  }

  .scroll-btn-right {
    right: 2px; /* Placed extremely close to the right boundary */
  }

  .registry-scroll-btn:hover {
    opacity: 0.55; /* Refined soft micro-glow on hover */
    color: #ffffff;
    /* Tyndall Effect: soft, scattered light spill diffusing into the background */
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 70%) !important;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.2));
    transform: translateY(-50%) scale(1.15);
  }

  .registry-scroll-btn:active {
    transform: translateY(-50%) scale(0.95);
  }

  /* Animated holographic scanning laser sweep */
  .registry-laser-sweep {
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.04) 30%, rgba(6, 182, 212, 0.12) 50%, rgba(139, 92, 246, 0.04) 70%, transparent 100%);
    border-radius: 33px; /* Matched to regular box form */
    animation: registry-laser-scan-sweep 5s infinite linear;
    pointer-events: none;
    z-index: 1;
  }
  @keyframes registry-laser-scan-sweep {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  /* Focus within state - intense illumination of capsule boundaries */
  .overlord-registry-box:focus-within {
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 4px),
      linear-gradient(135deg, rgba(20, 10, 45, 0.25) 0%, rgba(5, 2, 15, 0.5) 100%);
    border-color: rgba(6, 182, 212, 0.85); /* Shifting focus highlight to glowing Cyan */
    box-shadow:
      0 12px 45px rgba(6, 182, 212, 0.25),
      inset 0 0 25px rgba(6, 182, 212, 0.15);
  }

  /* Vibrant Flash Alarm when exceeding 8 tags capacity limit */
  .overlord-registry-box.has-capacity-error {
    border-color: #ef4444 !important;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(22, 6, 8, 0.8) 100%) !important;
    box-shadow:
      0 0 45px rgba(239, 68, 68, 0.65),
      inset 0 0 25px rgba(239, 68, 68, 0.3) !important;
    animation: horizontal-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .registry-flow-container { display: flex; align-items: center; gap: 12px; flex: 1; overflow-x: auto; scrollbar-width: none; height: 100%; }
  .overlord-registry-box.portal-active .registry-flow-container {
    position: relative;
    z-index: 126000 !important;
  }

  .data-shard {
    flex-shrink: 0;
    padding: 10px 24px; /* Increased padding */
    border-radius: 24px; /* Perfect Capsule Pill Shape matching container */
    color: #ffffff;
    font-size: 20px; /* Increased font size to 20px */
    font-weight: 950; /* Ultra bold Outfit */
    font-family: 'Outfit', sans-serif;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 48px; /* Slightly taller for visual priority */
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .data-shard span {
    z-index: 2;
    color: #ffffff;
    font-size: 20px;
    font-weight: 950;
    letter-spacing: 1.5px;
    text-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.9), 0 0 4px rgba(255, 255, 255, 0.25); /* Softened white highlighting, supreme visibility */
  }
  .shard-glow-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%); }

  /* Deterministic Random Neon Gradient Presets */
  .tag-preset-0 {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #034b6e 100%);
    border: 1.5px solid rgba(14, 165, 233, 0.6);
    box-shadow: 0 0 20px rgba(14, 165, 233, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px rgba(14, 165, 233, 0.6);
  }
  .tag-preset-1 {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #3b0764 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px rgba(139, 92, 246, 0.6);
  }
  .tag-preset-2 {
    background: linear-gradient(135deg, #ec4899 0%, #be185d 50%, #500724 100%);
    border: 1.5px solid rgba(236, 72, 153, 0.6);
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px rgba(236, 72, 153, 0.6);
  }
  .tag-preset-3 {
    background: linear-gradient(135deg, #f59e0b 0%, #b45309 50%, #451a03 100%);
    border: 1.5px solid rgba(245, 158, 11, 0.6);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px rgba(245, 158, 11, 0.6);
  }
  .tag-preset-4 {
    background: linear-gradient(135deg, #10b981 0%, #047857 50%, #022c22 100%);
    border: 1.5px solid rgba(16, 185, 129, 0.6);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 4px rgba(16, 185, 129, 0.6);
  }

  /* Highly Tactile Circular Threat Purge Close Button with Constant Red Gradient */
  .shard-close-btn {
    background: linear-gradient(135deg, #ff3b30 0%, #ff2a2a 40%, #990000 100%);
    border: 1.5px solid rgba(255, 77, 77, 0.75);
    color: #ffffff;
    border-radius: 50%; /* Perfect circular shape */
    width: 28px; /* Slightly increased size */
    height: 28px; /* Slightly increased size */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    z-index: 10;
    box-shadow: 0 0 12px rgba(255, 59, 48, 0.45), inset 0 0 4px rgba(255, 255, 255, 0.2);
  }
  .shard-close-btn:hover {
    background: linear-gradient(135deg, #ff5e62 0%, #ff3b30 50%, #d32f2f 100%) !important;
    border-color: #ffffff !important;
    color: #ffffff !important;
    transform: scale(1.2) rotate(90deg); /* Exact 90 degrees rotation animation */
    box-shadow: 0 0 20px rgba(255, 94, 98, 0.95), inset 0 0 6px rgba(255, 255, 255, 0.3);
  }

  .input-registry-wrapper {
    position: relative;
    flex: 1;
    min-width: 250px;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .overlord-registry-input {
    flex: 1; /* Match maximum horizontal remaining space inside the box */
    width: 100%; background: transparent; border: none; color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 19px; font-weight: 950; outline: none; /* Occupy maximum vertical height */
    height: 100%;
    margin: 0 24px; /* Slightly more margin on left and right */
    padding: 0; /* Minimal padding */
    line-height: 66px; /* Centered perfectly in 66px box */
  }

  .overlord-registry-input::placeholder {
    font-size: 19px; /* Matching the font size exactly */
    font-weight: 950; /* Matching the font weight exactly */
    color: rgba(255, 255, 255, 0.22); /* Highly aesthetic cybernetic placeholder contrast */
    font-family: 'Outfit', sans-serif;
    text-transform: uppercase;
    letter-spacing: 2px; /* Increased tracking for readability at smaller sizes */
    line-height: 66px; /* Centered perfectly */
  }

  /* High-Fidelity Cyber Diagnostic Suggestions Portal - Card Type Backdrop Blur */
  .overlord-registry-box.portal-active {
    z-index: 999990 !important; /* Elevate above portal backdrop, slightly below portal itself */
  }

  .overlord-portal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 999900 !important; /* Stacks below registry box but above other items inside the modal */
    pointer-events: auto; /* Catch clicks to dismiss */
  }

  .overlord-search-portal {
    position: absolute; bottom: calc(100% + 24px); left: 0; width: 480px;
    background: linear-gradient(135deg, rgba(8, 6, 20, 0.98) 0%, rgba(2, 4, 10, 0.99) 100%) !important;
    backdrop-filter: blur(50px) saturate(3);
    -webkit-backdrop-filter: blur(50px) saturate(3);
    border: 2px solid rgba(139, 92, 246, 0.95);
    border-radius: 24px;
    margin-bottom: 12px;
    z-index: 999999 !important; /* Absolute maximum z-index to guarantee it is always on top */
    box-shadow:
      0 50px 120px rgba(0, 0, 0, 1),
      0 0 80px rgba(139, 92, 246, 0.6),
      0 0 40px rgba(6, 182, 212, 0.4),
      inset 0 0 30px rgba(139, 92, 246, 0.3);
    padding: 16px 0;
    transition: left 0.1s linear; /* Fast, fluid horizontal tracking */
    box-sizing: border-box;
    display: flex; flex-direction: column;
  }

  /* Holographic visual pointer connecting the portal directly to the input text */
  .overlord-search-portal::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: var(--pointer-left, 24px); /* Dynamically tracks the actual cursor */
    width: 0;
    height: 0;
    border-left: 14px solid transparent;
    border-right: 14px solid transparent;
    border-top: 14px solid rgba(139, 92, 246, 0.95);
    filter: drop-shadow(0 6px 12px rgba(139, 92, 246, 0.9));
    z-index: 10;
    transition: left 0.1s linear;
  }

  .portal-header-legend.new-record-legend {
    color: #ef4444;
    border-bottom: 2px solid rgba(239, 68, 68, 0.45);
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%);
  }

  .legend-beacon.create-beacon {
    background-color: #ef4444;
    box-shadow: 0 0 10px #ef4444;
    animation: beacon-pulse-danger 1s infinite alternate;
  }
  @keyframes beacon-pulse-danger {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.4); opacity: 1; }
  }

  .search-suggestion-item.create-new-item {
    color: #fca5a5 !important;
  }
  .search-suggestion-item.create-new-item::before {
    background: #ef4444;
  }
  .search-suggestion-item.create-new-item::after {
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, transparent 100%);
  }
  .search-suggestion-item.create-new-item:hover::before {
    box-shadow: 0 0 15px #ef4444;
  }
  .search-suggestion-item.create-new-item .create-icon {
    color: rgba(239, 68, 68, 0.8);
  }
  .search-suggestion-item.create-new-item:hover .create-icon {
    color: #ef4444;
    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.9));
  }

  .new-text-chroma {
    background: linear-gradient(90deg, #fff, #ef4444, #fca5a5, #fff);
    background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: chroma-loop 6s linear infinite;
  }

  /* Telemetry portal list view legend header */
  .portal-header-legend {
    font-size: 11px;
    font-weight: 950;
    color: #a78bfa;
    letter-spacing: 5px;
    padding: 16px 28px 12px 28px;
    border-bottom: 2px solid rgba(139, 92, 246, 0.45);
    text-transform: uppercase;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, transparent 100%);
    pointer-events: none;
    user-select: none;
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    box-shadow: inset 0 -4px 10px rgba(0, 0, 0, 0.2);
  }

  /* Pulsing cyan diagnostic beacon */
  .legend-beacon {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #06b6d4;
    box-shadow: 0 0 8px #06b6d4;
    margin-right: 12px;
    vertical-align: middle;
    animation: legend-beacon-pulse 1.2s infinite alternate ease-in-out;
  }
  @keyframes legend-beacon-pulse {
    0% { transform: scale(0.8); opacity: 0.4; }
    100% { transform: scale(1.3); opacity: 1; }
  }

  .search-suggestion-item {
    width: 100%; padding: 16px 28px; background: transparent !important; border: none;
    color: #94a3b8 !important; text-align: left; cursor: pointer; font-size: 16px; font-weight: 950;
    letter-spacing: 1.5px; font-family: 'Outfit', sans-serif;
    display: flex; align-items: center; gap: 16px;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }
  .search-suggestion-item:last-child { border-bottom: none; }

  .search-suggestion-item::before {
    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
    background: #06b6d4; transform: scaleY(0); transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: center; z-index: 2;
  }

  .search-suggestion-item::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, rgba(6, 182, 212, 0.2) 0%, transparent 100%);
    transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); z-index: 1;
  }

  .search-suggestion-item:hover {
    color: #ffffff !important; padding-left: 36px; box-shadow: none !important; transform: none !important;
  }
  .search-suggestion-item:hover::before { transform: scaleY(1); box-shadow: 0 0 15px #06b6d4; }
  .search-suggestion-item:hover::after { left: 0; }

  /* Override presets */
  .search-suggestion-item.tag-preset-0, .search-suggestion-item.tag-preset-1,
  .search-suggestion-item.tag-preset-2, .search-suggestion-item.tag-preset-3,
  .search-suggestion-item.tag-preset-4 { border-color: transparent !important; box-shadow: none !important; border-left: none !important; margin: 0 !important; border-radius: 0 !important; }

  .suggestion-icon-shell {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; z-index: 5;
  }

  .suggestion-add-icon {
    color: rgba(139, 92, 246, 0.8);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    transform: scale(0.6) rotate(-90deg);
  }

  .search-suggestion-item:hover .suggestion-add-icon {
    color: #06b6d4; opacity: 1 !important;
    filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.9));
    transform: scale(1.1) rotate(0deg);
  }

  .suggestion-text { z-index: 5; position: relative; display: flex; align-items: center; }

  /* Symmetrical footer margins */
  .overlord-footer { display: flex; gap: 40px; padding-top: 32px; margin-top: auto; margin-bottom: 32px; }
  .overlord-action-btn {
    flex: 1; height: 76px; border-radius: 24px; font-size: 20px; font-weight: 950;
    letter-spacing: 6px; cursor: pointer; transition: all 0.5s;
    position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
    border: 3.5px solid rgba(255, 255, 255, 0.2);
  }

  .btn-liquid-sweep { position: absolute; top: 0; left: -150%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-25deg); transition: 0.8s; }
  .overlord-action-btn:hover .btn-liquid-sweep { left: 150%; }

  /* Point 3 & 8: Abort hover matching Nuke button */
  .abort-style { background: linear-gradient(90deg, #ef4444 0%, #3a0202 100%); color: #fff; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); }
  .abort-style:hover {
    background: linear-gradient(135deg, #ff3b30 0%, #b91c1c 45%, #450a0a 100%) !important;
    border-color: #ffffff !important;
    transform: translateY(-10px) scale(1.03);
    box-shadow: 0 20px 60px rgba(255, 59, 48, 0.85), inset 0 0 30px rgba(255, 255, 255, 0.3) !important;
  }

  .launch-style { background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%); color: #fff; box-shadow: 0 10px 30px rgba(6, 182, 212, 0.3); }
  .launch-style:hover { border-color: #ffffff; transform: translateY(-10px) scale(1.03); box-shadow: 0 0 80px rgba(6, 182, 212, 1); }
  .launch-style:disabled { opacity: 0.1; filter: grayscale(1); }

  /* Bottom glow sweeps removed for clean look */

  :global(.overlord-match) {
    color: #ffffff !important;
    background: rgba(6, 182, 212, 0.4) !important;
    border-bottom: 2px solid #06b6d4 !important;
    padding: 2px 8px !important;
    border-radius: 6px !important;
    text-shadow: 0 0 15px #fff, 0 0 25px #06b6d4 !important;
    box-shadow: 0 4px 20px rgba(6, 182, 212, 0.5), inset 0 0 8px rgba(6, 182, 212, 0.4) !important;
    display: inline-block !important;
    transform: scale(1.08);
    margin: 0 4px !important;
    letter-spacing: 2px !important;
    font-weight: 950 !important;
  }

  .search-suggestion-item.tag-preset-0 :global(.overlord-match),
  .search-suggestion-item.tag-preset-1 :global(.overlord-match),
  .search-suggestion-item.tag-preset-2 :global(.overlord-match),
  .search-suggestion-item.tag-preset-3 :global(.overlord-match),
  .search-suggestion-item.tag-preset-4 :global(.overlord-match) {
    background: rgba(6, 182, 212, 0.4) !important;
    text-shadow: 0 0 15px #fff, 0 0 25px #06b6d4 !important;
  }

  .overlord-error-log {
    font-size: 13px;
    color: #ef4444;
    font-weight: 950;
    margin-left: auto;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4);
    letter-spacing: 2px;
    white-space: nowrap;
    overflow: hidden;
    display: inline-block;
    flex-shrink: 0;
    vertical-align: middle;
    line-height: 1;
    animation: error-glow-pulse 1.5s infinite ease-in-out;
  }

  @keyframes error-glow-pulse {
    0%, 100% { opacity: 0.85; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
    50% { opacity: 1; text-shadow: 0 0 15px rgba(239, 68, 68, 0.9), 0 0 25px rgba(239, 68, 68, 0.6); }
  }

  @keyframes chroma-loop { from { background-position: 0% center; } to { background-position: 200% center; } }
  @keyframes photon-flash { from { opacity: 0.4; } to { opacity: 1; filter: brightness(2); } }

  .font-outfit { font-family: 'Outfit', sans-serif; font-weight: 950; }
  :global(.nexus-backdrop) { z-index: 40000 !important; }

  /* Mini Task Scope Terminal Styling */
  .task-scope-terminal {
    width: 54px; height: 54px; position: relative;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 80%);
    border-radius: 50%;
    border: 1.5px solid rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
  }

  .scope-chassis.mini {
    position: absolute; width: 100%; height: 100%;
    animation: chassis-spin 40s linear infinite;
  }
  .mini-chassis-segment { position: absolute; background: rgba(139, 92, 246, 0.6); transition: all 0.5s var(--ease-fui); }
  .mini-chassis-segment.top, .mini-chassis-segment.bottom { width: 10px; height: 2px; left: 50%; transform: translateX(-50%); }
  .mini-chassis-segment.left, .mini-chassis-segment.right { width: 2px; height: 10px; top: 50%; transform: translateY(-50%); }
  .mini-chassis-segment.top { top: -1.5px; } .mini-chassis-segment.bottom { bottom: -1.5px; }
  .mini-chassis-segment.left { left: -1.5px; } .mini-chassis-segment.right { right: -1.5px; }

  .scope-data-rings.mini { position: absolute; width: 100%; height: 100%; }
  .mini-ring-cyan {
    position: absolute; top: 2px; left: 2px; right: 2px; bottom: 2px;
    border: 1px dashed #06b6d4; border-radius: 50%; opacity: 0.4;
    animation: data-ring-breath-a 6s ease-in-out infinite alternate;
  }
  .mini-ring-violet {
    position: absolute; top: 7px; left: 7px; right: 7px; bottom: 7px;
    border: 1px dotted #8b5cf6; border-radius: 50%; opacity: 0.4;
    animation: data-ring-breath-b 4s ease-in-out infinite alternate-reverse;
  }

  .scope-reticle-core.mini { position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; }
  .mini-reticle-dot { animation: laser-heartbeat 2s infinite alternate; }

  /* Kinetic Laser Underliner (Matching Header Alignment) */
  .terminal-laser-bar {
    position: absolute;
    bottom: 0;
    left: 100px; /* Aligns with start of text */
    right: 24px;
    height: 2px;
    background: rgba(139, 92, 246, 0.2);
    z-index: 10;
    overflow: hidden;
  }

  .terminal-shell-premium.has-empty-error .terminal-laser-bar { background: rgba(245, 158, 11, 0.3); }
  .terminal-shell-premium.has-collision-error .terminal-laser-bar { background: rgba(239, 68, 68, 0.3); }

  .terminal-laser-bar .laser-pulse {
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent);
    animation: laser-sweep-pulse 2.5s infinite ease-in-out;
  }

  .terminal-shell-premium.has-empty-error .laser-pulse {
    background: linear-gradient(90deg, transparent, #f59e0b, transparent);
  }
  .terminal-shell-premium.has-collision-error .laser-pulse {
    background: linear-gradient(90deg, transparent, #ef4444, transparent);
  }
</style>
