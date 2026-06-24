<script lang="ts">
  import { executionTasks } from '../../core/store';
  import { AudioEngine } from '../../core/audio-engine';

  let { selectedTags = $bindable([]) } = $props();

  let favoriteTags = $state<string[]>([]);
  let scrollContainer = $state<HTMLDivElement | null>(null);

  // Derive unique tags reactively from the synchronized tasks store
  let allUniqueTags = $derived.by(() => {
    const tagsSet = new Set<string>();
    $executionTasks.forEach(task => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach(tag => {
          const cleaned = tag.trim().toUpperCase().replace('#', '');
          if (cleaned) {
            tagsSet.add(cleaned);
          }
        });
      }
    });

    const tagsList = Array.from(tagsSet);

    // Sort pinned/favorite tags to the absolute front
    tagsList.sort((a, b) => {
      const aFav = favoriteTags.includes(a);
      const bFav = favoriteTags.includes(b);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.localeCompare(b);
    });

    return tagsList;
  });

  const toggleFavorite = (tag: string, e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    AudioEngine.play('success');
    if (favoriteTags.includes(tag)) {
      favoriteTags = favoriteTags.filter(t => t !== tag);
    } else {
      favoriteTags = [...favoriteTags, tag];
    }
  };

  const toggleTag = (tag: string) => {
    AudioEngine.play('ui-click');
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t: string) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainer) return;
    const amount = 300;
    scrollContainer.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
    AudioEngine.play('ui-click');
  };
</script>

<div class="tag-bar-wrapper">
  <div class="tag-bar-container">
    <button 
      class="scroll-btn scroll-left" 
      onclick={() => scroll('left')}
      aria-label="Scroll Left"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <button 
      class="tag-pill tag-all font-inter" 
      class:active={selectedTags.length === 0} 
      onclick={() => { AudioEngine.play('ui-click'); selectedTags = []; }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      ALL
    </button>
    
    <div class="tags-scroll-row" bind:this={scrollContainer}>
      {#each allUniqueTags as tag}
        <div class="tag-pill-wrapper" class:active={selectedTags.includes(tag)}>
          <button 
            class="tag-pill font-inter" 
            onclick={() => toggleTag(tag)}
            onmouseenter={() => AudioEngine.play('ui-hover')}
          >
            {tag}
          </button>
          <button 
            class="favorite-btn" 
            class:favorited={favoriteTags.includes(tag)}
            onclick={(e) => toggleFavorite(tag, e)}
            title="Favorite Tag"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z"/>
            </svg>
          </button>
        </div>
      {/each}
    </div>
    
    <button 
      class="scroll-btn scroll-right" 
      onclick={() => scroll('right')}
      aria-label="Scroll Right"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .tag-bar-wrapper {
    width: 100%;
    margin-bottom: 24px;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
    position: relative;
    z-index: 5;
  }

  .tag-bar-container {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    position: relative;
    padding: 0 50px; /* Space for scroll buttons align flush with edges */
    box-sizing: border-box;
  }

  .tags-scroll-row {
    display: flex;
    align-items: center;
    gap: 12px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex: 1;
    scroll-behavior: smooth;
    padding: 4px 0;
  }

  .tags-scroll-row::-webkit-scrollbar {
    display: none;
  }

  /* Polished Tactical Scroll Buttons */
  .scroll-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 38px; /* Slightly reduced for cleaner fit */
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), 0 0 15px var(--primary-glow);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10;
    outline: none;
    padding: 0;
  }

  .scroll-left { left: 0; }
  .scroll-right { right: 0; }

  .scroll-btn:hover {
    transform: translateY(-50%) scale(1.1);
    filter: brightness(1.2);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5), 0 0 25px var(--primary-glow);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .scroll-btn:active {
    transform: translateY(-50%) scale(0.95);
  }

  .scroll-btn svg {
    width: 20px; /* Upscaled from 16px */
    height: 20px; /* Upscaled from 16px */
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
  }

  /* Tag Pill styles */
  .tag-pill {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13.5px; /* Upscaled from 11px */
    font-weight: 800;
    letter-spacing: 1.2px;
    cursor: pointer;
    outline: none;
    transition: all var(--anim-fast);
    padding: 8px 18px; /* Increased padding */
  }

  .tag-all {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    flex-shrink: 0;
    height: 38px; /* Upscaled from 32px */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    padding: 0 24px;
  }

  .tag-all:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .tag-all.active {
    background: linear-gradient(90deg, var(--primary-accent), var(--secondary-accent)) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    color: #ffffff !important;
    box-shadow: 0 0 25px var(--primary-glow), inset 0 0 10px rgba(255, 255, 255, 0.3);
    animation: selectionPulse 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tag-pill-wrapper {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    height: 38px; /* Upscaled from 32px */
    transition: all 0.3s var(--ease-fui);
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
  }

  .tag-pill-wrapper:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .tag-pill-wrapper.active {
    background: rgba(139, 92, 246, 0.35) !important;
    border-color: var(--primary-accent) !important;
    box-shadow: 0 0 20px var(--primary-glow), inset 0 0 8px rgba(139, 92, 246, 0.4);
    animation: selectionPulse 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes selectionPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); filter: brightness(1.3); }
    100% { transform: scale(1); }
  }

  .tag-pill-wrapper.active .tag-pill {
    color: #ffffff !important;
    text-shadow: 0 0 10px #ffffff;
  }

  .tag-pill-wrapper.active .favorite-btn {
    border-left-color: rgba(255, 255, 255, 0.2);
  }

  .favorite-btn {
    background: transparent;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    height: 100%;
    padding: 0 14px; /* Increased from 10px */
    color: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    outline: none;
    transition: all 0.3s var(--ease-fui);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .favorite-btn:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.08);
  }

  .favorite-btn.favorited {
    color: var(--warning-amber) !important;
    background: rgba(255, 184, 0, 0.1);
    filter: drop-shadow(0 0 8px rgba(255, 184, 0, 0.8));
    animation: favPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes favPop {
    0% { transform: scale(0.5) rotate(-45deg); opacity: 0; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .favorite-btn svg {
    width: 14px; /* Upscaled from 10px */
    height: 14px;
    transition: transform 0.3s var(--ease-fui);
  }

  .favorite-btn:hover svg {
    transform: scale(1.2) rotate(15deg);
  }
</style>
