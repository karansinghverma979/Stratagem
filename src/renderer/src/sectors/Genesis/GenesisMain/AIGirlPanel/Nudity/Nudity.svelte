<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale, blur } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { AntaryamiState } from '../../../../../core/store';

  interface Props {
    currentEmote: string;
    isGlitching: boolean;
    isReacting: boolean;
    onCompanionClick: (e: MouseEvent) => void;
    onThemeChange: (theme: string) => void;
    onColorChange?: (rgb: string) => void;
  }

  let { 
    currentEmote,
    isGlitching,
    isReacting,
    onCompanionClick,
    onThemeChange,
    onColorChange
  } = $props<Props>();

  let activeImageBase64 = $state<string>('');
  let currentFileName = $state<string>('');
  let activeAudio: HTMLAudioElement | null = null;
  let audioTimeoutId: any = null;
  let isMounted = true;

  // Obsidian-style random animations
  const transitions = [
    { fn: fly, params: { y: 25, duration: 550, easing: cubicOut } },
    { fn: fly, params: { y: -25, duration: 550, easing: cubicOut } },
    { fn: fly, params: { x: 25, duration: 550, easing: cubicOut } },
    { fn: fly, params: { x: -25, duration: 550, easing: cubicOut } },
    { fn: scale, params: { start: 0.95, duration: 550, easing: cubicOut } },
    { fn: blur, params: { amount: 6, duration: 500, easing: cubicOut } },
    { fn: fade, params: { duration: 500 } }
  ];

  let currentTransition = $state(transitions[0]);

  function dynamicTransition(node: HTMLElement) {
    return currentTransition.fn(node, currentTransition.params);
  }

  function extractColorFromBase64(base64: string): Promise<string> {
    return new Promise((resolve) => {
      if (!base64 || !base64.startsWith('data:image')) {
        resolve('139, 92, 246');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            resolve(`${data[0]}, ${data[1]}, ${data[2]}`);
            return;
          }
        } catch (e) {
          console.warn('Canvas color extraction failed:', e);
        }
        resolve('139, 92, 246');
      };
      img.onerror = () => {
        resolve('139, 92, 246');
      };
      img.src = base64;
    });
  }

  function determineThemeFromFilename(filename: string): string {
    const fn = filename.toLowerCase();
    if (fn.includes('angry') || fn.includes('makima') || fn.includes('hancock') || fn.includes('yor') || fn.includes('red')) {
      return 'angry';
    }
    if (fn.includes('tactical') || fn.includes('esdeath') || fn.includes('blue') || fn.includes('cyan')) {
      return 'tactical';
    }
    if (fn.includes('happy') || fn.includes('green')) {
      return 'happy';
    }
    if (fn.includes('empathy') || fn.includes('marin') || fn.includes('zerotwo') || fn.includes('pink') || fn.includes('magenta')) {
      return 'empathy';
    }
    if (fn.includes('neutral') || fn.includes('meimei') || fn.includes('purple') || fn.includes('violet') || fn.includes('indigo')) {
      return 'neutral';
    }
    return 'neutral';
  }

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
    const savedFilename = localStorage.getItem('aigirl_nudity_filename');
    if (savedFilename) {
      try {
        const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('Nudity/assets');
        if (!isMounted) return;
        if (scanRes.success && scanRes.files && scanRes.files.includes(savedFilename)) {
          currentFileName = savedFilename;
          const imgRes = await window.stratagemAPI.aigirlGetFileData('Nudity/assets', savedFilename);
          if (!isMounted) return;
          if (imgRes.success && imgRes.data) {
            activeImageBase64 = imgRes.data;
            onThemeChange(determineThemeFromFilename(savedFilename));
            extractColorFromBase64(imgRes.data).then(rgb => {
              if (onColorChange && isMounted) onColorChange(rgb);
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Nudity loadInitial from saved filename failed:', e);
      }
    }
    await loadNextImage();
  }

  export async function triggerInteraction(e: MouseEvent) {
    await loadNextImage();
    await playNudityCustomSound();
    onCompanionClick(e);
  }

  async function loadNextImage() {
    try {
      const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('Nudity/assets');
      if (!isMounted) return;
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
        localStorage.setItem('aigirl_nudity_filename', randomFile);

        const imgRes = await window.stratagemAPI.aigirlGetFileData('Nudity/assets', randomFile);
        if (!isMounted) return;
        if (imgRes.success && imgRes.data) {
          activeImageBase64 = imgRes.data;
          onThemeChange(determineThemeFromFilename(randomFile));
          
          // Randomize transition
          currentTransition = transitions[Math.floor(Math.random() * transitions.length)];

          // Extract color
          extractColorFromBase64(imgRes.data).then(rgb => {
            if (onColorChange && isMounted) onColorChange(rgb);
          });
          return;
        }
      }

      // Nothing to show — folder is empty or file failed to load
      console.warn('Nudity: no images found in folder.');
    } catch (e) {
      console.error('Nudity failed to load image:', e);
    }
  }

  async function playNudityCustomSound() {
    try {
      let stateVal;
      AntaryamiState.subscribe(s => { stateVal = s; })();
      if (!stateVal || stateVal.audioEnabled === false) return;
      const vol = stateVal.audioVolume !== undefined ? stateVal.audioVolume : 0.8;

      const scanRes = await window.stratagemAPI.aigirlScanFolderFiles('Nudity/effects');
      if (!isMounted) return;
      if (scanRes.success && scanRes.files && scanRes.files.length > 0) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.webm', '.wma'];
        const audioFiles = scanRes.files.filter(f => {
          const ext = '.' + f.split('.').pop()?.toLowerCase();
          return audioExtensions.includes(ext);
        });

        if (audioFiles.length > 0) {
          const randomSoundFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
          const audioRes = await window.stratagemAPI.aigirlGetFileData('Nudity/effects', randomSoundFile);
          if (!isMounted) return;
          if (audioRes.success && audioRes.data) {
            stopAudio();
            if (!isMounted) return;

            activeAudio = new Audio(audioRes.data);
            activeAudio.volume = 0.55 * vol;

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
            }, 2000); // Only play for 2 seconds!

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
      isMounted = false;
      stopAudio();
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div 
  class="character-viewport"
  class:glitch-active={isGlitching}
  class:recoil-active={isReacting}
  role="presentation"
>
  {#if activeImageBase64}
    <img 
      src={activeImageBase64} 
      alt="Companion avatar" 
      class="full-body-avatar"
      onclick={triggerInteraction}
      role="button"
      tabindex="0"
      title="Click to trigger companion reaction"
    />
  {/if}
</div>
