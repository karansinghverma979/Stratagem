<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';
  import { onMount } from 'svelte';
  import QuoteEditorModal from './QuoteEditorModal.svelte';
  import QuotesImportModel from './QuotesImportModel.svelte';

  interface QuoteItem {
    text: string;
    author: string;
    book: string;
    date: string;
    type: 'imported' | 'standalone';
    key?: string;
  }

  interface BookInfo {
    name: string;
    filename: string;
    icon: string;
    themeClass: string;
    author: string;
  }

  const books: BookInfo[] = [
    { name: '48 Laws of Power', filename: 'laws_of_power.json', icon: '👑', themeClass: 'btn-power', author: 'Robert Greene' },
    { name: '33 Strategies of War', filename: '33_strategies_of_war.json', icon: '⚔️', themeClass: 'btn-war', author: 'Robert Greene' },
    { name: 'Laws of Human Nature', filename: 'laws_of_human_nature.json', icon: '🧠', themeClass: 'btn-human', author: 'Robert Greene' },
    { name: 'Daily Law', filename: 'daily_law.json', icon: '📅', themeClass: 'btn-daily', author: 'Robert Greene' },
    { name: 'Art of Seduction', filename: 'art_of_seduction.json', icon: '💖', themeClass: 'btn-seduction', author: 'Robert Greene' },
    { name: '50th Law', filename: '50th_law.json', icon: '🔥', themeClass: 'btn-50th', author: 'Robert Greene' },
    { name: 'Tactical Axioms', filename: 'tactical_axioms.json', icon: '🛡️', themeClass: 'btn-axioms', author: 'Various Authors' }
  ];

  const fallbackQuotes: Record<string, any> = {
    'laws_of_power.json': [
      "LAW 1: NEVER OUTSHINE THE MASTER. Make those above you feel superior.",
      "LAW 2: NEVER PUT TOO MUCH TRUST IN FRIENDS, LEARN HOW TO USE ENEMIES. Friends betray out of envy; a former enemy is more loyal.",
      "LAW 3: CONCEAL YOUR INTENTIONS. Keep people off-balance and in the dark.",
      "LAW 4: ALWAYS SAY LESS THAN NECESSARY. The more you say, the more common you appear.",
      "LAW 5: SO MUCH DEPENDS ON REPUTATION - GUARD IT WITH YOUR LIFE. Reputation is the cornerstone of power."
    ],
    '33_strategies_of_war.json': [
      "STRATEGY 1: THE POLARITY STRATEGY. Declare war on your enemies. Clear boundaries define your strength.",
      "STRATEGY 2: THE GUERILLA-WAR-OF-THE-MIND STRATEGY. Do not let the past dictate the present. Keep moving.",
      "STRATEGY 3: THE COUNTERBALANCE STRATEGY. Keep your presence of mind under fire. Master your emotions."
    ],
    'laws_of_human_nature.json': [
      "LAW OF IRRATIONALITY: Control your emotional self. Realize that feelings cloud clear strategic thinking.",
      "LAW OF NARCISSISM: Transform self-love into empathy. Learn to see others from their perspective."
    ],
    'daily_law.json': {
      "06-14": "DAILY LAW (JUNE 14): Mastery is not a product of time and intense focus. Absolute cognitive presence is required.",
      "default": "DAILY LAW: Focus entirely on the immediate task. Strategic mastery is born from absolute cognitive isolation."
    },
    'art_of_seduction.json': [
      "THE COQUETTE: The master of delay. Alternating between warmth and coldness keeps the target hooked.",
      "THE DANDY: A figure of romantic ambiguity. They subvert gender expectations to create fascination."
    ],
    '50th_law.json': [
      "THE 50TH LAW: FEAR NOTHING. Fear is the ultimate barrier to power. Eliminate it.",
      "FEARLESSNESS DIRECTIVE: When you show no fear, others respect your authority and yield."
    ],
    'tactical_axioms.json': [
      "The supreme art of war is to subdue the enemy without fighting. - Sun Tzu",
      "In the midst of chaos, there is also opportunity. - Sun Tzu"
    ]
  };

  // State
  let activeBookIndex = $state(6); // Default: Tactical Axioms (index 6)
  let selectedBook = $derived(books[activeBookIndex]);
  let quotesList = $state<QuoteItem[]>([]);
  let isEditorOpen = $state(false); // Modal state
  let quoteToEdit = $state<(QuoteItem & { index?: number }) | null>(null);
  let isImportOpen = $state(false); // Import Modal state
  let showDeleteConfirm = $state(false);
  let deleteTargetIndex = $state<number | null>(null);
  let listWrapperEl = $state<HTMLElement | null>(null);
  let highlightedQuotes = $state<Set<string>>(new Set());

  // Load quotes from file/cache
  async function loadQuotes(filename: string, bookName: string) {
    try {
      let data: any = null;
      if (typeof window !== 'undefined' && (window as any).localQuotesCache && (window as any).localQuotesCache[filename]) {
        data = (window as any).localQuotesCache[filename];
      }
      
      if (!data && window.stratagemAPI) {
        try {
          const result = await window.stratagemAPI.intelReadQuotes(filename);
          if (result && result.success) {
            data = result.data;
          }
        } catch (bridgeErr) {
          console.warn("Secure bridge read failed:", bridgeErr);
        }
      }
      
      if (!data) {
        data = fallbackQuotes[filename];
      }
      
      normalizeAndSet(data, filename, bookName);
    } catch (err) {
      console.error(err);
      normalizeAndSet([], filename, bookName);
    }
  }

  function normalizeAndSet(data: any, filename: string, bookName: string) {
    const authorVal = books.find(b => b.filename === filename)?.author || 'Unknown';
    let rawList: QuoteItem[] = [];
    if (Array.isArray(data)) {
      rawList = data.map((q: any) => {
        if (typeof q === 'string') {
          return {
            text: q,
            author: authorVal,
            book: bookName,
            date: new Date().toISOString().split('T')[0],
            type: 'standalone' as const
          };
        }
        return {
          text: q.text || '',
          author: q.author || authorVal,
          book: q.book || bookName,
          date: q.date || new Date().toISOString().split('T')[0],
          type: q.type || 'standalone'
        };
      });
    } else if (data && typeof data === 'object') {
      rawList = Object.entries(data).map(([key, val]: [string, any]) => {
        if (typeof val === 'string') {
          return {
            text: val,
            author: authorVal,
            book: bookName,
            date: new Date().toISOString().split('T')[0],
            type: 'standalone' as const,
            key: key
          };
        }
        return {
          text: val.text || val,
          author: val.author || authorVal,
          book: val.book || bookName,
          date: val.date || new Date().toISOString().split('T')[0],
          type: val.type || 'standalone',
          key: key || val.key
        };
      });
    } else {
      rawList = [];
    }

    // Sort by date ascending: oldest first (top), newest last (lowest)
    rawList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    quotesList = rawList;
  }

  // Save changes to file/cache
  async function saveQuotesList() {
    let preparedData: any = null;
    if (selectedBook.filename === 'daily_law.json') {
      const dict: Record<string, any> = {};
      quotesList.forEach((q) => {
        const key = q.key || (q.date ? q.date.substring(5) : 'default'); // e.g. "06-20" or "default"
        dict[key] = {
          text: q.text,
          author: q.author,
          book: q.book,
          date: q.date,
          type: q.type
        };
      });
      preparedData = dict;
    } else {
      preparedData = quotesList.map(q => ({
        text: q.text,
        author: q.author,
        book: q.book,
        date: q.date,
        type: q.type
      }));
    }

    if (typeof window !== 'undefined') {
      if (!(window as any).localQuotesCache) (window as any).localQuotesCache = {};
      (window as any).localQuotesCache[selectedBook.filename] = preparedData;
    }

    if (window.stratagemAPI) {
      try {
        await window.stratagemAPI.intelWriteQuotes(selectedBook.filename, JSON.stringify(preparedData, null, 2));
      } catch (err) {
        console.warn("Secure bridge write failed, falling back to local cache:", err);
      }
    }

    // Trigger update notification
    window.dispatchEvent(new CustomEvent('quotes-updated', { detail: { filename: selectedBook.filename } }));
  }

  onMount(() => {
    loadQuotes(selectedBook.filename, selectedBook.name);
  });

  // Modal actions
  function handleAddClick() {
    AudioEngine.play('data-lock');
    quoteToEdit = null;
    isEditorOpen = true;
  }

  function handleEditClick(quote: QuoteItem, index: number) {
    AudioEngine.play('data-lock');
    quoteToEdit = { ...quote, index };
    isEditorOpen = true;
  }

  function handleModalClose() {
    isEditorOpen = false;
    quoteToEdit = null;
  }

  async function handleModalSave(newQuote: QuoteItem, index?: number) {
    const savedQuoteText = newQuote.text;
    if (index !== undefined) {
      // Edit mode
      const keyVal = quotesList[index].key;
      quotesList[index] = { ...newQuote, key: keyVal };
    } else {
      // Create mode
      let keyVal: string | undefined = undefined;
      if (selectedBook.filename === 'daily_law.json') {
        keyVal = newQuote.date.substring(5); // "MM-DD"
      }
      quotesList = [...quotesList, { ...newQuote, key: keyVal }];
    }

    // Sort ascending by date (oldest first, newest last)
    quotesList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    quotesList = [...quotesList];

    // Highlight and smooth scroll to bottom where the newest records reside
    highlightedQuotes = new Set([savedQuoteText]);
    setTimeout(() => {
      if (listWrapperEl) {
        listWrapperEl.scrollTo({ top: listWrapperEl.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
    setTimeout(() => {
      highlightedQuotes = new Set();
    }, 4000);

    isEditorOpen = false;
    quoteToEdit = null;
    await saveQuotesList();
  }

  async function handleDeleteClick(e: Event, index: number) {
    e.stopPropagation(); // Prevent opening edit modal
    AudioEngine.play('error');
    deleteTargetIndex = index;
    showDeleteConfirm = true;
  }

  async function executeDelete() {
    if (deleteTargetIndex !== null) {
      quotesList = quotesList.filter((_, idx) => idx !== deleteTargetIndex);
      await saveQuotesList();
    }
    showDeleteConfirm = false;
    deleteTargetIndex = null;
  }

  // Export File
  function handleExport() {
    try {
      AudioEngine.play('data-lock');
      // Strip everything except text, author, book, and date
      const exportData = quotesList.map(q => ({
        text: q.text,
        author: q.author,
        book: q.book,
        date: q.date
      }));
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedBook.filename.replace('.json', '')}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      AudioEngine.play('error');
    }
  }

  function handleImportClick() {
    AudioEngine.play('ui-click');
    isImportOpen = true;
  }

  async function handleImportSave(importedQuotes: QuoteItem[], isOverwrite: boolean) {
    if (isOverwrite) {
      quotesList = importedQuotes;
    } else {
      quotesList = [...quotesList, ...importedQuotes];
    }

    // Sort ascending by date
    quotesList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    quotesList = [...quotesList];

    // Highlight and scroll to bottom
    highlightedQuotes = new Set(importedQuotes.map(q => q.text));
    setTimeout(() => {
      if (listWrapperEl) {
        listWrapperEl.scrollTo({ top: listWrapperEl.scrollHeight, behavior: 'smooth' });
      }
    }, 150);
    setTimeout(() => {
      highlightedQuotes = new Set();
    }, 4000);

    await saveQuotesList();
    isImportOpen = false;
  }

  // Header hover state
  let isHeaderHovered = $state(false);
</script>

<div class="quotes-panel glass-container" in:fade={{ duration: 120 }} out:fade={{ duration: 60 }}>
  <!-- Top Tech Header -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="panel-header" onmouseenter={() => { isHeaderHovered = true; AudioEngine.play('ui-hover'); }} onmouseleave={() => isHeaderHovered = false}>
    <div class="live-icon quotes-icon" class:acquired={isHeaderHovered}>
      <svg viewBox="0 0 24 24" class="svg-anim">
        <!-- Animated Document Frame -->
        <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="rgba(167, 139, 250, 0.4)" stroke-width="1.2" class="frame-draw" />
        <!-- Scanning Data Lines -->
        <line x1="7" y1="8" x2="17" y2="8" stroke="#a78bfa" stroke-width="1.5" class="flow-line-1" stroke-dasharray="10 2" />
        <line x1="7" y1="12" x2="15" y2="12" stroke="#ffd700" stroke-width="1.5" class="flow-line-2" stroke-dasharray="8 3" />
        <line x1="7" y1="16" x2="12" y2="16" stroke="#00d1ff" stroke-width="1.5" class="flow-line-1" stroke-dasharray="5 5" />
        <!-- Corner Decals -->
        <path d="M3 7V4h3" fill="none" stroke="#a78bfa" stroke-width="1.5" />
        <path d="M18 20h3v-3" fill="none" stroke="#00d1ff" stroke-width="1.5" />
      </svg>
    </div>
    
    <!-- Title Group -->
    <div class="title-group-animated" class:acquired={isHeaderHovered}>
      <div class="title-fui-shell">
        <h1 class="forge-title font-outfit">SOURCE DATABASE</h1>
      </div>
    </div>
  </div>

  <!-- CONTROL ROW (ADD, IMPORT, EXPORT, SELECTOR TOGGLE) -->
  <div class="control-row font-mono">
    <!-- Action buttons (left side) -->
    <div class="left-actions">
      <button type="button" class="action-btn btn-add" onclick={handleAddClick}>
        <span class="btn-symbol">+</span> ADD WISDOM
      </button>
      <button type="button" class="action-btn btn-import" onclick={handleImportClick}>
        IMPORT
      </button>
      <button type="button" class="action-btn btn-export" onclick={handleExport}>
        EXPORT
      </button>
    </div>

    <!-- Toggle Selector (right side) -->
    <div class="toggle-container">
      {#each books as book, index}
        <button 
          type="button" 
          class="toggle-btn {book.themeClass}"
          class:active={activeBookIndex === index}
          onclick={() => {
            activeBookIndex = index;
            AudioEngine.play('switch-flip');
            loadQuotes(book.filename, book.name);
          }}
          title={book.name}
        >
          <span class="toggle-icon">{book.icon}</span>
          {#if activeBookIndex === index}
            <span class="toggle-text" transition:fade={{ duration: 150 }}>{book.name}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- QUOTES CARD LIST VIEW -->
  <div class="quotes-list-wrapper scrollable" bind:this={listWrapperEl}>
    {#if quotesList.length === 0}
      <div class="empty-state font-mono">
        <span class="empty-icon">⚠️</span>
        <span class="empty-text">AWAITING COGNITIVE ENTRY VECTOR PROTOCOLS...</span>
      </div>
    {:else}
      {#each quotesList as quote, idx}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="quote-card" 
          class:highlighted={highlightedQuotes.has(quote.text)}
          onclick={() => handleEditClick(quote, idx)}
        >
          <div class="card-left-accent"></div>
          
          <div class="quote-text">“{quote.text}”</div>
          
          <div class="quote-card-meta font-outfit">
            <div class="meta-left">
              <span class="quote-type-label" class:type-imported={quote.type === 'imported'}>
                {quote.type.toUpperCase()}
              </span>
              <span class="intel-ref-label">INTEL REF</span>
              <div class="meta-source-details">
                <span class="source-dot dot-author"></span>
                <span class="meta-author">{quote.author.replace(/[_/]/g, ' ')}</span>
                <span class="source-dot dot-book"></span>
                <span class="meta-book">{quote.book.replace(/[_/]/g, ' ')}</span>
              </div>
            </div>
            
            <div class="meta-right">
              <span class="quote-date">{quote.date || ''}</span>
              <button 
                type="button" 
                class="delete-btn" 
                onclick={(e) => handleDeleteClick(e, idx)}
              >
                PURGE
              </button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<QuoteEditorModal
  isOpen={isEditorOpen}
  quoteToEdit={quoteToEdit}
  currentBookName={selectedBook.name}
  onClose={handleModalClose}
  onSave={handleModalSave}
/>

<QuotesImportModel
  isOpen={isImportOpen}
  activeBook={selectedBook}
  quotesList={quotesList}
  onClose={() => isImportOpen = false}
  onSave={handleImportSave}
/>

{#if showDeleteConfirm}
  <div class="delete-confirm-overlay" transition:fade={{ duration: 150 }}>
    <div class="delete-confirm-card font-outfit" transition:scale={{ duration: 200, start: 0.95 }}>
      <div class="danger-header">
        <span class="danger-led"></span>
        <span class="danger-title">CRITICAL PURGE DETECTED</span>
      </div>
      
      <div class="danger-body">
        <p class="confirm-question">ARE YOU SURE YOU WANT TO PURGE THIS WISDOM RECORD FROM THE COGNITIVE DATABASE?</p>
        <div class="target-preview">
          {#if deleteTargetIndex !== null && quotesList[deleteTargetIndex]}
            <p class="preview-text">“{quotesList[deleteTargetIndex].text.replace(/[_/]/g, ' ')}”</p>
            <div class="preview-source-group">
              <span class="preview-label">COGNITIVE SOURCE</span>
              <div class="source-details">
                <div class="source-item author-item">
                  <span class="source-dot dot-author"></span>
                  <span class="preview-author">{quotesList[deleteTargetIndex].author.replace(/[_/]/g, ' ')}</span>
                </div>
                <div class="source-item book-item">
                  <span class="source-dot dot-book"></span>
                  <span class="preview-book">{quotesList[deleteTargetIndex].book.replace(/[_/]/g, ' ')}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
        <p class="warning-text">WARNING: THIS ACTION IS IRREVERSIBLE AND WILL PERMANENTLY ALTER DATABASE SCHEMATICS.</p>
      </div>
      
      <div class="danger-footer">
        <button class="confirm-btn btn-abort" onclick={() => { showDeleteConfirm = false; deleteTargetIndex = null; }}>
          ABORT PROTOCOL
        </button>
        <button class="confirm-btn btn-purge" onclick={executeDelete}>
          PURGE RECORD
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .quotes-panel {
    width: 100%;
    height: 100%;
    padding: 30px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 34px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      0 12px 30px rgba(0, 0, 0, 0.75);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    height: 60px;
    box-sizing: border-box;
    padding: 0 0 16px 0;
    margin: 0;
    position: relative;
    user-select: none;
    outline: none;
  }

  .live-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 6px var(--glow-color, rgba(167, 139, 250, 0.6)));
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s ease;
  }
  .live-icon:hover {
    transform: scale(1.2) skewX(-10deg);
    filter: drop-shadow(0 0 15px #a78bfa) drop-shadow(0 0 25px #00d1ff);
  }
  .live-icon.acquired {
    transform: scale(1.15) skewX(-5deg);
    filter: drop-shadow(0 0 15px #a78bfa) drop-shadow(0 0 25px #00d1ff);
  }

  .quotes-icon {
    --glow-color: rgba(167, 139, 250, 0.6);
  }

  .svg-anim {
    width: 100%;
    height: 100%;
  }

  .flow-line-1 {
    animation: flowDash 1.5s infinite linear;
  }

  .flow-line-2 {
    animation: flowDash 2s infinite linear reverse;
  }

  @keyframes flowDash {
    from { stroke-dashoffset: 12; }
    to { stroke-dashoffset: 0; }
  }

  .frame-draw {
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    animation: frameDraw 2s forwards ease-out;
  }

  @keyframes frameDraw {
    to { stroke-dashoffset: 0; }
  }

  .title-group-animated {
    display: flex;
    align-items: center;
  }
  .title-fui-shell {
    position: relative;
    padding: 2px 0 6px 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .forge-title {
    font-size: 38px;
    font-weight: 950;
    color: #fff;
    margin: 0;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #fff, #8b5cf6, #06b6d4, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 8s linear infinite, glow-breath 5s infinite alternate ease-in-out;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  .title-group-animated.acquired .forge-title {
    background: linear-gradient(90deg, #fff, #ff2d55, #f59e0b, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 2.5s linear infinite, title-alert-pulse 0.6s infinite alternate ease-in-out;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.45);
  }

  @keyframes glow-breath {
    0% { filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2)); }
    100% { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)); }
  }

  @keyframes title-alert-pulse {
    0% { filter: drop-shadow(0 0 8px rgba(255, 45, 85, 0.4)); }
    100% { filter: drop-shadow(0 0 20px rgba(255, 45, 85, 0.75)); }
  }

  @keyframes chroma-loop { 
    from { background-position: 0% center; } 
    to { background-position: 200% center; } 
  }

  .control-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    margin-bottom: 20px;
    gap: 20px;
    flex-wrap: nowrap;
  }

  .left-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
  }

  .action-btn {
    font-family: 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 950 !important;
    letter-spacing: 0.08em;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    background-size: 200% auto;
    color: #ffffff;
    white-space: nowrap;
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease;
    animation: gradient-shift 6s ease infinite;
  }
  .action-btn:hover {
    transform: scale(1.04);
  }
  .action-btn:active {
    transform: scale(0.97);
  }
  .action-btn.btn-add {
    background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #8b5cf6 100%);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    border-color: rgba(139, 92, 246, 0.4);
  }
  .action-btn.btn-add:hover {
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.6);
  }
  .action-btn.btn-import {
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #0d9488 100%);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
    border-color: rgba(13, 148, 136, 0.4);
  }
  .action-btn.btn-import:hover {
    box-shadow: 0 6px 20px rgba(13, 148, 136, 0.6);
  }
  .action-btn.btn-export {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0284c7 100%);
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
    border-color: rgba(2, 132, 199, 0.4);
  }
  .action-btn.btn-export:hover {
    box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
  }

  .btn-symbol {
    font-size: 14px;
    font-weight: 900;
  }

  /* TOGGLE CONTAINER */
  .toggle-container {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.65);
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    padding: 4px 8px;
    box-shadow: 
      inset 0 0 16px rgba(0, 0, 0, 0.95),
      0 0 15px rgba(139, 92, 246, 0.1);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.45);
    height: 42px;
    width: 42px;
    border-radius: 50%;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    font-weight: 950 !important;
    font-size: 13px;
    text-transform: uppercase;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-sizing: border-box;
    padding: 0;
    overflow: hidden;
  }

  .toggle-btn:hover {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.08);
  }

  .toggle-btn.active {
    width: auto;
    border-radius: 9999px;
    padding: 0 18px;
    color: #ffffff;
    font-size: 13.5px;
    font-weight: 950 !important;
    letter-spacing: 0.08em;
    box-shadow: 0 0 16px currentColor;
    text-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.7);
  }

  /* Active book specific designs */
  .toggle-btn.active.btn-power {
    background: linear-gradient(135deg, #ea580c, #dc2626);
    box-shadow: 0 0 15px rgba(234, 88, 12, 0.5);
  }
  .toggle-btn.active.btn-war {
    background: linear-gradient(135deg, #f1f5f9, #94a3b8);
    color: #0f172a;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
    text-shadow: none;
  }
  .toggle-btn.active.btn-human {
    background: linear-gradient(135deg, #ef4444, #3b82f6);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
  }
  .toggle-btn.active.btn-daily {
    background: linear-gradient(135deg, #7c3aed, #0d9488);
    box-shadow: 0 0 15px rgba(124, 58, 237, 0.5);
  }
  .toggle-btn.active.btn-seduction {
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
  }
  .toggle-btn.active.btn-50th {
    background: #000000;
    border: 2px solid #ffd700;
    color: #ffd700;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  }
  .toggle-btn.active.btn-axioms {
    background: linear-gradient(135deg, #475569, #0f172a);
    box-shadow: 0 0 15px rgba(71, 85, 105, 0.5);
  }

  .toggle-icon {
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 950 !important;
    font-size: 12.5px;
    letter-spacing: 0.08em;
    white-space: nowrap;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }

  /* LIST VIEW CARDS */
  .quotes-list-wrapper {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 6px;
    box-sizing: border-box;
  }

  .quotes-list-wrapper::-webkit-scrollbar {
    width: 6px;
  }
  .quotes-list-wrapper::-webkit-scrollbar-track {
    background: transparent;
  }
  .quotes-list-wrapper::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 9999px;
  }
  .quotes-list-wrapper::-webkit-scrollbar-thumb:hover {
    background: #8b5cf6;
  }

  .quote-card {
    background: linear-gradient(135deg, rgba(16, 17, 34, 0.75) 0%, rgba(6, 7, 15, 0.98) 100%);
    border: 1px solid rgba(139, 92, 246, 0.22);
    border-radius: 16px;
    padding: 22px 26px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.05),
      0 8px 24px rgba(0, 0, 0, 0.6);
    width: 100%;
    height: auto;
    min-height: max-content;
  }

  .quote-card::before {
    content: "“";
    position: absolute;
    right: 20px;
    bottom: -25px;
    font-size: 130px;
    color: rgba(255, 255, 255, 0.025);
    font-family: 'Outfit', sans-serif;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
    transition: all 0.35s ease;
  }

  .quote-card:hover::before {
    color: rgba(0, 242, 255, 0.04);
    transform: translateY(-5px);
  }

  .quote-card:hover {
    border-color: rgba(0, 242, 255, 0.45);
    background: linear-gradient(135deg, rgba(25, 27, 50, 0.8) 0%, rgba(8, 9, 20, 0.99) 100%);
    box-shadow: 
      0 0 30px rgba(0, 242, 255, 0.12),
      inset 0 0 20px rgba(255, 255, 255, 0.03),
      0 12px 35px rgba(0, 0, 0, 0.7);
    transform: translateY(-3px) scale(1.005);
  }

  .quote-card.highlighted {
    border-color: #00f2ff;
    background: linear-gradient(135deg, rgba(0, 242, 255, 0.12) 0%, rgba(25, 27, 50, 0.85) 100%);
    box-shadow: 
      0 0 40px rgba(0, 242, 255, 0.25),
      inset 0 0 25px rgba(255, 255, 255, 0.04),
      0 12px 35px rgba(0, 0, 0, 0.75);
    animation: highlight-pulse 2s infinite ease-in-out alternate;
  }

  @keyframes highlight-pulse {
    0% {
      border-color: #00f2ff;
      box-shadow: 0 0 30px rgba(0, 242, 255, 0.2);
    }
    100% {
      border-color: #a78bfa;
      box-shadow: 0 0 45px rgba(167, 139, 250, 0.35);
    }
  }

  .card-left-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #8b5cf6 0%, #00f2ff 100%);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
    transition: all 0.35s ease;
  }

  .quote-card:hover .card-left-accent {
    width: 5.5px;
    box-shadow: 0 0 16px #00f2ff;
  }

  .quote-text {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    line-height: 1.6;
    background: linear-gradient(90deg, #ffffff 0%, #cbd5e1 50%, #ffffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 950 !important;
    letter-spacing: 0.01em;
    margin: 4px 0;
    padding-left: 14px;
    border-left: 3px solid rgba(139, 92, 246, 0.45);
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
    z-index: 1;
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    transition: all 0.35s ease;
  }

  .quote-card:hover .quote-text {
    border-left-color: #00f2ff;
    background: linear-gradient(90deg, #ffffff 0%, #00f2ff 50%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0, 242, 255, 0.35));
  }

  .quote-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 950 !important;
    letter-spacing: 0.05em;
    margin-top: 10px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    padding-top: 12px;
    z-index: 1;
    flex-wrap: nowrap;
    gap: 16px;
  }

  .meta-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .intel-ref-label {
    color: rgba(255, 255, 255, 0.45);
    font-weight: 950 !important;
    font-size: 11px;
    letter-spacing: 0.12em;
  }

  .meta-source-details {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    animation: led-dot-pulse 2s infinite ease-in-out;
  }

  .dot-author {
    background: #00f2ff;
    box-shadow: 0 0 6px #00f2ff;
  }

  .dot-book {
    background: #a78bfa;
    box-shadow: 0 0 6px #a78bfa;
    animation-delay: 0.5s;
  }

  @keyframes led-dot-pulse {
    0%, 100% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1.25); opacity: 1; }
  }

  .meta-author {
    color: #00f2ff;
    text-shadow: 0 0 8px rgba(0, 242, 255, 0.25);
    font-weight: 950 !important;
    font-size: 12px;
    transition: all 0.25s ease;
  }

  .quote-card:hover .meta-author {
    color: #ffffff;
    text-shadow: 0 0 12px #00f2ff;
  }

  .quote-card:hover .dot-author {
    transform: scale(1.4);
    box-shadow: 0 0 12px #00f2ff;
    background: #ffffff;
  }

  .meta-book {
    color: #a78bfa;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.25);
    font-weight: 950 !important;
    font-size: 12px;
    transition: all 0.25s ease;
  }

  .quote-card:hover .meta-book {
    color: #ffffff;
    text-shadow: 0 0 12px #a78bfa;
  }

  .quote-card:hover .dot-book {
    transform: scale(1.4);
    box-shadow: 0 0 12px #a78bfa;
    background: #ffffff;
  }

  .quote-type-label {
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.4);
    color: #a78bfa;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 9.5px;
    font-weight: 950 !important;
    letter-spacing: 0.08em;
  }

  .quote-type-label.type-imported {
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.4);
    color: #00ffff;
  }

  .meta-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .quote-date {
    font-size: 11px;
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.5);
  }

  .delete-btn {
    position: relative;
    background: linear-gradient(135deg, #ff2d55 0%, #b91c1c 100%);
    border: none;
    color: #ffffff;
    font-size: 10px;
    font-weight: 950 !important;
    padding: 4px 12px;
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 3px 8px rgba(255, 45, 85, 0.35);
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -60%;
    width: 30%;
    height: 200%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(30deg);
    animation: button-shimmer 2.5s infinite linear;
  }

  @keyframes button-shimmer {
    0% { left: -60%; }
    100% { left: 140%; }
  }

  .delete-btn:hover {
    transform: scale(1.06);
    box-shadow: 0 5px 15px rgba(255, 45, 85, 0.6);
  }

  .delete-btn:active {
    transform: scale(0.95);
  }

  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* DELETE CONFIRM MODAL */
  .delete-confirm-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(2, 2, 5, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 400000;
    backdrop-filter: blur(20px);
    border-radius: 34px;
  }

  .delete-confirm-card {
    width: 90%;
    max-width: 760px;
    min-height: 380px;
    background: linear-gradient(160deg, #0f0508 0%, #030102 100%);
    border: 2.5px solid #ff2d55;
    border-radius: 32px;
    box-shadow: 
      0 0 60px rgba(255, 45, 85, 0.4),
      inset 0 0 35px rgba(255, 45, 85, 0.12),
      0 35px 80px rgba(0, 0, 0, 0.99);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .danger-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    background: rgba(255, 45, 85, 0.06);
    border-bottom: 1.5px solid rgba(255, 45, 85, 0.2);
  }

  .danger-led {
    width: 14px;
    height: 14px;
    background: #ff2d55;
    border-radius: 50%;
    box-shadow: 0 0 16px #ff2d55;
    animation: led-pulse-danger 1.5s infinite ease-in-out;
  }

  @keyframes led-pulse-danger {
    0% { background: #ff2d55; box-shadow: 0 0 10px #ff2d55; }
    50% { background: #00f2ff; box-shadow: 0 0 20px #00f2ff; }
    100% { background: #a78bfa; box-shadow: 0 0 14px #a78bfa; }
  }

  .danger-title {
    font-size: 26px;
    font-weight: 950 !important;
    letter-spacing: 0.18em;
    color: #ff2d55;
    text-shadow: 0 0 12px rgba(255, 45, 85, 0.45);
  }

  .danger-body {
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    line-height: 1.6;
  }

  .confirm-question {
    font-weight: 950 !important;
    font-size: 20px;
    color: #ffffff;
    margin: 0;
    text-shadow: 0 0 12px rgba(255, 45, 85, 0.25);
    line-height: 1.5;
  }

  .target-preview {
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid rgba(255, 45, 85, 0.25);
    border-radius: 16px;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .preview-text {
    margin: 0;
    font-size: 19px;
    font-weight: 900;
    line-height: 1.7;
    color: #ffffff;
    font-style: italic;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
  }

  .preview-source-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
    border-top: 1px dashed rgba(255, 45, 85, 0.15);
    padding-top: 16px;
  }

  .preview-label {
    font-size: 13px;
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.1em;
  }

  .source-details {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
  }

  .source-item {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .source-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .dot-author {
    background: #00f2ff;
    box-shadow: 0 0 8px #00f2ff;
  }

  .dot-book {
    background: #a78bfa;
    box-shadow: 0 0 8px #a78bfa;
  }

  .preview-author {
    color: #00f2ff;
    text-shadow: 0 0 8px rgba(0, 242, 255, 0.25);
    font-weight: 950 !important;
    font-size: 18px;
    letter-spacing: 0.02em;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .preview-book {
    color: #a78bfa;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.25);
    font-weight: 950 !important;
    font-size: 18px;
    letter-spacing: 0.02em;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  /* Hover states */
  .source-item.author-item:hover .preview-author {
    color: #ffffff;
    text-shadow: 0 0 16px #00f2ff;
    transform: scale(1.05);
  }

  .source-item.author-item:hover .dot-author {
    transform: scale(1.4);
    box-shadow: 0 0 16px #00f2ff;
    background: #ffffff;
  }

  .source-item.book-item:hover .preview-book {
    color: #ffffff;
    text-shadow: 0 0 16px #a78bfa;
    transform: scale(1.05);
  }

  .source-item.book-item:hover .dot-book {
    transform: scale(1.4);
    box-shadow: 0 0 16px #a78bfa;
    background: #ffffff;
  }

  .warning-text {
    margin: 0;
    color: #ff2d55;
    font-weight: 950 !important;
    font-size: 13.5px;
    letter-spacing: 0.1em;
    text-shadow: 0 0 8px rgba(255, 45, 85, 0.2);
  }

  .danger-footer {
    display: flex;
    justify-content: flex-end;
    gap: 18px;
    padding: 24px 32px;
    background: rgba(255, 45, 85, 0.03);
    border-top: 1.5px solid rgba(255, 45, 85, 0.15);
  }

  .confirm-btn {
    font-family: 'Outfit', sans-serif;
    font-size: 16px;
    font-weight: 950 !important;
    padding: 14px 32px;
    border-radius: 10px;
    cursor: pointer;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease;
    border: none;
  }

  .confirm-btn.btn-abort {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.75);
  }

  .confirm-btn.btn-abort:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    transform: translateY(-2px);
  }

  .confirm-btn.btn-purge {
    background: linear-gradient(135deg, #ff2d55 0%, #b91c1c 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(255, 45, 85, 0.35);
  }

  .confirm-btn.btn-purge:hover {
    box-shadow: 0 6px 20px rgba(255, 45, 85, 0.65);
    transform: translateY(-2px);
  }

  /* EMPTY STATE */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    color: rgba(255, 255, 255, 0.3);
  }

  .empty-icon {
    font-size: 24px;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.15));
  }

  .empty-text {
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-align: center;
  }
</style>
