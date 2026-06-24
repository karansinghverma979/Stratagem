<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';

  interface QuoteData {
    text: string;
    author: string;
    book: string;
    date: string;
    type: 'imported' | 'standalone';
  }

  interface Props {
    isOpen: boolean;
    quoteToEdit?: (QuoteData & { index?: number }) | null;
    currentBookName: string;
    onClose: () => void;
    onSave: (quote: QuoteData, index?: number) => void;
  }

  let { isOpen, quoteToEdit, currentBookName, onClose, onSave } = $props<Props>();

  let text = $state('');
  let author = $state('');
  let book = $state('');

  // Sync inputs when modal opens or edits change
  $effect(() => {
    if (isOpen) {
      if (quoteToEdit) {
        text = quoteToEdit.text;
        author = quoteToEdit.author;
        book = quoteToEdit.book || currentBookName;
      } else {
        text = '';
        author = '';
        book = currentBookName;
      }
    }
  });

  function handleSave() {
    if (!text.trim()) {
      AudioEngine.play('error');
      return;
    }
    AudioEngine.play('success');
    
    // Save record: edited or newly created quote automatically becomes "standalone", date is updated to current
    onSave({
      text: text.trim(),
      author: author.trim() || 'Unknown',
      book: currentBookName === 'Tactical Axioms' ? (book.trim() || 'Tactical Axioms') : currentBookName,
      date: new Date().toISOString().split('T')[0],
      type: 'standalone'
    }, quoteToEdit ? quoteToEdit.index : undefined);
  }

  function handleClose() {
    AudioEngine.play('ui-click');
    onClose();
  }
</script>

{#if isOpen}
  <div class="modal-overlay" transition:fade={{ duration: 200 }}>
    <div class="modal-card font-outfit" transition:scale={{ duration: 250, start: 0.96 }}>
      <header class="modal-header">
        <div class="header-title-wrapper">
          <span class="header-led"></span>
          <span class="header-title">{quoteToEdit ? 'EDIT' : 'ADD NEW'} COGNITIVE RECORD</span>
        </div>
      </header>

      <div class="modal-body">
        <div class="input-group">
          <label class="input-label" for="quote-text-area">QUOTE PROTOCOL TEXT</label>
          <textarea
            id="quote-text-area"
            class="cyber-textarea"
            placeholder="Enter quote content or tactical axiom..."
            bind:value={text}
          ></textarea>
        </div>

        <div class="grid-inputs">
          <div class="input-group">
            <label class="input-label" for="quote-author-input">AUTHOR SOURCE</label>
            <div class="input-container">
              <span class="input-dot dot-author"></span>
              <input
                id="quote-author-input"
                type="text"
                class="cyber-input with-dot"
                placeholder="e.g. Robert Greene or Sun Tzu"
                bind:value={author}
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label" for="quote-book-input">COGNITIVE MATRIX</label>
            <div class="input-container">
              <span class="input-dot dot-book"></span>
              <input
                id="quote-book-input"
                type="text"
                class="cyber-input with-dot"
                class:disabled={currentBookName !== 'Tactical Axioms'}
                bind:value={book}
                disabled={currentBookName !== 'Tactical Axioms'}
                placeholder="e.g. Art of War or Hagakure"
              />
            </div>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="footer-btn btn-abort" onclick={handleClose}>ABORT PROTOCOL</button>
        <button class="footer-btn btn-commit" onclick={handleSave}>COMMIT RECORD</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(2, 2, 5, 0.94);
    backdrop-filter: blur(25px) saturate(140%);
    z-index: 200000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal-card {
    width: 90%;
    max-width: 700px;
    background: linear-gradient(160deg, #090a16 0%, #020204 100%);
    border: 2px solid rgba(139, 92, 246, 0.4);
    border-radius: 32px;
    box-shadow: 
      0 0 60px rgba(139, 92, 246, 0.25),
      inset 0 0 35px rgba(139, 92, 246, 0.05),
      0 35px 80px rgba(0, 0, 0, 0.97);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    word-spacing: 1.5px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
    background: rgba(255, 255, 255, 0.01);
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.06);
  }

  .header-title-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-led {
    width: 10px;
    height: 10px;
    background: #a78bfa;
    border-radius: 50%;
    box-shadow: 0 0 10px #a78bfa;
    animation: led-pulse 1.8s infinite ease-in-out;
  }

  @keyframes led-pulse {
    0% { transform: scale(0.9); opacity: 0.4; box-shadow: 0 0 6px #a78bfa; }
    50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 12px #a78bfa; }
    100% { transform: scale(0.9); opacity: 0.4; box-shadow: 0 0 6px #a78bfa; }
  }

  .header-title {
    font-family: 'Outfit', sans-serif;
    font-size: 20px;
    font-weight: 950 !important;
    letter-spacing: 0.15em;
    background: linear-gradient(90deg, #ffffff, #a78bfa, #00ffff, #ffffff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chroma-loop 5s linear infinite;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
  }

  @keyframes chroma-loop {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .modal-body {
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-dot {
    position: absolute;
    left: 16px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
  }

  .dot-author {
    background: #00f2ff;
    box-shadow: 0 0 8px #00f2ff;
    animation: dot-pulse-author 1.8s infinite ease-in-out;
  }

  .dot-book {
    background: #a78bfa;
    box-shadow: 0 0 8px #a78bfa;
    animation: dot-pulse-book 1.8s infinite ease-in-out;
    animation-delay: 0.4s;
  }

  @keyframes dot-pulse-author {
    0%, 100% { transform: scale(0.9); opacity: 0.6; box-shadow: 0 0 6px rgba(0, 242, 255, 0.4); }
    50% { transform: scale(1.25); opacity: 1; box-shadow: 0 0 12px rgba(0, 242, 255, 0.95); }
  }

  @keyframes dot-pulse-book {
    0%, 100% { transform: scale(0.9); opacity: 0.6; box-shadow: 0 0 6px rgba(167, 139, 250, 0.4); }
    50% { transform: scale(1.25); opacity: 1; box-shadow: 0 0 12px rgba(167, 139, 250, 0.95); }
  }

  .input-label {
    font-family: 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 0.12em;
  }

  .cyber-textarea {
    width: 100%;
    height: 140px;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    color: #ffffff;
    padding: 16px 20px;
    font-size: 19px;
    font-weight: 800;
    font-family: inherit;
    resize: none;
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
    line-height: 1.6;
    word-spacing: 2px;
  }
  .cyber-textarea:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
    background: rgba(139, 92, 246, 0.03);
  }

  .grid-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .cyber-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 14px 18px;
    font-size: 15px;
    font-weight: 900;
    font-family: inherit;
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
    word-spacing: 2px;
  }
  .cyber-input:focus:not(.disabled) {
    border-color: #8b5cf6;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
    background: rgba(139, 92, 246, 0.03);
  }

  .cyber-input.with-dot {
    padding-left: 36px;
  }

  #quote-author-input {
    color: #00f2ff;
    caret-color: #00f2ff;
    text-shadow: 0 0 8px rgba(0, 242, 255, 0.4);
  }

  #quote-author-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
    text-shadow: none;
  }

  #quote-book-input {
    color: #a78bfa;
    caret-color: #a78bfa;
    text-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
  }

  #quote-book-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
    text-shadow: none;
  }

  #quote-book-input.disabled {
    color: rgba(167, 139, 250, 0.7);
    text-shadow: 0 0 4px rgba(167, 139, 250, 0.2);
    cursor: not-allowed;
    border: 2px solid rgba(255, 255, 255, 0.04);
  }

  .cyber-input.disabled {
    background: rgba(255, 255, 255, 0.02);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    padding: 24px 32px;
    background: rgba(255, 255, 255, 0.01);
    border-top: 1.5px solid rgba(255, 255, 255, 0.06);
    word-spacing: normal;
  }

  .footer-btn {
    font-family: 'Outfit', sans-serif;
    font-size: 14.5px;
    font-weight: 950 !important;
    padding: 14px 32px;
    border-radius: 12px;
    cursor: pointer;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease;
    border: none;
    position: relative;
    overflow: hidden;
  }

  .footer-btn::after {
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

  .footer-btn.btn-abort {
    background: linear-gradient(135deg, #ff2d55 0%, #b91c1c 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(255, 45, 85, 0.35);
  }
  .footer-btn.btn-abort:hover {
    box-shadow: 0 6px 18px rgba(255, 45, 85, 0.6);
    transform: translateY(-2px);
  }

  .footer-btn.btn-commit {
    background: linear-gradient(135deg, #8b5cf6 0%, #00ffff 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
  }
  .footer-btn.btn-commit:hover {
    box-shadow: 0 6px 18px rgba(139, 92, 246, 0.6);
    transform: translateY(-2px);
  }

  .footer-btn:active {
    transform: scale(0.96);
  }
</style>
