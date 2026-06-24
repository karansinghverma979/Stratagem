<script lang="ts">
  import { onMount } from 'svelte';

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

  let activeAudio: HTMLAudioElement | null = null;
  let audioTimeoutId: any = null;

  function stopAudio() {
    if (audioTimeoutId) {
      clearTimeout(audioTimeoutId);
      audioTimeoutId = null;
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (err) {
        console.warn('Failed to stop audio:', err);
      }
      activeAudio = null;
    }
  }

  export async function loadInitial() {
    await loadNextImage();
  }

  export async function triggerInteraction(e: MouseEvent) {
    await loadNextImage();
    await playNudityCustomSound();
  }

  async function loadNextImage() {
    try {
      const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('Nudity');
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

        const imgRes = await window.stratagemAPI.aigirlGetFileData('Nudity', randomFile);
        if (imgRes.success && imgRes.data) {
          activeImageBase64 = imgRes.data;
          currentFolderType = 'nudity';
          return;
        }
      }

      // Fallback
      useFallbackImage();
    } catch (e) {
      console.error('NudityMode failed to load image:', e);
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

  async function playNudityCustomSound() {
    try {
      const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('Nudity');
      if (scanRes.success && scanRes.files && scanRes.files.length > 0) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.webm', '.wma'];
        const audioFiles = scanRes.files.filter(f => {
          const ext = '.' + f.split('.').pop()?.toLowerCase();
          return audioExtensions.includes(ext);
        });

        if (audioFiles.length > 0) {
          const randomSoundFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
          const audioRes = await window.stratagemAPI.aigirlGetFileData('Nudity', randomSoundFile);
          if (audioRes.success && audioRes.data) {
            stopAudio();

            activeAudio = new Audio(audioRes.data);
            activeAudio.volume = 0.55;

            // Set 2 seconds play limit
            audioTimeoutId = setTimeout(() => {
              if (activeAudio) {
                try {
                  activeAudio.pause();
                  activeAudio.currentTime = 0;
                } catch (e) {
                  console.warn('Timeout pause failed:', e);
                }
                activeAudio = null;
              }
            }, 2000);

            await activeAudio.play();
          }
        }
      }
    } catch (err) {
      console.warn('Nudity custom sound playback failed:', err);
    }
  }

  onMount(() => {
    loadInitial();
    return () => {
      stopAudio();
    };
  });
</script>
