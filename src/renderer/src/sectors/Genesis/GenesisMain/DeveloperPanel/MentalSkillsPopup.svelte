<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import { AudioEngine } from '../../../../core/audio-engine';
  import { AntaryamiState } from '../../../../core/store';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose } = $props<Props>();

  const defaultSkills = [
    { 
      name: 'COMPARTMENTALIZATION', 
      description: 'Isolate thoughts, emotions, or cognitive processes to remain operational under intense psychological distress.', 
      dateAdded: Date.now() - 90 * 24 * 60 * 60 * 1000 
    },
    { 
      name: 'EMPTY YOUR MIND', 
      description: 'Achieve complete cognitive silence. Erase background noise and secondary processes to maximize current execution speed.', 
      dateAdded: Date.now() - 60 * 24 * 60 * 60 * 1000 
    },
    { 
      name: 'THINK FOR YOURSELF', 
      description: 'By-pass external network heuristics and media overrides. Exercise absolute cognitive autonomy.', 
      dateAdded: Date.now() - 45 * 24 * 60 * 60 * 1000 
    },
    { 
      name: 'SELF REFLECTION', 
      description: 'Execute continuous background diagnostic checks on your own decisions, logic loops, and psychological states.', 
      dateAdded: Date.now() - 28 * 24 * 60 * 60 * 1000 
    },
    { 
      name: 'FORESIGHT THINKING', 
      description: 'Compute parallel branching future state models. Anticipate threat moves and environmental shifts 10 steps ahead.', 
      dateAdded: Date.now() - 12 * 24 * 60 * 60 * 1000 
    },
    { 
      name: 'DELAYED GRATIFICATION', 
      description: 'Suppress short-term dopamine seeking loops. Focus resources entirely on high-value, long-term strategic objectives.', 
      dateAdded: Date.now() - 5 * 24 * 60 * 60 * 1000 
    }
  ];

  let skills = $state<Array<{ name: string; description: string; dateAdded: number }>>([]);
  let hoveredSkillIndex = $state<number | null>(null);
  let selectedSkillIndex = $state<number | null>(0);

  // Adding skill state
  let isAddingSkill = $state(false);
  let newName = $state('');
  let newDescription = $state('');
  let newlyAddedIndex = $state<number | null>(null);

  // Purge/Timer state
  let skillToPurgeIndex = $state<number | null>(null);
  let purgeCountdown = $state(60);
  let purgeInterval: any = null;

  // Sukuna Close Domain State
  let isSukunaDomainActive = $state(false);

  onMount(() => {
    const saved = localStorage.getItem('mental_skills');
    if (saved) {
      try {
        skills = JSON.parse(saved);
      } catch (e) {
        skills = [...defaultSkills];
      }
    } else {
      skills = [...defaultSkills];
      localStorage.setItem('mental_skills', JSON.stringify(skills));
    }
  });

  onDestroy(() => {
    if (purgeInterval) clearInterval(purgeInterval);
  });

  let wasOpen = false;
  $effect(() => {
    if (isOpen && !wasOpen) {
      wasOpen = true;
      playGojoDomainAudio();
    } else if (!isOpen) {
      wasOpen = false;
    }
  });

  // Synthesize realistic fast metallic slicing sound using Web Audio oscillators and high-pass noise
  function playSlicingSound() {
    try {
      let stateVal;
      AntaryamiState.subscribe(s => { stateVal = s; })();
      if (!stateVal || stateVal.audioEnabled === false) return;
      const vol = stateVal.audioVolume !== undefined ? stateVal.audioVolume : 0.8;

      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const time = ctx.currentTime;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(vol, time);
          masterGain.connect(ctx.destination);

          // 1. Air "Swish" (Noise layer)
          const bufferSize = ctx.sampleRate * 0.25; 
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1400, time);
          filter.frequency.exponentialRampToValueAtTime(3500, time + 0.15);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.25, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(time);

          // 2. High Metallic "Shing" frequency components
          const frequencies = [950, 1300, 1800, 2400];
          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.75, time + 0.12);

            gain.gain.setValueAtTime(idx === 0 ? 0.18 : 0.09, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.22);
          });
        }
      }
    } catch (e) {
      console.error('Failed to play slicing sound:', e);
    }
  }

  function playGojoDomainAudio() {
    try {
      let stateVal;
      AntaryamiState.subscribe(s => { stateVal = s; })();
      if (!stateVal || stateVal.audioEnabled === false) return;
      const vol = stateVal.audioVolume !== undefined ? stateVal.audioVolume : 0.8;

      // 1. Synthesize Gojo's Unlimited Void (Muryōkūsho) background hum & chime
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const time = ctx.currentTime;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(vol, time);
          masterGain.connect(ctx.destination);

          // Shimmering sweep (information flow)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(330, time); 
          osc1.frequency.exponentialRampToValueAtTime(784, time + 2.0); 

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(500, time);
          filter.frequency.exponentialRampToValueAtTime(1000, time + 2.0);
          filter.Q.setValueAtTime(4, time);

          gain1.gain.setValueAtTime(0.08, time);
          gain1.gain.linearRampToValueAtTime(0.16, time + 0.8);
          gain1.gain.exponentialRampToValueAtTime(0.001, time + 2.6);

          osc1.connect(filter);
          filter.connect(gain1);
          gain1.connect(masterGain);
          
          osc1.start(time);
          osc1.stop(time + 2.8);

          // Ethereal chord (shimmering Void)
          [261.63, 329.63, 392.00, 493.88].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time + idx * 0.08); 
            
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 2.4);
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            osc.start(time);
            osc.stop(time + 2.5);
          });
        }
      }
    } catch (e) {
      console.error('Failed to synthesize Gojo domain audio:', e);
    }
  }

  function saveSkills() {
    localStorage.setItem('mental_skills', JSON.stringify(skills));
  }

  function playDomainAudio() {
    try {
      let stateVal;
      AntaryamiState.subscribe(s => { stateVal = s; })();
      if (!stateVal || stateVal.audioEnabled === false) return;
      const vol = stateVal.audioVolume !== undefined ? stateVal.audioVolume : 0.8;

      // 1. Synthesize Malevolent Shrine domain expansion background hum & chime
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const time = ctx.currentTime;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(vol, time);
          masterGain.connect(ctx.destination);

          // Play deep sub-rumble (Domain Hum)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(55, time); // A1 note
          osc1.frequency.linearRampToValueAtTime(45, time + 2.5);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(140, time);

          gain1.gain.setValueAtTime(0.35, time);
          gain1.gain.exponentialRampToValueAtTime(0.001, time + 2.8);

          osc1.connect(filter);
          filter.connect(gain1);
          gain1.connect(masterGain);

          // Play sharp metallic chiming chord (Malevolent Bell)
          [220, 330, 440].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq / 2, time + 1.2);
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(time);
            osc.stop(time + 1.5);
          });

          osc1.start(time);
          osc1.stop(time + 3.0);
        }
      }
    } catch (e) {
      console.error('Failed to synthesize domain audio:', e);
    }
  }

  function handleClose() {
    if (skillToPurgeIndex !== null || isSukunaDomainActive) return; // Lock inputs during active loops
    
    // Broadcast event to notify App.svelte to hide the Gojo eyes cursor overlay
    window.dispatchEvent(new CustomEvent('sukuna-domain-close-active', { detail: { active: true } }));

    // Play domain expansion audio and activate Sukuna's cleaving overlay
    playDomainAudio();
    isSukunaDomainActive = true;

    // Play synthesized realistic fast metallic cleave/slicing sounds exactly synced with visual slashes:
    // .slash-1 (at 200ms), .slash-2 (at 700ms), .slash-3 (at 1200ms), .slash-4 (at 1700ms), .slash-5 (at 2200ms), .slash-6 (at 2600ms)
    setTimeout(playSlicingSound, 200);
    setTimeout(playSlicingSound, 700);
    setTimeout(playSlicingSound, 1200);
    setTimeout(playSlicingSound, 1700);
    setTimeout(playSlicingSound, 2200);
    setTimeout(playSlicingSound, 2600);

    // Final shutdown close after 3.2 seconds
    setTimeout(() => {
      isSukunaDomainActive = false;
      window.dispatchEvent(new CustomEvent('sukuna-domain-close-active', { detail: { active: false } }));
      onClose();
    }, 3200);
  }

  function getDaysAgo(dateAdded: number): string {
    const diffTime = Date.now() - dateAdded;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'ADDED TODAY';
    return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
  }

  function triggerAddSkill() {
    AudioEngine.play('ui-click');
    isAddingSkill = true;
  }

  function cancelAddSkill() {
    AudioEngine.play('fail');
    isAddingSkill = false;
    newName = '';
    newDescription = '';
  }

  function confirmAddSkill() {
    if (!newName.trim() || !newDescription.trim()) return;
    AudioEngine.play('success');
    const newIndex = skills.length;
    skills = [...skills, {
      name: newName.toUpperCase().trim(),
      description: newDescription.trim(),
      dateAdded: Date.now()
    }];
    saveSkills();

    // Auto-scroll and highlight/glow newly added card
    selectedSkillIndex = newIndex;
    newlyAddedIndex = newIndex;
    setTimeout(() => {
      const el = document.getElementById('skill-card-' + newIndex);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
    setTimeout(() => {
      newlyAddedIndex = null;
    }, 3500);

    newName = '';
    newDescription = '';
    isAddingSkill = false;
  }

  function initiatePurge(index: number, e: MouseEvent) {
    e.stopPropagation();
    AudioEngine.play('fail');
    skillToPurgeIndex = index;
    purgeCountdown = 60;
    if (purgeInterval) clearInterval(purgeInterval);
    
    purgeInterval = setInterval(() => {
      if (purgeCountdown > 0) {
        purgeCountdown--;
        AudioEngine.play('tick');
      } else {
        clearInterval(purgeInterval);
      }
    }, 1000);
  }

  function confirmPurge() {
    if (skillToPurgeIndex === null || purgeCountdown > 0) return;
    AudioEngine.play('success');
    const oldIndex = skillToPurgeIndex;
    skills = skills.filter((_, i) => i !== oldIndex);
    saveSkills();
    cancelPurge();
    if (skills.length > 0) {
      selectedSkillIndex = 0;
    } else {
      selectedSkillIndex = null;
    }
  }

  function cancelPurge() {
    AudioEngine.play('success');
    skillToPurgeIndex = null;
    if (purgeInterval) {
      clearInterval(purgeInterval);
      purgeInterval = null;
    }
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
      class="popup-card glass-container theme-skills" 
      class:sukuna-shaking={isSukunaDomainActive}
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
          <h2 class="popup-title font-outfit">COGNITIVE SCHEMAS</h2>
          <div class="alias-row font-mono">
            <span class="popup-alias">MENTAL FORTRESS ARCHITECTURE ARCHIVE</span>
            <div class="entry-count-container">
              <span class="skill-indicator-dot small-dot"></span>
              <span class="entry-count">ACTIVE NODES: {skills.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="popup-content dual-layout">
        <!-- LEFT COLUMN: SKILL CARDS LIST -->
        <div class="skills-list-container">
          <div class="scroll-area">
            {#each skills as skill, i}
              <div 
                id="skill-card-{i}"
                class="skill-card"
                class:active={selectedSkillIndex === i}
                class:newly-added={newlyAddedIndex === i}
                onclick={() => { selectedSkillIndex = i; AudioEngine.play('click'); }}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedSkillIndex = i; AudioEngine.play('click'); } }}
                role="button"
                tabindex="0"
              >
                <div class="card-glow-edge"></div>
                <div class="card-main">
                  <div class="card-info">
                    <div class="skill-title-row">
                      <div class="skill-indicator-dot"></div>
                      <span class="skill-name font-outfit">{skill.name}</span>
                    </div>
                    <span class="skill-elapsed font-mono">ELAPSED: {getDaysAgo(skill.dateAdded)}</span>
                  </div>
                  <button 
                    class="purge-btn font-mono" 
                    onclick={(e) => initiatePurge(i, e)}
                    onmouseenter={() => AudioEngine.play('ui-hover')}
                  >
                    PURGE
                  </button>
                </div>
              </div>
            {/each}
          </div>

          <button class="add-node-btn font-outfit" onclick={triggerAddSkill} onmouseenter={() => AudioEngine.play('ui-hover')}>
            INITIATE NEW COGNITIVE NODE
          </button>
        </div>

        <!-- RIGHT COLUMN: LIQUID GLASS MATTER DISPLAY -->
        <div class="liquid-glass-container">
          <div class="fluid-matter-bg"></div>
          <div class="glass-grid-overlay"></div>
          
          {#if isAddingSkill}
            <!-- Add Skill Form Overlay -->
            <div class="add-form-panel" transition:fade={{ duration: 150 }}>
              <h3 class="panel-header-title font-outfit">INITIATE NODE</h3>
              <div class="input-group">
                <label for="skillNameInput" class="input-label font-mono">NODE IDENTIFIER</label>
                <div class="input-wrapper">
                  <span class="input-dot-pulse"></span>
                  <input 
                    id="skillNameInput"
                    type="text" 
                    class="tech-input font-outfit input-with-dot" 
                    placeholder="E.G. SILENT CONSCIOUSNESS" 
                    bind:value={newName}
                  />
                </div>
              </div>
              <div class="input-group desc-group">
                <label for="skillDescInput" class="input-label font-mono">TELEMETRY DESCRIPTION</label>
                <textarea 
                  id="skillDescInput"
                  class="tech-textarea font-outfit" 
                  placeholder="Define the logic boundaries and execution constraints..." 
                  bind:value={newDescription}
                ></textarea>
              </div>
              <div class="form-actions">
                <button 
                  class="form-btn confirm-btn font-outfit" 
                  onclick={confirmAddSkill} 
                  disabled={!newName.trim() || !newDescription.trim()}
                  onmouseenter={() => AudioEngine.play('ui-hover')}
                >
                  DEPLOY NODE
                </button>
                <button 
                  class="form-btn cancel-btn font-outfit" 
                  onclick={cancelAddSkill}
                  onmouseenter={() => AudioEngine.play('ui-hover')}
                >
                  ABORT
                </button>
              </div>
            </div>
          {:else}
            <!-- Telemetry Description Panel -->
            <div class="telemetry-panel">
              <div class="panel-led-bar">
                <span class="status-indicator-dot active"></span>
                <span class="telemetry-label font-mono">COGNITIVE FEEDBACK LINK</span>
              </div>

              {#if selectedSkillIndex !== null && skills[selectedSkillIndex]}
                <div class="telemetry-data" transition:fade={{ duration: 120 }}>
                  <div class="description-scroll-container">
                    <p class="popup-description font-outfit-body">
                      {skills[selectedSkillIndex].description}
                    </p>
                  </div>
                </div>
              {:else}
                <div class="telemetry-idle font-mono" transition:fade={{ duration: 120 }}>
                  <div class="scanlines-idle"></div>
                  <p class="idle-text">
                    AWAITING NEURAL SELECTION...
                  </p>
                  <p class="idle-sub">
                    CLICK ON A COGNITIVE NODE CARD TO UNLOCK COGNITIVE DESCRIPTION TELEMETRY.
                  </p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </main>

      <footer class="popup-footer" style="justify-content: center;">
        <button class="dismiss-btn" onclick={handleClose} onmouseenter={() => AudioEngine.play('ui-hover')}>
          ACKNOWLEDGE ARCHIVE
        </button>
      </footer>

      <!-- PSYCHOLOGICAL TENSION PURGE TIMELOCK DIALOG -->
      {#if skillToPurgeIndex !== null}
        <div class="purge-lockout-overlay" transition:fade={{ duration: 200 }}>
          <div class="lockout-card font-mono" transition:fly={{ y: 20, duration: 300 }}>
            <div class="klaxon-light"></div>
            <div class="lockout-header">
              <svg class="warning-triangle" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ef4444" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h3 class="lockout-title font-outfit">CONTEMPLATION TIMELOCK ACTIVE</h3>
            </div>
            
            <div class="lockout-body">
              <p class="lockout-warning-text">
                WARNING: DESTRUCTION OF COGNITIVE SCHEMA DETECTED.
              </p>
              <p class="lockout-detail-text">
                You are initiating a purge sequence for the schema node: <span class="highlight">"{skills[skillToPurgeIndex].name}"</span>. 
                System forces a 1-minute contemplative delay to prevent impulsive cognitive deletion.
              </p>
              
              <!-- Circular Countdown Display -->
              <div class="circular-countdown-container">
                <svg class="countdown-svg" viewBox="0 0 100 100">
                  <circle class="countdown-track" cx="50" cy="50" r="42" />
                  <circle 
                    class="countdown-progress" 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    style="stroke-dashoffset: {263.89 * (1 - purgeCountdown / 60)}"
                  />
                </svg>
                <div class="countdown-number">{purgeCountdown}</div>
              </div>
            </div>

            <div class="lockout-actions">
              <button 
                class="lockout-btn confirm-purge-btn" 
                class:active={purgeCountdown === 0}
                disabled={purgeCountdown > 0} 
                onclick={confirmPurge}
                onmouseenter={() => purgeCountdown === 0 && AudioEngine.play('ui-hover')}
              >
                {#if purgeCountdown > 0}
                  TIME LOCK ACTIVE
                {:else}
                  CONFIRM COGNITIVE PURGE
                {/if}
              </button>
              <button class="lockout-btn abort-purge-btn" onclick={cancelPurge} onmouseenter={() => AudioEngine.play('ui-hover')}>
                ABORT PROTOCOL
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- SUKUNA MALEVOLENT SHRINE & CLEAVE OVERLAY ON CLOSE -->
      {#if isSukunaDomainActive}
        <div class="sukuna-domain-overlay" transition:fade={{ duration: 150 }}>
          <div class="domain-blood-sky"></div>
          <div class="shrine-gate-glow"></div>
          
          <!-- Slices cutting through the canvas -->
          <div class="slashes-container">
            <div class="slash slash-1"></div>
            <div class="slash slash-2"></div>
            <div class="slash slash-3"></div>
            <div class="slash slash-4"></div>
            <div class="slash slash-5"></div>
            <div class="slash slash-6"></div>
          </div>
          
          <div class="shrine-text-warning font-mono">
            DOMAIN EXPANSION: MALEVOLENT SHRINE // CLEAVE PROTOCOL ACTIVE
          </div>
        </div>
      {/if}
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
    max-width: 980px;
    max-height: calc(100vh - 180px);
    margin-top: 10px;
    background: linear-gradient(135deg, rgba(12, 10, 24, 0.96) 0%, rgba(6, 4, 12, 0.98) 100%);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: 50px !important;
    box-shadow: 
      inset 0 0 25px rgba(139, 92, 246, 0.05),
      0 0 35px rgba(139, 92, 246, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    padding: 32px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: relative;
    overflow: hidden;
    transition: transform 0.1s ease;
    --theme-color: #8b5cf6;
    will-change: transform, opacity;
    --theme-glow: rgba(139, 92, 246, 0.45);
    --theme-gradient-end: #ec4899;
  }

  /* Sukuna cutting effect rumbles the card visual matrix */
  .popup-card.sukuna-shaking {
    animation: card-slice-shake 1.3s ease-in-out infinite;
  }

  @keyframes card-slice-shake {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    10% { transform: translate(-3px, -1px) rotate(-0.5deg); }
    20% { transform: translate(2px, 3px) rotate(1deg); }
    30% { transform: translate(-1px, -2px) rotate(-1deg); }
    40% { transform: translate(3px, 1px) rotate(0.5deg); }
    50% { transform: translate(-2px, 2px) rotate(-0.5deg); }
    60% { transform: translate(1px, -1px) rotate(1deg); }
    70% { transform: translate(-3px, 1px) rotate(-1deg); }
    80% { transform: translate(2px, -2px) rotate(0.5deg); }
    90% { transform: translate(1px, 3px) rotate(-0.5deg); }
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
    width: 300px;
    height: 300px;
    background: var(--theme-color, #8b5cf6);
    top: -10%;
    right: -10%;
  }
  .orb-secondary {
    width: 200px;
    height: 200px;
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
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--theme-color, #8b5cf6);
    box-shadow: 0 0 10px var(--theme-color, #8b5cf6);
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
      #8b5cf6 0%,
      #8b5cf6 30%,
      #ffffff 45%,
      #ffffff 55%,
      #ec4899 70%,
      #8b5cf6 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: text-sheen 2.5s linear infinite;
    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.45));
  }

  @keyframes text-sheen {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }

  .alias-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
  }

  .popup-alias {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: 800;
  }

  .entry-count-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  .entry-count-container .small-dot {
    width: 6px;
    height: 6px;
    background: #ec4899;
    box-shadow: 0 0 8px #ec4899;
    animation: dot-glow-pulse 1.2s infinite ease-in-out;
    display: inline-block;
    flex-shrink: 0;
    margin-top: 0;
  }

  .entry-count {
    font-size: 10px;
    color: #a78bfa;
    letter-spacing: 1px;
    font-weight: 900;
    text-shadow: 0 0 6px rgba(139, 92, 246, 0.4);
  }

  /* MAIN LAYOUT (DUAL COLUMN) */
  .popup-content.dual-layout {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 55% 42%;
    gap: 3%;
    flex: 1;
    min-height: 0;
    height: auto;
    overflow: hidden;
  }

  /* LEFT COLUMN: LIST AREA */
  .skills-list-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    overflow: hidden;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .scroll-area::-webkit-scrollbar {
    width: 6px;
  }
  .scroll-area::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 9999px;
  }
  .scroll-area::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 9999px;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.1);
  }
  .scroll-area::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.6);
  }

  .skill-card {
    position: relative;
    background: linear-gradient(135deg, rgba(22, 16, 44, 0.65) 0%, rgba(10, 6, 20, 0.9) 100%);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 35px;
    padding: 14px 24px;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    flex-shrink: 0;
    min-height: 70px;
    height: auto;
  }

  .card-glow-edge {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: transparent;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .skill-card:hover:not(.active) {
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.55);
    box-shadow: 
      0 0 18px rgba(139, 92, 246, 0.28),
      inset 0 0 10px rgba(139, 92, 246, 0.08);
    transform: translateX(6px);
  }

  .skill-card:hover:not(.active) .card-glow-edge {
    width: 4px;
    background: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
  }

  .skill-card.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(236, 72, 153, 0.12) 100%);
    border-color: #a78bfa;
    box-shadow: 
      0 0 25px rgba(139, 92, 246, 0.4),
      inset 0 0 12px rgba(139, 92, 246, 0.2);
    transform: translateX(8px);
  }

  .skill-card.active .card-glow-edge {
    width: 6px;
    background: linear-gradient(180deg, #c084fc 0%, #ec4899 100%);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.9), 0 0 4px rgba(236, 72, 153, 0.6);
  }

  .skill-card.active .skill-indicator-dot {
    background: #ec4899;
    box-shadow: 0 0 10px #ec4899;
  }

  .skill-card.newly-added {
    animation: newly-added-glow 3.5s ease-out forwards;
    border-color: #ec4899 !important;
  }

  @keyframes newly-added-glow {
    0% {
      box-shadow: 0 0 30px rgba(236, 72, 153, 0.8), inset 0 0 15px rgba(236, 72, 153, 0.4);
      background: rgba(236, 72, 153, 0.15);
      border-color: #ec4899;
    }
    50% {
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.9), inset 0 0 20px rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.2);
      border-color: #8b5cf6;
    }
    100% {
      box-shadow: none;
      background: rgba(10, 10, 18, 0.6);
      border-color: rgba(255, 255, 255, 0.05);
    }
  }

  .card-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 16px;
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .skill-title-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .skill-indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a78bfa;
    box-shadow: 0 0 8px #8b5cf6;
    animation: dot-glow-pulse 1.5s infinite ease-in-out;
    display: inline-block;
    flex-shrink: 0;
    margin-top: 5px;
  }

  @keyframes dot-glow-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.6;
      box-shadow: 0 0 4px #8b5cf6;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
      box-shadow: 0 0 12px #ec4899, 0 0 6px #8b5cf6;
    }
  }

  .skill-name {
    font-size: 16px;
    font-weight: 950;
    color: #ffffff;
    letter-spacing: 1.5px;
    white-space: normal;
    word-break: break-word;
    line-height: 1.3;
  }

  .skill-elapsed {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 1px;
    font-weight: 800;
    padding-left: 18px;
  }

  .purge-btn {
    position: relative;
    background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
    border: none;
    color: #ffffff;
    padding: 8px 18px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .purge-btn:hover {
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.8);
    transform: scale(1.05);
  }

  .purge-btn::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -60%;
    width: 30%;
    height: 200%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.65) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(30deg);
    animation: purge-btn-sheen 3s infinite linear;
  }

  @keyframes purge-btn-sheen {
    0% { left: -60%; }
    30% { left: 140%; }
    100% { left: 140%; }
  }

  .add-node-btn {
    background: rgba(139, 92, 246, 0.15);
    border: 1px dashed rgba(139, 92, 246, 0.5);
    color: #c084fc;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 1.5px;
    padding: 14px;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    width: 100%;
    margin-top: 4px;
  }

  .add-node-btn:hover {
    background: rgba(139, 92, 246, 0.3);
    border-color: #a78bfa;
    color: #ffffff;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
  }

  /* RIGHT COLUMN: LIQUID GLASS MATTER DISPLAY CONTAINER */
  .liquid-glass-container {
    position: relative;
    background: rgba(6, 4, 12, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 35px;
    overflow: hidden;
    padding: 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .fluid-matter-bg {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 40% 60%, rgba(139, 92, 246, 0.18), transparent 60%),
                radial-gradient(circle at 70% 30%, rgba(236, 72, 153, 0.12), transparent 50%),
                rgba(6, 4, 12, 0.7);
    filter: blur(10px);
    z-index: 1;
    animation: flow-matter 12s infinite alternate ease-in-out;
  }

  @keyframes flow-matter {
    0% { background-position: 0% 0%; }
    100% { background-position: 100% 100%; }
  }

  .glass-grid-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
    background-size: 20px 20px;
    z-index: 2;
  }

  .telemetry-panel, .add-form-panel {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .panel-led-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .status-indicator-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
  }
  .status-indicator-dot.active {
    background: #a78bfa;
    box-shadow: 0 0 6px #8b5cf6;
  }

  .telemetry-label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1.5px;
    font-weight: 900;
  }

  .telemetry-data {
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    justify-content: space-between;
    min-height: 0;
  }

  .description-scroll-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 12px;
    box-sizing: border-box;
    min-height: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }

  .description-scroll-container::-webkit-scrollbar {
    width: 6px;
  }
  .description-scroll-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 9999px;
  }
  .description-scroll-container::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 9999px;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.1);
  }
  .description-scroll-container::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.6);
  }

  .popup-description.font-outfit-body {
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 900;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
    word-spacing: 1.5px;
    letter-spacing: 0.5px;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .telemetry-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    padding: 0 10px;
  }

  .idle-text {
    font-size: 12px;
    color: #a78bfa;
    text-shadow: 0 0 6px rgba(139, 92, 246, 0.3);
    margin: 0 0 8px 0;
    font-weight: 955;
    letter-spacing: 1.5px;
  }

  .idle-sub {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.3);
    line-height: 1.5;
    margin: 0;
    letter-spacing: 0.5px;
    font-weight: 800;
  }

  /* ADD SKILL FORM STYLES */
  .add-form-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
  }

  .panel-header-title {
    font-size: 20px;
    font-weight: 950;
    letter-spacing: 2px;
    color: #ffffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 8px;
    margin: 0 0 4px 0;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-group.desc-group {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .input-label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1.5px;
    font-weight: 950;
  }

  .input-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
  }

  .input-dot-pulse {
    position: absolute;
    left: 16px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ec4899;
    box-shadow: 0 0 10px #ec4899, 0 0 4px #8b5cf6;
    animation: dot-glow-pulse 1.2s infinite ease-in-out;
    pointer-events: none;
    z-index: 10;
  }

  .tech-input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    color: #ffffff;
    padding: 12px 18px;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.5px;
    outline: none;
    transition: all 0.25s ease;
    width: 100%;
    box-sizing: border-box;
  }

  .tech-input.input-with-dot {
    padding-left: 38px;
  }

  .tech-textarea {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    color: #ffffff;
    padding: 16px 20px;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.5px;
    outline: none;
    transition: all 0.25s ease;
    flex: 1;
    resize: none;
    min-height: 0;
  }

  .tech-input:focus, .tech-textarea:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.35);
    background: rgba(0, 0, 0, 0.7);
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
  }

  .form-btn {
    border: none;
    border-radius: 9999px;
    padding: 12px;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-btn {
    background: #8b5cf6;
    color: #ffffff;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
  }
  .confirm-btn:hover:not(:disabled) {
    background: #a78bfa;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  }
  .confirm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
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
    font-weight: 950;
    font-size: 11px;
    padding: 10px 24px;
    border-radius: 9999px;
    cursor: pointer;
    letter-spacing: 1.5px;
    transition: all 0.2s ease;
    box-shadow: 0 0 15px var(--theme-glow, rgba(139, 92, 246, 0.35));
    text-transform: uppercase;
  }

  .dismiss-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 25px var(--theme-glow, rgba(139, 92, 246, 0.5));
    filter: brightness(1.15);
  }

  /* PSYCHOLOGICAL TENSION TIMELOCK DIALOG */
  .purge-lockout-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(16, 2, 4, 0.96);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50px;
  }

  .lockout-card {
    width: 85%;
    max-width: 500px;
    background: linear-gradient(135deg, rgba(28, 4, 8, 0.98) 0%, rgba(12, 2, 4, 0.99) 100%);
    border: 2px solid rgba(239, 68, 68, 0.45);
    border-radius: 45px;
    box-shadow: 
      0 0 35px rgba(239, 68, 68, 0.3),
      inset 0 0 20px rgba(239, 68, 68, 0.15);
    padding: 28px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .klaxon-light {
    position: absolute;
    top: -50%; left: -50%; right: -50%; bottom: -50%;
    background: radial-gradient(circle at center, rgba(239, 68, 68, 0.08), transparent 70%);
    z-index: 1;
    pointer-events: none;
    animation: klaxon-pulse 1.2s infinite ease-in-out;
  }

  @keyframes klaxon-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.15); }
  }

  .lockout-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    z-index: 2;
  }

  .warning-triangle {
    animation: alert-blink 1.2s infinite;
  }

  @keyframes alert-blink {
    0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.3)); }
    50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.8)); }
  }

  .lockout-title {
    font-size: 26px;
    font-weight: 950;
    letter-spacing: 2.5px;
    color: #fca5a5;
    margin: 0;
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  }

  .lockout-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 2;
  }

  .lockout-warning-text {
    font-size: 16px;
    font-weight: 950;
    color: #ef4444;
    letter-spacing: 1.5px;
    margin: 0;
  }

  .lockout-detail-text {
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-weight: 900;
  }

  .lockout-detail-text .highlight {
    color: #ffffff;
    font-weight: 950;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
  }

  /* Circular Progress Timer */
  .circular-countdown-container {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 15px auto;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;
    border: none;
    box-shadow: none;
    outline: none;
  }

  .countdown-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .countdown-track {
    fill: none;
    stroke: rgba(239, 68, 68, 0.1);
    stroke-width: 6px;
  }

  .countdown-progress {
    fill: none;
    stroke: #ef4444;
    stroke-width: 6px;
    stroke-linecap: round;
    stroke-dasharray: 263.89;
    transition: stroke-dashoffset 1s linear;
    filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
  }

  .countdown-number {
    position: absolute;
    font-size: 40px;
    font-weight: 950;
    color: #ef4444;
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
    font-family: 'Outfit', sans-serif;
    animation: heartbeat 1s infinite ease-in-out;
  }

  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .lockout-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 2;
  }

  .lockout-btn {
    border: none;
    border-radius: 9999px;
    padding: 16px;
    font-size: 14px;
    font-weight: 950;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .confirm-purge-btn {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: rgba(255, 255, 255, 0.35);
    cursor: not-allowed;
  }

  .confirm-purge-btn.active {
    background: #ef4444;
    border-color: #ef4444;
    color: #ffffff;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
    cursor: pointer;
  }

  .confirm-purge-btn.active:hover {
    background: #ff5c5c;
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.85);
    transform: translateY(-1px);
  }

  .abort-purge-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }

  .abort-purge-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  /* SUKUNA MALEVOLENT SHRINE & INVISIBLE BLADES CLEAVE ON CLOSE */
  .sukuna-domain-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10, 2, 4, 0.96);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-radius: 50px;
    overflow: hidden;
  }

  .domain-blood-sky {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at center, rgba(185, 28, 28, 0.25), transparent 80%);
    animation: blood-sky-pulse 0.7s infinite ease-in-out alternate;
    pointer-events: none;
    z-index: 1;
  }

  @keyframes blood-sky-pulse {
    0% { opacity: 0.3; }
    100% { opacity: 0.95; }
  }

  /* Malevolent Shrine gate glowing projection */
  .shrine-gate-glow {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.12), transparent 70%);
    box-shadow: 0 0 80px rgba(239, 68, 68, 0.15);
    filter: blur(10px);
    z-index: 2;
    animation: shrine-pulse 1.3s infinite ease-in-out;
  }

  @keyframes shrine-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(1.15); opacity: 0.8; }
  }

  .slashes-container {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 5;
    pointer-events: none;
  }

  .slash {
    position: absolute;
    background: linear-gradient(90deg, transparent, #ffffff 40%, #ff2d55 60%, transparent);
    height: 6px;
    width: 150%;
    opacity: 0;
    box-shadow: 0 0 20px #ff2d55, 0 0 40px #ff0000;
  }

  .slash-1 {
    top: 20%;
    left: -25%;
    transform: rotate(-15deg) scaleX(0);
    animation: cleave-slash 0.35s 0.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .slash-2 {
    bottom: 30%;
    left: -25%;
    transform: rotate(20deg) scaleX(0);
    animation: cleave-slash 0.35s 0.7s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .slash-3 {
    top: 50%;
    left: -25%;
    transform: rotate(-45deg) scaleX(0);
    animation: cleave-slash 0.4s 1.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .slash-4 {
    top: 40%;
    left: -25%;
    transform: rotate(35deg) scaleX(0);
    animation: cleave-slash 0.35s 1.7s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .slash-5 {
    bottom: 15%;
    left: -25%;
    transform: rotate(-10deg) scaleX(0);
    animation: cleave-slash 0.35s 2.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  .slash-6 {
    top: 10%;
    left: -25%;
    transform: rotate(60deg) scaleX(0);
    animation: cleave-slash 0.4s 2.6s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
  }

  @keyframes cleave-slash {
    0% {
      opacity: 0;
      transform: rotate(var(--rotation, 0deg)) scaleX(0);
    }
    15% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--rotation, 0deg)) scaleX(1.3);
    }
  }

  .slash-1 { --rotation: -15deg; }
  .slash-2 { --rotation: 20deg; }
  .slash-3 { --rotation: -45deg; }
  .slash-4 { --rotation: 35deg; }
  .slash-5 { --rotation: -10deg; }
  .slash-6 { --rotation: 60deg; }

  .shrine-text-warning {
    z-index: 10;
    color: #fca5a5;
    font-size: 11px;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
    text-align: center;
    margin-top: 180px;
    animation: alert-blink-sukuna 1s infinite alternate;
  }

  @keyframes alert-blink-sukuna {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
  }
</style>
