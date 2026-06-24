<script lang="ts">
  import { AudioEngine } from '../core/audio-engine.js';
  let { onclick } = $props();
</script>

<button class="task-forge-btn" onclick={onclick} onmouseenter={() => AudioEngine.play('ui-hover')} aria-label="Task Forge">
  <div class="glow-layer"></div>
  <svg class="plus-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  </svg>
</button>

<style>
  .task-forge-btn {
    position: fixed;
    bottom: 40px;
    right: 40px;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(139, 92, 246, 0.4);
    transition: all 0.3s cubic-bezier(0.25, 1.5, 0.5, 1);
    outline: none;
    z-index: 999;
    overflow: hidden;
    animation: pulseGlow 2s infinite ease-in-out;
  }

  @keyframes pulseGlow {
    0% {
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.4), 0 0 4px rgba(236, 72, 153, 0.2);
    }
    50% {
      box-shadow: 0 0 35px rgba(139, 92, 246, 0.8), 0 0 15px rgba(236, 72, 153, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.2);
    }
    100% {
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.4), 0 0 4px rgba(236, 72, 153, 0.2);
    }
  }

  .glow-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
    opacity: 0.2;
    transition: opacity 0.3s ease;
  }

  .plus-icon {
    position: relative;
    z-index: 2;
    transition: transform 0.3s cubic-bezier(0.25, 1.5, 0.5, 1);
    color: #ffffff;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.4));
  }

  .task-forge-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 35px rgba(236, 72, 153, 0.8);
    border-color: rgba(255, 255, 255, 0.45);
  }

  .task-forge-btn:hover .glow-layer {
    opacity: 0.6;
  }

  .task-forge-btn:hover .plus-icon {
    transform: rotate(90deg);
  }

  .task-forge-btn:active {
    transform: scale(0.95);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(139, 92, 246, 0.5);
  }
</style>
