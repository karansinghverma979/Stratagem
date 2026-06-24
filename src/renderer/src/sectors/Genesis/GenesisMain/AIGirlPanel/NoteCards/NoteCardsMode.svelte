<script lang="ts">
  import { onMount } from 'svelte';
  import { AudioEngine } from '../../../../../core/audio-engine';

  // Props
  interface Props {
    activeImageBase64: string;
    currentFileName: string;
    currentFolderType: string;
    fallbackImages: string[];
  }

  let { 
    activeImageBase64 = $bindable(''), 
    currentFileName = $bindable(''), 
    currentFolderType = $bindable(''),
    fallbackImages
  } = $props<Props>();

  export async function loadInitial() {
    await loadNextImage();
  }

  export async function triggerInteraction(e: MouseEvent) {
    await loadNextImage();
    playSystemSound();
  }

  async function loadNextImage() {
    try {
      const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('NoteCards');
      let folderImages: string[] = [];
      if (scanRes.success && scanRes.files && scanRes.files.length > 0) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
        folderImages = scanRes.files.filter(f => {
          const ext = '.' + f.split('.').pop()?.toLowerCase();
          return imageExtensions.includes(ext);
        });
      }

      if (folderImages.length > 0) {
        let available = folderImages;
        if (folderImages.length > 1) {
          available = folderImages.filter(f => f !== currentFileName);
        }
        const randomFile = available[Math.floor(Math.random() * available.length)];
        currentFileName = randomFile;

        const imgRes = await window.stratagemAPI.aigirlGetFileData('NoteCards', randomFile);
        if (imgRes.success && imgRes.data) {
          activeImageBase64 = imgRes.data;
          currentFolderType = 'notecards';
          return;
        }
      }

      // Fallback
      useFallbackImage();
    } catch (e) {
      console.error('NoteCardsMode failed to load image:', e);
      useFallbackImage();
    }
  }

  function useFallbackImage() {
    if (fallbackImages && fallbackImages.length > 0) {
      let available = fallbackImages;
      if (fallbackImages.length > 1 && activeImageBase64) {
        available = fallbackImages.filter(f => f !== activeImageBase64);
      }
      activeImageBase64 = available[Math.floor(Math.random() * available.length)];
      currentFileName = 'fallback_' + Math.random().toString(36).substring(7);
      currentFolderType = 'fallback';
    }
  }

  function playSystemSound() {
    // 1. Play core system audio decodes
    try {
      AudioEngine.play('data-decode');
    } catch (e) {
      console.warn('AudioEngine system play failed:', e);
    }

    // 2. Procedurally synthesize a beautiful premium sci-fi telemetry chime
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!ctx) return;

      const time = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.2, time);
      masterGain.connect(ctx.destination);

      // Playing a sweet minor 7th high-tech chime chord arpeggio
      const baseFreqs = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5 (Major 7th arpeggio)
      baseFreqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time + index * 0.05);

        // Gentle volume sweep and decay
        gainNode.gain.setValueAtTime(0, time + index * 0.05);
        gainNode.gain.linearRampToValueAtTime(0.15, time + index * 0.05 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + index * 0.05 + 0.35);

        osc.connect(gainNode);
        gainNode.connect(masterGain);

        osc.start(time + index * 0.05);
        osc.stop(time + index * 0.05 + 0.4);
      });
    } catch (err) {
      console.warn('Procedural chime synthesis failed:', err);
    }
  }

  onMount(() => {
    loadInitial();
  });
</script>
