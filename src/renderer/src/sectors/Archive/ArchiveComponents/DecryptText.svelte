<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Props accepted via Svelte 5 $props()
  let { text = '', resolution = 'VICTORY' } = $props();

  let displayedText = $state('');
  let intervalId: any = null;

  const cryptoChars = 'X#9!@$%^&*()_+-=[]{}|;:,.<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  onMount(() => {
    const duration = 400; // 400ms cryptographic cycle
    const fps = 30;
    const intervalMs = 1000 / fps;
    const totalTicks = duration / intervalMs;
    let tickCount = 0;

    intervalId = setInterval(() => {
      tickCount++;
      let currentResult = '';

      // Secure progressive lock-in algorithm letter-by-letter
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          currentResult += ' ';
          continue;
        }

        const relativeProgress = tickCount / totalTicks;
        const letterThreshold = i / text.length;

        // Snapping letters sequentially based on ticker progress
        if (relativeProgress > letterThreshold) {
          currentResult += text[i];
        } else {
          currentResult += cryptoChars[Math.floor(Math.random() * cryptoChars.length)];
        }
      }

      displayedText = currentResult;

      // Completion check
      if (tickCount >= totalTicks) {
        displayedText = text;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    }, intervalMs);
  });

  onDestroy(() => {
    // Critical Guardrail: strict cleanup to prevent memory leaks
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

<span 
  class="decrypt-text font-mono" 
  class:victory={resolution === 'VICTORY'}
  class:aborted={resolution === 'ABORTED'}
>
  {displayedText}
</span>

<style>
  .decrypt-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 700;
    letter-spacing: 1px;
    transition: color 0.3s ease;
  }

  .victory {
    color: #10b981;
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.4), 0 0 2px rgba(16, 185, 129, 0.2);
  }

  .aborted {
    color: rgba(255, 255, 255, 0.4);
    text-shadow: none;
  }

  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
</style>
