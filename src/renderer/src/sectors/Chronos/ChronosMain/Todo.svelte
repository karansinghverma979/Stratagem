<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';

  let {
    mode = 'viewport', // 'viewport' or 'sidebar'
    todoItems = $bindable([]),
    savedLists = $bindable([]),
    hideCompleted = $bindable(false),
    addLog,
    showChronosNotification
  } = $props();

  let todoSubMode = $state('active'); // 'active', 'browser', 'view_archive'
  let selectedArchiveList = $state<{ id: string; title: string; items: { text: string; done: boolean }[] } | null>(null);

  let currentListTitle = $state('DAILY OPERATIONS');
  let newTodoText = $state('');

  let objectiveTemplates = $state<string[]>([]);
  let newTemplateText = $state('');
  let editingTemplateIdx = $state(-1);
  let editingTemplateText = $state('');
  let highlightedTemplateIdx = $state(-1);

  let todoListEl = $state<HTMLDivElement | null>(null);
  let templateListEl = $state<HTMLDivElement | null>(null);

  const getTodayDateString = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const toggleTodo = (id: string) => {
    todoItems = todoItems.map(item => {
      if (item.id === id) {
        const nextDone = !item.done;
        addLog(`OBJECTIVE ${nextDone ? 'RESOLVED' : 'REOPENED'}: ${item.text.substring(0, 15)}...`);
        return { ...item, done: nextDone };
      }
      return item;
    });
    AudioEngine.play('data-lock');
  };

  const deleteTodo = (id: string) => {
    const deleted = todoItems.find(item => item.id === id);
    if (deleted) {
      addLog(`OBJECTIVE PURGED: ${deleted.text.substring(0, 15)}...`);
    }
    todoItems = todoItems.filter(item => item.id !== id);
    AudioEngine.play('fail');
  };

  const moveTodoUp = (id: string) => {
    const idx = todoItems.findIndex(item => item.id === id);
    if (idx > 0) {
      AudioEngine.play('ui-click');
      const nextTodos = [...todoItems];
      const temp = nextTodos[idx];
      nextTodos[idx] = nextTodos[idx - 1];
      nextTodos[idx - 1] = temp;
      todoItems = nextTodos;
      addLog(`OBJECTIVE MOVED UP: ${temp.text.substring(0, 15)}...`);
    }
  };

  const startEditing = (id: string) => {
    todoItems = todoItems.map(item => item.id === id ? { ...item, editing: true } : item);
    AudioEngine.play('ui-click');
  };

  const saveEditing = (id: string, newText: string) => {
    todoItems = todoItems.map(item => {
      if (item.id === id) {
        addLog(`OBJECTIVE REALIGNED: ${newText.substring(0, 15)}...`);
        return { ...item, text: newText.trim(), editing: false };
      }
      return item;
    });
    AudioEngine.play('data-lock');
  };

  const addTodo = (text: string) => {
    if (!text.trim()) return;
    todoItems = [...todoItems, { id: Math.random().toString(36).substring(2, 9), text: text.trim(), done: false, editing: false }];
    newTodoText = '';
    AudioEngine.play('ui-click');
    addLog(`OBJECTIVE ADDED: ${text.length > 20 ? text.substring(0, 17) + '...' : text}`);
    
    setTimeout(() => {
      if (todoListEl) {
        todoListEl.scrollTo({ top: todoListEl.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  };

  const addPresetTodo = (text: string) => {
    addTodo(text);
  };

  const saveListToArchive = async () => {
    if (todoItems.length === 0) {
      AudioEngine.play('fail');
      addLog("ARCHIVE FAILED: EMPTY LIST");
      return;
    }

    const datePrefix = getTodayDateString();
    const cleanTitle = currentListTitle.replace(/^\d{2}-\d{2}-\d{4}\s+/, '').trim();
    const finalTitle = `${datePrefix} ${cleanTitle || 'DAILY OPERATIONS'}`;
    
    const hasDuplicate = savedLists.some(list => {
      return list.title.toUpperCase() === finalTitle.toUpperCase();
    });

    if (hasDuplicate) {
      AudioEngine.play('fail');
      addLog(`DUPLICATE NAME DETECTED: ${finalTitle}`);
      showChronosNotification("DUPLICATE ARCHIVE DETECTED FOR TODAY. RENAME LIST TO AVOID OVERWRITE PROTOCOL.", "error");
      return;
    }

    const newList = {
      id: Math.random().toString(36).substring(2, 9),
      title: finalTitle,
      items: todoItems.map(item => ({ text: item.text, done: item.done }))
    };

    savedLists = [newList, ...savedLists.filter(l => l.title !== newList.title)].slice(0, 15);
    addLog(`LIST ARCHIVED: ${finalTitle}`);
    
    todoItems = [];
    currentListTitle = 'DAILY OPERATIONS';

    if (window.stratagemAPI) {
      try {
        await window.stratagemAPI.setConfig('chronosTodoLists', JSON.stringify(savedLists));
      } catch (err) {
        console.error('Failed to save Chronos Todo lists:', err);
      }
    }
  };

  const loadSavedList = (list: typeof savedLists[0]) => {
    AudioEngine.play('data-decode');
    currentListTitle = list.title;
    todoItems = list.items.map(item => ({
      id: Math.random().toString(36).substring(2, 9),
      text: item.text,
      done: item.done,
      editing: false
    }));
    addLog(`ARCHIVE RESTORED: ${list.title}`);
  };

  const deleteSavedList = async (id: string) => {
    const deleted = savedLists.find(l => l.id === id);
    if (deleted) {
      addLog(`ARCHIVE PURGED: ${deleted.title}`);
    }
    AudioEngine.play('fail');
    savedLists = savedLists.filter(l => l.id !== id);
    if (window.stratagemAPI) {
      try {
        await window.stratagemAPI.setConfig('chronosTodoLists', JSON.stringify(savedLists));
      } catch (err) {
        console.error('Failed to update Chronos Todo lists config:', err);
      }
    }
  };

  const resetTodoList = () => {
    AudioEngine.play('shutdown');
    todoItems = [];
    addLog("CHECKLIST RESET TO EMPTY STATE");
  };

  const checkAllTodos = () => {
    AudioEngine.play('success');
    todoItems = todoItems.map(item => ({ ...item, done: true }));
    addLog("ALL OBJECTIVES RESOLVED");
  };

  const uncheckAllTodos = () => {
    AudioEngine.play('data-lock');
    todoItems = todoItems.map(item => ({ ...item, done: false }));
    addLog("ALL OBJECTIVES UNCHECKED");
  };

  const toggleAllTodos = () => {
    const allDone = todoItems.length > 0 && todoItems.every(item => item.done);
    if (allDone) {
      uncheckAllTodos();
    } else {
      checkAllTodos();
    }
  };

  const toggleHideCompleted = () => {
    AudioEngine.play('ui-click');
    hideCompleted = !hideCompleted;
    addLog(`COMPLETED OBJECTIVES: ${hideCompleted ? 'HIDDEN' : 'VISIBLE'}`);
  };

  const addTemplate = () => {
    const text = newTemplateText.trim();
    if (!text) return;
    objectiveTemplates = [...objectiveTemplates, text];
    newTemplateText = '';
    localStorage.setItem('chronos_objective_templates', JSON.stringify(objectiveTemplates));
    AudioEngine.play('ui-click');
    addLog(`TEMPLATE ADDED: ${text}`);
    highlightedTemplateIdx = objectiveTemplates.length - 1;
    setTimeout(() => { highlightedTemplateIdx = -1; }, 1200);

    setTimeout(() => {
      if (templateListEl) {
        templateListEl.scrollTo({ top: templateListEl.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  };

  const saveTemplateEdit = (idx: number, newText: string) => {
    const text = newText.trim();
    if (text) {
      const oldText = objectiveTemplates[idx];
      objectiveTemplates[idx] = text;
      localStorage.setItem('chronos_objective_templates', JSON.stringify(objectiveTemplates));
      AudioEngine.play('data-lock');
      addLog(`TEMPLATE REALIGNED: ${oldText} -> ${text}`);
      highlightedTemplateIdx = idx;
      setTimeout(() => { highlightedTemplateIdx = -1; }, 1200);
    }
    editingTemplateIdx = -1;
  };

  const deleteTemplate = (idx: number) => {
    const text = objectiveTemplates[idx];
    objectiveTemplates = objectiveTemplates.filter((_, i) => i !== idx);
    localStorage.setItem('chronos_objective_templates', JSON.stringify(objectiveTemplates));
    AudioEngine.play('fail');
    addLog(`TEMPLATE PURGED: ${text}`);
    if (editingTemplateIdx === idx) {
      editingTemplateIdx = -1;
    }
  };

  const moveTemplateUp = (idx: number) => {
    if (idx > 0) {
      AudioEngine.play('ui-click');
      const nextTemplates = [...objectiveTemplates];
      const temp = nextTemplates[idx];
      nextTemplates[idx] = nextTemplates[idx - 1];
      nextTemplates[idx - 1] = temp;
      objectiveTemplates = nextTemplates;
      localStorage.setItem('chronos_objective_templates', JSON.stringify(objectiveTemplates));
      highlightedTemplateIdx = idx - 1;
      setTimeout(() => { highlightedTemplateIdx = -1; }, 1200);
    }
  };

  const scrollTodoToBottom = (smooth = true) => {
    if (todoListEl) {
      todoListEl.scrollTo({
        top: todoListEl.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  onMount(async () => {
    const savedTemplates = localStorage.getItem('chronos_objective_templates');
    if (savedTemplates) {
      objectiveTemplates = JSON.parse(savedTemplates);
    } else {
      objectiveTemplates = [
        "REFRACT COGNITIVE MATRIX",
        "SYNCHRONIZE QUANTUM CORES",
        "MONITOR TELEMETRY LINK",
        "PURGE KERNEL CACHED STACKS",
        "AUDIT SECURE BRIDGE INTEGRITY"
      ];
      localStorage.setItem('chronos_objective_templates', JSON.stringify(objectiveTemplates));
    }

    if (window.stratagemAPI) {
      try {
        const config = await window.stratagemAPI.getConfig();
        if (config && config.chronosTodoLists) {
          savedLists = JSON.parse(config.chronosTodoLists);
        }
      } catch (err) {
        console.error('Failed to load Chronos Todo lists:', err);
      }
    }
  });
</script>

{#if mode === 'viewport'}
  <div class="todo-view-wrapper" in:fade={{ duration: 80 }} out:fade={{ duration: 80 }}>
    {#if todoSubMode === 'active'}
      <div class="panel-header">
        <span class="fui-label">IMMEDIATE OBJECTIVES</span>
        <button class="fui-button header-action-btn todo-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); todoSubMode = 'browser'; }}>
          BROWSE ARCHIVES
        </button>
      </div>

      <div class="todo-list-container">
        <div class="todo-header-group">
          <input 
            type="text" 
            bind:value={currentListTitle} 
            class="todo-title-input" 
            placeholder="ENTER LIST TITLE..." 
          />
        </div>

        <div class="todo-items-list" bind:this={todoListEl}>
          {#each todoItems.filter(item => !hideCompleted || !item.done) as item, idx (item.id)}
            <div class="todo-item">
              <div class="todo-item-left">
                <div 
                  class="todo-checkbox" 
                  class:checked={item.done} 
                  onclick={() => toggleTodo(item.id)}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTodo(item.id); } }}
                  role="checkbox"
                  aria-checked={item.done}
                  tabindex="0"
                >
                  {#if item.done}
                    <div class="todo-checkbox-check"></div>
                  {/if}
                </div>

                {#if item.editing}
                  <!-- svelte-ignore a11y_autofocus -->
                  <input 
                    type="text" 
                    value={item.text} 
                    onkeydown={(e) => {
                      if (e.key === 'Enter') {
                        saveEditing(item.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        todoItems = todoItems.map(it => it.id === item.id ? { ...it, editing: false } : it);
                      }
                    }}
                    onblur={(e) => saveEditing(item.id, e.currentTarget.value)}
                    class="todo-edit-input"
                    autofocus
                  />
                {:else}
                  <span 
                    class="todo-text" 
                    class:checked={item.done}
                    onclick={() => startEditing(item.id)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditing(item.id); } }}
                    role="button"
                    tabindex="0"
                  >
                    {item.text}
                  </span>
                {/if}
              </div>

              <div class="todo-actions">
                {#if idx > 0}
                  <button class="todo-act-btn move-up-btn" onclick={() => moveTodoUp(item.id)} title="Move Up">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                {/if}
                {#if !item.editing}
                  <button class="todo-act-btn" onclick={() => startEditing(item.id)} title="Edit Item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                {/if}
                <button class="todo-act-btn delete-btn" onclick={() => deleteTodo(item.id)} title="Delete Item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            </div>
          {/each}
          {#if todoItems.length === 0}
            <div style="text-align: center; color: rgba(255,255,255,0.2); font-family: 'Share Tech Mono', monospace; font-size: 13px; margin: auto 0; font-weight: 950; letter-spacing: 0.08em;">
              NO ACTIVE OBJECTIVES FOR TODAY. DEPLOY NEW PROTOCOLS.
            </div>
          {/if}
        </div>

        <div class="todo-input-row">
          <div class="input-wrapper-relative">
            <input 
              type="text" 
              bind:value={newTodoText} 
              onkeydown={(e) => e.key === 'Enter' && addTodo(newTodoText)}
              onfocus={() => scrollTodoToBottom(true)}
              oninput={() => scrollTodoToBottom(false)}
              class="todo-text-input" 
              placeholder="ENTER NEW OBJECTIVE & PRESS ENTER..." 
            />
            <span class="todo-input-plus-icon">+</span>
          </div>
          <button class="fui-button todo-archive-btn font-outfit" onclick={saveListToArchive}>
            ARCHIVE
          </button>
        </div>
      </div>
    {:else}
      <div class="panel-header">
        {#if todoSubMode === 'browser'}
          <span class="fui-label">ARCHIVED CHRONICLES</span>
          <button class="fui-button header-action-btn todo-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); todoSubMode = 'active'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            RETURN TO OBJECTIVES
          </button>
        {:else}
          <span class="fui-label">SECURED READ ONLY LOG</span>
          <button class="fui-button header-action-btn todo-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); todoSubMode = 'browser'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            RETURN TO ARCHIVES
          </button>
        {/if}
      </div>

      {#if todoSubMode === 'browser'}
        <div class="archive-browser-container">
          {#if savedLists.length > 0}
            <div class="saved-lists-grid-large">
              {#each savedLists as list (list.id)}
                <div class="saved-list-card-large" onclick={() => { AudioEngine.play('data-decode'); todoSubMode = 'view_archive'; selectedArchiveList = list; }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AudioEngine.play('data-decode'); todoSubMode = 'view_archive'; selectedArchiveList = list; } }} role="button" tabindex="0">
                  <div class="saved-list-info-large">
                    <span class="saved-list-name-large">{list.title}</span>
                    <span class="saved-list-count-large">{list.items.filter(i => i.done).length}/{list.items.length} COMPLETED OBJECTIVES</span>
                  </div>
                  <button 
                    class="todo-act-btn delete-btn-large" 
                    onclick={(e) => { e.stopPropagation(); deleteSavedList(list.id); }} 
                    title="Purge Archive"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              {/each}
            </div>
          {:else}
            <div style="text-align: center; color: rgba(255,255,255,0.2); font-family: 'Share Tech Mono', monospace; font-size: 13px; margin: 40px 0; font-weight: 950; letter-spacing: 0.08em;">
              NO ARCHIVED OPERATIONS AVAILABLE.
            </div>
          {/if}
        </div>
      {:else if todoSubMode === 'view_archive' && selectedArchiveList}
        <div class="archive-view-container">
          <div class="archive-header-details">
            <span class="archive-details-title">{selectedArchiveList.title}</span>
            <span class="archive-warning-tag">SECURED ARTIFACT - NO MODIFICATIONS PERMITTED</span>
          </div>

          <div class="todo-items-list read-only-list">
            {#each selectedArchiveList.items as item, idx}
              <div class="todo-item read-only-item">
                <div class="todo-item-left">
                  <div class="todo-checkbox read-only-checkbox" class:checked={item.done}>
                    {#if item.done}
                      <div class="todo-checkbox-check"></div>
                    {/if}
                  </div>
                  <span class="todo-text read-only-text" class:checked={item.done}>
                    {item.text}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
{:else if mode === 'sidebar'}
  <div class="panel-section-title">QUICK ACTIONS</div>
  <div class="todo-quick-actions" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px;">
    <div class="todo-status-readout font-mono">
      STATUS: {todoItems.filter(i => i.done).length}/{todoItems.length} COMPLETED
    </div>
    <button class="action-btn font-mono" onclick={toggleAllTodos} disabled={todoItems.length === 0}>
      {todoItems.length > 0 && todoItems.every(i => i.done) ? 'UNCHECK ALL TASKS' : 'CHECK ALL TASKS'}
    </button>
    <button class="action-btn font-mono" onclick={toggleHideCompleted}>
      {hideCompleted ? 'SHOW COMPLETED' : 'HIDE COMPLETED'}
    </button>
    <button class="action-btn font-mono reset-btn-todo" onclick={resetTodoList}>RESET ALL ITEMS</button>
  </div>

  <div class="panel-section-title">OBJECTIVE TEMPLATES</div>
  <div class="add-template-row">
    <input 
      type="text" 
      placeholder="NEW TEMPLATE..." 
      bind:value={newTemplateText}
      onkeydown={(e) => e.key === 'Enter' && addTemplate()}
      onfocus={() => {
        if (templateListEl) {
          templateListEl.scrollTo({ top: templateListEl.scrollHeight, behavior: 'smooth' });
        }
      }}
      class="template-input font-mono"
    />
  </div>
  <div class="template-list" bind:this={templateListEl}>
    {#each objectiveTemplates as template, idx}
      {#if editingTemplateIdx === idx}
        <div style="margin-bottom: 4px; width: 100%; position: relative;">
          <!-- svelte-ignore a11y_autofocus -->
          <input 
            type="text" 
            bind:value={editingTemplateText} 
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                saveTemplateEdit(idx, editingTemplateText);
              } else if (e.key === 'Escape') {
                editingTemplateIdx = -1;
              }
            }}
            onblur={(e) => saveTemplateEdit(idx, editingTemplateText)}
            class="template-edit-inline-input highlighted-input font-mono"
            autofocus
          />
        </div>
      {:else}
        <div class="template-item-row" style="margin-bottom: 4px; position: relative;" class:highlight-flash={highlightedTemplateIdx === idx}>
          <span 
            class="template-text-clickable font-mono" 
            onclick={() => addPresetTodo(template)} 
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addPresetTodo(template); } }}
            role="button"
            tabindex="0"
          >
            {template}
          </span>
          <div class="template-actions">
            {#if idx > 0}
              <button class="template-act-btn move-up" onclick={(e) => { e.stopPropagation(); moveTemplateUp(idx); }} title="Move Up">▲</button>
            {/if}
            <button class="template-act-btn edit" onclick={(e) => { e.stopPropagation(); editingTemplateIdx = idx; editingTemplateText = template; AudioEngine.play('ui-click'); }} title="Edit">✎</button>
            <button class="template-act-btn delete" onclick={(e) => { e.stopPropagation(); deleteTemplate(idx); }} title="Delete">×</button>
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
