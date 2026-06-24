<script lang="ts">
  import { spring } from 'svelte/motion';

  let { checked = false, label = '', disabled = false, onchange } = $props();

  let position = spring(0, { stiffness: 0.15, damping: 0.65 });

  // Update spring destination reactively using Svelte 5 effects
  $effect(() => {
    position.set(checked ? 24 : 0);
  });

  const handleToggle = () => {
    if (disabled) return;
    if (onchange) {
      onchange(!checked);
    }
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_to_interactive_role -->
<div 
  class="toggle-container" 
  class:checked={checked}
  class:disabled={disabled}
  onclick={handleToggle}
  role="switch"
  aria-checked={checked}
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleToggle()}
>
  <div class="toggle-track">
    <div 
      class="toggle-thumb" 
      style="transform: translateX({$position}px);"
    ></div>
  </div>
  <span class="toggle-label font-outfit">{label}</span>
</div>

<style>
  .toggle-container {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    outline: none;
    user-select: none;
    padding: 4px 0;
    transition: opacity 0.2s ease;
  }

  .toggle-container.disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .toggle-track {
    position: relative;
    width: 48px;
    height: 24px;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1.5px solid rgba(239, 68, 68, 0.3);
    padding: 2px;
    box-sizing: border-box;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toggle-container.checked .toggle-track {
    background: rgba(16, 185, 129, 0.15);
    border-color: #10b981;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.35);
  }

  .toggle-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2b2d42;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition: background 0.3s ease, box-shadow 0.3s ease;
  }

  .toggle-container.checked .toggle-thumb {
    background: #ffffff;
    box-shadow: 0 0 10px 2px #10b981, 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .toggle-label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.5px;
  }

  .font-outfit { font-family: 'Outfit', sans-serif; }
</style>
