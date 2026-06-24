<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';

  interface Props {
    isOpen: boolean;
    activeBook: { name: string; filename: string; author: string };
    quotesList: any[];
    onClose: () => void;
    onSave: (importedQuotes: any[], isOverwrite: boolean) => void;
  }

  let { isOpen, activeBook, quotesList, onClose, onSave } = $props<Props>();

  // Svelte 5 states
  let steps = $state<any[]>([]);
  let activeStepIndex = $state(-1);
  let importSuccess = $state(false);
  let importCompleted = $state(false);
  let hasFailed = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);
  let loadedFileName = $state('');
  let loadedQuotesCount = $state(0);
  let showConfirmMode = $state(false);
  let isProcessing = $state(false);
  let diagnosticLog = $state('');
  let normalizedImportedList = $state<any[]>([]);

  let listViewport: HTMLElement | null = $state(null);

  // Auto-scroll logic
  $effect(() => {
    if (steps.length && listViewport) {
      listViewport.scrollTop = listViewport.scrollHeight;
    }
  });

  const playAudio = (track: string) => {
    AudioEngine.play(track);
  };

  function updateStep(index: number, status: 'idle' | 'pending' | 'success' | 'failed' | 'waiting', text?: string, reason: string = '') {
    if (steps[index]) {
      steps[index].status = status;
      if (text) steps[index].text = text;
      steps[index].reason = reason;
      activeStepIndex = index;
    }
  }

  // Initialize steps
  function initializeSteps() {
    hasFailed = false;
    importSuccess = false;
    importCompleted = false;
    showConfirmMode = false;
    loadedFileName = '';
    loadedQuotesCount = 0;
    diagnosticLog = '';
    normalizedImportedList = [];

    steps = [
      { text: 'PROTOCOL ENGAGED: IMPORT PROTOCOL ACTIVE', status: 'success', type: 'mode', reason: `TARGET DATABASE: ${activeBook.name}` },
      { text: 'Awaiting secure source selection...', status: 'waiting', type: 'folder', reason: '' },
      { text: 'Validating payload schema integrity...', status: 'idle', type: 'shield', reason: '' },
      { text: 'Analyzing database payload structural limits...', status: 'idle', type: 'database', reason: '' },
      { text: 'Ready for integration authorization...', status: 'idle', type: 'sync', reason: '' },
      { text: 'Neural Merge synchronization complete.', status: 'idle', type: 'rocket', reason: '' },
    ];
    activeStepIndex = 1;
  }

  // Handle source file selection
  function handleImportClick() {
    playAudio('ui-click');
    if (fileInputEl) {
      fileInputEl.click();
    }
  }

  // Process selected file
  async function handleFileImport(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    loadedFileName = file.name;
    
    updateStep(1, 'success', `Source Identified: ${loadedFileName}`);
    updateStep(2, 'pending');
    await new Promise(r => setTimeout(r, 600));

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        // Verify JSON parse
        let parsed: any;
        try {
          parsed = JSON.parse(fileContent);
        } catch (jsonErr: any) {
          throw new Error(`MALFORMED JSON PACKET: ${jsonErr.message}`);
        }

        // Schema structure validation
        let count = 0;
        if (Array.isArray(parsed)) {
          count = parsed.length;
        } else if (parsed && typeof parsed === 'object') {
          count = Object.keys(parsed).length;
        } else {
          throw new Error('INVALID ROOT STRUCTURE: Expected a JSON Array or Dictionary Map.');
        }

        if (count === 0) {
          throw new Error('EMPTY MATRIX: Source contains zero records.');
        }

        // Extract and normalize - validate layout strictly
        let list: any[] = [];
        const authorVal = activeBook.author;
        const bookName = activeBook.name;
        const todayStr = new Date().toISOString().split('T')[0];

        if (Array.isArray(parsed)) {
          list = parsed.map((q: any) => {
            if (typeof q === 'string') {
              return {
                text: q,
                author: authorVal,
                book: bookName,
                date: todayStr,
                type: 'imported' as const
              };
            }
            if (!q.text && !q.quote) {
              throw new Error("SCHEMA INTEGRITY FAULT: Record does not contain required text or quote fields.");
            }
            return {
              text: q.text || q.quote || '',
              author: q.author || q.authorName || authorVal,
              book: q.book || q.bookName || bookName,
              date: todayStr,
              type: 'imported' as const
            };
          });
        } else if (parsed && typeof parsed === 'object') {
          list = Object.entries(parsed).map(([key, val]: [string, any]) => {
            if (typeof val === 'string') {
              return {
                text: val,
                author: authorVal,
                book: bookName,
                date: todayStr,
                type: 'imported' as const
              };
            }
            if (!val.text && !val.quote) {
              throw new Error("SCHEMA INTEGRITY FAULT: Record does not contain required text or quote fields.");
            }
            return {
              text: val.text || val.quote || '',
              author: val.author || val.authorName || authorVal,
              book: val.book || val.bookName || bookName,
              date: todayStr,
              type: 'imported' as const
            };
          });
        }

        normalizedImportedList = list;
        loadedQuotesCount = count;

        updateStep(2, 'success', 'Schema Integrity validated successfully.');
        updateStep(3, 'pending');
        await new Promise(r => setTimeout(r, 600));

        updateStep(3, 'success', `Payload Analyzed: ${count} Wisdom records decoded.`);
        updateStep(4, 'pending');
        
        // Show confirmation popup
        showConfirmMode = true;
      } catch (err: any) {
        updateStep(activeStepIndex, 'failed', undefined, err.message);
        diagnosticLog = `DIAGNOSTIC SIGNAL INTERRUPT:\n${err.message}\n\nPlease check that the file is a valid JSON quote structure export.`;
        hasFailed = true;
        playAudio('error');
      }
    };
    reader.readAsText(file);
    input.value = ''; // Reset input element
  }

  // Finalize imported data and integrate - ALWAYS MERGE logic now
  async function authorizeIntegration() {
    try {
      isProcessing = true;
      showConfirmMode = false;
      playAudio('ui-click');

      updateStep(4, 'success', `Authorization: MERGE PROTOCOL DEPLOYED`);
      updateStep(5, 'pending');
      await new Promise(r => setTimeout(r, 1000));

      onSave(normalizedImportedList, false);

      updateStep(5, 'success', `Neural synchronization finished: ${loadedQuotesCount} elements merged.`);
      importSuccess = true;
      importCompleted = true;
      playAudio('success');
    } catch (e: any) {
      updateStep(5, 'failed', undefined, `INTEGRATION FAULT: ${e.message}`);
      diagnosticLog = `INTEGRATION FAULT EXCEPTION:\n${e.stack || e.message}`;
      hasFailed = true;
      playAudio('error');
    } finally {
      isProcessing = false;
    }
  }

  function handleAbort() {
    playAudio('ui-click');
    showConfirmMode = false;
    hasFailed = true;
    updateStep(activeStepIndex, 'failed', undefined, 'SYNC ABORTED BY OPERATOR');
  }

  function handleClose() {
    playAudio('ui-click');
    onClose();
  }

  $effect(() => {
    if (isOpen) {
      initializeSteps();
    }
  });
</script>

{#if isOpen}
  <div class="station-overlay" transition:fade={{ duration: 250 }}>
    <div class="station-ambient-glow"></div>

    <div class="station-container font-mono" transition:scale={{ duration: 300, start: 0.96, opacity: 0 }}>
      
      <header class="header-section">
        <div class="header-left">
          <div class="status-core-indicator" 
            class:state-success={importSuccess} 
            class:state-failed={hasFailed}
            class:state-active={!importCompleted && !hasFailed}
          >
            <svg class="core-svg" width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2" class="rotator"/>
              <path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div class="core-glow"></div>
          </div>
          <div class="station-titles">
            <span class="eyebrow font-outfit">INTELLIGENCE SYNC CHANNEL</span>
            <h1 class="title font-outfit">WISDOM INGESTION LINK</h1>
          </div>
        </div>

        <button class="kinetic-red-btn font-outfit" onclick={importCompleted || hasFailed ? handleClose : handleAbort}>
          {#if importCompleted || hasFailed}
            EXIT CHANNEL
          {:else}
            ABORT CHANNEL
          {/if}
        </button>
      </header>

      <div class="separator-line"></div>

      <div class="main-body-layout">
        <!-- Main workflow step console -->
        <main class="steps-viewport" bind:this={listViewport}>
          <div class="steps-list">
            {#each steps as step, i}
              {#if step.status !== 'idle'}
                <div 
                  class="step-row" 
                  class:row-pending={step.status === 'pending'}
                  class:row-waiting={step.status === 'waiting'}
                  class:row-success={step.status === 'success'}
                  class:row-failed={step.status === 'failed'}
                  class:mode-active={step.type === 'mode'}
                  transition:fly={{ y: 15, duration: 250 }}
                >
                  <div class="accent-bar"></div>
                  <div class="step-icon">
                    {#if step.type === 'mode'}
                      <span class="icon-glyph">👑</span>
                    {:else if step.type === 'folder'}
                      <span class="icon-glyph">📂</span>
                    {:else if step.type === 'shield'}
                      <span class="icon-glyph">🛡️</span>
                    {:else if step.type === 'database'}
                      <span class="icon-glyph">💾</span>
                    {:else if step.type === 'sync'}
                      <span class="icon-glyph">⚙️</span>
                    {:else if step.type === 'rocket'}
                      <span class="icon-glyph">🚀</span>
                    {/if}
                  </div>
                  <div class="step-text-block">
                    <span class="step-title font-outfit">{step.text}</span>
                    {#if step.reason}
                      <span class="step-reason">{step.reason}</span>
                    {/if}
                  </div>
                  <div class="step-status">
                    {#if step.status === 'success'}
                      <span class="badge success">VALID</span>
                    {:else if step.status === 'failed'}
                      <span class="badge failed">FAULT</span>
                    {:else if step.status === 'waiting'}
                      <span class="badge waiting">AWAITING</span>
                    {:else}
                      <span class="badge active-spin">RUNNING</span>
                    {/if}
                  </div>
                </div>
              {/if}
            {/each}
          </div>

          {#if hasFailed && diagnosticLog}
            <div class="diagnostic-console" transition:fade={{ duration: 200 }}>
              <div class="console-header font-outfit">CRITICAL EXCEPTION DIAGNOSTICS</div>
              <pre class="console-body">{diagnosticLog}</pre>
            </div>
          {/if}
        </main>

        <!-- Initial action button when awaiting selection -->
        {#if !importCompleted && !hasFailed && steps[1] && steps[1].status === 'waiting'}
          <div class="selection-trigger-wrapper" transition:fade>
            <p class="instruction-text font-outfit">CHOOSE LOCAL INTELLIGENCE DATA PACKET (.JSON) TO BEGIN PROTOCOL</p>
            <button class="select-btn font-outfit" onclick={handleImportClick}>
              SELECT SOURCE DATABASE JSON
            </button>
            <input 
              type="file" 
              accept=".json" 
              bind:this={fileInputEl} 
              onchange={handleFileImport} 
              style="display: none;" 
            />
          </div>
        {/if}

      </div>

      <div class="separator-line"></div>

      <!-- Footer displaying stats and action control -->
      <footer class="footer-section">
        <div class="stats-matrix">
          <div class="matrix-item">
            <span class="matrix-lbl">CURRENT INDEX SIZE</span>
            <span class="matrix-val font-mono">{quotesList.length}</span>
          </div>
          {#if loadedQuotesCount > 0}
            <div class="matrix-item">
              <span class="matrix-lbl">INCOMING DATA</span>
              <span class="matrix-val font-mono text-cyan">+{loadedQuotesCount}</span>
            </div>
          {/if}
        </div>
      </footer>

      <!-- Full Pane Confirmation Dialog (covers entire station-container including header and footer) -->
      {#if showConfirmMode}
        <div class="crystal-modal-overlay" transition:fade={{ duration: 200 }}>
          <div class="crystal-dialog font-outfit" transition:scale={{ duration: 300, start: 0.98 }}>
            <div class="dialog-glow"></div>
            
            <header class="dialog-header">
              <h2 class="dialog-title">AUTHORIZE INTEGRATION</h2>
            </header>

            <div class="dialog-body">
              <p class="dialog-desc">{loadedQuotesCount} WISDOM RECORD PACKETS READY TO MERGE.</p>
              
              <div class="import-preview-list">
                {#each normalizedImportedList as item}
                  <div class="import-preview-item">
                    <p class="preview-text">“{item.text.replace(/[_/]/g, ' ')}”</p>
                    <div class="preview-meta">
                      <span class="preview-dot dot-author"></span>
                      <span class="preview-author">{item.author.replace(/[_/]/g, ' ')}</span>
                      <span class="preview-dot dot-book"></span>
                      <span class="preview-book">{item.book.replace(/[_/]/g, ' ')}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="dialog-actions">
              <button class="action-choice-btn choice-merge" onclick={authorizeIntegration}>
                COMMIT
              </button>
              <button class="dialog-abort-btn" onclick={handleAbort}>
                ABORT
              </button>
            </div>
          </div>
        </div>
      {/if}

    </div>
  </div>
{/if}

<style>
  .station-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(2, 2, 5, 0.95);
    display: flex; align-items: center; justify-content: center;
    z-index: 300000;
    backdrop-filter: blur(25px);
  }

  .station-ambient-glow {
    position: absolute;
    width: 100%; height: 100%;
    background: 
      radial-gradient(circle at 15% 15%, rgba(139, 92, 246, 0.15) 0%, transparent 45%),
      radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.12) 0%, transparent 45%);
    pointer-events: none;
  }

  .station-container {
    width: 980px;
    height: 640px;
    background: linear-gradient(165deg, #090a12 0%, #020204 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.45);
    border-radius: 32px;
    padding: 30px 42px;
    display: flex;
    flex-direction: column;
    box-shadow: 
      0 30px 80px rgba(0, 0, 0, 0.95),
      0 0 40px rgba(139, 92, 246, 0.15);
    position: relative;
    overflow: hidden;
  }

  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .status-core-indicator {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: transform 0.3s ease, filter 0.3s ease;
  }

  .status-core-indicator:hover {
    transform: scale(1.12);
    filter: drop-shadow(0 0 12px currentColor);
  }

  .core-svg {
    filter: drop-shadow(0 0 6px currentColor);
  }

  .rotator {
    animation: spin 8s linear infinite;
    transform-origin: center;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .state-active { color: #8b5cf6; border-color: rgba(139, 92, 246, 0.4); }
  .state-success { color: #06b6d4; border-color: rgba(6, 182, 212, 0.4); }
  .state-failed { color: #ff2d55; border-color: rgba(255, 45, 85, 0.4); }

  .station-titles {
    display: flex;
    flex-direction: column;
  }

  .eyebrow {
    font-size: 9px;
    font-weight: 950;
    color: #8b5cf6;
    letter-spacing: 3px;
  }

  .title {
    font-size: 20px;
    font-weight: 950;
    margin: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #ffffff, #8b5cf6, #00f2ff, #ffffff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop-import 5s linear infinite;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  @keyframes chroma-loop-import {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .kinetic-red-btn {
    height: 38px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #ff2d55 0%, #b91c1c 100%);
    color: #ffffff;
    font-size: 11px;
    font-weight: 950;
    padding: 0 18px;
    letter-spacing: 0.1em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(255, 45, 85, 0.35);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .kinetic-red-btn::after {
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
    animation: button-shimmer-import 2.5s infinite linear;
  }

  @keyframes button-shimmer-import {
    0% { left: -60%; }
    100% { left: 140%; }
  }

  .kinetic-red-btn:hover {
    box-shadow: 0 6px 18px rgba(255, 45, 85, 0.6);
    transform: scale(1.03);
  }

  .separator-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
    margin: 16px 0;
  }

  .main-body-layout {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .steps-viewport {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .steps-viewport::-webkit-scrollbar {
    width: 4px;
  }

  .steps-viewport::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 9999px;
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .step-row {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 20px; /* More rounded corner */
    padding: 14px 22px 14px 28px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s ease;
    position: relative;
  }

  .accent-bar {
    position: absolute;
    left: 8px; /* Push vertical lighting colorful line inside card */
    top: 8px;
    bottom: 8px;
    width: 4px;
    background: transparent;
    border-radius: 4px;
  }

  .row-success .accent-bar { background: #06b6d4; box-shadow: 0 0 8px #06b6d4; }
  .row-failed .accent-bar { background: #ff2d55; box-shadow: 0 0 8px #ff2d55; }
  .row-waiting .accent-bar { background: #eab308; box-shadow: 0 0 8px #eab308; }
  .row-pending .accent-bar { background: #8b5cf6; box-shadow: 0 0 8px #8b5cf6; }

  .step-icon {
    font-size: 18px;
  }

  .step-text-block {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .step-title {
    font-size: 15px; /* Slightly increased step row title text size */
    color: rgba(255, 255, 255, 0.85);
    font-weight: 950 !important;
  }

  .step-reason {
    font-size: 11px; /* Slightly increased step row reason text size */
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.05em;
  }

  .badge {
    font-size: 10px; /* Slightly increased step row badge text size */
    font-weight: 950;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 9999px;
  }

  .badge.success { background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); }
  .badge.failed { background: rgba(255, 45, 85, 0.15); color: #ff2d55; border: 1px solid rgba(255, 45, 85, 0.3); }
  .badge.waiting { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }
  .badge.active-spin { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }

  .mode-active {
    background: rgba(139, 92, 246, 0.05);
    border-color: rgba(139, 92, 246, 0.25);
  }

  .selection-trigger-wrapper {
    margin-top: 16px;
    padding: 28px;
    border: 1px dashed rgba(139, 92, 246, 0.25);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }

  .instruction-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 0.1em;
    margin: 0;
  }

  .select-btn {
    height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(139, 92, 246, 0.4);
    background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 950;
    padding: 0 28px;
    letter-spacing: 0.08em;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .select-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }

  .diagnostic-console {
    background: rgba(255, 45, 85, 0.04);
    border: 1px solid rgba(255, 45, 85, 0.25);
    border-radius: 16px;
    padding: 18px;
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: inset 0 0 15px rgba(255, 45, 85, 0.05);
  }

  .console-header {
    font-size: 11px;
    font-weight: 950;
    color: #ff2d55;
    letter-spacing: 0.08em;
  }

  .console-body {
    font-family: inherit;
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.5;
  }

  /* CRYSTAL MODAL CONFIRM DIALOG - FULL SCREEN MAP OF THE MODAL size */
  .crystal-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0b14;
    z-index: 1000;
    border-radius: 30px; /* Sits cleanly inside parent's 32px rounded border */
    overflow: hidden;
  }

  .crystal-dialog {
    width: 100%;
    height: 100%;
    padding: 30px 42px; /* Matches parent container padding */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
    position: relative;
    background: transparent;
    border: none;
  }

  .dialog-glow {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.15);
    border-radius: 30px;
  }

  .dialog-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dialog-title {
    font-size: 24px;
    font-weight: 950;
    color: #ffffff;
    margin: 0;
    letter-spacing: 1.5px;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  }

  .dialog-body {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13.5px;
    line-height: 1.6;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin: 20px 0;
  }

  .dialog-desc {
    margin: 0;
    font-size: 15px;
    font-weight: 850;
    color: rgba(255, 255, 255, 0.85);
  }

  /* PREVIEW LIST (Much taller to fit full modal height) */
  .import-preview-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(139, 92, 246, 0.3) rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 20px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
    text-align: left;
  }

  .import-preview-list::-webkit-scrollbar {
    width: 4px;
  }
  .import-preview-list::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 9999px;
  }

  .import-preview-item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 10px;
  }
  .import-preview-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .preview-text {
    margin: 0 0 6px 0;
    font-size: 14.5px;
    line-height: 1.6;
    color: #ffffff;
    font-style: italic;
  }

  .preview-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
  }

  .preview-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  .preview-dot.dot-author {
    background: #00f2ff;
    box-shadow: 0 0 4px #00f2ff;
  }
  .preview-dot.dot-book {
    background: #a78bfa;
    box-shadow: 0 0 4px #a78bfa;
  }

  .preview-author {
    color: #00f2ff;
    font-weight: 850;
  }

  .preview-book {
    color: #a78bfa;
    font-weight: 850;
  }

  .dialog-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 14px;
  }

  .action-choice-btn {
    height: 50px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    font-size: 14px;
    font-weight: 950;
    text-transform: uppercase;
    border: none;
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
  }
  .action-choice-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.55);
  }

  .dialog-abort-btn {
    height: 50px;
    background: linear-gradient(135deg, #ff2d55 0%, #b91c1c 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(255, 45, 85, 0.35);
    border-radius: 12px;
    border: none;
    font-size: 14px;
    font-weight: 950;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
  }

  .dialog-abort-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(255, 45, 85, 0.55);
  }

  /* FOOTER */
  .footer-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stats-matrix {
    display: flex;
    gap: 32px;
  }

  .matrix-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .matrix-lbl {
    font-size: 8.5px;
    font-weight: 950;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
  }

  .matrix-val {
    font-size: 20px;
    font-weight: 950;
    color: #ffffff;
    line-height: 1;
  }

  .text-cyan {
    color: #06b6d4;
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
  }

  .font-outfit { font-family: 'Outfit', sans-serif; }
</style>
