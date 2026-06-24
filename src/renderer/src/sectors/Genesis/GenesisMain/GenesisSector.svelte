<script lang="ts">
  import { AudioEngine } from '../../../core/audio-engine';
  import { genesisActiveTab } from '../../../core/store';

  // Imported isolated panels
  import DeveloperPanel from './DeveloperPanel/DeveloperPanel.svelte';
  import AIGirlPanel from './AIGirlPanel/AIGirlPanel.svelte';
  import SettingsPanel from './SettingsPanel/SettingsPanel.svelte';
  import QuotesPanel from './QuotesPanel/QuotesPanel.svelte';
  import ImprovementPanel from './ImprovementPanel/ImprovementPanel.svelte';
  import GenesisInterfaceSwitcher from './GenesisInterfaceSwitcher.svelte';

  // Navigation state
  let activeTab = $state('developer');

  $effect(() => {
    genesisActiveTab.set(activeTab);
  });

  function selectTab(tab: string) {
    try {
      AudioEngine.play('data-lock');
    } catch (e) {
      console.warn('AudioEngine play failed:', e);
    }
    activeTab = tab;
  }
</script>

<div class="fui-container genesis-full-workspace">
  <!-- Floating interface switcher toggle - Always on top -->
  <div class="genesis-floating-toggle-container">
    <GenesisInterfaceSwitcher {activeTab} {selectTab} />
  </div>

  <section class="workspace-station">
    {#if activeTab === 'developer'}
      <DeveloperPanel />
    {:else if activeTab === 'aigirl'}
      <AIGirlPanel />
    {:else if activeTab === 'settings'}
      <SettingsPanel />
    {:else if activeTab === 'quotes'}
      <QuotesPanel />
    {:else if activeTab === 'improvement'}
      <ImprovementPanel />
    {/if}
  </section>
</div>

<style>
  .genesis-full-workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    height: 100%;
    position: relative;
    padding-bottom: 40px !important;
  }

  .workspace-station {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    width: 100%;
  }

  .genesis-floating-toggle-container {
    position: absolute;
    top: 52px;
    right: 63px;
    z-index: 9999;
    pointer-events: auto;
  }
</style>
