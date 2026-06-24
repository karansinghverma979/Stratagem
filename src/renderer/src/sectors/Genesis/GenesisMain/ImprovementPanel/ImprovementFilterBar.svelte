<script lang="ts">
  import { AudioEngine } from '../../../../core/audio-engine';

  interface Props {
    filterIntent: string;
    filterAgency: string;
    filterVector: string;
    filterSector: string;
    showResolvedOnly: boolean;
    sortBy: 'creation' | 'resolution' | 'name';

    setIntent: (v: string) => void;
    setAgency: (v: string) => void;
    setVector: (v: string) => void;
    setSector: (v: string) => void;
    toggleResolvedOnly: () => void;
    setSortBy: (v: 'creation' | 'resolution' | 'name') => void;
  }

  let {
    filterIntent,
    filterAgency,
    filterVector,
    filterSector,
    showResolvedOnly,
    sortBy,
    setIntent,
    setAgency,
    setVector,
    setSector,
    toggleResolvedOnly,
    setSortBy
  } = $props<Props>();

  const intents = ['', 'Matrix Undefined', 'FIX BUG', 'ENHANCE EXISTING FEATURE', 'NEW IMPLEMENTATION'];
  const agencies = ['', 'Undefined', 'Strict Compliance', 'Moderate Editing', 'Creative Autonomy'];
  const vectors = ['', 'Undefined', 'UI - FRONTEND ENHANCE', 'UX - BACKEND IMPROVE', 'UI & UX - FULLSTACK CREATION'];
  const sectors = ['', 'GLOBAL', 'COMPONANTES', 'DATABASE STATION', 'FORGE', 'EXECUTION', 'ARSENAL', 'BREACH', 'ARCHIVE', 'CHRONOS', 'GENESIS'];
</script>

<div class="filter-bar-container font-outfit">
  <div class="filter-field">
    <label for="intent-select" class="filter-label">INTENT</label>
    <select 
      id="intent-select"
      class="filter-select font-weight-950" 
      value={filterIntent} 
      onchange={(e) => { AudioEngine.play('switch-flip'); setIntent((e.target as HTMLSelectElement).value); }}
    >
      {#each intents as opt}
        <option value={opt}>{opt === '' ? 'ALL INTENTS' : opt.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-field">
    <label for="agency-select" class="filter-label">AGENCY</label>
    <select 
      id="agency-select"
      class="filter-select font-weight-950" 
      value={filterAgency} 
      onchange={(e) => { AudioEngine.play('switch-flip'); setAgency((e.target as HTMLSelectElement).value); }}
    >
      {#each agencies as opt}
        <option value={opt}>{opt === '' ? 'ALL AGENCIES' : opt.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-field">
    <label for="vector-select" class="filter-label">VECTOR</label>
    <select 
      id="vector-select"
      class="filter-select font-weight-950" 
      value={filterVector} 
      onchange={(e) => { AudioEngine.play('switch-flip'); setVector((e.target as HTMLSelectElement).value); }}
    >
      {#each vectors as opt}
        <option value={opt}>{opt === '' ? 'ALL VECTORS' : opt.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-field">
    <label for="sector-select" class="filter-label">SECTOR</label>
    <select 
      id="sector-select"
      class="filter-select font-weight-950" 
      value={filterSector} 
      onchange={(e) => { AudioEngine.play('switch-flip'); setSector((e.target as HTMLSelectElement).value); }}
    >
      {#each sectors as opt}
        <option value={opt}>{opt === '' ? 'ALL SECTORS' : opt.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-field">
    <label for="sort-select" class="filter-label">SORT BY</label>
    <select 
      id="sort-select"
      class="filter-select font-weight-950" 
      value={sortBy} 
      onchange={(e) => { AudioEngine.play('switch-flip'); setSortBy((e.target as HTMLSelectElement).value as any); }}
    >
      <option value="creation">CREATION DATE</option>
      {#if showResolvedOnly}
        <option value="resolution">RESOLUTION DATE</option>
      {/if}
      <option value="name">NAME / CONTENT</option>
    </select>
  </div>

  <div class="filter-field filter-checkbox-field">
    <button 
      type="button"
      class="resolved-toggle-btn font-weight-950" 
      class:active={showResolvedOnly}
      onclick={() => { AudioEngine.play('switch-flip'); toggleResolvedOnly(); }}
      onmouseenter={() => AudioEngine.play('ui-hover')}
    >
      <span class="toggle-indicator"></span>
      JUST SHOW RESOLVED
    </button>
  </div>
</div>

<style>
  .filter-bar-container {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 20px;
    padding: 20px;
    background: rgba(13, 15, 28, 0.4);
    border: 1px solid rgba(139, 92, 246, 0.1);
    border-radius: 16px;
    margin-bottom: 24px;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 130px;
  }

  .filter-checkbox-field {
    justify-content: flex-end;
    min-width: 180px;
  }

  .filter-label {
    font-size: 10px;
    font-weight: 950 !important;
    letter-spacing: 0.1em;
    color: rgba(139, 92, 246, 0.7);
    text-transform: uppercase;
  }

  .filter-select {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.85);
    outline: none;
    cursor: pointer;
    transition: all 0.25s ease;
    font-family: 'Outfit', sans-serif;
  }

  .filter-select:hover {
    border-color: rgba(139, 92, 246, 0.35);
    color: #fff;
  }

  .filter-select:focus {
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.05);
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  .filter-select option {
    background: #090a12;
    color: #fff;
    font-weight: 950 !important;
  }

  .resolved-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 950 !important;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.25s ease;
    height: 34px;
    box-sizing: border-box;
    font-family: 'Outfit', sans-serif;
  }

  .resolved-toggle-btn:hover {
    border-color: rgba(139, 92, 246, 0.3);
    color: #fff;
    background: rgba(139, 92, 246, 0.04);
  }

  .resolved-toggle-btn.active {
    border-color: rgba(16, 185, 129, 0.4);
    color: #34d399;
    background: rgba(16, 185, 129, 0.05);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
  }

  .toggle-indicator {
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transition: all 0.25s ease;
  }

  .resolved-toggle-btn.active .toggle-indicator {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }
</style>
