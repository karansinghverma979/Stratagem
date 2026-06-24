<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';
  import ArsenalPurgeConfirmation from '../ArsenalMain/ArsenalPurgeConfirmation.svelte';
  import StrategizeModal from '../ArsenalMain/StrategizeModal.svelte';

  let { card, columnId, onweaponize } = $props();

  let cardRef = $state<HTMLDivElement | null>(null);
  let rotateX = $state(0);
  let rotateY = $state(0);
  let glareX = $state(50);
  let glareY = $state(50);
  let isHovered = $state(false);

  // Deletion state variables
  let isConfirmingDelete = $state(false); // For RAW_INTEL inline delete
  let isPurgeModalOpen = $state(false);  // For SYNTHESIZING modal delete
  let isStrategizeModalOpen = $state(false);
  let noteExists = $state(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef) return;
    isHovered = true;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const percentX = x / rect.width;
    const percentY = y / rect.height;

    // 3D rotation calculations
    rotateX = (0.5 - percentY) * 25;
    rotateY = (percentX - 0.5) * 25;

    glareX = percentX * 100;
    glareY = percentY * 100;
  };

  const handleMouseLeave = () => {
    isHovered = false;
    rotateX = 0;
    rotateY = 0;
  };

  const handleDragStart = (e: DragEvent) => {
    AudioEngine.play('card-pickup');
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', card.id.toString());
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDeleteClick = () => {
    AudioEngine.play('ui-click');
    if (columnId === 'RAW_INTEL') {
      isConfirmingDelete = true;
    } else if (columnId === 'SYNTHESIZING') {
      isPurgeModalOpen = true;
    }
  };

  const confirmDeleteRaw = async () => {
    AudioEngine.play('success');
    if (window.stratagemAPI && window.stratagemAPI.deleteMission) {
      try {
        await window.stratagemAPI.deleteMission(card.id);
        const { syncAntaryami } = await import('../../../core/store');
        await syncAntaryami();
      } catch (err) {
        console.error('[ArsenalCard] Failed to delete Raw Intel task:', err);
      }
    }
    isConfirmingDelete = false;
  };

  const confirmPurge = async () => {
    if (window.stratagemAPI && window.stratagemAPI.deleteMission) {
      try {
        await window.stratagemAPI.deleteMission(card.id);
        setTimeout(async () => {
          const { syncAntaryami } = await import('../../../core/store');
          await syncAntaryami();
          isPurgeModalOpen = false;
        }, 800);
      } catch (err) {
        console.error('[ArsenalCard] Failed to purge Synthesizing task:', err);
      }
    }
  };

  async function checkNote() {
    if (window.stratagemAPI && window.stratagemAPI.checkNoteExists) {
      try {
        noteExists = await window.stratagemAPI.checkNoteExists(card.id);
      } catch (err) {
        console.error('[ArsenalCard] Failed to check note existence:', err);
      }
    }
  }

  async function handleStrategizeClick() {
    AudioEngine.play('ui-click');
    if (window.stratagemAPI && window.stratagemAPI.readNote) {
      try {
        await window.stratagemAPI.readNote(card.id, card.title);
        await checkNote();
        isStrategizeModalOpen = true;
      } catch (err) {
        console.error('[ArsenalCard] Failed to initialize note:', err);
      }
    }
  }

  $effect(() => {
    if (card && card.id) {
      checkNote();
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="arsenal-card-container"
  bind:this={cardRef}
  draggable="true"
  ondragstart={handleDragStart}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  style="transform: perspective(1000px) rotateX({rotateX}deg) rotateY({rotateY}deg); --glare-x: {glareX}%; --glare-y: {glareY}%; --glare-opacity: {isHovered ? 1 : 0};"
>
  <!-- Glare Layer -->
  <div class="glare-layer"></div>

  <!-- Top-Right Animated Purge Button -->
  {#if !isConfirmingDelete}
    <!-- svelte-ignore a11y_button_has_type -->
    <button 
      class="top-right-purge-btn" 
      onclick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
      title="Purge Task"
    >
      <svg class="trash-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    </button>
  {/if}

  <!-- Content -->
  <div class="card-content font-inter">
    <!-- Line 1: Creation Time -->
    {#if card.createdAt}
      <div class="creation-time font-mono">
        CREATED: {card.createdAt.split(' ')[0].split('T')[0]}
      </div>
    {/if}

    <!-- Line 2: Task Icon and Task Name -->
    <div class="card-header-row">
      {#if columnId === 'RAW_INTEL'}
        <!-- Glowing Bulb SVG -->
        <svg class="bulb-icon animated-bulb" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <path d="M9 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 9V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      {:else if columnId === 'SYNTHESIZING'}
        <!-- Processing / Loader Icon -->
        <svg class="process-icon animated-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="16 8"/>
          <path d="M12 7V12L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
      <h4 class="card-title font-outfit">{card.title}</h4>
    </div>

    <!-- Line 3: Priority Button and Strategizing Button -->
    <div class="card-controls-row">
      <button class="priority-badge-btn threat-{card.tags[1]?.toLowerCase() || 'med'} font-outfit" onclick={(e) => e.stopPropagation()}>
        {card.tags[1] || 'MED'}
      </button>

      <!-- svelte-ignore a11y_button_has_type -->
      <button 
        class="strategize-btn font-outfit" 
        class:note-exists={noteExists} 
        onclick={(e) => { e.stopPropagation(); handleStrategizeClick(); }}
      >
        <svg class="btn-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        PLAN PROTOCOL
      </button>
    </div>

    <!-- Line 4: Tags -->
    <div class="card-tags">
      {#each card.tags.filter(t => t !== 'RAW' && t !== 'SYNTH' && t !== 'WEAPON' && t !== card.tags[1]) as tag}
        <span class="tag-chip font-mono">{tag.replace('#', '')}</span>
      {/each}
    </div>

    <!-- Action Buttons (inline confirm delete or Weaponize button) -->
    {#if isConfirmingDelete || (columnId === 'SYNTHESIZING' && !isConfirmingDelete)}
      <div class="card-actions-row">
        {#if isConfirmingDelete}
          <div class="inline-confirm-buttons">
            <!-- svelte-ignore a11y_button_has_type -->
            <button class="action-confirm-btn font-outfit" onclick={(e) => { e.stopPropagation(); confirmDeleteRaw(); }}>CONFIRM</button>
            <!-- svelte-ignore a11y_button_has_type -->
            <button class="action-cancel-btn font-outfit" onclick={(e) => { e.stopPropagation(); isConfirmingDelete = false; }}>RETHINK</button>
          </div>
        {:else if columnId === 'SYNTHESIZING'}
          <!-- svelte-ignore a11y_button_has_type -->
          <button 
            class="weaponize-btn font-outfit" 
            onclick={(e) => { e.stopPropagation(); AudioEngine.play('ui-click'); onweaponize && onweaponize(card); }}
          >
            <svg class="btn-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            WEAPONIZE
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if isPurgeModalOpen}
    <ArsenalPurgeConfirmation
      isOpen={isPurgeModalOpen}
      mission={card}
      onConfirm={confirmPurge}
      onCancel={() => isPurgeModalOpen = false}
    />
  {/if}

  {#if isStrategizeModalOpen}
    <StrategizeModal
      isOpen={isStrategizeModalOpen}
      taskId={card.id}
      taskTitle={card.title}
      onClose={() => isStrategizeModalOpen = false}
      onSaveFinished={checkNote}
    />
  {/if}
</div>

<style>
  .arsenal-card-container {
    position: relative;
    background: rgba(13, 15, 30, 0.65);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    cursor: grab;
    transform-style: preserve-3d;
    transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), 
                border-color 0.3s ease, 
                box-shadow 0.3s ease;
    user-select: none;
    overflow: hidden;
  }

  .arsenal-card-container:active {
    cursor: grabbing;
  }

  .arsenal-card-container:hover {
    border-color: rgba(139, 92, 246, 0.7);
    box-shadow: 0 10px 30px rgba(139, 92, 246, 0.25), 0 0 15px rgba(139, 92, 246, 0.1);
  }

  /* Interactive Glare overlay */
  .glare-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(255, 255, 255, 0.12) 0%, transparent 80%);
    pointer-events: none;
    opacity: var(--glare-opacity);
    transition: opacity 0.2s ease;
    z-index: 2;
  }

  .card-content {
    transform: translateZ(20px); /* Lifts elements physically in 3D perspective */
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-title {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.75px;
    color: #ffffff;
    margin: 0;
    text-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
  }

  .card-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag-chip {
    font-size: 11px;
    font-weight: 800;
    color: #ffffff;
    background: rgba(139, 92, 246, 0.25);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.75px;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
  }

  /* Weaponize button */
  .weaponize-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 38px;
    flex: 1;
    background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.6);
    border-radius: 6px;
    color: #ffffff;
    font-size: 13.5px;
    font-weight: 900;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.25s ease;
    outline: none;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .weaponize-btn:hover {
    filter: brightness(1.15);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.6);
    transform: scale(1.02);
  }

  /* Header Row */
  .card-header-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bulb-icon {
    color: #a78bfa;
    filter: drop-shadow(0 0 4px #8b5cf6);
    flex-shrink: 0;
  }
  .animated-bulb {
    animation: bulb-glow-pulse 2s infinite alternate ease-in-out;
  }
  @keyframes bulb-glow-pulse {
    0% {
      opacity: 0.6;
      filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.4));
    }
    100% {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.9));
    }
  }

  .process-icon {
    color: #06b6d4;
    filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.5));
    flex-shrink: 0;
  }
  .animated-spin {
    animation: spin-smooth 3s linear infinite;
  }
  @keyframes spin-smooth {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .btn-icon {
    flex-shrink: 0;
  }

  /* Metadata Row */
  .card-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .priority-badge-btn {
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 900;
    border-radius: 4px;
    border: 1.5px solid currentColor;
    background: transparent;
    cursor: default;
    letter-spacing: 0.5px;
    text-shadow: 0 0 5px currentColor;
    outline: none;
  }
  .threat-high {
    color: #ff2d55;
    box-shadow: 0 0 8px rgba(255, 45, 85, 0.2), inset 0 0 4px rgba(255, 45, 85, 0.15);
  }
  .threat-med {
    color: #f59e0b;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.2), inset 0 0 4px rgba(245, 158, 11, 0.15);
  }
  .threat-low {
    color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.2), inset 0 0 4px rgba(16, 185, 129, 0.15);
  }

  /* Creation Time */
  .creation-time {
    font-size: 10px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.25);
    letter-spacing: 0.5px;
    margin-bottom: -4px;
    align-self: flex-start;
  }

  /* Top-Right Purge/Delete Button */
  .top-right-purge-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(255, 45, 85, 0.2);
    background: rgba(0, 0, 0, 0.4);
    color: rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10;
    outline: none;
  }

  .top-right-purge-btn:hover {
    border-color: #ff2d55;
    background: rgba(255, 45, 85, 0.15);
    color: #ff2d55;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.45);
  }

  .top-right-purge-btn:hover .trash-icon {
    animation: trash-shudder 0.3s ease infinite alternate;
  }

  @keyframes trash-shudder {
    0% { transform: rotate(-6deg) scale(1.1); }
    100% { transform: rotate(6deg) scale(1.1); }
  }

  /* Card Controls Row */
  .card-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }

  /* Strategizing Button styling with color coding */
  .strategize-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.75px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    text-shadow: 0 0 5px currentColor;
    outline: none;
    
    /* Default: Note Missing color coding (Cyan) */
    background: rgba(6, 182, 212, 0.05);
    border: 1.5px dashed rgba(6, 182, 212, 0.35);
    color: rgba(6, 182, 212, 0.75);
  }

  .strategize-btn:hover {
    background: rgba(6, 182, 212, 0.12);
    border-style: solid;
    border-color: #06b6d4;
    color: #ffffff;
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.35);
    transform: translateY(-1.5px);
  }

  /* Note Exists color coding (Neon Violet / Purple) */
  .strategize-btn.note-exists {
    background: rgba(139, 92, 246, 0.12);
    border: 1.5px solid rgba(139, 92, 246, 0.5);
    color: #c084fc;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15), inset 0 0 5px rgba(139, 92, 246, 0.08);
  }

  .strategize-btn.note-exists:hover {
    background: rgba(139, 92, 246, 0.22);
    border-color: #8b5cf6;
    color: #ffffff;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.45);
    transform: translateY(-1.5px);
  }

  /* Actions Row */
  .card-actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    width: 100%;
  }

  /* Inline Confirm/Cancel */
  .inline-confirm-buttons {
    display: flex;
    gap: 8px;
    flex: 1;
  }
  .action-confirm-btn {
    flex: 1;
    height: 38px;
    background: #ff2d55;
    border: 1.5px solid #ff2d55;
    border-radius: 6px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.3);
    outline: none;
  }
  .action-confirm-btn:hover {
    filter: brightness(1.15);
    box-shadow: 0 0 15px rgba(255, 45, 85, 0.6);
  }
  .action-cancel-btn {
    flex: 1;
    height: 38px;
    background: rgba(255, 255, 255, 0.08);
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
  }
  .action-cancel-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .font-outfit { font-family: 'Outfit', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
</style>
