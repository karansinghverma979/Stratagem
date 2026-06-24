<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';
  import { onMount, tick } from 'svelte';
  import { triggerShield } from '../../../core/shield-store.js';
  import { addNotification } from '../../../core/store';

  let { taskId, taskTitle, onClose, onSave, onSaveFinished, overCalibration = false, readOnly = false } = $props<{
    taskId: number;
    taskTitle: string;
    onClose: () => void;
    onSave?: () => void;
    onSaveFinished?: () => void;
    overCalibration?: boolean;
    readOnly?: boolean;
  }>();

  const triggerSaveCallback = () => {
    if (onSave) onSave();
    if (onSaveFinished) onSaveFinished();
  };

  let mode = $state<'view' | 'edit'>('view');
  let rawText = $state('');
  let editBuffer = $state('');

  const warnReadOnly = () => {
    AudioEngine.play('alarm_warning');
    triggerShield('ACCESS DENIED', 'WARNING', 3000);
    addNotification('ACCESS RESTRICTED', 'CANNOT EDIT INTEL - RECORD IS ARCHIVED', 'error');
  };
  let isSaving = $state(false);
  let isLoading = $state(true);
  let savedFlash = $state(false);
  let wordCount = $derived(rawText.trim() ? rawText.trim().split(/\s+/).length : 0);
  let charCount = $derived(rawText.length);

  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let mirrorContainer = $state<HTMLDivElement | null>(null);
  let lineHeights = $state<number[]>([]);

  // ─── Markdown Parser ────────────────────────────────────
  function parseMarkdown(md: string): string {
    if (!md || !md.trim()) {
      return `<div class="md-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>No intel logged. Switch to <strong>EDIT</strong> mode to begin planning.</p>
      </div>`;
    }

    let h = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced code blocks
    h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="md-pre"><code class="md-code${lang ? ` lang-${lang}` : ''}">${code.trimEnd()}</code></pre>`
    );
    h = h.replace(/```([\s\S]*?)```/g, (_, code) =>
      `<pre class="md-pre"><code class="md-code">${code.trimEnd()}</code></pre>`
    );

    // Horizontal rule
    h = h.replace(/^---+$/gm, '<hr class="md-hr">');

    // Blockquote
    h = h.replace(/^&gt; ?(.*)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

    // Checkboxes
    let checkboxCount = 0;
    h = h.replace(/^- \[( |x)\] (.+)$/gim, (match, checked, label) => {
      const isChecked = checked.toLowerCase() === 'x';
      const idx = checkboxCount++;
      return `<div class="md-check${isChecked ? ' done' : ''}" data-cb-idx="${idx}"><span class="cb">${isChecked ? '✓' : ''}</span><span class="cb-text${isChecked ? ' done-text' : ''}">${label}</span></div>`;
    });

    // Headers
    h = h.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

    // Unordered list items
    h = h.replace(/^[*-] (.+)$/gm, '<li class="md-li">$1</li>');
    h = h.replace(/(<li class="md-li">.*<\/li>\n?)+/g, (m) => `<ul class="md-ul">${m}</ul>`);

    // Ordered list
    h = h.replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>');
    h = h.replace(/(<li class="md-oli">.*<\/li>\n?)+/g, (m) => `<ol class="md-ol">${m}</ol>`);

    // Inline: bold, italic, inline code, strikethrough
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/~~(.+?)~~/g, '<del class="md-del">$1</del>');
    h = h.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

    // Highlight ==text==
    h = h.replace(/==(.+?)==/g, '<mark class="md-mark">$1</mark>');

    // Wrap remaining lines in paragraphs (not already block-level)
    const blockPattern = /^<(h[1-6]|ul|ol|li|pre|blockquote|div|hr)/;
    h = h.split('\n').map(line => {
      if (!line.trim()) return '<div class="md-spacer"></div>';
      if (blockPattern.test(line.trim())) return line;
      return `<p class="md-p">${line}</p>`;
    }).join('\n');

    return h;
  }

  let renderedHtml = $derived(parseMarkdown(rawText));

  // ─── Line Height Tracking (for Text Wrapping) ────────────
  const updateLineHeights = () => {
    if (!mirrorContainer) return;
    const children = mirrorContainer.children;
    const heights: number[] = [];
    for (let i = 0; i < children.length; i++) {
      heights.push((children[i] as HTMLElement).offsetHeight);
    }
    lineHeights = heights;
  };

  // Keep line heights updated on mode / text edits
  $effect(() => {
    if (editBuffer !== undefined && mode === 'edit') {
      tick().then(updateLineHeights);
    }
  });

  let resizeObserver = $state<ResizeObserver | null>(null);

  // Checkbox Toggle in View Mode
  const toggleCheckbox = async (idx: number) => {
    const lines = rawText.split('\n');
    let count = 0;
    let insideCodeBlock = false;
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
      }
      if (!insideCodeBlock && /^- \[( |x)\]/i.test(line)) {
        if (count === idx) {
          const isChecked = line.match(/^- \[(x)\]/i) !== null;
          const replacement = isChecked ? '- [ ]' : '- [x]';
          lines[i] = line.replace(/^- \[( |x)\]/i, replacement);
          changed = true;
          break;
        }
        count++;
      }
    }

    if (changed) {
      const newText = lines.join('\n');
      rawText = newText;
      editBuffer = newText;
      AudioEngine.play('ui-click');
      if (!readOnly) {
        try {
          await window.stratagemAPI.writeNote(taskId, editBuffer);
          triggerSaveCallback();
        } catch (e) {
          console.error('[Strategize] Auto-save checkbox failed:', e);
        }
      }
    }
  };

  const handleViewClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const checkEl = target.closest('.md-check');
    if (checkEl) {
      const idxAttr = checkEl.getAttribute('data-cb-idx');
      if (idxAttr !== null) {
        const idx = parseInt(idxAttr, 10);
        if (readOnly) {
          warnReadOnly();
        } else {
          toggleCheckbox(idx);
        }
      }
    }
  };

  // ─── Load ────────────────────────────────────────────────
  onMount(async () => {
    try {
      const exists = await window.stratagemAPI.checkNoteExists(taskId);
      if (exists) {
        rawText = await window.stratagemAPI.readNote(taskId, taskTitle);
        AudioEngine.play('data-decode');
      } else {
        if (!readOnly) {
          // Create the empty file when opened for the first time
          await window.stratagemAPI.writeNote(taskId, '');
          AudioEngine.play('data-lock');
          triggerSaveCallback();
        }
        rawText = '';
      }
    } catch (e) {
      rawText = '';
    }
    editBuffer = rawText;
    isLoading = false;

    // Observe textarea container to update heights on width/layout shifts
    const checkTextarea = setInterval(() => {
      if (textareaEl) {
        clearInterval(checkTextarea);
        resizeObserver = new ResizeObserver(() => {
          updateLineHeights();
        });
        resizeObserver.observe(textareaEl);
        updateLineHeights();
      }
    }, 100);

    return () => {
      clearInterval(checkTextarea);
      if (resizeObserver) resizeObserver.disconnect();
    };
  });

  // ─── Actions ─────────────────────────────────────────────
  const switchToEdit = () => {
    if (readOnly) {
      warnReadOnly();
      return;
    }
    editBuffer = rawText;
    mode = 'edit';
    AudioEngine.play('ui-click');
  };

  const switchToView = () => {
    rawText = editBuffer;
    mode = 'view';
    AudioEngine.play('ui-click');
  };

  const save = async () => {
    if (isSaving) return;
    isSaving = true;
    rawText = editBuffer;
    AudioEngine.play('ui-click');
    try {
      await window.stratagemAPI.writeNote(taskId, editBuffer);
      AudioEngine.play('data-lock');
      savedFlash = true;
      triggerSaveCallback();
      setTimeout(() => { savedFlash = false; }, 2000);
    } catch (e) {
      console.error('[Strategize] Save failed:', e);
    }
    isSaving = false;
  };

  let lineNumbersDiv = $state<HTMLDivElement | null>(null);
  let linesArray = $derived(editBuffer.split('\n'));

  const handleScroll = (e: Event) => {
    const ta = e.target as HTMLTextAreaElement;
    if (lineNumbersDiv) {
      lineNumbersDiv.scrollTop = ta.scrollTop;
    }
  };

  const handleEditorKeydown = (e: KeyboardEvent) => {
    const PAIRS: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    const char = e.key;

    // 1. Enter key: Obsidian-style auto list or bulleting
    if (e.key === 'Enter') {
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const val = editBuffer;

      // Find the start of the current line
      const lastNewLine = val.lastIndexOf('\n', start - 1);
      const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
      const currentLine = val.substring(lineStart, start);

      const todoMatch = currentLine.match(/^(-\s+\[( |x)\]\s*)/i);
      const bulletMatch = currentLine.match(/^(([-*])\s+)/);
      const numberMatch = currentLine.match(/^(\d+)\.\s+/);

      if (todoMatch) {
        e.preventDefault();
        if (currentLine.trim() === '- [ ]' || currentLine.trim() === '- [x]') {
          // Empty checkbox line: erase to exit list mode
          editBuffer = val.substring(0, lineStart) + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
        } else {
          // Auto-insert next checkbox
          const insertText = '\n- [ ] ';
          editBuffer = val.substring(0, start) + insertText + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insertText.length; }, 0);
        }
        return;
      }

      if (bulletMatch) {
        e.preventDefault();
        const symbol = bulletMatch[2];
        if (currentLine.trim() === symbol) {
          // Empty bullet line: erase to exit list mode
          editBuffer = val.substring(0, lineStart) + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
        } else {
          // Auto-insert next bullet
          const insertText = `\n${symbol} `;
          editBuffer = val.substring(0, start) + insertText + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insertText.length; }, 0);
        }
        return;
      }

      if (numberMatch) {
        e.preventDefault();
        const num = parseInt(numberMatch[1], 10);
        if (currentLine.trim() === `${num}.`) {
          // Empty number line: erase to exit list mode
          editBuffer = val.substring(0, lineStart) + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = lineStart; }, 0);
        } else {
          // Auto-insert incremented number list item
          const insertText = `\n${num + 1}. `;
          editBuffer = val.substring(0, start) + insertText + val.substring(start);
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insertText.length; }, 0);
        }
        return;
      }
    }

    // 2. Ctrl+Enter: Obsidian-style todo/checkbox toggles
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const val = editBuffer;

      // Find start and end of the current line
      const lastNewLine = val.lastIndexOf('\n', start - 1);
      const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
      const nextNewLine = val.indexOf('\n', start);
      const lineEnd = nextNewLine === -1 ? val.length : nextNewLine;

      const currentLine = val.substring(lineStart, lineEnd);

      let newLine = '';
      if (currentLine.match(/^-\s+\[\s\]\s/)) {
        newLine = currentLine.replace(/^-\s+\[\s\]\s/, '- [x] ');
      } else if (currentLine.match(/^-\s+\[x\]\s/i)) {
        newLine = currentLine.replace(/^-\s+\[x\]\s/i, '');
      } else if (currentLine.match(/^([-*])\s/)) {
        newLine = currentLine.replace(/^([-*])\s/, '- [ ] ');
      } else {
        newLine = '- [ ] ' + currentLine;
      }

      editBuffer = val.substring(0, lineStart) + newLine + val.substring(lineEnd);

      const diff = newLine.length - currentLine.length;
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + diff;
      }, 0);
      return;
    }

    // 3. Ctrl+H: toggle headings (H1 -> H2 -> H3 -> normal)
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const val = editBuffer;

      // Find start and end of the current line
      const lastNewLine = val.lastIndexOf('\n', start - 1);
      const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
      const nextNewLine = val.indexOf('\n', start);
      const lineEnd = nextNewLine === -1 ? val.length : nextNewLine;

      const currentLine = val.substring(lineStart, lineEnd);

      let newLine = '';
      if (currentLine.startsWith('# ')) {
        newLine = '## ' + currentLine.substring(2);
      } else if (currentLine.startsWith('## ')) {
        newLine = '### ' + currentLine.substring(3);
      } else if (currentLine.startsWith('### ')) {
        newLine = currentLine.substring(4);
      } else {
        newLine = '# ' + currentLine;
      }

      editBuffer = val.substring(0, lineStart) + newLine + val.substring(lineEnd);

      const diff = newLine.length - currentLine.length;
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + diff;
      }, 0);
      return;
    }

    // Auto-pairing insertion
    if (PAIRS[char] !== undefined) {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const closingChar = PAIRS[char];

      const selectedText = editBuffer.substring(start, end);
      const replacement = char + selectedText + closingChar;

      editBuffer = editBuffer.substring(0, start) + replacement + editBuffer.substring(end);

      setTimeout(() => {
        ta.selectionStart = start + 1;
        ta.selectionEnd = start + 1 + selectedText.length;
      }, 0);
      return;
    }

    // Skip typing closing character if next character is already the closing character
    if ([')', ']', '}', '"', "'", '`'].includes(char)) {
      const ta = e.target as HTMLTextAreaElement;
      const pos = ta.selectionStart;
      if (editBuffer.charAt(pos) === char) {
        e.preventDefault();
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = pos + 1;
        }, 0);
        return;
      }
    }

    // Backspace auto-delete pair
    if (e.key === 'Backspace') {
      const ta = e.target as HTMLTextAreaElement;
      const pos = ta.selectionStart;
      const end = ta.selectionEnd;
      if (pos === end && pos > 0) {
        const charBefore = editBuffer.charAt(pos - 1);
        const charAfter = editBuffer.charAt(pos);
        if (PAIRS[charBefore] === charAfter) {
          e.preventDefault();
          editBuffer = editBuffer.substring(0, pos - 1) + editBuffer.substring(pos + 1);
          setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = pos - 1;
          }, 0);
          return;
        }
      }
    }

    // Pass keyboard shortcut actions up to global handler
    handleKeydown(e);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { handleClose(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (readOnly) {
        warnReadOnly();
      } else {
        save();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); mode === 'edit' ? switchToView() : switchToEdit(); return; }
    // Tab → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      editBuffer = editBuffer.substring(0, start) + '  ' + editBuffer.substring(end);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  };

  const handleClose = () => {
    AudioEngine.play('ui-click');
    onClose();
  };

  // Ultra-smooth cubic-out easing curve (no flat feel)
  const premiumOutCurve = (t: number) => {
    const t1 = t - 1;
    return t1 * t1 * t1 + 1;
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="modal-backdrop"
  class:over-calibration={overCalibration}
  onclick={handleClose}
  onkeydown={handleKeydown}
  transition:fade={{ duration: 240 }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-window"
    onclick={(e) => e.stopPropagation()}
    transition:fly={{ y: 60, duration: 420, easing: premiumOutCurve, opacity: 0 }}
  >

    <!-- ─── Top Bar ─── -->
    <div class="modal-topbar">
      <div class="topbar-left">
        <div class="modal-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div class="modal-title-block">
          <span class="modal-label">INTEL FILE</span>
          <h2 class="modal-title">{taskTitle}</h2>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Stats -->
        <div class="file-stats">
          <span class="stat">{wordCount} words</span>
          <span class="stat-divider">·</span>
          <span class="stat">{charCount} chars</span>
        </div>

        <!-- Mode toggle -->
        <div class="mode-toggle">
          <button
            class="mode-btn"
            class:active={mode === 'view'}
            onclick={switchToView}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            VIEW
          </button>
          <button
            class="mode-btn"
            class:active={mode === 'edit'}
            class:mode-btn-readonly={readOnly}
            onclick={switchToEdit}
            title={readOnly ? "EDIT MODE LOCKED - RECORD ARCHIVED" : "SWITCH TO EDIT"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            EDIT
          </button>
        </div>

        {#if mode === 'edit'}
          <button
            class="save-btn"
            class:saving={isSaving}
            class:saved={savedFlash}
            class:btn-readonly={readOnly}
            onclick={() => { if (readOnly) { warnReadOnly(); } else { save(); } }}
            disabled={isSaving && !readOnly}
          >
            {#if isSaving}
              <div class="save-spinner"></div>
              SAVING
            {:else if savedFlash}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
              SAVED
            {:else}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              SAVE {#if !readOnly}<span class="kbd">Ctrl+S</span>{/if}
            {/if}
          </button>
        {/if}

        <!-- Close -->
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ─── Shortcut hint bar ─── -->
    <div class="hint-bar">
      <span class="hint"><kbd>Ctrl+E</kbd> toggle edit</span>
      <span class="hint"><kbd>Ctrl+S</kbd> save</span>
      <span class="hint"><kbd>Ctrl+Enter</kbd> toggle todo</span>
      <span class="hint"><kbd>Ctrl+H</kbd> toggle heading</span>
      <span class="hint"><kbd>Esc</kbd> close</span>
      {#if mode === 'edit'}
        <span class="hint">Supports <strong>**bold**</strong>, <em>*italic*</em>, <code># headers</code>, <code>- lists</code>, <code>```code```</code>, <code>==highlight==</code></span>
      {/if}
    </div>

    <!-- ─── Content Area ─── -->
    <div class="modal-body">
      {#if isLoading}
        <div class="loading-state">
          <div class="load-spinner"></div>
          <span>LOADING INTEL FILE...</span>
        </div>
      {:else if mode === 'view'}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="markdown-view" in:fade={{ duration: 150 }} onclick={handleViewClick}>
          {@html renderedHtml}
        </div>
      {:else}
        <div class="editor-container" in:fade={{ duration: 150 }}>
          <div class="line-numbers" bind:this={lineNumbersDiv}>
            {#each linesArray as _, index}
              <div class="line-number" style="height: {lineHeights[index] ? lineHeights[index] + 'px' : 'auto'}">
                {index + 1}
              </div>
            {/each}
          </div>
          <textarea
            bind:this={textareaEl}
            class="markdown-editor"
            class:editor-readonly={readOnly}
            bind:value={editBuffer}
            onkeydown={(e) => {
              if (readOnly) {
                e.preventDefault();
                warnReadOnly();
                return;
              }
              handleEditorKeydown(e);
            }}
            onclick={() => {
              if (readOnly) {
                warnReadOnly();
              }
            }}
            onscroll={handleScroll}
            placeholder={readOnly ? "NO INTEL LOGGED TO ARCHIVE." : "# Mission Plan\n\n## Objectives\n- [ ] Define scope\n- [ ] Identify resources\n\n## Notes\nWrite your intelligence here..."}
            readonly={readOnly}
            spellcheck={false}
          ></textarea>

          <!-- Hidden mirror container for height calculation -->
          <div bind:this={mirrorContainer} class="editor-mirror" aria-hidden="true">
            {#each linesArray as line}
              <div class="mirror-line">{line || '\n'}</div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  /* ─── Backdrop ─── */
  .modal-backdrop {
    position: fixed;
    top: 80px; /* Offset below top navbar */
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    z-index: 25000;
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    box-sizing: border-box;
    will-change: opacity;
  }

  .modal-backdrop.over-calibration {
    top: 80px;
    height: calc(100vh - 80px);
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  /* ─── Modal window (sized like ExecutionTaskview) ─── */
  .modal-window {
    width: 1184px;
    height: 800px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    border-radius: 48px;
    border: 3px solid rgba(6, 182, 212, 0.65);
    background: linear-gradient(165deg, #0b0722 0%, #010103 100%);
    box-shadow: 
      0 0 350px rgba(0, 0, 0, 1), 
      inset 0 0 100px rgba(6, 182, 212, 0.05);
    overflow: hidden;
    position: relative;
    will-change: transform, opacity;
  }

  /* ─── Top bar ─── */
  .modal-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 36px;
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
    gap: 20px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .modal-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1.5px solid rgba(6, 182, 212, 0.4);
    background: rgba(6, 182, 212, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #06b6d4;
    flex-shrink: 0;
    animation: iconGlowBreathe 3s infinite ease-in-out;
  }

  @keyframes iconGlowBreathe {
    0%, 100% {
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
      border-color: rgba(6, 182, 212, 0.4);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 28px rgba(6, 182, 212, 0.65);
      border-color: rgba(6, 182, 212, 0.85);
      transform: scale(1.05);
    }
  }

  .modal-title-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .modal-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.26em;
    color: rgba(6, 182, 212, 0.7);
    text-transform: uppercase;
  }

  .modal-title {
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 950;
    margin: 0;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: linear-gradient(90deg, #ffffff 0%, #a5f3fc 55%, #06b6d4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.45));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 540px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  /* Stats */
  .file-stats {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.25);
    letter-spacing: 0.06em;
  }
  .stat-divider { color: rgba(255,255,255,0.12); }

  /* Mode toggle */
  .mode-toggle {
    display: flex;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    overflow: hidden;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.35);
    font-family: 'Rajdhani', sans-serif;
    font-size: 11.5px;
    font-weight: 900;
    letter-spacing: 0.12em;
    cursor: pointer;
    outline: none;
    transition: all 0.18s ease;
    text-transform: uppercase;
  }

  .mode-btn:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }

  .mode-btn.active {
    background: rgba(6,182,212,0.15);
    color: #06b6d4;
    text-shadow: 0 0 10px rgba(6,182,212,0.5);
  }

  .mode-btn.mode-btn-readonly {
    opacity: 0.4;
    cursor: not-allowed;
    background: rgba(255, 45, 85, 0.05) !important;
    border-color: rgba(255, 45, 85, 0.2) !important;
    color: rgba(255, 45, 85, 0.6) !important;
  }

  /* Save button */
  .save-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    border-radius: 8px;
    border: 1.5px solid rgba(6,182,212,0.4);
    background: rgba(6,182,212,0.1);
    color: #06b6d4;
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.12em;
    cursor: pointer;
    outline: none;
    transition: all 0.18s ease;
    text-transform: uppercase;
  }

  .save-btn:hover:not(:disabled) {
    background: rgba(6,182,212,0.2);
    border-color: rgba(6,182,212,0.7);
    box-shadow: 0 0 16px rgba(6,182,212,0.3);
  }

  .save-btn.saved {
    border-color: rgba(0,255,159,0.5);
    background: rgba(0,255,159,0.1);
    color: #00ff9f;
    box-shadow: 0 0 14px rgba(0,255,159,0.25);
  }

  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .save-spinner {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 2px solid rgba(6,182,212,0.2);
    border-top-color: #06b6d4;
    animation: spin 0.6s linear infinite;
  }

  .kbd {
    font-size: 9px;
    opacity: 0.55;
    font-family: monospace;
    border: 1px solid rgba(255,255,255,0.15);
    padding: 1px 4px;
    border-radius: 3px;
    margin-left: 2px;
  }

  /* Close button gradient, rotation and shine animation */
  .close-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    padding: 0;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.45) 0%, rgba(6, 182, 212, 0.45) 100%);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
    color: #ffffff;
    cursor: pointer;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, background 0.3s ease;
  }

  .close-btn:hover {
    transform: rotate(90deg);
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(6, 182, 212, 0.6) 100%);
    color: #ffffff;
  }

  /* Slicing light animation (shine reflection effect) */
  .close-btn::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 50%,
      transparent 100%
    );
    transform: skewX(-25deg);
    transition: none;
  }

  .close-btn:hover::after {
    left: 150%;
    transition: left 0.6s ease-in-out;
  }

  /* ─── Hint bar ─── */
  .hint-bar {
    padding: 12px 60px; /* Aligns with 60px left/right borders */
    display: flex;
    align-items: center;
    justify-content: space-between; /* Spans full available width */
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    background: rgba(0,0,0,0.3);
    flex-shrink: 0;
  }

  .hint {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px; /* Increased font size */
    font-weight: 700;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.06em;
  }

  .hint kbd {
    font-family: monospace;
    font-size: 10px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 3px;
    padding: 2px 6px;
    color: rgba(255,255,255,0.55);
  }

  /* ─── Modal body ─── */
  .modal-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 36px; /* Margin at the bottom border of the window */
  }

  /* ─── View mode ─── */
  .markdown-view {
    flex: 1;
    overflow-y: auto;
    padding: 48px 60px;
    scrollbar-width: thin;
    scrollbar-color: rgba(6,182,212,0.2) transparent;
    font-family: 'Outfit', 'Inter', sans-serif;
    color: rgba(255,255,255,0.92);
    line-height: 1.8;
  }

  .markdown-view::-webkit-scrollbar { width: 5px; }
  .markdown-view::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.2); border-radius: 4px; }

  /* ─── Edit mode container ─── */
  .editor-container {
    flex: 1;
    display: flex;
    flex-direction: row;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .line-numbers {
    width: 66px;
    padding: 48px 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.22);
    border-right: 1.5px solid rgba(6, 182, 212, 0.15);
    overflow: hidden;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 22px;
    line-height: 1.75;
    text-align: right;
    padding-right: 16px;
    color: rgba(6, 182, 212, 0.35);
    user-select: none;
    pointer-events: none;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .line-numbers::-webkit-scrollbar {
    display: none;
  }

  .line-number {
    height: 1.75em;
  }

  /* ─── Edit mode textarea ─── */
  .markdown-editor {
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    padding: 48px 60px 48px 20px;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.75;
    letter-spacing: 0.02em;
    scrollbar-width: thin;
    scrollbar-color: rgba(6, 182, 212, 0.2) transparent;
    caret-color: #06b6d4;
    white-space: pre-wrap;   /* Enable text wrap */
    word-wrap: break-word;   /* Wrap long words */
    word-break: break-word;
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* ─── Hidden mirror for line height calculations (with text wrapping) ─── */
  .editor-mirror {
    position: absolute;
    left: 66px; /* offset matching line numbers sidebar width */
    right: 0;
    top: 0;
    padding: 48px 60px 48px 20px;
    box-sizing: border-box;
    visibility: hidden;
    pointer-events: none;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.75;
    letter-spacing: 0.02em;
    white-space: pre-wrap;
    word-wrap: break-word;
    z-index: -100;
  }

  .mirror-line {
    width: 100%;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-word;
    min-height: 1.75em;
  }

  .markdown-editor::placeholder {
    color: rgba(255,255,255,0.15);
    font-style: italic;
  }

  .markdown-editor::-webkit-scrollbar { width: 5px; }
  .markdown-editor::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.2); border-radius: 4px; }

  /* Loading */
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: rgba(6,182,212,0.6);
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .load-spinner {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(6,182,212,0.15);
    border-top-color: #06b6d4;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── Markdown rendered styles (increased size & weight per request) ─── */
  :global(.md-h1) {
    font-family: 'Outfit', sans-serif;
    font-size: 2.5rem;
    font-weight: 900;
    color: #ffffff;
    margin: 0 0 20px;
    letter-spacing: 0.02em;
    border-bottom: 1.5px solid rgba(6,182,212,0.3);
    padding-bottom: 12px;
    text-shadow: 0 0 24px rgba(6,182,212,0.25);
  }
  :global(.md-h2) {
    font-family: 'Outfit', sans-serif;
    font-size: 1.8rem;
    font-weight: 900;
    color: rgba(6,182,212,0.95);
    margin: 28px 0 12px;
    letter-spacing: 0.03em;
    text-shadow: 0 0 14px rgba(6,182,212,0.3);
  }
  :global(.md-h3) {
    font-family: 'Outfit', sans-serif;
    font-size: 1.4rem;
    font-weight: 850;
    color: rgba(139,92,246,0.95);
    margin: 22px 0 10px;
    letter-spacing: 0.04em;
  }
  :global(.md-p) {
    margin: 0 0 14px;
    color: rgba(255,255,255,0.9);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.8;
  }
  :global(.md-spacer) { height: 8px; }
  :global(.md-ul), :global(.md-ol) {
    margin: 0 0 14px;
    padding-left: 28px;
  }
  :global(.md-li), :global(.md-oli) {
    color: rgba(255,255,255,0.88);
    margin-bottom: 6px;
    font-size: 1.2rem;
    font-weight: 600;
  }
  :global(.md-blockquote) {
    border-left: 3px solid rgba(6,182,212,0.5);
    margin: 12px 0;
    padding: 8px 16px;
    color: rgba(6,182,212,0.8);
    background: rgba(6,182,212,0.05);
    border-radius: 0 6px 6px 0;
    font-style: italic;
  }
  :global(.md-hr) {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent);
    margin: 20px 0;
  }
  :global(.md-pre) {
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(6,182,212,0.15);
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
    overflow-x: auto;
  }
  :global(.md-code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85rem;
    color: #06b6d4;
    line-height: 1.6;
  }
  :global(.md-inline-code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    background: rgba(6,182,212,0.1);
    border: 1px solid rgba(6,182,212,0.2);
    border-radius: 4px;
    padding: 1px 6px;
    color: #06b6d4;
  }
  :global(.md-del) {
    text-decoration: line-through;
    color: rgba(255,255,255,0.35);
  }
  :global(.md-mark) {
    background: rgba(255,184,0,0.22);
    color: #ffb800;
    border-radius: 3px;
    padding: 0 3px;
  }
  :global(.md-check) {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 10px 0;
    font-size: 1.35rem; /* Increased size */
    font-weight: 750;   /* Increased boldness */
    color: rgba(255,255,255,0.85);
    cursor: pointer;
    transition: color 0.15s ease, opacity 0.15s ease;
  }
  :global(.md-check:hover) {
    color: #ffffff;
  }
  :global(.md-check:hover .cb) {
    border-color: rgba(255,255,255,0.6);
  }
  :global(.md-check .cb) {
    width: 22px; height: 22px; /* Increased size */
    border-radius: 6px;
    border: 1.8px solid rgba(255,255,255,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px; /* Increased checkmark size */
    flex-shrink: 0;
    margin-top: 4px;
  }
  :global(.md-check.done .cb) {
    background: rgba(0,255,159,0.2);
    border-color: #00ff9f;
    color: #00ff9f;
  }
  :global(.md-check .done-text) {
    text-decoration: line-through;
    color: rgba(255,255,255,0.35);
  }
  :global(.md-empty) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 60px 20px;
    text-align: center;
    color: rgba(255,255,255,0.2);
  }
  :global(.md-empty svg) { opacity: 0.3; }
  :global(.md-empty p) {
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.25);
  }
  :global(.md-empty strong) { color: rgba(6,182,212,0.6); }

  .markdown-editor.editor-readonly {
    cursor: not-allowed;
    background: rgba(255, 45, 85, 0.02) !important;
  }
  .save-btn.btn-readonly {
    background: rgba(255, 45, 85, 0.1) !important;
    border: 1.5px solid rgba(255, 45, 85, 0.4) !important;
    color: #ff2d55 !important;
    cursor: not-allowed !important;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.15) !important;
  }
</style>
