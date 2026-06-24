<script lang="ts">
  import { AudioEngine } from '../../../../core/audio-engine';

  interface Props {
    selectedCount: number;
    totalCount: number;
    resolvedFilterActive: boolean;
    onToggleSelectAll: () => void;
    onCopy: () => void;
    onExport: () => void;
    onResolveOrClear: () => void;
    onLaunchUplink: () => void;
  }

  let { 
    selectedCount, 
    totalCount, 
    resolvedFilterActive, 
    onToggleSelectAll, 
    onCopy, 
    onExport, 
    onResolveOrClear,
    onLaunchUplink
  } = $props<Props>();

  let isAllSelected = $derived(totalCount > 0 && selectedCount === totalCount);
  let copiedState = $state(false);
  let exportState = $state<'idle' | 'success' | 'fail'>('idle');
</script>

<div class="action-bar-container font-outfit">
  <div class="action-status">
    <span class="status-led" class:active={selectedCount > 0}></span>
    <span class="status-text font-weight-950">
      {selectedCount} OF {totalCount} PROTOCOLS STAGED
    </span>
  </div>

  <div class="action-buttons">
    <button 
      type="button" 
      class="btn-action btn-select font-weight-950" 
      onclick={() => { AudioEngine.play('switch-flip'); onToggleSelectAll(); }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      {isAllSelected ? 'UNSELECT ALL' : 'SELECT ALL'}
    </button>

    <button 
      type="button" 
      class="btn-action btn-copy font-weight-950" 
      class:copied={copiedState}
      disabled={selectedCount === 0}
      onclick={() => {
        AudioEngine.play('data-lock');
        onCopy();
        copiedState = true;
        setTimeout(() => { copiedState = false; }, 2000);
      }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      {copiedState ? 'COPIED ✓' : 'COPY'}
    </button>

    <button 
      type="button" 
      class="btn-action btn-export font-weight-950" 
      class:success={exportState === 'success'}
      class:fail={exportState === 'fail'}
      disabled={selectedCount === 0}
      onclick={() => {
        try {
          onExport();
          AudioEngine.play('data-decode');
          exportState = 'success';
        } catch (e) {
          AudioEngine.play('error');
          exportState = 'fail';
        }
        setTimeout(() => { exportState = 'idle'; }, 2000);
      }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      {exportState === 'success' ? 'EXPORTED ✓' : (exportState === 'fail' ? 'ABORTED ✗' : 'EXPORT')}
    </button>

    <button 
      type="button" 
      class="btn-action font-weight-950" 
      class:btn-resolve={!resolvedFilterActive}
      class:btn-purge={resolvedFilterActive}
      disabled={selectedCount === 0}
      onclick={() => { AudioEngine.play(resolvedFilterActive ? 'fail' : 'success'); onResolveOrClear(); }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      {resolvedFilterActive ? 'PURGE' : 'RESOLVED'}
    </button>

    <button 
      type="button" 
      class="trigger-modal-btn font-weight-950" 
      onclick={() => { AudioEngine.play('data-lock'); onLaunchUplink(); }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      INITIALIZE NEURAL UPLINK
    </button>
  </div>
</div>

<style>
  .action-bar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 16px;
    margin-bottom: 16px;
    box-shadow: inset 0 0 15px rgba(139, 92, 246, 0.05);
  }

  .action-status {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-led {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .status-led.active {
    background: #00ffff;
    box-shadow: 0 0 10px #00ffff, 0 0 20px rgba(0, 255, 255, 0.5);
    animation: pulseLed 1.5s infinite alternate;
  }

  @keyframes pulseLed {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }

  .status-text {
    font-size: 11px;
    font-weight: 950 !important;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.7);
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Solid tactical button design matching NeuralUplink modal styling */
  .btn-action {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 950 !important;
    border: none;
    color: #fff;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
    outline: none;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .btn-action:hover:not(:disabled) {
    transform: scale(1.05) translateY(-2px);
  }

  .btn-action:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  .btn-select {
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
  }
  .btn-select:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
  }

  .btn-copy {
    background: linear-gradient(135deg, #06b6d4, #8b5cf6);
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
    min-width: 145px;
  }
  .btn-copy:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(6, 182, 212, 0.5);
  }
  .btn-copy.copied {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.5) !important;
  }

  .btn-export {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    box-shadow: 0 0 15px rgba(37, 99, 235, 0.25);
    min-width: 145px;
  }
  .btn-export:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(37, 99, 235, 0.5);
  }
  .btn-export.success {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.5) !important;
  }
  .btn-export.fail {
    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.5) !important;
  }

  .btn-resolve {
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
  }
  .btn-resolve:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
  }

  .btn-purge {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
  }
  .btn-purge:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.5);
  }

  /* Core Launch Button style is preserved exactly as required */
  .trigger-modal-btn {
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    border: none;
    color: #ffffff;
    font-family: 'Outfit', sans-serif;
    font-weight: 950 !important;
    font-size: 11.5px;
    padding: 12px 28px;
    border-radius: 9999px;
    cursor: pointer;
    letter-spacing: 0.08em;
    transition: all 0.3s ease;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.25);
  }

  .trigger-modal-btn:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 
      0 10px 20px rgba(236, 72, 153, 0.25),
      0 0 25px rgba(139, 92, 246, 0.5);
  }
</style>
