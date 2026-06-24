<script lang="ts">
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../../../core/audio-engine';
  import { editingEntry, editingEntryIndex } from '../../../../../core/store';
  import { get } from 'svelte/store';

  interface Props {
    isModalOpen: boolean;
    toggleModal: () => void;
    onCommitSuccess: () => void;
    pastLogs: any[];
  }

  let { isModalOpen, toggleModal, onCommitSuccess, pastLogs } = $props<Props>();

  interface FileNode {
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
  }

  import { onMount } from 'svelte';
  import { neuralUplinkDraft } from '../../../../../core/store';

  const staticFileSystemTree: FileNode[] = [
    {
      name: 'GLOBAL',
      type: 'folder',
      path: 'src',
      children: [
        { name: 'App.svelte', type: 'file', path: 'src/App.svelte' },
        { name: 'main.ts', type: 'file', path: 'src/main.ts' }
      ]
    },
    {
      name: 'COMPONANTES',
      type: 'folder',
      path: 'src/components',
      children: [
        { name: 'CommandPalette.svelte', type: 'file', path: 'src/components/CommandPalette.svelte' },
        { name: 'DeepFocusOverlay.svelte', type: 'file', path: 'src/components/DeepFocusOverlay.svelte' },
        { name: 'TaskForgeButton.svelte', type: 'file', path: 'src/components/TaskForgeButton.svelte' },
        { name: 'TopNavigation.svelte', type: 'file', path: 'src/components/TopNavigation.svelte' },
        { name: 'Versions.svelte', type: 'file', path: 'src/components/Versions.svelte' },
        {
          name: 'ShieldEngine',
          type: 'folder',
          path: 'src/components/ShieldEngine',
          children: [
            { name: 'ShieldAlert.svelte', type: 'file', path: 'src/components/ShieldEngine/ShieldAlert.svelte' },
            { name: 'ShieldSentinel.svelte', type: 'file', path: 'src/components/ShieldEngine/ShieldSentinel.svelte' }
          ]
        }
      ]
    },
    {
      name: 'DATABASE STATION',
      type: 'folder',
      path: 'src/sectors/StratagemHub',
      children: [
        {
          name: 'HubMain',
          type: 'folder',
          path: 'src/sectors/StratagemHub/HubMain',
          children: [
            { name: 'HubModal.svelte', type: 'file', path: 'src/sectors/StratagemHub/HubMain/HubModal.svelte' }
          ]
        },
        {
          name: 'NeuralLink',
          type: 'folder',
          path: 'src/sectors/StratagemHub/NeuralLink',
          children: [
            { name: 'NeuralLinkStation.svelte', type: 'file', path: 'src/sectors/StratagemHub/NeuralLink/NeuralLinkStation.svelte' }
          ]
        },
        {
          name: 'Nuke',
          type: 'folder',
          path: 'src/sectors/StratagemHub/Nuke',
          children: [
            { name: 'NukeProtocol.svelte', type: 'file', path: 'src/sectors/StratagemHub/Nuke/NukeProtocol.svelte' }
          ]
        }
      ]
    },
    {
      name: 'FORGE',
      type: 'folder',
      path: 'src/sectors/Forge',
      children: [
        {
          name: 'ForgeCalendar',
          type: 'folder',
          path: 'src/sectors/Forge/ForgeCalendar',
          children: [
            { name: 'Calendar.svelte', type: 'file', path: 'src/sectors/Forge/ForgeCalendar/Calendar.svelte' },
            { name: 'TemporalNexus.svelte', type: 'file', path: 'src/sectors/Forge/ForgeCalendar/TemporalNexus.svelte' }
          ]
        },
        {
          name: 'ForgeMain',
          type: 'folder',
          path: 'src/sectors/Forge/ForgeMain',
          children: [
            { name: 'TaskForgeModal.svelte', type: 'file', path: 'src/sectors/Forge/ForgeMain/TaskForgeModal.svelte' }
          ]
        }
      ]
    },
    {
      name: 'EXECUTION',
      type: 'folder',
      path: 'src/sectors/Execution',
      children: [
        { name: 'ExecutionTagBar.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionTagBar.svelte' },
        {
          name: 'ExecutionMain',
          type: 'folder',
          path: 'src/sectors/Execution/ExecutionMain',
          children: [
            { name: 'ExecutionSector.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionMain/ExecutionSector.svelte' },
            { name: 'ExecutionTaskList.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionMain/ExecutionTaskList.svelte' },
            { name: 'ExecutionTaskRow.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionMain/ExecutionTaskRow.svelte' }
          ]
        },
        {
          name: 'ExecutionTaskView',
          type: 'folder',
          path: 'src/sectors/Execution/ExecutionTaskView',
          children: [
            { name: 'AbortConfirmation.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionTaskView/AbortConfirmation.svelte' },
            { name: 'MissionProtocol.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionTaskView/MissionProtocol.svelte' },
            { name: 'VictoryConfirmation.svelte', type: 'file', path: 'src/sectors/Execution/ExecutionTaskView/VictoryConfirmation.svelte' }
          ]
        }
      ]
    },
    {
      name: 'ARSENAL',
      type: 'folder',
      path: 'src/sectors/Arsenal',
      children: [
        {
          name: 'ArsenalMain',
          type: 'folder',
          path: 'src/sectors/Arsenal/ArsenalMain',
          children: [
            { name: 'ArsenalBoard.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/ArsenalBoard.svelte' },
            { name: 'ArsenalPurgeConfirmation.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/ArsenalPurgeConfirmation.svelte' },
            { name: 'ArsenalTagBar.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/ArsenalTagBar.svelte' },
            { name: 'ArsenalTaskList.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/ArsenalTaskList.svelte' },
            { name: 'ArsenalTaskRow.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/ArsenalTaskRow.svelte' },
            { name: 'StrategizeModal.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/StrategizeModal.svelte' },
            { name: 'SynthDeleteConfirmation.svelte', type: 'file', path: 'src/sectors/Arsenal/ArsenalMain/SynthDeleteConfirmation.svelte' }
          ]
        }
      ]
    },
    {
      name: 'BREACH',
      type: 'folder',
      path: 'src/sectors/Breach',
      children: [
        { name: 'BreachTagBar.svelte', type: 'file', path: 'src/sectors/Breach/BreachTagBar.svelte' },
        {
          name: 'BreachMain',
          type: 'folder',
          path: 'src/sectors/Breach/BreachMain',
          children: [
            { name: 'BreachSector.svelte', type: 'file', path: 'src/sectors/Breach/BreachMain/BreachSector.svelte' },
            { name: 'BreachTaskRow.svelte', type: 'file', path: 'src/sectors/Breach/BreachMain/BreachTaskRow.svelte' },
            { name: 'BreachTaskView.svelte', type: 'file', path: 'src/sectors/Breach/BreachMain/BreachTaskView.svelte' }
          ]
        }
      ]
    },
    {
      name: 'ARCHIVE',
      type: 'folder',
      path: 'src/sectors/Archive',
      children: [
        {
          name: 'ArchiveMain',
          type: 'folder',
          path: 'src/sectors/Archive/ArchiveMain',
          children: [
            { name: 'ArchiveSector.svelte', type: 'file', path: 'src/sectors/Archive/ArchiveMain/ArchiveSector.svelte' }
          ]
        }
      ]
    },
    {
      name: 'CHRONOS',
      type: 'folder',
      path: 'src/sectors/Chronos',
      children: [
        {
          name: 'ChronosMain',
          type: 'folder',
          path: 'src/sectors/Chronos/ChronosMain',
          children: [
            { name: 'ChronosSector.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/ChronosSector.svelte' },
            { name: 'Reminder.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/Reminder.svelte' },
            { name: 'Stopwatch.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/Stopwatch.svelte' },
            { name: 'TemporalScheduler.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/TemporalScheduler.svelte' },
            { name: 'Timer.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/Timer.svelte' },
            { name: 'Todo.svelte', type: 'file', path: 'src/sectors/Chronos/ChronosMain/Todo.svelte' }
          ]
        }
      ]
    },
    {
      name: 'GENESIS',
      type: 'folder',
      path: 'src/sectors/Genesis',
      children: [
        {
          name: 'GenesisMain',
          type: 'folder',
          path: 'src/sectors/Genesis/GenesisMain',
          children: [
            {
              name: 'AIGirlPanel',
              type: 'folder',
              path: 'src/sectors/Genesis/GenesisMain/AIGirlPanel',
              children: [
                { name: 'AIGirlPanel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/AIGirlPanel/AIGirlPanel.svelte' }
              ]
            },
            {
              name: 'DeveloperPanel',
              type: 'folder',
              path: 'src/sectors/Genesis/GenesisMain/DeveloperPanel',
              children: [
                { name: 'DeveloperPanel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/DeveloperPanel/DeveloperPanel.svelte' }
              ]
            },
            {
              name: 'ImprovementPanel',
              type: 'folder',
              path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel',
              children: [
                { name: 'ImprovementActionBar.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel/ImprovementActionBar.svelte' },
                { name: 'ImprovementFilterBar.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel/ImprovementFilterBar.svelte' },
                { name: 'ImprovementPanel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel/ImprovementPanel.svelte' },
                {
                  name: 'NeuralUplink',
                  type: 'folder',
                  path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel/NeuralUplink',
                  children: [
                    { name: 'NeuralUplink.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/ImprovementPanel/NeuralUplink/NeuralUplink.svelte' }
                  ]
                }
              ]
            },
            {
              name: 'QuotesPanel',
              type: 'folder',
              path: 'src/sectors/Genesis/GenesisMain/QuotesPanel',
              children: [
                { name: 'QuotesPanel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/QuotesPanel/QuotesPanel.svelte' },
                { name: 'QuoteEditorModal.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/QuotesPanel/QuoteEditorModal.svelte' },
                { name: 'QuotesImportModel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/QuotesPanel/QuotesImportModel.svelte' }
              ]
            },
            {
              name: 'SettingsPanel',
              type: 'folder',
              path: 'src/sectors/Genesis/GenesisMain/SettingsPanel',
              children: [
                { name: 'SettingsPanel.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/SettingsPanel/SettingsPanel.svelte' }
              ]
            },
            { name: 'GenesisInterfaceSwitcher.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/GenesisInterfaceSwitcher.svelte' },
            { name: 'GenesisSector.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/GenesisSector.svelte' },
            { name: 'GenesisToggle.svelte', type: 'file', path: 'src/sectors/Genesis/GenesisMain/GenesisToggle.svelte' }
          ]
        }
      ]
    }
  ];

  let fileSystemTree = $state<FileNode[]>(staticFileSystemTree);

  onMount(() => {
    const handleAutoscan = async () => {
      if (window.stratagemAPI && window.stratagemAPI.scanAppPaths) {
        try {
          const res = await window.stratagemAPI.scanAppPaths();
          if (res && res.success && Array.isArray(res.tree) && res.tree.some(node => node.children && node.children.length > 0)) {
            fileSystemTree = res.tree;
            const { addNotification } = await import('../../../../../core/store');
            addNotification('PATH SCAN COMPLETION', 'Active source tree successfully scanned and mapped.', 'success');
          } else {
            const { addNotification } = await import('../../../../../core/store');
            addNotification('PATH SCAN ERROR', 'Unable to resolve local source tree paths.', 'error');
          }
        } catch (err: any) {
          console.error('Autoscan failed:', err);
          const { addNotification } = await import('../../../../../core/store');
          addNotification('PATH SCAN EXCEPTION', err.message || 'Paths scan failed.', 'error');
        }
      }
    };

    window.addEventListener('trigger-autoscan-paths', handleAutoscan);
    return () => {
      window.removeEventListener('trigger-autoscan-paths', handleAutoscan);
    };
  });

  const intentOptions = [
    { value: 'Matrix Undefined', label: 'UNDEFINED' },
    { value: 'FIX BUG', label: 'FIX BUG' },
    { value: 'ENHANCE EXISTING FEATURE', label: 'ENHANCE EXISTING FEATURE' },
    { value: 'NEW IMPLEMENTATION', label: 'NEW IMPLEMENTATION' }
  ];

  const agencyOptions = [
    { value: 'Undefined', label: 'UNDEFINED' },
    { value: 'Strict Compliance', label: 'STRICT COMPLIANCE' },
    { value: 'Moderate Editing', label: 'MODERATE EDITING' },
    { value: 'Creative Autonomy', label: 'CREATIVE AUTONOMY' }
  ];

  const vectorOptions = [
    { value: 'Undefined', label: 'UNDEFINED' },
    { value: 'UI - FRONTEND ENHANCE', label: 'UI - FRONTEND ENHANCE' },
    { value: 'UX - BACKEND IMPROVE', label: 'UX - BACKEND IMPROVE' },
    { value: 'UI & UX - FULLSTACK CREATION', label: 'UI & UX - FULLSTACK CREATION' }
  ];

  // State
  let openDropdown = $state<string | null>(null);
  let selectedIntent = $state('Matrix Undefined');
  let selectedAgency = $state('Undefined');
  let selectedVector = $state('Undefined');
  let selectedFile = $state('Matrix Undefined');
  let selectedPriority = $state('ELEVATED');
  let selectedTolerance = $state('STRICT');
  let selectedOperator = $state('ANTIGRAVITY');

  let suggestion = $state('');
  let commitStatus = $state('');
  let isHeaderHovered = $state(false);

  let textareaElement = $state<HTMLTextAreaElement | null>(null);

  // File Manager Tree Selections
  let selectedL1 = $state<FileNode | null>(null);
  let selectedL2 = $state<FileNode | null>(null);
  let selectedL3 = $state<FileNode | null>(null);
  let selectedL4 = $state<FileNode | null>(null);
  let selectedL5 = $state<FileNode | null>(null);

  $effect(() => {
    if ($editingEntry) {
      selectedIntent = $editingEntry.category || 'Matrix Undefined';
      selectedAgency = $editingEntry.agency || 'Undefined';
      selectedVector = $editingEntry.vector || 'Undefined';
      selectedFile = $editingEntry.location || 'Matrix Undefined';
      selectedPriority = $editingEntry.priority || 'ELEVATED';
      selectedTolerance = $editingEntry.tolerance || 'STRICT';
      selectedOperator = $editingEntry.operator || 'ANTIGRAVITY';
      suggestion = $editingEntry.content || '';
    }
  });

  // Load or save draft on modal open/close transitions (prevents keydown lag from writing store on every keystroke)
  let wasModalOpen = false;
  $effect(() => {
    if (isModalOpen && !wasModalOpen) {
      // Modal opened: load the saved draft
      if (!$editingEntry) {
        const draft = get(neuralUplinkDraft);
        if (draft.content.trim() !== '') {
          selectedIntent = draft.category;
          selectedAgency = draft.agency;
          selectedVector = draft.vector;
          selectedFile = draft.location;
          selectedPriority = draft.priority;
          selectedTolerance = draft.tolerance;
          selectedOperator = draft.operator;
          suggestion = draft.content;
        }
      }
    } else if (!isModalOpen && wasModalOpen) {
      // Modal closed: save the draft
      if (!$editingEntry) {
        neuralUplinkDraft.set({
          category: selectedIntent,
          agency: selectedAgency,
          vector: selectedVector,
          location: selectedFile,
          priority: selectedPriority,
          tolerance: selectedTolerance,
          operator: selectedOperator,
          content: suggestion
        });
      }
    }
    wasModalOpen = isModalOpen;
  });

  // Auto-align tree nodes on initialization based on selectedFile default
  $effect(() => {
    if (selectedFile && selectedFile !== 'Matrix Undefined' && selectedL1 === null) {
      const parts = selectedFile.split('/');
      let l1Name = '';
      if (parts[1] === 'App.svelte') {
        l1Name = 'GLOBAL';
      } else if (parts[1] === 'components') {
        l1Name = 'COMPONANTES';
      } else if (parts[1] === 'sectors') {
        if (parts[2] === 'StratagemHub') {
          l1Name = 'DATABASE STATION';
        } else {
          l1Name = parts[2].toUpperCase();
        }
      }
      
      const node1 = fileSystemTree.find(n => n.name === l1Name);
      if (node1) {
        selectedL1 = node1;
        const remainingParts = parts.slice(l1Name === 'GLOBAL' ? 2 : (l1Name === 'COMPONANTES' ? 2 : 3));
        if (remainingParts.length > 0 && node1.children) {
          const node2 = node1.children.find(n => n.name === remainingParts[0]);
          if (node2) {
            selectedL2 = node2;
            if (remainingParts.length > 1 && node2.children) {
              const node3 = node2.children.find(n => n.name === remainingParts[1]);
              if (node3) {
                selectedL3 = node3;
                if (remainingParts.length > 2 && node3.children) {
                  const node4 = node3.children.find(n => n.name === remainingParts[2]);
                  if (node4) {
                    selectedL4 = node4;
                    if (remainingParts.length > 3 && node4.children) {
                      const node5 = node4.children.find(n => n.name === remainingParts[3]);
                      if (node5) {
                        selectedL5 = node5;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  function selectL1(node: FileNode | null) {
    selectedL1 = node;
    selectedL2 = null;
    selectedL3 = null;
    selectedL4 = null;
    selectedL5 = null;
    selectedFile = node ? node.path : 'Matrix Undefined';
    openDropdown = null;
    AudioEngine.play('data-lock');
  }

  function selectL2(node: FileNode | null) {
    selectedL2 = node;
    selectedL3 = null;
    selectedL4 = null;
    selectedL5 = null;
    selectedFile = node ? node.path : (selectedL1 ? selectedL1.path : 'Matrix Undefined');
    openDropdown = null;
    AudioEngine.play('data-lock');
  }

  function selectL3(node: FileNode | null) {
    selectedL3 = node;
    selectedL4 = null;
    selectedL5 = null;
    selectedFile = node ? node.path : (selectedL2 ? selectedL2.path : (selectedL1 ? selectedL1.path : 'Matrix Undefined'));
    openDropdown = null;
    AudioEngine.play('data-lock');
  }

  function selectL4(node: FileNode | null) {
    selectedL4 = node;
    selectedL5 = null;
    selectedFile = node ? node.path : (selectedL3 ? selectedL3.path : (selectedL2 ? selectedL2.path : (selectedL1 ? selectedL1.path : 'Matrix Undefined')));
    openDropdown = null;
    AudioEngine.play('data-lock');
  }

  function selectL5(node: FileNode | null) {
    selectedL5 = node;
    selectedFile = node ? node.path : (selectedL4 ? selectedL4.path : (selectedL3 ? selectedL3.path : (selectedL2 ? selectedL2.path : (selectedL1 ? selectedL1.path : 'Matrix Undefined'))));
    openDropdown = null;
    AudioEngine.play('data-lock');
  }

  const priorityOptions = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'ELEVATED', label: 'Elevated' },
    { value: 'STABLE', label: 'Stable' }
  ];

  const toleranceOptions = [
    { value: 'STRICT', label: 'Strict' },
    { value: 'MODULAR', label: 'Modular' }
  ];

  const operatorOptions = [
    { value: 'ANTIGRAVITY', label: 'Antigravity' },
    { value: 'OPERATOR', label: 'Operator' }
  ];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const target = e.target as HTMLTextAreaElement;
      const val = target.value;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const beforeCursor = val.substring(0, start);
      const afterCursor = val.substring(end);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if it's an empty bullet or number row (to exit)
      const emptyBulletMatch = currentLine.match(/^\s*([-*•]|\d+\.)\s*$/);
      if (emptyBulletMatch) {
        e.preventDefault();
        const newLines = lines.slice(0, -1);
        const newVal = newLines.join('\n') + '\n' + afterCursor;
        suggestion = newVal;
        setTimeout(() => {
          const pos = newLines.join('\n').length + 1;
          target.setSelectionRange(pos, pos);
          target.scrollTop = target.scrollHeight;
        }, 0);
        return;
      }
      
      // Check for bullet list
      const bulletMatch = currentLine.match(/^(\s*[-*•])\s*(.*)$/);
      if (bulletMatch && bulletMatch[2].trim() !== '') {
        e.preventDefault();
        const bulletSign = bulletMatch[1].trim();
        const text = bulletMatch[2];
        const leadingWhitespace = bulletMatch[1].match(/^\s*/)?.[0] || '';
        
        const formattedCurrentLine = leadingWhitespace + bulletSign + ' ' + text;
        const insertText = '\n\n' + leadingWhitespace + bulletSign + ' ';
        
        const newLines = [...lines.slice(0, -1), formattedCurrentLine];
        const newVal = newLines.join('\n') + insertText + afterCursor;
        suggestion = newVal;
        setTimeout(() => {
          const newPos = newLines.join('\n').length + insertText.length;
          target.setSelectionRange(newPos, newPos);
          target.scrollTop = target.scrollHeight;
        }, 0);
        return;
      }
      
      // Check for numbered list
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numberMatch && numberMatch[3].trim() !== '') {
        e.preventDefault();
        const leadingWhitespace = numberMatch[1];
        const currentNum = parseInt(numberMatch[2], 10);
        const text = numberMatch[3];
        
        const nextNum = currentNum + 1;
        const formattedCurrentLine = leadingWhitespace + currentNum + '. ' + text;
        const insertText = '\n\n' + leadingWhitespace + nextNum + '. ';
        
        const newLines = [...lines.slice(0, -1), formattedCurrentLine];
        const newVal = newLines.join('\n') + insertText + afterCursor;
        suggestion = newVal;
        setTimeout(() => {
          const newPos = newLines.join('\n').length + insertText.length;
          target.setSelectionRange(newPos, newPos);
          target.scrollTop = target.scrollHeight;
        }, 0);
        return;
      }

      // Default behavior: Insert double newline and autoscroll
      e.preventDefault();
      const insertText = '\n\n';
      const newVal = beforeCursor + insertText + afterCursor;
      suggestion = newVal;
      setTimeout(() => {
        const newPos = start + insertText.length;
        target.setSelectionRange(newPos, newPos);
        target.scrollTop = target.scrollHeight;
      }, 0);
    }
  }

  function toggleDropdown(name: string) {
    AudioEngine.play('switch-flip');
    openDropdown = openDropdown === name ? null : name;
    if (openDropdown === name) {
      setTimeout(() => {
        const activeGroup = document.querySelector(`.cyber-dropdown-group.active-dropdown`) as HTMLElement;
        const sidebar = document.querySelector(`.uplink-sidebar`) as HTMLElement;
        if (activeGroup && sidebar) {
          const menu = activeGroup.querySelector('.cyber-dropdown-menu') as HTMLElement;
          const menuHeight = menu ? menu.offsetHeight : 220;
          
          const relativeBottom = activeGroup.offsetTop + activeGroup.offsetHeight + menuHeight;
          const viewportBottom = sidebar.scrollTop + sidebar.clientHeight;
          
          if (relativeBottom > viewportBottom) {
            sidebar.scrollTo({
              top: relativeBottom - sidebar.clientHeight + 20,
              behavior: 'smooth'
            });
          } else if (activeGroup.offsetTop < sidebar.scrollTop) {
            sidebar.scrollTo({
              top: activeGroup.offsetTop - 10,
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
  };

  function closeAllDropdowns() {
    openDropdown = null;
  }

  let copyStatus = $state(false);

  function copyTerminalContent() {
    let intentStr = selectedIntent !== 'Matrix Undefined' ? selectedIntent : '';
    let agencyStr = selectedAgency !== 'Undefined' ? `{${selectedAgency.toUpperCase()}}` : '';
    let vectorStr = selectedVector !== 'Undefined' ? `{${selectedVector}}` : '';
    let fileStr = selectedFile !== 'Matrix Undefined' ? `@${selectedFile}` : '';
    
    const parts = [];
    if (intentStr) parts.push(intentStr);
    if (agencyStr) parts.push(agencyStr);
    if (vectorStr) parts.push(vectorStr);
    if (fileStr) parts.push(fileStr);
    
    const promptLineText = `{${parts.join(' - ')}}`;
    const fullText = `${promptLineText}\n\n${suggestion}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
      AudioEngine.play('data-lock');
      copyStatus = true;
      if (textareaElement) {
        textareaElement.select();
      }
      setTimeout(() => {
        copyStatus = false;
      }, 2000);
    });
  }

  async function handleCommit() {
    if (!suggestion.trim()) {
      AudioEngine.play('error');
      commitStatus = 'ERROR: EMPTY CONTENT DETECTED';
      return;
    }

    AudioEngine.play('success');
    const newLog = {
      timestamp: $editingEntry ? $editingEntry.timestamp : new Date().toISOString().replace('T', ' ').substring(0, 19),
      category: selectedIntent,
      agency: selectedAgency,
      location: selectedFile,
      priority: selectedPriority,
      tolerance: selectedTolerance,
      operator: selectedOperator,
      content: suggestion,
      vector: selectedVector,
      resolved: $editingEntry ? $editingEntry.resolved : false,
      resolved_at: $editingEntry ? $editingEntry.resolved_at : null
    };

    let updatedLogs = [...pastLogs];
    if ($editingEntryIndex !== -1) {
      updatedLogs[$editingEntryIndex] = newLog;
    } else {
      updatedLogs = [newLog, ...pastLogs];
    }

    if (window.stratagemAPI) {
      try {
        const result = await window.stratagemAPI.intelWriteQuotes('improvements.json', JSON.stringify(updatedLogs, null, 2));
        if (result && result.success) {
          clearInputs();
          $editingEntry = null;
          $editingEntryIndex = -1;
          commitStatus = '';
          onCommitSuccess();
          toggleModal();
        } else {
          commitStatus = 'ERROR: ' + (result?.error || 'WRITE FAILED');
        }
      } catch (err: any) {
        commitStatus = 'ERROR: ' + err.message.toUpperCase();
      }
    } else {
      clearInputs();
      $editingEntry = null;
      $editingEntryIndex = -1;
      commitStatus = '';
      onCommitSuccess();
      toggleModal();
    }
  }

  function clearInputs() {
    selectedIntent = 'Matrix Undefined';
    selectedAgency = 'Undefined';
    selectedVector = 'Undefined';
    selectedFile = 'Matrix Undefined';
    selectedL1 = null;
    selectedL2 = null;
    selectedL3 = null;
    selectedL4 = null;
    selectedL5 = null;
    suggestion = '';
    commitStatus = '';
    neuralUplinkDraft.set({
      category: 'Matrix Undefined',
      agency: 'Undefined',
      vector: 'Undefined',
      location: 'Matrix Undefined',
      priority: 'ELEVATED',
      tolerance: 'STRICT',
      operator: 'ANTIGRAVITY',
      content: ''
    });
    AudioEngine.play('data-lock');
  }

  function handleCloseDiscard() {
    clearInputs();
    $editingEntry = null;
    $editingEntryIndex = -1;
    toggleModal();
  }
</script>

<svelte:window onclick={closeAllDropdowns} />

{#if isModalOpen}
  <div class="uplink-overlay" transition:fade={{ duration: 250 }}>
    <div class="uplink-card font-mono">
      <header class="uplink-header">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="header-content-wrapper"
          role="presentation"
          class:hovered={isHeaderHovered}
          onmouseenter={() => { isHeaderHovered = true; AudioEngine.play('data-decode'); }}
          onmouseleave={() => isHeaderHovered = false}
        >
          <div class="neural-logo">
            <svg viewBox="0 0 100 100" class="logo-svg">
              <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="none" stroke="rgba(0, 255, 255, 0.25)" stroke-width="1.2" class="logo-polygon" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#logo-grad)" stroke-width="2" class="outer-ring" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="6 4" class="inner-ring" />
              <path d="M50 15 L50 85 M15 50 L85 50 M25 25 L75 75 M25 75 L75 25" stroke="#00ffff" stroke-width="2" class="logo-cross" />
              <circle cx="50" cy="50" r="6" fill="#ffffff" class="logo-core" />
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#8b5cf6">
                    <animate attributeName="stop-color" values="#8b5cf6; #00ffff; #ec4899; #8b5cf6" dur="6s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stop-color="#00ffff">
                    <animate attributeName="stop-color" values="#00ffff; #ec4899; #8b5cf6; #00ffff" dur="6s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                <linearGradient id="logo-grad-hover" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#ff2d55" />
                  <stop offset="50%" stop-color="#ec4899" />
                  <stop offset="100%" stop-color="#00ff9f" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="title-stack">
            <h1 class="uplink-main-title">NEURAL UPLINK</h1>
            <span class="uplink-subtitle">OSTINATO RIGORE - RIGOROUS PERSISTENCE</span>
          </div>
        </div>

        <div class="header-actions">
          <button 
            type="button" 
            class="btn-copy-header" 
            class:copied={copyStatus}
            onclick={copyTerminalContent}
            onmouseenter={() => AudioEngine.play('ui-hover')}
          >
            {copyStatus ? 'COPIED ✓' : 'COPY'}
          </button>

          <button type="button" class="btn-commit-header slice-light-btn" onclick={handleCommit} onmouseenter={() => AudioEngine.play('ui-hover')}>
            <div class="slice-light-effect"></div>
            COMMIT
          </button>

          <button type="button" class="btn-clear-header" onclick={clearInputs} onmouseenter={() => AudioEngine.play('ui-hover')}>
            CLEAR
          </button>

          <button type="button" class="btn-suspend-header" onclick={toggleModal} onmouseenter={() => AudioEngine.play('ui-hover')}>
            SUSPEND
          </button>

          <button type="button" class="uplink-close-btn red-slice-btn" aria-label="Close Neural Uplink" onclick={handleCloseDiscard} onmouseenter={() => AudioEngine.play('ui-hover')}>
            <div class="slice-effect"></div>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {#if commitStatus}
        <div class="status-strip" class:err={commitStatus.startsWith('ERROR')}>
          <div class="status-content">
            <span class="status-icon">{commitStatus.startsWith('ERROR') ? '⚠️' : '✅'}</span>
            <span class="status-text">{commitStatus}</span>
          </div>
        </div>
      {/if}

      <div class="uplink-body">
        <div class="uplink-grid-layout">
          <!-- LEFT PORTION: TARGET SPECIFICATION MATRIX -->
          <aside class="uplink-sidebar" class:dropdown-active={openDropdown !== null}>
            <div class="sidebar-header">
              <span class="header-led"></span>
              <span class="header-title">TARGET SPECIFICATION MATRIX</span>
            </div>
            
            <div class="dropdowns-stack">
              <!-- PROTOCOL INTENT -->
              <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'intent'} class:active-undefined={selectedIntent === 'Matrix Undefined'}>
                <span class="cyber-label">PROTOCOL INTENT</span>
                <div class="cyber-select-wrapper">
                  <button 
                    type="button"
                    class="cyber-select-trigger trigger-intent" 
                    class:open={openDropdown === 'intent'}
                    class:undefined-trigger={selectedIntent === 'Matrix Undefined'}
                    onclick={(e) => { e.stopPropagation(); toggleDropdown('intent'); }}
                  >
                    <span class="trigger-val">{intentOptions.find(o => o.value === selectedIntent)?.label || 'UNDEFINED'}</span>
                    <span class="trigger-chevron">⧽</span>
                  </button>
                  {#if openDropdown === 'intent'}
                    <div class="cyber-dropdown-menu" transition:fade={{ duration: 100 }}>
                      {#each intentOptions as opt}
                        <button 
                          type="button"
                          class="cyber-dropdown-option" 
                          class:active={selectedIntent === opt.value}
                          class:active-undefined={opt.value === 'Matrix Undefined'}
                          onclick={() => { selectedIntent = opt.value; openDropdown = null; AudioEngine.play('data-lock'); }}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">{opt.label}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- MODIFICATION AGENCY -->
              <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'agency'} class:active-undefined={selectedAgency === 'Undefined'}>
                <span class="cyber-label">MODIFICATION AGENCY</span>
                <div class="cyber-select-wrapper">
                  <button 
                    type="button"
                    class="cyber-select-trigger trigger-agency" 
                    class:open={openDropdown === 'agency'}
                    class:undefined-trigger={selectedAgency === 'Undefined'}
                    onclick={(e) => { e.stopPropagation(); toggleDropdown('agency'); }}
                  >
                    <span class="trigger-val">{agencyOptions.find(o => o.value === selectedAgency)?.label || 'UNDEFINED'}</span>
                    <span class="trigger-chevron">⧽</span>
                  </button>
                  {#if openDropdown === 'agency'}
                    <div class="cyber-dropdown-menu" transition:fade={{ duration: 100 }}>
                      {#each agencyOptions as opt}
                        <button 
                          type="button"
                          class="cyber-dropdown-option" 
                          class:active={selectedAgency === opt.value}
                          class:active-undefined={opt.value === 'Undefined'}
                          onclick={() => { selectedAgency = opt.value; openDropdown = null; AudioEngine.play('data-lock'); }}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">{opt.label}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- COGNITIVE VECTOR -->
              <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'vector'} class:active-undefined={selectedVector === 'Undefined'}>
                <span class="cyber-label">COGNITIVE VECTOR</span>
                <div class="cyber-select-wrapper">
                  <button 
                    type="button"
                    class="cyber-select-trigger trigger-vector" 
                    class:open={openDropdown === 'vector'}
                    class:undefined-trigger={selectedVector === 'Undefined'}
                    onclick={(e) => { e.stopPropagation(); toggleDropdown('vector'); }}
                  >
                    <span class="trigger-val">{vectorOptions.find(o => o.value === selectedVector)?.label || 'UNDEFINED'}</span>
                    <span class="trigger-chevron">⧽</span>
                  </button>
                  {#if openDropdown === 'vector'}
                    <div class="cyber-dropdown-menu" transition:fade={{ duration: 100 }}>
                      {#each vectorOptions as opt}
                        <button 
                          type="button"
                          class="cyber-dropdown-option" 
                          class:active={selectedVector === opt.value}
                          class:active-undefined={opt.value === 'Undefined'}
                          onclick={() => { selectedVector = opt.value; openDropdown = null; AudioEngine.play('data-lock'); }}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">{opt.label}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- LEVEL 1: SECTOR LOCATOR -->
              <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'l1'} class:active-undefined={selectedL1 === null}>
                <span class="cyber-label">SECTOR LOCATOR</span>
                <div class="cyber-select-wrapper">
                  <button 
                    type="button"
                    class="cyber-select-trigger trigger-layer" 
                    class:open={openDropdown === 'l1'}
                    class:undefined-trigger={selectedL1 === null}
                    class:trigger-folder={selectedL1 !== null}
                    onclick={(e) => { e.stopPropagation(); toggleDropdown('l1'); }}
                  >
                    <span class="trigger-val">
                      {#if selectedL1 !== null}
                        <span class="opt-type-glyph">⧓</span>
                      {/if}
                      {selectedL1 ? selectedL1.name.toUpperCase() : 'UNDEFINED'}
                    </span>
                    <span class="trigger-chevron">⧽</span>
                  </button>
                  {#if openDropdown === 'l1'}
                    <div class="cyber-dropdown-menu scrollable" transition:fade={{ duration: 100 }}>
                      <button 
                        type="button"
                        class="cyber-dropdown-option active-undefined" 
                        class:active={selectedL1 === null}
                        onclick={() => selectL1(null)}
                      >
                        <span class="opt-indicator"></span>
                        <span class="opt-text">UNDEFINED</span>
                      </button>
                      {#each fileSystemTree as opt}
                        <button 
                          type="button"
                          class="cyber-dropdown-option item-folder" 
                          class:active={selectedL1 === opt}
                          onclick={() => selectL1(opt)}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-type-glyph">⧓</span>
                          <span class="opt-text">{opt.name}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- LEVEL 2 -->
              {#if selectedL1 && selectedL1.children && selectedL1.children.length > 0}
                <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'l2'} class:active-undefined={selectedL2 === null}>
                  <span class="cyber-label">PATH LAYER 02</span>
                  <div class="cyber-select-wrapper">
                    <button 
                      type="button"
                      class="cyber-select-trigger trigger-layer" 
                      class:open={openDropdown === 'l2'}
                      class:undefined-trigger={selectedL2 === null}
                      class:trigger-folder={selectedL2?.type === 'folder'}
                      class:trigger-file={selectedL2?.type === 'file'}
                      onclick={(e) => { e.stopPropagation(); toggleDropdown('l2'); }}
                    >
                      <span class="trigger-val">
                        {#if selectedL2 !== null}
                          <span class="opt-type-glyph">{selectedL2.type === 'folder' ? '⧓' : '⧽'}</span>
                        {/if}
                        {selectedL2 ? selectedL2.name : 'UNDEFINED'}
                      </span>
                      <span class="trigger-chevron">⧽</span>
                    </button>
                    {#if openDropdown === 'l2'}
                      <div class="cyber-dropdown-menu scrollable" transition:fade={{ duration: 100 }}>
                        <button 
                          type="button"
                          class="cyber-dropdown-option active-undefined" 
                          class:active={selectedL2 === null}
                          onclick={() => selectL2(null)}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">UNDEFINED</span>
                        </button>
                        {#each selectedL1.children as opt}
                          <button 
                            type="button"
                            class="cyber-dropdown-option" 
                            class:item-folder={opt.type === 'folder'}
                            class:item-file={opt.type === 'file'}
                            class:active={selectedL2 === opt}
                            onclick={() => selectL2(opt)}
                          >
                            <span class="opt-indicator"></span>
                            <span class="opt-type-glyph">{opt.type === 'folder' ? '⧓' : '⧽'}</span>
                            <span class="opt-text">{opt.name}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- LEVEL 3 -->
              {#if selectedL2 && selectedL2.children && selectedL2.children.length > 0}
                <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'l3'} class:active-undefined={selectedL3 === null}>
                  <span class="cyber-label">PATH LAYER 03</span>
                  <div class="cyber-select-wrapper">
                    <button 
                      type="button"
                      class="cyber-select-trigger trigger-layer" 
                      class:open={openDropdown === 'l3'}
                      class:undefined-trigger={selectedL3 === null}
                      class:trigger-folder={selectedL3?.type === 'folder'}
                      class:trigger-file={selectedL3?.type === 'file'}
                      onclick={(e) => { e.stopPropagation(); toggleDropdown('l3'); }}
                    >
                      <span class="trigger-val">
                        {#if selectedL3 !== null}
                          <span class="opt-type-glyph">{selectedL3.type === 'folder' ? '⧓' : '⧽'}</span>
                        {/if}
                        {selectedL3 ? selectedL3.name : 'UNDEFINED'}
                      </span>
                      <span class="trigger-chevron">⧽</span>
                    </button>
                    {#if openDropdown === 'l3'}
                      <div class="cyber-dropdown-menu scrollable" transition:fade={{ duration: 100 }}>
                        <button 
                          type="button"
                          class="cyber-dropdown-option active-undefined" 
                          class:active={selectedL3 === null}
                          onclick={() => selectL3(null)}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">UNDEFINED</span>
                        </button>
                        {#each selectedL2.children as opt}
                          <button 
                            type="button"
                            class="cyber-dropdown-option" 
                            class:item-folder={opt.type === 'folder'}
                            class:item-file={opt.type === 'file'}
                            class:active={selectedL3 === opt}
                            onclick={() => selectL3(opt)}
                          >
                            <span class="opt-indicator"></span>
                            <span class="opt-type-glyph">{opt.type === 'folder' ? '⧓' : '⧽'}</span>
                            <span class="opt-text">{opt.name}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- LEVEL 4 -->
              {#if selectedL3 && selectedL3.children && selectedL3.children.length > 0}
                <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'l4'} class:active-undefined={selectedL4 === null}>
                  <span class="cyber-label">PATH LAYER 04</span>
                  <div class="cyber-select-wrapper">
                    <button 
                      type="button"
                      class="cyber-select-trigger trigger-layer" 
                      class:open={openDropdown === 'l4'}
                      class:undefined-trigger={selectedL4 === null}
                      class:trigger-folder={selectedL4?.type === 'folder'}
                      class:trigger-file={selectedL4?.type === 'file'}
                      onclick={(e) => { e.stopPropagation(); toggleDropdown('l4'); }}
                    >
                      <span class="trigger-val">
                        {#if selectedL4 !== null}
                          <span class="opt-type-glyph">{selectedL4.type === 'folder' ? '⧓' : '⧽'}</span>
                        {/if}
                        {selectedL4 ? selectedL4.name : 'UNDEFINED'}
                      </span>
                      <span class="trigger-chevron">⧽</span>
                    </button>
                    {#if openDropdown === 'l4'}
                      <div class="cyber-dropdown-menu scrollable" transition:fade={{ duration: 100 }}>
                        <button 
                          type="button"
                          class="cyber-dropdown-option active-undefined" 
                          class:active={selectedL4 === null}
                          onclick={() => selectL4(null)}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">UNDEFINED</span>
                        </button>
                        {#each selectedL3.children as opt}
                          <button 
                            type="button"
                            class="cyber-dropdown-option" 
                            class:item-folder={opt.type === 'folder'}
                            class:item-file={opt.type === 'file'}
                            class:active={selectedL4 === opt}
                            onclick={() => selectL4(opt)}
                          >
                            <span class="opt-indicator"></span>
                            <span class="opt-type-glyph">{opt.type === 'folder' ? '⧓' : '⧽'}</span>
                            <span class="opt-text">{opt.name}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- LEVEL 5 -->
              {#if selectedL4 && selectedL4.children && selectedL4.children.length > 0}
                <div class="cyber-dropdown-group" class:active-dropdown={openDropdown === 'l5'} class:active-undefined={selectedL5 === null}>
                  <span class="cyber-label">PATH LAYER 05</span>
                  <div class="cyber-select-wrapper">
                    <button 
                      type="button"
                      class="cyber-select-trigger trigger-layer" 
                      class:open={openDropdown === 'l5'}
                      class:undefined-trigger={selectedL5 === null}
                      class:trigger-folder={selectedL5?.type === 'folder'}
                      class:trigger-file={selectedL5?.type === 'file'}
                      onclick={(e) => { e.stopPropagation(); toggleDropdown('l5'); }}
                    >
                      <span class="trigger-val">
                        {#if selectedL5 !== null}
                          <span class="opt-type-glyph">{selectedL5.type === 'folder' ? '⧓' : '⧽'}</span>
                        {/if}
                        {selectedL5 ? selectedL5.name : 'UNDEFINED'}
                      </span>
                      <span class="trigger-chevron">⧽</span>
                    </button>
                    {#if openDropdown === 'l5'}
                      <div class="cyber-dropdown-menu scrollable" transition:fade={{ duration: 100 }}>
                        <button 
                          type="button"
                          class="cyber-dropdown-option active-undefined" 
                          class:active={selectedL5 === null}
                          onclick={() => selectL5(null)}
                        >
                          <span class="opt-indicator"></span>
                          <span class="opt-text">UNDEFINED</span>
                        </button>
                        {#each selectedL4.children as opt}
                          <button 
                            type="button"
                            class="cyber-dropdown-option" 
                            class:item-folder={opt.type === 'folder'}
                            class:item-file={opt.type === 'file'}
                            class:active={selectedL5 === opt}
                            onclick={() => selectL5(opt)}
                          >
                            <span class="opt-indicator"></span>
                            <span class="opt-type-glyph">{opt.type === 'folder' ? '⧓' : '⧽'}</span>
                            <span class="opt-text">{opt.name}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>

            <!-- PORTIONS SUMMARY AREA (REPLACES FOOTER SPACE IN SIDEBAR) -->
            <div class="sidebar-portions font-mono">
              <div class="portion-indicator">
                <span class="p-label">INTENT:</span>
                <span class="p-val" class:val-undefined={selectedIntent === 'Matrix Undefined'}>{selectedIntent === 'Matrix Undefined' ? 'UNDEFINED' : selectedIntent}</span>
              </div>
              <div class="portion-indicator">
                <span class="p-label">AGENCY:</span>
                <span class="p-val agency-p-val" class:val-undefined={selectedAgency === 'Undefined'}>{selectedAgency === 'Undefined' ? 'UNDEFINED' : selectedAgency.toUpperCase()}</span>
              </div>
              <div class="portion-indicator">
                <span class="p-label">VECTOR:</span>
                <span class="p-val" class:val-undefined={selectedVector === 'Undefined'}>{selectedVector === 'Undefined' ? 'UNDEFINED' : selectedVector}</span>
              </div>
              <div class="portion-indicator">
                <span class="p-label">TARGET:</span>
                <span class="p-val file-p-val" class:val-undefined={selectedFile === 'Matrix Undefined'}>
                  {selectedFile === 'Matrix Undefined' ? 'UNDEFINED' : '@' + selectedFile.split('/').pop()}
                </span>
              </div>
            </div>
          </aside>

          <!-- RIGHT PORTION: Suggestion Dispatch Deck is now the main Input Console itself -->
          <main class="uplink-main">
            <div class="console-prompt-line">
              <span class="prompt-bracket font-mono">&#123;</span>
              {#if selectedIntent !== 'Matrix Undefined'}
                <span class="prompt-intent font-mono">{selectedIntent}</span>
              {/if}
              
              {#if selectedIntent !== 'Matrix Undefined' && selectedAgency !== 'Undefined'}
                <span class="prompt-divider font-mono"> - </span>
              {/if}

              {#if selectedAgency !== 'Undefined'}
                <span class="prompt-agency-wrapper font-mono">
                  <span class="prompt-agency-brace">&#123;</span>
                  <span class="prompt-agency">{selectedAgency.toUpperCase()}</span>
                  <span class="prompt-agency-brace">&#125;</span>
                </span>
              {/if}

              {#if (selectedIntent !== 'Matrix Undefined' || selectedAgency !== 'Undefined') && selectedVector !== 'Undefined'}
                <span class="prompt-divider font-mono"> - </span>
              {/if}

              {#if selectedVector !== 'Undefined'}
                <span class="prompt-vector-wrapper font-mono">
                  <span class="prompt-vector-brace">&#123;</span>
                  <span class="prompt-vector">{selectedVector}</span>
                  <span class="prompt-vector-brace">&#125;</span>
                </span>
              {/if}

              {#if (selectedIntent !== 'Matrix Undefined' || selectedAgency !== 'Undefined' || selectedVector !== 'Undefined') && selectedFile !== 'Matrix Undefined'}
                <span class="prompt-divider font-mono"> - </span>
              {/if}

              {#if selectedFile !== 'Matrix Undefined'}
                <span class="prompt-file font-mono">@{selectedFile}</span>
              {/if}
              <span class="prompt-bracket font-mono">&#125;</span>
              <span class="prompt-caret">⧽</span>
            </div>
            
            <textarea 
              class="cyber-textarea" 
              placeholder="ENTER TACTICAL SUGGESTION OR PROTOCOL SPECIFICATION..." 
              bind:value={suggestion}
              bind:this={textareaElement}
              onkeydown={handleKeyDown}
              spellcheck={false}
            ></textarea>
          </main>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .uplink-overlay {
    position: fixed;
    top: 80px; /* Aligns beneath the 80px applications-topnavbar */
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    background: rgba(1, 1, 3, 0.92);
    backdrop-filter: blur(25px) saturate(180%);
    z-index: 100000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 4vh;
    will-change: opacity;
  }

  .uplink-card {
    width: 82%; /* Increased by 4% from 78% */
    max-width: 1176px; /* Increased by 4% from 1120px */
    height: 82vh; /* Increased by 4% from 78vh */
    background: linear-gradient(165deg, #0a0b14 0%, #030408 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 44px;
    box-shadow: 
      0 60px 120px rgba(0, 0, 0, 0.9),
      inset 0 0 60px rgba(139, 92, 246, 0.08),
      0 0 40px rgba(139, 92, 246, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    font-weight: 950 !important;
    will-change: transform, opacity;
  }

  /* HEADER UPGRADE */
  .uplink-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 40px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s ease;
  }
  .uplink-header:hover {
    background: rgba(139, 92, 246, 0.05);
  }

  .header-content-wrapper {
    display: flex;
    align-items: center;
    gap: 20px;
    cursor: pointer;
    transition: all 0.4s ease;
  }

  .neural-logo {
    width: 56px;
    height: 56px;
  }
  .logo-svg {
    width: 100%;
    height: 100%;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .outer-ring {
    transform-origin: center;
    animation: rotateCW 10s linear infinite;
    transition: all 0.4s ease;
  }
  .inner-ring {
    transform-origin: center;
    animation: rotateCCW 6s linear infinite;
    transition: all 0.4s ease;
  }
  .logo-polygon {
    transform-origin: center;
    animation: rotateCCW 20s linear infinite;
    transition: all 0.4s ease;
  }
  .logo-cross {
    transform-origin: center;
    animation: pulseScale 3s ease-in-out infinite;
    transition: all 0.4s ease;
  }
  .logo-core {
    transition: all 0.4s ease;
  }

  @keyframes rotateCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes rotateCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes pulseScale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
  
  @keyframes pulseScaleRapid {
    0% { transform: scale(1) rotate(0deg); }
    100% { transform: scale(1.25) rotate(45deg); }
  }

  /* HOVER STYLES FOR THE LOGO & WRAPPER */
  .header-content-wrapper.hovered .outer-ring {
    animation: rotateCW 2.5s linear infinite;
    stroke: url(#logo-grad-hover);
    filter: drop-shadow(0 0 8px #ff2d55);
  }

  .header-content-wrapper.hovered .inner-ring {
    animation: rotateCCW 1.8s linear infinite;
    stroke: #ff2d55;
    filter: drop-shadow(0 0 6px #ff2d55);
  }

  .header-content-wrapper.hovered .logo-polygon {
    animation: rotateCW 6s linear infinite;
    stroke: #00ff9f;
    stroke-width: 1.8px;
    filter: drop-shadow(0 0 10px #00ff9f);
  }

  .header-content-wrapper.hovered .logo-cross {
    animation: pulseScaleRapid 0.8s ease-in-out infinite alternate;
    stroke: #00ffff;
    filter: drop-shadow(0 0 8px #00ffff);
  }

  .header-content-wrapper.hovered .logo-core {
    fill: #00ff9f;
    filter: drop-shadow(0 0 12px #00ff9f);
  }

  .header-content-wrapper.hovered .logo-svg {
    transform: scale(1.12);
    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.4));
  }

  .title-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .uplink-main-title {
    margin: 0;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 32px;
    font-weight: 990 !important;
    letter-spacing: 0.22em;
    background: linear-gradient(90deg, #fff, #8b5cf6, #00ffff, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: chromaFlow 6s linear infinite;
    text-shadow: 0 0 30px rgba(139, 92, 246, 0.5), 0 0 10px rgba(0, 255, 255, 0.3);
    transition: all 0.4s ease;
  }
  @keyframes chromaFlow { to { background-position: 200% center; } }

  .uplink-subtitle {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11.5px;
    font-weight: 950 !important;
    letter-spacing: 0.29em;
    color: rgba(139, 92, 246, 0.65);
    text-transform: uppercase;
    margin-top: -2px;
    display: block;
    text-shadow: 0 0 5px rgba(139, 92, 246, 0.2);
    transition: all 0.4s ease;
  }

  .header-content-wrapper.hovered .uplink-main-title {
    background: linear-gradient(90deg, #ff2d55, #ec4899, #00ff9f, #ff2d55);
    background-size: 200% auto;
    animation: chromaFlow 1.5s linear infinite;
    text-shadow: 0 0 45px rgba(236, 72, 153, 0.9), 0 0 15px rgba(0, 255, 159, 0.5);
    transform: scale(1.02);
  }

  .header-content-wrapper.hovered .uplink-subtitle {
    color: #ff2d55;
    text-shadow: 0 0 15px rgba(255, 45, 85, 0.9);
  }

  /* HEADER ACTIONS BLOCK */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .btn-commit-header {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 950 !important;
    border: none;
    color: #fff;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }
  .btn-commit-header:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
  }

  /* CLOSE BUTTON - RED GRADIENT & SLICE */
  .red-slice-btn {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #ff2d55, #6f0a3e);
    border: none;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 15px rgba(255, 45, 85, 0.3);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .red-slice-btn:hover {
    transform: scale(1.05) rotate(90deg);
    box-shadow: 0 0 25px rgba(255, 45, 85, 0.6);
  }

  .slice-effect {
    position: absolute;
    top: 0;
    left: -150%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    transform: skewX(-25deg);
    animation: sliceAnim 3s infinite linear;
  }
  @keyframes sliceAnim {
    0% { left: -150%; }
    20% { left: 150%; }
    100% { left: 150%; }
  }

  /* BODY LAYOUT */
  .uplink-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .uplink-grid-layout {
    display: grid;
    grid-template-columns: 460px 1fr;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .uplink-sidebar {
    background: rgba(0, 0, 0, 0.2);
    border-right: 1px solid rgba(139, 92, 246, 0.15);
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
    transition: all 0.4s ease;
  }

  /* ACTIVE DROPDOWN BACKGROUND BLUR FOR LEFT SIDE */
  .uplink-sidebar.dropdown-active .cyber-dropdown-group:not(.active-dropdown) {
    filter: blur(8px);
    opacity: 0.3;
    pointer-events: none;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
    margin-bottom: 8px;
  }

  .header-led {
    width: 8px;
    height: 8px;
    background: #8b5cf6;
    border-radius: 50%;
    box-shadow: 0 0 8px #8b5cf6;
  }

  .header-title {
    font-family: 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 950 !important;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.75);
  }

  .dropdowns-stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .cyber-dropdown-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    transition: all 0.3s ease;
  }

  .cyber-label {
    font-size: 0.82rem;
    font-weight: 950 !important;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 4px;
    display: block;
  }

  .cyber-select-wrapper {
    position: relative;
    width: 100%;
  }

  /* BUTTON-LIKE SELECT TRIGGER */
  .cyber-select-trigger {
    width: 100%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 950 !important;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    outline: none;
    box-sizing: border-box;
    text-shadow: 0 0 1px currentColor;
  }

  .cyber-select-trigger:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(139, 92, 246, 0.5);
    color: #fff;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
  }

  .cyber-select-trigger.open {
    border-color: #8b5cf6;
    color: #fff;
    background: rgba(139, 92, 246, 0.08);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
  }

  /* Defined trigger states (active selections) */
  .cyber-select-trigger.trigger-intent:not(.undefined-trigger) {
    border-color: rgba(167, 139, 250, 0.45);
    color: #c084fc;
    background: rgba(167, 139, 250, 0.05);
    box-shadow: 0 0 12px rgba(167, 139, 250, 0.12);
  }
  .cyber-select-trigger.trigger-intent:not(.undefined-trigger):hover {
    border-color: rgba(167, 139, 250, 0.7);
    color: #d8b4fe;
    box-shadow: 0 0 15px rgba(167, 139, 250, 0.25);
  }

  .cyber-select-trigger.trigger-agency:not(.undefined-trigger) {
    border-color: rgba(251, 146, 60, 0.45);
    color: #fb923c;
    background: rgba(251, 146, 60, 0.05);
    box-shadow: 0 0 12px rgba(251, 146, 60, 0.12);
  }
  .cyber-select-trigger.trigger-agency:not(.undefined-trigger):hover {
    border-color: rgba(251, 146, 60, 0.7);
    color: #fed7aa;
    box-shadow: 0 0 15px rgba(251, 146, 60, 0.25);
  }

  .cyber-select-trigger.trigger-vector:not(.undefined-trigger) {
    border-color: rgba(34, 211, 238, 0.45);
    color: #22d3ee;
    background: rgba(34, 211, 238, 0.05);
    box-shadow: 0 0 12px rgba(34, 211, 238, 0.12);
  }
  .cyber-select-trigger.trigger-vector:not(.undefined-trigger):hover {
    border-color: rgba(34, 211, 238, 0.7);
    color: #67e8f9;
    box-shadow: 0 0 15px rgba(34, 211, 238, 0.25);
  }

  .cyber-select-trigger.trigger-layer:not(.undefined-trigger) {
    border-color: rgba(74, 222, 128, 0.45);
    color: #4ade80;
    background: rgba(74, 222, 128, 0.05);
    box-shadow: 0 0 12px rgba(74, 222, 128, 0.12);
  }
  .cyber-select-trigger.trigger-layer:not(.undefined-trigger):hover {
    border-color: rgba(74, 222, 128, 0.7);
    color: #86efac;
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.25);
  }

  /* Undefined trigger states (default values) */
  .cyber-select-trigger.undefined-trigger {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.35);
  }
  .cyber-select-trigger.undefined-trigger:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.55);
  }
  .cyber-select-trigger.undefined-trigger.open {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.65);
    box-shadow: none;
  }

  .trigger-val {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 85%;
    font-weight: 950 !important;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  :global(.file-val) {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    font-weight: 950 !important;
    color: #00ffff;
  }

  .trigger-chevron {
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
    transition: transform 0.3s ease;
  }

  .cyber-select-trigger.open .trigger-chevron {
    transform: rotate(90deg) scaleX(-1);
    color: #8b5cf6;
  }

  /* CYBER DROPDOWN MENU */
  .cyber-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 100%;
    background: #090a12;
    border: 1px solid #8b5cf6;
    border-radius: 14px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.2);
    z-index: 1000;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
  }

  .cyber-dropdown-menu.scrollable {
    max-height: 220px;
    overflow-y: auto;
  }

  .cyber-dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  .cyber-dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }
  .cyber-dropdown-menu::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 3px;
  }
  .cyber-dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: #8b5cf6;
  }

  .cyber-dropdown-option {
    width: 100%;
    background: transparent;
    border: none;
    padding: 10px 14px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    font-weight: 950 !important;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    outline: none;
    text-shadow: 0 0 1px currentColor, 0 0 1px currentColor;
  }

  .cyber-dropdown-option:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #fff;
  }

  .cyber-dropdown-option.active {
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.18), rgba(139, 92, 246, 0.18));
    color: #fff;
    border: 1px solid rgba(236, 72, 153, 0.35);
  }

  .cyber-dropdown-option.active.active-undefined {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* Folder & File dropdown options coloring */
  .cyber-dropdown-option.item-folder {
    color: #38bdf8;
  }
  .cyber-dropdown-option.item-folder:hover {
    background: rgba(56, 189, 248, 0.12);
    color: #fff;
  }
  .cyber-dropdown-option.item-file {
    color: #4ade80;
  }
  .cyber-dropdown-option.item-file:hover {
    background: rgba(74, 222, 128, 0.12);
    color: #fff;
  }

  .opt-type-glyph {
    font-size: 10px;
    font-weight: 900;
    margin-right: 4px;
    opacity: 0.8;
  }
  .item-folder .opt-type-glyph {
    color: #0ea5e9;
  }
  .item-file .opt-type-glyph {
    color: #22c55e;
  }

  .opt-indicator {
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .cyber-dropdown-option:hover .opt-indicator {
    background: #00ffff;
    box-shadow: 0 0 6px #00ffff;
  }

  .cyber-dropdown-option.active .opt-indicator {
    background: #ec4899;
    box-shadow: 0 0 8px #ec4899;
  }

  .cyber-dropdown-option.active.active-undefined .opt-indicator {
    background: rgba(255, 255, 255, 0.4);
    box-shadow: none;
  }

  .opt-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.file-text) {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    font-weight: 950 !important;
  }

  /* RIGHT PORTION IS INPUT BOX */
  .uplink-main {
    display: flex;
    flex-direction: column;
    background: rgba(13, 15, 28, 0.75); /* Not pure black, dark space indigo/violet bg */
    border-left: 1px solid rgba(139, 92, 246, 0.15);
    padding: 32px 40px;
    position: relative;
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.6);
    transition: all 0.4s ease;
    box-sizing: border-box;
    overflow: hidden;
    flex: 1;
  }

  .uplink-main:focus-within {
    background: rgba(17, 19, 38, 0.85);
    box-shadow: 
      inset 0 0 50px rgba(139, 92, 246, 0.08);
  }

  /* PROMPT LINE */
  .console-prompt-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    user-select: none;
    flex-wrap: wrap;
    min-height: 28px;
  }

  .console-prompt-line span {
    word-spacing: 0.18em;
    letter-spacing: 0.05em;
    font-weight: 950 !important;
  }

  .prompt-bracket {
    color: rgba(255, 255, 255, 0.15);
    font-size: 1.15rem;
    font-weight: 950 !important;
  }

  .prompt-intent {
    color: #c084fc;
    font-size: 1.05rem;
    font-weight: 950 !important;
    text-shadow: 0 0 10px rgba(192, 132, 252, 0.35);
  }

  .prompt-divider {
    color: rgba(255, 255, 255, 0.15);
    font-size: 1.05rem;
    font-weight: 950 !important;
  }

  .prompt-agency-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .prompt-agency-brace {
    color: rgba(251, 146, 60, 0.35);
    font-size: 1.05rem;
    font-weight: 950 !important;
  }

  .prompt-agency {
    color: #fb923c;
    font-size: 1.05rem;
    font-weight: 950 !important;
    text-shadow: 0 0 10px rgba(251, 146, 60, 0.35);
  }

  .prompt-vector-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .prompt-vector-brace {
    color: rgba(34, 211, 238, 0.35);
    font-size: 1.05rem;
    font-weight: 950 !important;
  }

  .prompt-vector {
    color: #22d3ee;
    font-size: 1.05rem;
    font-weight: 950 !important;
    text-shadow: 0 0 10px rgba(34, 211, 238, 0.35);
  }

  .prompt-file {
    color: #4ade80;
    font-size: 1.05rem;
    font-weight: 950 !important;
    text-shadow: 0 0 10px rgba(74, 222, 128, 0.35);
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  .prompt-caret {
    color: #8b5cf6;
    font-size: 18px;
    font-weight: 950 !important;
    margin-left: 2px;
    animation: caretPulse 1s infinite alternate;
  }

  @keyframes caretPulse {
    0% { opacity: 0.4; }
    100% { opacity: 1; text-shadow: 0 0 8px #8b5cf6; }
  }

  /* THE TEXTAREA */
  .cyber-textarea {
    width: 100%;
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 22px;
    font-weight: 950 !important;
    line-height: 1.6;
    outline: none;
    resize: none;
    padding: 0;
    margin: 0;
    font-family: 'Share Tech Mono', monospace;
  }

  .cyber-textarea::placeholder {
    color: rgba(255, 255, 255, 0.25);
    font-weight: 950 !important;
  }



  /* COPY BUTTON IN HEADER actions */
  .btn-copy-header {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 950 !important;
    border: none;
    color: #fff;
    background: linear-gradient(135deg, #06b6d4, #8b5cf6);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }

  .btn-clear-header {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 950 !important;
    border: none;
    color: #fff;
    background: linear-gradient(135deg, #eab308, #ca8a04);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.25);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }
  .btn-clear-header:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 0 25px rgba(234, 179, 8, 0.5);
  }

  .btn-suspend-header {
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 950 !important;
    border: none;
    color: #fff;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 15px rgba(37, 99, 235, 0.25);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }
  .btn-suspend-header:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 0 25px rgba(37, 99, 235, 0.5);
  }
  
  .btn-copy-header:hover {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 0 25px rgba(6, 182, 212, 0.5);
  }

  .btn-copy-header.copied {
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
  }

  /* SIDEBAR PORTIONS SUMMARY */
  .sidebar-portions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .portion-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 11px;
  }

  .p-label {
    color: rgba(255, 255, 255, 0.35);
    font-weight: 950 !important;
    font-size: 10px;
    letter-spacing: 0.05em;
  }

  .p-val {
    color: #8b5cf6;
    font-weight: 950 !important;
    text-shadow: 0 0 6px rgba(139, 92, 246, 0.2);
  }

  .p-val.val-undefined {
    color: rgba(255, 255, 255, 0.25) !important;
    text-shadow: none !important;
    font-weight: 950 !important;
  }

  .agency-p-val {
    color: #fb923c;
    text-shadow: 0 0 6px rgba(251, 146, 60, 0.2);
    font-weight: 950 !important;
  }

  .file-p-val {
    color: #00ffff;
    text-shadow: 0 0 6px rgba(0, 255, 255, 0.2);
  }

  .slice-light-btn .slice-light-effect {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transform: skewX(-20deg);
    animation: sliceLightAnim 4s infinite linear;
  }
  @keyframes sliceLightAnim {
    0% { left: -100%; }
    15% { left: 100%; }
    100% { left: 100%; }
  }

  .status-strip {
    background: rgba(16, 185, 129, 0.15);
    border-bottom: 1px solid rgba(16, 185, 129, 0.4);
    padding: 12px 32px;
  }
  .status-strip.err {
    background: rgba(239, 68, 68, 0.15);
    border-bottom: 1px solid rgba(239, 68, 68, 0.4);
  }
  .status-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .status-text {
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 950 !important;
    color: #ffffff;
  }

  /* Folder Trigger Styles */
  .cyber-select-trigger.trigger-folder {
    border-color: rgba(56, 189, 248, 0.45) !important;
    color: #38bdf8 !important;
    background: rgba(56, 189, 248, 0.05) !important;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.12) !important;
    text-shadow: 0 0 1px #38bdf8;
  }
  .cyber-select-trigger.trigger-folder:hover {
    border-color: rgba(56, 189, 248, 0.7) !important;
    color: #7dd3fc !important;
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.25) !important;
  }

  /* File Trigger Styles */
  .cyber-select-trigger.trigger-file {
    border-color: rgba(74, 222, 128, 0.45) !important;
    color: #4ade80 !important;
    background: rgba(74, 222, 128, 0.05) !important;
    box-shadow: 0 0 12px rgba(74, 222, 128, 0.12) !important;
    text-shadow: 0 0 1px #4ade80;
  }
  .cyber-select-trigger.trigger-file:hover {
    border-color: rgba(74, 222, 128, 0.7) !important;
    color: #86efac !important;
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.25) !important;
  }
</style>
