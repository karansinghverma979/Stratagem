<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';

  let { activeTab, selectTab } = $props<{
    activeTab: string;
    selectTab: (tab: string) => void;
  }>();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="genesis-toggle-switch five-way" 
  class:dev-active={activeTab === 'developer'} 
  class:aigirl-active={activeTab === 'aigirl'} 
  class:settings-active={activeTab === 'settings'} 
  class:quotes-active={activeTab === 'quotes'} 
  class:improvement-active={activeTab === 'improvement'}
  onmouseenter={() => {
    try {
      AudioEngine.play('ui-hover');
    } catch (e) {
      console.warn('AudioEngine play failed:', e);
    }
  }}
>
  <button type="button" class="toggle-slot slot-1" onclick={() => selectTab('developer')} title="Developer Schematic">👑</button>
  <button type="button" class="toggle-slot slot-2" onclick={() => selectTab('aigirl')} title="Synthetic Companion">💋</button>
  <button type="button" class="toggle-slot slot-3" onclick={() => selectTab('settings')} title="System Parameters">⚙️</button>
  <button type="button" class="toggle-slot slot-4" onclick={() => selectTab('quotes')} title="Cognitive Database">
    <span class="quotes-icon">
      <span class="quote-char left-q">❝</span>
      <span class="quote-char right-q">❞</span>
    </span>
  </button>
  <button type="button" class="toggle-slot slot-5" onclick={() => selectTab('improvement')} title="Realignment Module">📝</button>
  
  <div class="toggle-thumb">
    {#if activeTab === 'developer'}
      <span class="active-icon crown-icon">👑</span>
    {:else if activeTab === 'aigirl'}
      <span class="active-icon lips-icon">💋</span>
    {:else if activeTab === 'settings'}
      <span class="active-icon settings-icon">⚙️</span>
    {:else if activeTab === 'quotes'}
      <span class="active-icon quotes-icon">
        <span class="quote-char left-q">❝</span>
        <span class="quote-char right-q">❞</span>
      </span>
    {:else}
      <span class="active-icon improvement-icon">📝</span>
    {/if}
  </div>
</div>

<style>
  .genesis-toggle-switch.five-way {
    position: relative;
    width: 370px;
    height: 52px;
    border-radius: 26px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(8, 10, 20, 0.65);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 5px;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.4), 
      inset 0 0 10px rgba(255, 255, 255, 0.03);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .genesis-toggle-switch.five-way:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow: 
      0 8px 25px rgba(0, 0, 0, 0.5), 
      inset 0 0 12px rgba(255, 255, 255, 0.05);
  }

  .toggle-slot {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.35);
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 26px;
    transition: color 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease;
    z-index: 1;
    padding: 0;
  }

  .toggle-slot:hover {
    color: rgba(255, 255, 255, 0.9);
    transform: scale(1.1);
  }

  .toggle-thumb {
    position: absolute;
    top: 4px;
    left: 11px;
    width: 60px;
    height: 42px;
    border-radius: 21px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.4s cubic-bezier(0.25, 1.3, 0.4, 1.1), 
                background 0.4s ease, 
                box-shadow 0.4s ease;
    color: #0b0c16; /* Deep charcoal text/emoji for maximum contrast against bright active tabs */
    font-weight: 900;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
    z-index: 2;
    pointer-events: none;
    font-size: 26px;
  }

  /* Slot Active states */
  .genesis-toggle-switch.five-way.dev-active .slot-1 { color: rgba(0, 255, 255, 0.95); }
  .genesis-toggle-switch.five-way.aigirl-active .slot-2 { color: rgba(236, 72, 153, 0.95); }
  .genesis-toggle-switch.five-way.settings-active .slot-3 { color: rgba(255, 215, 0, 0.95); }
  .genesis-toggle-switch.five-way.quotes-active .slot-4 { color: rgba(167, 139, 250, 0.95); }
  .genesis-toggle-switch.five-way.improvement-active .slot-5 { color: rgba(236, 72, 153, 0.95); }

  /* Thumb movement and glow gradients matching each state */
  .genesis-toggle-switch.five-way.dev-active .toggle-thumb {
    background: linear-gradient(135deg, #06b6d4, #0e7490);
    transform: translateX(0px);
    box-shadow: 0 0 12px rgba(6, 182, 212, 0.45);
  }

  .genesis-toggle-switch.five-way.aigirl-active .toggle-thumb {
    background: linear-gradient(135deg, #0f172a, #1e1b4b);
    transform: translateX(72px);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }

  .genesis-toggle-switch.five-way.settings-active .toggle-thumb {
    background: linear-gradient(135deg, #f59e0b, #b45309);
    transform: translateX(144px);
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.45);
  }

  .genesis-toggle-switch.five-way.quotes-active .toggle-thumb {
    background: linear-gradient(135deg, #a78bfa, #8b5cf6);
    transform: translateX(216px);
    box-shadow: 0 0 12px rgba(167, 139, 250, 0.5);
  }

  .genesis-toggle-switch.five-way.improvement-active .toggle-thumb {
    background: linear-gradient(135deg, #ec4899, #d946ef);
    transform: translateX(288px);
    box-shadow: 0 0 12px rgba(236, 72, 153, 0.5);
  }

  /* Dark definition filters for icons against bright backgrounds */
  .active-icon.crown-icon,
  .active-icon.lips-icon,
  .active-icon.settings-icon,
  .active-icon.improvement-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
    display: inline-block;
  }

  /* Quotes spacing, styling and offset */
  .active-icon.quotes-icon,
  .quotes-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 20px;
    line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
  }

  .quote-char {
    display: inline-block;
  }

  .quote-char.right-q {
    transform: translateY(3px);
  }
</style>
