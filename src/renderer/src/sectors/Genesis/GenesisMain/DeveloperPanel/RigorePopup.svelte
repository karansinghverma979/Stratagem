<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose } = $props<Props>();

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
      class="popup-card glass-container theme-rigore" 
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
          <h2 class="popup-title font-outfit">OSTINATO RIGORE</h2>
          <span class="popup-alias font-mono">RIGOROUS PERSISTENCE</span>
        </div>
      </header>

      <main class="popup-content">
        <p class="popup-description font-outfit-body">
          The motto of Leonardo da Vinci, who was the icon of my book, is ostinato rigore. For any Italians out there, it means 'rigorous persistence.' And da Vinci said, 'The only reason I am so much better is I am more persistent. That's the secret to my success: if I encounter a problem, I won't let go.' That was the secret of Einstein; that was the secret of Steve Jobs. So, it's the super-intelligence that you get from not just your knowledge, but also your experience and your practice. At that point, you're at what I call 'high-level intuition,' and your thinking is much faster.
        </p>
      </main>

      <footer class="popup-footer" style="justify-content: center;">
        <button class="dismiss-btn" onclick={handleClose} onmouseenter={() => AudioEngine.play('ui-hover')}>
          ACKNOWLEDGE MAXIM
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

  .theme-rigore {
    border-color: rgba(6, 182, 212, 0.35);
    box-shadow: 
      inset 0 0 25px rgba(6, 182, 212, 0.05),
      0 0 35px rgba(6, 182, 212, 0.12),
      0 24px 60px rgba(0, 0, 0, 0.95);
    --theme-color: #06b6d4;
    --theme-glow: rgba(6, 182, 212, 0.45);
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
      #06b6d4 0%,
      #06b6d4 30%,
      #ffffff 45%,
      #ffffff 55%,
      #8b5cf6 70%,
      #06b6d4 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: text-sheen 2.5s linear infinite;
    filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.45));
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
    background: var(--theme-color, #06b6d4);
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
    box-shadow: 0 0 15px var(--theme-glow, rgba(6, 182, 212, 0.35));
    text-transform: uppercase;
  }

  .dismiss-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 25px var(--theme-glow, rgba(6, 182, 212, 0.5));
    filter: brightness(1.15);
  }
</style>
