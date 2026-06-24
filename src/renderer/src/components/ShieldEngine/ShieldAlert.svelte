<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { backOut, quintOut } from 'svelte/easing';

  let { message = '', type = 'TACTICAL', duration = 4000 } = $props();

  // Strictly typed custom inline SVG icons
  const icons = {
    CRITICAL: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/><path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    SUCCESS: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    TACTICAL: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`
  };
</script>

<!-- Glassmorphic Pill Alert -->
<div 
  class="shield-alert-pill font-inter"
  class:critical={type === 'CRITICAL'}
  class:success={type === 'SUCCESS'}
  class:tactical={type === 'TACTICAL'}
  in:fly={{ y: -50, duration: 450, easing: backOut }}
  out:fade={{ duration: 200, easing: quintOut }}
  style="--duration: {duration}ms"
>
  <div class="alert-icon">
    {@html icons[type as keyof typeof icons] || icons.TACTICAL}
  </div>
  
  <span class="alert-message font-outfit">{message}</span>

  <!-- 2px Telemetry Progress Bar visually shrinking over time -->
  <div class="telemetry-bar"></div>
</div>

<style>
  .shield-alert-pill {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(13, 15, 30, 0.75);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid transparent;
    border-radius: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    min-width: 280px;
    max-width: 440px;
    overflow: hidden;
    user-select: none;
    pointer-events: auto; /* Crucial: allows alert-level clicks */
    will-change: transform, opacity;
  }

  /* Critical Alert */
  .critical {
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.15), 0 0 15px rgba(239, 68, 68, 0.05);
  }

  /* Success Alert */
  .success {
    border-color: rgba(16, 185, 129, 0.5);
    color: #10b981;
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15), 0 0 15px rgba(16, 185, 129, 0.05);
  }

  /* Tactical Alert */
  .tactical {
    border-color: rgba(139, 92, 246, 0.5);
    color: #8b5cf6;
    box-shadow: 0 10px 30px rgba(139, 92, 246, 0.15), 0 0 15px rgba(139, 92, 246, 0.05);
  }

  .alert-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    filter: drop-shadow(0 0 4px currentColor);
  }

  .alert-message {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #ffffff;
    line-height: 1.4;
  }

  .telemetry-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background-color: currentColor;
    opacity: 0.85;
    animation: shrink var(--duration) linear forwards;
    transform-origin: left;
  }

  @keyframes shrink {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  .font-outfit { font-family: 'Outfit', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
</style>
