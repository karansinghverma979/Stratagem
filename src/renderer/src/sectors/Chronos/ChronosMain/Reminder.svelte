<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';
  import TemporalScheduler from './TemporalScheduler.svelte';

  let {
    mode = 'viewport', // 'viewport', 'sidebar', or 'overlay_only'
    remindersList = $bindable([]),
    dispatchedReminders = $bindable([]),
    activeAlarm = $bindable(null),
    isSchedulerOpen = $bindable(false),
    activeReminderScheduler = $bindable({
      type: 'once' as 'once' | 'daily' | 'weekly' | 'custom',
      date: '',
      time: '',
      weeklyDays: [] as number[],
      customTimes: [] as { date: string; time: string }[]
    }),
    newReminderText = $bindable(''),
    addLog,
    showChronosNotification,
    currentTick = $bindable(Date.now())
  } = $props();

  let highlightBgEl = $state<HTMLDivElement | null>(null);
  let remindersListEl = $state<HTMLDivElement | null>(null);
  let mainInputEl = $state<HTMLInputElement | null>(null);
  let editReminderHighlightBgEl = $state<HTMLDivElement | null>(null);
  let editTemplateHighlightBgEl = $state<HTMLDivElement | null>(null);

  // Auto-focus main input and place cursor at the end when scheduler is closed
  $effect(() => {
    if (!isSchedulerOpen) {
      untrack(() => {
        if (mainInputEl) {
          setTimeout(() => {
            mainInputEl.focus();
            const len = mainInputEl.value.length;
            mainInputEl.setSelectionRange(len, len);
          }, 50);
        }
      });
    }
  });
  let globalMute = $state(false);
  let alarmInterval = $state<any>(null);
  let alarmShownAt = $state<number>(0);
  let highlightedReminderId = $state('');
  let highlightedTemplateIdx = $state(-1);
  let editingReminderId = $state('');
  let editingReminderText = $state('');
  let reschedulingAlarmId = $state<string | null>(null);
  let showMessageTooltip = $state(false);

  // Autocomplete states removed

  // Reminder templates states
  let reminderTemplates = $state<string[]>([]);
  let newReminderTemplateText = $state('');
  let editingReminderTemplateIdx = $state(-1);
  let editingReminderTemplateText = $state('');
  let remindersSubMode = $state('active');

  const datePresets = [
    { tag: '@today', label: 'Today', desc: 'Schedule for today' },
    { tag: '@tomorrow', label: 'Tomorrow', desc: 'Schedule for tomorrow' },
    { tag: '@overmorrow', label: 'In 2 Days', desc: 'Schedule for day after tomorrow' }
  ];

  const timePresets = [
    { tag: '#2', label: '2 Hours From Now', desc: 'Relative offset (+2h)' },
    { tag: '#8', label: '08:00 AM', desc: 'Morning sync threshold' },
    { tag: '#12', label: '12:00 PM', desc: 'Midday synchronization' },
    { tag: '#14', label: '02:00 PM', desc: 'Standard afternoon ops' },
    { tag: '#16', label: '04:00 PM', desc: 'Late afternoon telemetry' },
    { tag: '#18', label: '06:00 PM', desc: 'Evening system audit' },
    { tag: '#20', label: '08:00 PM', desc: 'Night shift checklist' },
    { tag: '#22', label: '10:00 PM', desc: 'Core operational shutdown' }
  ];

  function getLocalDateStr(dateInput?: Date | number) {
    const d = dateInput !== undefined ? new Date(dateInput) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatSchedulerDisplayDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    const [yr, mo, dy] = dateStr.split('-');
    const mNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${dy} ${mNames[parseInt(mo) - 1]} ${yr}`;
  }

  function calculateNextTargetTime(scheduler: any): number | null {
    const now = new Date();
    const nowMs = now.getTime();

    if (scheduler.type === 'once') {
      let d = new Date();
      if (scheduler.date) {
        const [yr, mo, dy] = scheduler.date.split('-').map(Number);
        d.setFullYear(yr, mo - 1, dy);
      }
      if (scheduler.time) {
        const [hr, mn] = scheduler.time.split(':').map(Number);
        d.setHours(hr, mn, 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      return d.getTime();
    }

    if (scheduler.type === 'daily') {
      let d = new Date();
      if (scheduler.time) {
        const [hr, mn] = scheduler.time.split(':').map(Number);
        d.setHours(hr, mn, 0, 0);
      } else {
        d.setHours(12, 0, 0, 0);
      }
      if (d.getTime() <= nowMs) {
        d.setDate(d.getDate() + 1);
      }
      return d.getTime();
    }

    if (scheduler.type === 'weekly') {
      if (!scheduler.weeklyDays || scheduler.weeklyDays.length === 0) return null;
      let d = new Date();
      if (scheduler.time) {
        const [hr, mn] = scheduler.time.split(':').map(Number);
        d.setHours(hr, mn, 0, 0);
      } else {
        d.setHours(12, 0, 0, 0);
      }
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        let testDate = new Date(d);
        testDate.setDate(d.getDate() + dayOffset);
        let testDay = testDate.getDay();
        if (scheduler.weeklyDays.includes(testDay)) {
          if (testDate.getTime() > nowMs) {
            return testDate.getTime();
          }
        }
      }
      let testDate = new Date(d);
      testDate.setDate(d.getDate() + 7);
      return testDate.getTime();
    }

    if (scheduler.type === 'custom') {
      if (!scheduler.customTimes || scheduler.customTimes.length === 0) return null;
      const futures = scheduler.customTimes
        .map((t: any) => {
          let d = new Date();
          const [yr, mo, dy] = t.date.split('-').map(Number);
          const [hr, mn] = t.time.split(':').map(Number);
          d.setFullYear(yr, mo - 1, dy);
          d.setHours(hr, mn, 0, 0);
          return d.getTime();
        })
        .filter((t: number) => t > nowMs);
      
      if (futures.length === 0) return null;
      return Math.min(...futures);
    }

    return null;
  }

  // Real-time target Display and Input Error Validation
  let computedTargetDisplay = $derived.by(() => {
    const parsed = parseReminderTags(newReminderText);
    let type = activeReminderScheduler.type;
    let date = parsed.targetDate ? getLocalDateStr(parsed.targetDate) : activeReminderScheduler.date;
    let time = parsed.targetTimeStr || activeReminderScheduler.time;
    let weeklyDays = activeReminderScheduler.weeklyDays;
    let customTimes = activeReminderScheduler.customTimes;

    if (!date) date = getLocalDateStr();
    if (!time) {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
      date = getLocalDateStr(future);
      const hrs = String(future.getHours()).padStart(2, '0');
      const mins = String(future.getMinutes()).padStart(2, '0');
      time = `${hrs}:${mins}`;
    }

    let nextTarget = calculateNextTargetTime({ type, date, time, weeklyDays, customTimes });
    if (!nextTarget) return { text: "NO ACTIVE VECTOR", isPast: false };

    const dateDisplay = formatSchedulerDisplayDate(getLocalDateStr(nextTarget));
    const timeDisplay = new Date(nextTarget).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPast = nextTarget < Date.now();

    return {
      text: `ARMED VECTOR: ${dateDisplay} @ ${timeDisplay} (${type.toUpperCase()})`,
      isPast
    };
  });

  let activeInputError = $derived.by(() => {
    const text = editingReminderId ? editingReminderText : newReminderText;
    if (!text) return "";

    const atCount = (text.match(/@/g) || []).length;
    const hashCount = (text.match(/#/g) || []).length;

    if (atCount > 1) {
      return "ERROR: MULTIPLE DATE VECTORS DETECTED (@ TAGS LIMIT: 1)";
    }
    if (hashCount > 1) {
      return "ERROR: MULTIPLE TIME VECTORS DETECTED (# TAGS LIMIT: 1)";
    }

    const atMatch = text.match(/(@\S+)/);
    if (atMatch) {
      const tag = atMatch[1];
      if (!isValidDateTag(tag)) {
        return "INVALID DATE FORMAT: USE YYYY-MM-DD OR PRESETS";
      } else {
        const parsed = parseReminderTags(text);
        if (parsed.targetDate) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const test = new Date(parsed.targetDate);
          test.setHours(23,59,59,999);
          if (test.getTime() < today.getTime()) {
            return "INVALID DATE: TARGET VECTOR IN THE PAST";
          }
        }
      }
    }

    const hashMatch = text.match(/(#\S+)/);
    if (hashMatch) {
      const tag = hashMatch[1];
      if (!isValidTimeTag(tag)) {
        return "INVALID TIME FORMAT: USE HH:MM OR PRESETS";
      }
    }

    // Check if the calculated target time is in the past
    const parsed = parseReminderTags(text);
    let scheduler = { type: 'once', date: '', time: '', weeklyDays: [], customTimes: [] };
    if (editingReminderId) {
      const r = remindersList.find(item => item.id === editingReminderId);
      if (r && r.scheduler) {
        scheduler = r.scheduler;
      }
    } else {
      scheduler = activeReminderScheduler;
    }

    let type = scheduler.type;
    let date = parsed.targetDate ? getLocalDateStr(parsed.targetDate) : scheduler.date;
    let time = parsed.targetTimeStr || scheduler.time;
    let weeklyDays = scheduler.weeklyDays;
    let customTimes = scheduler.customTimes;

    if (!date) date = getLocalDateStr();
    if (!time) {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
      date = getLocalDateStr(future);
      const hrs = String(future.getHours()).padStart(2, '0');
      const mins = String(future.getMinutes()).padStart(2, '0');
      time = `${hrs}:${mins}`;
    }

    let nextTarget = calculateNextTargetTime({ type, date, time, weeklyDays, customTimes });
    if (!nextTarget) return "NO ACTIVE VECTOR";
    if (nextTarget < Date.now()) {
      return "INVALID DETECTION: TEMPORAL VECTOR PRECEDES CURRENT REALITY (PAST CHRONO VECTOR)";
    }

    return "";
  });

  const parseReminderTags = (text: string) => {
    let cleanText = text;
    let targetDate: Date | null = null;
    let targetTimeStr: string | null = null;
    let recurrenceType: 'once' | 'daily' | 'weekly' | 'custom' = 'once';
    let weeklyDays: number[] = [];

    // Parse Recurrence Tags: %daily
    if (text.toLowerCase().includes('%daily')) {
      recurrenceType = 'daily';
      cleanText = cleanText.replace(/%daily/gi, '');
    }

    // Parse Recurrence Tags: %weekly(MON,WED) or %weekly
    const weeklyMatch = text.match(/%weekly(?:\((.*?)\))?/i);
    if (weeklyMatch) {
      recurrenceType = 'weekly';
      cleanText = cleanText.replace(weeklyMatch[0], '');
      if (weeklyMatch[1]) {
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const parts = weeklyMatch[1].toUpperCase().split(',').map(s => s.trim());
        const days: number[] = [];
        parts.forEach(part => {
          const idx = dayNames.indexOf(part);
          if (idx !== -1) {
            days.push(idx);
          }
        });
        weeklyDays = days.sort();
      } else {
        weeklyDays = [new Date().getDay()];
      }
    }

    const ymdMatch = text.match(/@(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const yr = parseInt(ymdMatch[1], 10);
      const mo = parseInt(ymdMatch[2], 10);
      const dy = parseInt(ymdMatch[3], 10);
      if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        targetDate = new Date(yr, mo - 1, dy);
        cleanText = cleanText.replace(ymdMatch[0], '');
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('@today')) {
        targetDate = new Date();
        cleanText = cleanText.replace(/@today/gi, '');
      } else if (lowerText.includes('@tomorrow')) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        cleanText = cleanText.replace(/@tomorrow/gi, '');
      } else if (lowerText.includes('@overmorrow')) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        cleanText = cleanText.replace(/@overmorrow/gi, '');
      } else {
        const match = text.match(/@(\d{1,2})([a-zA-Z]+)(\d{4}|\d{2})?/);
        if (match) {
          const day = parseInt(match[1]);
          const monthStr = match[2].toLowerCase();
          const yearStr = match[3];

          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          let monthIndex = -1;
          for (let i = 0; i < 12; i++) {
            if (monthStr.startsWith(months[i])) {
              monthIndex = i;
              break;
            }
          }

          if (monthIndex !== -1 && day >= 1 && day <= 31) {
            targetDate = new Date();
            let year = yearStr ? parseInt(yearStr) : targetDate.getFullYear();
            if (yearStr && yearStr.length === 2) {
              year += 2000;
            }
            targetDate.setFullYear(year, monthIndex, day);
            cleanText = cleanText.replace(match[0], '');
          }
        } else {
          const dayOnlyMatch = text.match(/@(\d{1,2})(?!\d)/);
          if (dayOnlyMatch) {
            const day = parseInt(dayOnlyMatch[1], 10);
            if (day >= 1 && day <= 31) {
              const now = new Date();
              targetDate = new Date(now.getFullYear(), now.getMonth(), day);
              cleanText = cleanText.replace(dayOnlyMatch[0], '');
            }
          }
        }
      }
    }

    const timeMatch = text.match(/#(\d{1,2})(?::(\d{2}))?/);
    if (timeMatch) {
      const hr = parseInt(timeMatch[1]);
      const mn = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      if (hr >= 0 && hr <= 23 && mn >= 0 && mn <= 59) {
        targetTimeStr = `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
        cleanText = cleanText.replace(timeMatch[0], '');
      }
    }

    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    return { cleanText, targetDate, targetTimeStr, recurrenceType, weeklyDays };
  };

  const applyQuickTagsToScheduler = () => {
    if (!newReminderText.trim()) {
      activeReminderScheduler.type = 'once';
      activeReminderScheduler.date = getLocalDateStr();
      activeReminderScheduler.time = '';
      activeReminderScheduler.weeklyDays = [];
      activeReminderScheduler.customTimes = [];
      return;
    }

    const parsed = parseReminderTags(newReminderText);
    
    // Date sync
    if (parsed.targetDate) {
      activeReminderScheduler.date = getLocalDateStr(parsed.targetDate);
    } else {
      const hasAtTag = newReminderText.includes('@');
      if (!hasAtTag) {
        activeReminderScheduler.date = '';
      }
    }

    // Time sync
    if (parsed.targetTimeStr) {
      activeReminderScheduler.time = parsed.targetTimeStr;
    } else {
      const hasHashTag = newReminderText.includes('#');
      if (!hasHashTag) {
        activeReminderScheduler.time = '';
      }
    }
  };

  $effect(() => {
    applyQuickTagsToScheduler();
  });

  const handleInputKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddReminder();
      return;
    }
    if (e.key === 'Tab') {
      if (mainInputEl) {
        const handled = performTabAutocomplete(
          mainInputEl,
          newReminderText,
          (val) => { newReminderText = val; },
          (newCursor) => {
            if (mainInputEl) {
              mainInputEl.setSelectionRange(newCursor, newCursor);
              if (highlightBgEl) highlightBgEl.scrollLeft = mainInputEl.scrollLeft;
            }
          }
        );
        if (handled) {
          e.preventDefault();
        }
      }
    }
  };

  const checkReminders = () => {
    const now = Date.now();
    let updatedReminders = [...remindersList];
    let listChanged = false;

    updatedReminders.forEach(r => {
      if (!r.triggered && now >= r.targetTime) {
        r.triggered = true;
        listChanged = true;
        addLog(`ALERT TRIGGERED: ${r.text.substring(0, 15)}`);

        const logId = Math.random().toString(36).substring(2, 9);
        const logEntry = {
          id: logId,
          text: r.text,
          targetTime: r.targetTime,
          acknowledged: false
        };
        dispatchedReminders = [logEntry, ...dispatchedReminders].slice(0, 100);
        saveDispatchedRemindersToStorage();

        if (!r.muted && !globalMute) {
          activeAlarm = {
            ...r,
            logId: logId
          };
          alarmShownAt = Date.now();
          AudioEngine.play('success');
          if (!alarmInterval) {
            alarmInterval = setInterval(() => {
              if (activeAlarm) {
                AudioEngine.play('success');
              } else {
                clearInterval(alarmInterval);
                alarmInterval = null;
              }
            }, 2000);
          }
        }

        if (r.scheduler && r.scheduler.type !== 'once') {
          const nextTime = calculateNextTargetTime(r.scheduler);
          if (nextTime && nextTime > now) {
            r.targetTime = nextTime;
            r.triggered = false;
          } else {
            r.toBeRemoved = true;
          }
        } else {
          r.toBeRemoved = true;
        }
      }
    });

    if (listChanged) {
      remindersList = updatedReminders.filter((r: any) => !r.toBeRemoved).sort((a, b) => a.targetTime - b.targetTime);
      saveRemindersToStorage();
    }
  };

  const dismissAlarmWithoutAck = () => {
    activeAlarm = null;
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  };

  $effect(() => {
    const tick = currentTick;
    if (mode !== 'overlay_only') return;
    untrack(() => {
      checkReminders();
      if (activeAlarm && alarmShownAt > 0 && (Date.now() - alarmShownAt >= 60000)) {
        dismissAlarmWithoutAck();
      }
    });
  });

  const acknowledgeAlarm = () => {
    AudioEngine.play('data-lock');
    if (activeAlarm && activeAlarm.logId) {
      const logId = activeAlarm.logId;
      dispatchedReminders = dispatchedReminders.map(dr => dr.id === logId ? { ...dr, acknowledged: true } : dr);
      saveDispatchedRemindersToStorage();
    }
    activeAlarm = null;
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  };

  const handleAddReminder = () => {
    if (activeInputError) {
      AudioEngine.play('fail');
      showChronosNotification(`DEPLOY FAILED: ${activeInputError}`, "error");
      return;
    }

    const rawText = newReminderText.trim();
    if (!rawText) {
      AudioEngine.play('fail');
      addLog("DEPLOY FAILED: DESCRIPTION MISSING");
      showChronosNotification("DEPLOY FAILED: DESCRIPTION MISSING", "error");
      return;
    }

    const parsed = parseReminderTags(rawText);
    let schedulerConfig = { ...activeReminderScheduler };

    if (parsed.targetDate) {
      schedulerConfig.date = getLocalDateStr(parsed.targetDate);
      schedulerConfig.type = 'once';
    }
    if (parsed.targetTimeStr) {
      schedulerConfig.time = parsed.targetTimeStr;
    }
    if (parsed.recurrenceType && parsed.recurrenceType !== 'once') {
      schedulerConfig.type = parsed.recurrenceType;
      if (parsed.recurrenceType === 'weekly') {
        schedulerConfig.weeklyDays = parsed.weeklyDays;
      }
    }

    const text = parsed.cleanText;
    if (!text) {
      AudioEngine.play('fail');
      addLog("DEPLOY FAILED: DESCRIPTION MISSING");
      showChronosNotification("DEPLOY FAILED: DESCRIPTION MISSING", "error");
      return;
    }

    // CUSTOM Recurrence Mode: Deploy separate, individual reminders for each custom time vector
    if (schedulerConfig.type === 'custom') {
      if (!schedulerConfig.customTimes || schedulerConfig.customTimes.length === 0) {
        AudioEngine.play('fail');
        showChronosNotification("DEPLOY FAILED: NO CHRONO VECTORS CONFIGURED", "error");
        return;
      }

      let addedCount = 0;
      let dupCount = 0;
      let pastCount = 0;
      let newReminders: any[] = [];

      schedulerConfig.customTimes.forEach((vector: any) => {
        const onceConfig = {
          type: 'once' as const,
          date: vector.date,
          time: vector.time,
          weeklyDays: [],
          customTimes: []
        };

        const targetTime = calculateNextTargetTime(onceConfig);
        if (!targetTime || targetTime < Date.now()) {
          pastCount++;
          return;
        }

        // Check duplicates for this specific timestamp (within 1 minute)
        const isDuplicate = remindersList.some(r => r.text.toLowerCase() === text.toLowerCase() && Math.abs(r.targetTime - targetTime) < 60000) ||
                            newReminders.some(r => r.text.toLowerCase() === text.toLowerCase() && Math.abs(r.targetTime - targetTime) < 60000);
        if (isDuplicate) {
          dupCount++;
          return;
        }

        newReminders.push({
          id: Math.random().toString(36).substring(2, 9),
          text,
          targetTime,
          triggered: false,
          muted: false,
          scheduler: onceConfig
        });
        addedCount++;
      });

      if (newReminders.length > 0) {
        remindersList = [...remindersList, ...newReminders].sort((a, b) => a.targetTime - b.targetTime);
        saveRemindersToStorage();
      }

      newReminderText = '';
      
      let msg = `DEPLOYED ${addedCount} INDIVIDUAL CHRONO SENSORS`;
      if (dupCount > 0) msg += ` (${dupCount} DUP BLOCKED)`;
      if (pastCount > 0) msg += ` (${pastCount} PAST BLOCKED)`;

      showChronosNotification(msg, "success");
      addLog(`DEPLOYED ${addedCount} CUSTOM VECTORS`);

      activeReminderScheduler = {
        type: 'once',
        date: getLocalDateStr(),
        time: '',
        weeklyDays: [],
        customTimes: []
      };
      return;
    }

    let targetTime = calculateNextTargetTime(schedulerConfig);

    if (targetTime && targetTime < Date.now() && schedulerConfig.type === 'once' && !parsed.targetDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      schedulerConfig.date = getLocalDateStr(tomorrow);
      targetTime = calculateNextTargetTime(schedulerConfig);
    }

    if (!targetTime || targetTime < Date.now()) {
      AudioEngine.play('fail');
      addLog("DEPLOY FAILED: PAST OR INVALID TIME TARGET");
      showChronosNotification("DEPLOY FAILED: TEMPORAL VECTOR IS IN THE PAST", "error");
      return;
    }

    // Only prevent duplicates if the exact same task is scheduled at the exact same time
    const isDuplicate = remindersList.some(r => r.text.toLowerCase() === text.toLowerCase() && Math.abs(r.targetTime - targetTime) < 60000);
    if (isDuplicate) {
      AudioEngine.play('fail');
      addLog("DEPLOY FAILED: DUPLICATE VECTOR");
      showChronosNotification("DEPLOY FAILED: DUPLICATE VECTOR REGISTERED", "warning");
      return;
    }

    const newReminder = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      targetTime,
      triggered: false,
      muted: false,
      scheduler: schedulerConfig
    };

    remindersList = [...remindersList, newReminder].sort((a, b) => a.targetTime - b.targetTime);
    saveRemindersToStorage();
    
    highlightedReminderId = newReminder.id;
    setTimeout(() => {
      highlightedReminderId = '';
    }, 1200);

    setTimeout(() => {
      const el = document.getElementById(`reminder-${newReminder.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    newReminderText = '';
    showChronosNotification(`SENSOR DEPLOYED: "${text.substring(0, 20).toUpperCase()}"`, "success");
    addLog(`ALERT DEPLOYED: ${text.substring(0, 15)}`);

    activeReminderScheduler = {
      type: 'once',
      date: getLocalDateStr(),
      time: '',
      weeklyDays: [],
      customTimes: []
    };
  };

  const purgeReminder = (id: string) => {
    const deleted = remindersList.find(r => r.id === id);
    if (deleted) {
      addLog(`SENSOR PURGED: ${deleted.text.substring(0, 15)}`);
    }
    AudioEngine.play('fail');
    remindersList = remindersList.filter(r => r.id !== id);
    saveRemindersToStorage();
    showChronosNotification("ALERT SENSOR REMOVED", "info");
  };

  const toggleMuteReminder = (id: string) => {
    AudioEngine.play('ui-click');
    remindersList = remindersList.map(r => {
      if (r.id === id) {
        addLog(`SENSOR ${r.muted ? 'UNMUTED' : 'MUTED'}: ${r.text.substring(0, 15)}`);
        return { ...r, muted: !r.muted };
      }
      return r;
    });
    saveRemindersToStorage();
  };

  // Tag normalization helper functions
  function resolveDuplicateTags(text: string, cursorOffset: number, symbol: '@' | '#'): { text: string; cursorOffset: number } {
    const regex = symbol === '@' ? /@\S+/g : /#\S+/g;
    const matches: { text: string; index: number; length: number }[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        length: match[0].length
      });
    }

    if (matches.length <= 1) {
      return { text, cursorOffset };
    }

    // Find the match closest to the cursorOffset
    let closestIdx = 0;
    let minDistance = Infinity;
    matches.forEach((m, idx) => {
      let dist;
      if (cursorOffset >= m.index && cursorOffset <= m.index + m.length) {
        dist = 0;
      } else {
        dist = Math.min(
          Math.abs(cursorOffset - m.index),
          Math.abs(cursorOffset - (m.index + m.length))
        );
      }
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    let newText = text;
    let newCursor = cursorOffset;

    for (let i = matches.length - 1; i >= 0; i--) {
      if (i === closestIdx) continue;
      const m = matches[i];
      
      let startDel = m.index;
      let endDel = m.index + m.length;
      
      if (endDel < newText.length && newText[endDel] === ' ') {
        endDel++;
      } else if (startDel > 0 && newText[startDel - 1] === ' ') {
        startDel--;
      }

      const delLen = endDel - startDel;
      newText = newText.substring(0, startDel) + newText.substring(endDel);

      if (cursorOffset > startDel) {
        if (cursorOffset >= endDel) {
          newCursor -= delLen;
        } else {
          newCursor = startDel;
        }
      }
    }

    // Space normalization
    const originalText = newText;
    newText = newText.replace(/ {2,}/g, ' ');
    let spacesRemoved = 0;
    const spacesRegex = / {2,}/g;
    let spaceMatch;
    while ((spaceMatch = spacesRegex.exec(originalText)) !== null) {
      if (spaceMatch.index < cursorOffset) {
        const overlap = Math.min(cursorOffset, spaceMatch.index + spaceMatch[0].length) - spaceMatch.index;
        spacesRemoved += (overlap - 1);
      }
    }
    newCursor = cursorOffset - spacesRemoved;

    return { text: newText, cursorOffset: newCursor };
  }

  function removeDuplicateTags(text: string): string {
    if (!text) return text;
    let result = text;
    result = resolveDuplicateTags(result, result.length, '@').text;
    result = resolveDuplicateTags(result, result.length, '#').text;
    return result;
  }

  function performTabAutocomplete(
    inputEl: HTMLInputElement,
    currentVal: string,
    setVal: (v: string) => void,
    onSuccess: (newCursor: number) => void
  ): boolean {
    const cursor = inputEl.selectionStart || 0;
    const beforeCursor = currentVal.substring(0, cursor);
    const lastWordMatch = beforeCursor.match(/(\S+)$/);

    if (lastWordMatch) {
      const word = lastWordMatch[1];
      if (word.startsWith('@')) {
        const wordLower = word.toLowerCase();
        let completion = '';

        if (wordLower.startsWith('@tod')) {
          completion = '@today';
        } else if (wordLower.startsWith('@tom')) {
          completion = '@tomorrow';
        } else if (wordLower.startsWith('@over')) {
          completion = '@overmorrow';
        }

        if (completion) {
          const wordStart = cursor - word.length;
          const newText = currentVal.substring(0, wordStart) + completion + ' ' + currentVal.substring(cursor);
          const tempCursor = wordStart + completion.length + 1;
          const resAt = resolveDuplicateTags(newText, tempCursor, '@');
          
          setVal(resAt.text);
          AudioEngine.play('data-lock');
          setTimeout(() => {
            onSuccess(resAt.cursorOffset);
          }, 0);
          return true;
        } else {
          if (isValidDateTag(word)) {
            AudioEngine.play('ui-click');
            return true;
          } else {
            AudioEngine.play('fail');
            showChronosNotification(`AUTOCOMPLETE FAILED: NO MATCHING TEMPORAL PRESET FOUND FOR "${word.toUpperCase()}"`, "error");
            return true;
          }
        }
      }
    }
    return false;
  }

  function handleMainInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let val = input.value;
    let cursor = input.selectionStart || 0;
    const originalVal = val;

    if (val.includes('%')) {
      const oldLen = val.length;
      val = val.replace(/%/g, '');
      const newLen = val.length;
      cursor -= (oldLen - newLen);
      if (cursor < 0) cursor = 0;
    }

    const resAt = resolveDuplicateTags(val, cursor, '@');
    val = resAt.text;
    cursor = resAt.cursorOffset;

    const resHash = resolveDuplicateTags(val, cursor, '#');
    val = resHash.text;
    cursor = resHash.cursorOffset;

    newReminderText = val;

    if (val !== originalVal) {
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(cursor, cursor);
        }
      }, 0);
    }

    if (highlightBgEl) {
      setTimeout(() => {
        if (highlightBgEl) highlightBgEl.scrollLeft = input.scrollLeft;
      }, 0);
    }
  }

  function handleEditInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let val = input.value;
    let cursor = input.selectionStart || 0;
    const originalVal = val;

    if (val.includes('%')) {
      const oldLen = val.length;
      val = val.replace(/%/g, '');
      const newLen = val.length;
      cursor -= (oldLen - newLen);
      if (cursor < 0) cursor = 0;
    }

    const resAt = resolveDuplicateTags(val, cursor, '@');
    val = resAt.text;
    cursor = resAt.cursorOffset;

    const resHash = resolveDuplicateTags(val, cursor, '#');
    val = resHash.text;
    cursor = resHash.cursorOffset;

    editingReminderText = val;

    if (val !== originalVal) {
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(cursor, cursor);
        }
      }, 0);
    }

    if (editReminderHighlightBgEl) {
      setTimeout(() => {
        if (editReminderHighlightBgEl) editReminderHighlightBgEl.scrollLeft = input.scrollLeft;
      }, 0);
    }
  }

  function handleTemplateEditInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let val = input.value;
    let cursor = input.selectionStart || 0;
    const originalVal = val;

    if (val.includes('%') || val.includes('@')) {
      const oldLen = val.length;
      val = val.replace(/%/g, '').replace(/@/g, '');
      const newLen = val.length;
      cursor -= (oldLen - newLen);
      if (cursor < 0) cursor = 0;
    }

    const resHash = resolveDuplicateTags(val, cursor, '#');
    val = resHash.text;
    cursor = resHash.cursorOffset;

    editingReminderTemplateText = val;

    if (val !== originalVal) {
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(cursor, cursor);
        }
      }, 0);
    }

    if (editTemplateHighlightBgEl) {
      setTimeout(() => {
        if (editTemplateHighlightBgEl) editTemplateHighlightBgEl.scrollLeft = input.scrollLeft;
      }, 0);
    }
  }

  function handleNewTemplateInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let val = input.value;
    let cursor = input.selectionStart || 0;
    const originalVal = val;

    if (val.includes('%') || val.includes('@')) {
      const oldLen = val.length;
      val = val.replace(/%/g, '').replace(/@/g, '');
      const newLen = val.length;
      cursor -= (oldLen - newLen);
      if (cursor < 0) cursor = 0;
    }

    const resHash = resolveDuplicateTags(val, cursor, '#');
    val = resHash.text;
    cursor = resHash.cursorOffset;

    newReminderTemplateText = val;

    if (val !== originalVal) {
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(cursor, cursor);
        }
      }, 0);
    }
  }

  const handleEditInputKeydown = (e: KeyboardEvent, inputEl: HTMLInputElement) => {
    if (e.key === 'Tab') {
      const handled = performTabAutocomplete(
        inputEl,
        editingReminderText,
        (val) => { editingReminderText = val; },
        (newCursor) => {
          inputEl.setSelectionRange(newCursor, newCursor);
          if (editReminderHighlightBgEl) editReminderHighlightBgEl.scrollLeft = inputEl.scrollLeft;
        }
      );
      if (handled) {
        e.preventDefault();
      }
    }
  };

  function autoAddSpaceAfterTags(text: string): string {
    if (!text) return text;
    
    // Check if the text ends with a tag that doesn't have a trailing space
    // Valid date presets or yyyy-mm-dd
    const datePattern = /@(?:today|tomorrow|overmorrow|\d{4}-\d{2}-\d{2})$/i;
    // Valid time presets or hh:mm
    const timePattern = /#(?:2|8|12|14|16|18|20|22|\d{1,2}:\d{2})$/i;
    // Valid recurrence tags
    const recurrencePattern = /%(?:daily|weekly(?:\([^)]*\))?)$/i;

    if (datePattern.test(text) || timePattern.test(text) || recurrencePattern.test(text)) {
      return text + ' ';
    }
    return text;
  }

  function sanitizeTemplateText(text: string): string {
    // Remove all @ tags, standalone @ characters, and recurrence % tags (restricted for templates)
    text = text.replace(/@\S+/g, '').replace(/@/g, '').replace(/%\S+/g, '').replace(/%/g, '');
    // Keep only the last # tag
    text = removeDuplicateTags(text);
    return text;
  }

  function formatTemplateName(text: string): string {
    let sanitized = sanitizeTemplateText(text);
    let hashMatch = sanitized.match(/#\S+/);
    if (hashMatch) {
      let tag = hashMatch[0];
      let rest = sanitized.replace(tag, '').replace(/\s+/g, ' ').trim();
      return `${tag} ${rest}`;
    }
    return sanitized;
  }

  function validateReminderText(text: string, scheduler: any): string {
    if (!text) return "ERROR: DESCRIPTION MISSING";

    const atCount = (text.match(/@/g) || []).length;
    const hashCount = (text.match(/#/g) || []).length;

    if (atCount > 1) {
      return "ERROR: MULTIPLE DATE VECTORS DETECTED (@ TAGS LIMIT: 1)";
    }
    if (hashCount > 1) {
      return "ERROR: MULTIPLE TIME VECTORS DETECTED (# TAGS LIMIT: 1)";
    }

    const atMatch = text.match(/(@\S+)/);
    if (atMatch) {
      const tag = atMatch[1];
      if (!isValidDateTag(tag)) {
        return "INVALID DATE FORMAT: USE YYYY-MM-DD OR PRESETS";
      } else {
        const parsed = parseReminderTags(text);
        if (parsed.targetDate) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const test = new Date(parsed.targetDate);
          test.setHours(23,59,59,999);
          if (test.getTime() < today.getTime()) {
            return "INVALID DATE: TARGET VECTOR IN THE PAST";
          }
        }
      }
    }

    const hashMatch = text.match(/(#\S+)/);
    if (hashMatch) {
      const tag = hashMatch[1];
      if (!isValidTimeTag(tag)) {
        return "INVALID TIME FORMAT: USE HH:MM OR PRESETS";
      }
    }

    // Calculate next target time to check if it's in the past
    const parsed = parseReminderTags(text);
    let type = scheduler.type;
    let date = parsed.targetDate ? getLocalDateStr(parsed.targetDate) : scheduler.date;
    let time = parsed.targetTimeStr || scheduler.time;
    let weeklyDays = scheduler.weeklyDays;
    let customTimes = scheduler.customTimes;

    if (!date) date = getLocalDateStr();
    if (!time) {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
      date = getLocalDateStr(future);
      const hrs = String(future.getHours()).padStart(2, '0');
      const mins = String(future.getMinutes()).padStart(2, '0');
      time = `${hrs}:${mins}`;
    }

    let nextTarget = calculateNextTargetTime({ type, date, time, weeklyDays, customTimes });
    if (!nextTarget) {
      return "NO ACTIVE VECTOR";
    }
    if (nextTarget < Date.now()) {
      return "INVALID DETECTION: TEMPORAL VECTOR PRECEDES CURRENT REALITY (PAST CHRONO VECTOR)";
    }

    return "";
  }

  // Highlight syntax helper for templates (highlights # tag only)
  function highlightTemplateText(text: string, placeholder: string) {
    if (!text) {
      return `<span style="opacity: 0.35;">${placeholder}</span>`;
    }
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Highlight #time tags only if valid
    escaped = escaped.replace(/(#\S+)/g, (match) => {
      if (isValidTimeTag(match)) {
        return `<span class="highlight-tag-time">${match}</span>`;
      }
      return match;
    });
    
    return escaped;
  }

  // Keystroke effects removed to preserve native cursor behavior

  const startEditingReminder = (id: string, currentText: string) => {
    const reminder = remindersList.find(r => r.id === id);
    if (!reminder) return;
    
    // Reconstruct the text with tags from the existing scheduler configuration
    let textWithTags = currentText;
    if (reminder.scheduler) {
      if (reminder.scheduler.type === 'daily') {
        textWithTags += ' %daily';
      } else if (reminder.scheduler.type === 'weekly') {
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const activeDays = (reminder.scheduler.weeklyDays || []).map((d: number) => dayNames[d]).join(',');
        textWithTags += activeDays ? ` %weekly(${activeDays})` : ' %weekly';
      }
      
      if (reminder.scheduler.date) {
        textWithTags += ` @${reminder.scheduler.date}`;
      }
      
      if (reminder.scheduler.time) {
        textWithTags += ` #${reminder.scheduler.time}`;
      }
    }
    
    editingReminderId = id;
    editingReminderText = textWithTags;
    AudioEngine.play('ui-click');
  };

  const saveReminderNameEdit = (id: string, newText: string) => {
    let clean = newText.trim();
    if (!clean) {
      AudioEngine.play('fail');
      showChronosNotification("EDIT FAILED: DESCRIPTION MISSING", "error");
      editingReminderId = '';
      return;
    }

    if (clean.includes('%')) {
      AudioEngine.play('fail');
      showChronosNotification("EDIT FAILED: RECURRENCE % IS RESTRICTED IN INLINE EDITS", "error");
      editingReminderId = '';
      return;
    }

    clean = removeDuplicateTags(clean);

    const existingReminder = remindersList.find(r => r.id === id);
    if (!existingReminder) {
      editingReminderId = '';
      return;
    }

    const err = validateReminderText(clean, existingReminder.scheduler || { type: 'once' });
    if (err) {
      AudioEngine.play('fail');
      showChronosNotification(`EDIT FAILED: ${err}`, "error");
      editingReminderId = '';
      return;
    }

    const parsed = parseReminderTags(clean);
    let schedulerConfig = existingReminder.scheduler ? { ...existingReminder.scheduler } : {
      type: 'once' as const,
      date: '',
      time: '',
      weeklyDays: [],
      customTimes: []
    };

    if (parsed.targetDate) {
      schedulerConfig.date = getLocalDateStr(parsed.targetDate);
      schedulerConfig.type = 'once';
    }
    if (parsed.targetTimeStr) {
      schedulerConfig.time = parsed.targetTimeStr;
    }
    if (parsed.recurrenceType && parsed.recurrenceType !== 'once') {
      schedulerConfig.type = parsed.recurrenceType;
      if (parsed.recurrenceType === 'weekly') {
        schedulerConfig.weeklyDays = parsed.weeklyDays;
      }
    }

    const nextTargetTime = calculateNextTargetTime(schedulerConfig);
    if (!nextTargetTime) {
      AudioEngine.play('fail');
      showChronosNotification("EDIT FAILED: INVALID TIME CONFIGURATION", "error");
      editingReminderId = '';
      return;
    }

    const isDuplicate = remindersList.some(r => r.id !== id && r.text.toLowerCase() === parsed.cleanText.toLowerCase() && Math.abs(r.targetTime - nextTargetTime) < 60000);
    if (isDuplicate) {
      AudioEngine.play('fail');
      showChronosNotification("EDIT FAILED: DUPLICATE VECTOR REGISTERED AT SAME TIMESTAMP", "error");
      editingReminderId = '';
      return;
    }

    remindersList = remindersList.map(r => {
      if (r.id === id) {
        addLog(`SENSOR REALIGNED: ${r.text.substring(0, 15)} -> ${parsed.cleanText.substring(0, 15)}`);
        return { 
          ...r, 
          text: parsed.cleanText, 
          targetTime: nextTargetTime,
          scheduler: schedulerConfig,
          triggered: false
        };
      }
      return r;
    }).sort((a, b) => a.targetTime - b.targetTime);

    saveRemindersToStorage();
    highlightedReminderId = id;
    setTimeout(() => {
      highlightedReminderId = '';
    }, 1200);

    setTimeout(() => {
      const el = document.getElementById(`reminder-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    AudioEngine.play('data-lock');
    editingReminderId = '';
  };

  // Storage Persistence
  const saveRemindersToStorage = async () => {
    localStorage.setItem('chronos_reminders_list', JSON.stringify(remindersList));
    if (window.stratagemAPI) {
      try {
        await window.stratagemAPI.setConfig('chronosReminders', JSON.stringify(remindersList));
      } catch (err) {
        console.error('Failed to save Chronos Reminders:', err);
      }
    }
  };

  const saveDispatchedRemindersToStorage = async () => {
    localStorage.setItem('chronos_dispatched_reminders', JSON.stringify(dispatchedReminders));
    if (window.stratagemAPI) {
      try {
        await window.stratagemAPI.setConfig('chronosDispatchedReminders', JSON.stringify(dispatchedReminders));
      } catch (err) {
        console.error('Failed to save dispatched reminders:', err);
      }
    }
  };

  const openReschedulerForAlarm = (alarm: any) => {
    AudioEngine.play('ui-click');
    reschedulingAlarmId = alarm.id;
    isSchedulerOpen = true;
  };

  const openScheduler = () => {
    AudioEngine.play('ui-click');
    reschedulingAlarmId = null;
    isSchedulerOpen = true;
  };

  const addReminderTemplate = () => {
    let text = newReminderTemplateText.trim();
    if (!text) return;
    
    if (text.includes('@') || text.includes('%')) {
      AudioEngine.play('fail');
      showChronosNotification("DATE @ AND RECURRENCE % ARE RESTRICTED IN TEMPLATES", "error");
      return;
    }

    const hashMatch = text.match(/#\S+/g);
    if (hashMatch) {
      for (const tag of hashMatch) {
        if (!isValidTimeTag(tag)) {
          AudioEngine.play('fail');
          showChronosNotification("INVALID TEMPLATE: # IS RESERVED FOR TIME ONLY (0-23 HOURS, 0-59 MINUTES)", "error");
          return;
        }
      }
    }
    
    text = formatTemplateName(text);
    if (!text) return;

    reminderTemplates = [...reminderTemplates, text];
    newReminderTemplateText = '';
    localStorage.setItem('chronos_reminder_templates', JSON.stringify(reminderTemplates));
    AudioEngine.play('ui-click');
    addLog(`REMINDER TEMPLATE ADDED: ${text}`);

    const newIdx = reminderTemplates.length - 1;
    highlightedTemplateIdx = newIdx;
    setTimeout(() => {
      highlightedTemplateIdx = -1;
    }, 1200);

    setTimeout(() => {
      const el = document.getElementById('reminder-template-list');
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 40);
  };

  const saveReminderTemplateEdit = (idx: number, newText: string) => {
    let text = newText.trim();
    if (text) {
      if (text.includes('@') || text.includes('%')) {
        AudioEngine.play('fail');
        showChronosNotification("DATE @ AND RECURRENCE % ARE RESTRICTED IN TEMPLATES", "error");
        editingReminderTemplateIdx = -1;
        return;
      }

      const hashMatch = text.match(/#\S+/g);
      if (hashMatch) {
        for (const tag of hashMatch) {
          if (!isValidTimeTag(tag)) {
            AudioEngine.play('fail');
            showChronosNotification("INVALID TEMPLATE: # IS RESERVED FOR TIME ONLY (0-23 HOURS, 0-59 MINUTES)", "error");
            editingReminderTemplateIdx = -1;
            return;
          }
        }
      }

      text = formatTemplateName(text);
      if (text) {
        const oldText = reminderTemplates[idx];
        reminderTemplates[idx] = text;
        localStorage.setItem('chronos_reminder_templates', JSON.stringify(reminderTemplates));
        
        highlightedTemplateIdx = idx;
        setTimeout(() => {
          highlightedTemplateIdx = -1;
        }, 1200);

        AudioEngine.play('data-lock');
        addLog(`REMINDER TEMPLATE REALIGNED: ${oldText} -> ${text}`);
      }
    }
    editingReminderTemplateIdx = -1;
  };

  const deleteReminderTemplate = (idx: number) => {
    const text = reminderTemplates[idx];
    reminderTemplates = reminderTemplates.filter((_, i) => i !== idx);
    localStorage.setItem('chronos_reminder_templates', JSON.stringify(reminderTemplates));
    AudioEngine.play('fail');
    addLog(`REMINDER TEMPLATE PURGED: ${text}`);
  };

  const moveReminderTemplateUp = (idx: number) => {
    if (idx > 0) {
      AudioEngine.play('ui-click');
      const nextTemplates = [...reminderTemplates];
      const temp = nextTemplates[idx];
      nextTemplates[idx] = nextTemplates[idx - 1];
      nextTemplates[idx - 1] = temp;
      reminderTemplates = nextTemplates;
      localStorage.setItem('chronos_reminder_templates', JSON.stringify(reminderTemplates));
    }
  };

  const addReminderFromTemplate = (templateText: string) => {
    const text = templateText.trim();
    if (!text) return;
    
    const parsed = parseReminderTags(text);
    const todayStr = getLocalDateStr();
    
    let timeStr = parsed.targetTimeStr;
    if (!timeStr) {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const hr = String(future.getHours()).padStart(2, '0');
      const mn = String(future.getMinutes()).padStart(2, '0');
      timeStr = `${hr}:${mn}`;
    }
    
    const cleanText = parsed.cleanText;
    const targetTime = calculateNextTargetTime({ 
      type: 'once', 
      date: todayStr, 
      time: timeStr, 
      weeklyDays: [], 
      customTimes: [] 
    });

    if (!targetTime || targetTime < Date.now()) {
      AudioEngine.play('fail');
      showChronosNotification("DEPLOY FAILED: TEMPLATE VECTOR IS IN THE PAST", "error");
      addLog("TEMPLATE DEPLOY FAILED: TEMPORAL VECTOR IN THE PAST");
      return;
    }

    const newReminder = {
      id: Math.random().toString(36).substring(2, 9),
      text: cleanText,
      targetTime,
      triggered: false,
      muted: false,
      scheduler: {
        type: 'once' as const,
        date: todayStr,
        time: timeStr,
        weeklyDays: [],
        customTimes: []
      }
    };

    remindersList = [...remindersList, newReminder].sort((a, b) => a.targetTime - b.targetTime);
    saveRemindersToStorage();
    AudioEngine.play('success');
    addLog(`SENSOR DEPLOYED: ${cleanText}`);

    highlightedReminderId = newReminder.id;
    setTimeout(() => {
      highlightedReminderId = '';
    }, 1200);

    setTimeout(() => {
      const el = document.getElementById(`reminder-${newReminder.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);

    highlightedReminderId = newReminder.id;
    setTimeout(() => {
      highlightedReminderId = '';
    }, 1200);

    setTimeout(() => {
      const el = document.getElementById(`reminder-${newReminder.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const clearDispatchedReminders = () => {
    AudioEngine.play('fail');
    dispatchedReminders = [];
    saveDispatchedRemindersToStorage();
    addLog("DISPATCHED ALERTS LOGS PURGED");
    showChronosNotification("DISPATCHED LOGS PURGED", "info");
  };

  const resetRemindersMatrix = () => {
    AudioEngine.play('shutdown');
    remindersList = [];
    saveRemindersToStorage();
    addLog("ALERTS MATRIX RESET TO ZERO");
    showChronosNotification("ALERTS MATRIX RESET", "info");
  };

  // Shared actions
  const toggleMuteAllReminders = () => {
    const anyUnmuted = remindersList.some(r => !r.muted);
    if (anyUnmuted) {
      AudioEngine.play('fail');
      globalMute = true;
      remindersList = remindersList.map(r => ({ ...r, muted: true }));
      saveRemindersToStorage();
      addLog("ALL ALERTS MUTED PROTOCOL DEPLOYED");
      showChronosNotification("ALL ACTIVE ALERTS MUTED", "warning");
    } else {
      AudioEngine.play('success');
      globalMute = false;
      remindersList = remindersList.map(r => ({ ...r, muted: false }));
      saveRemindersToStorage();
      addLog("ALL ALERTS UNMUTED");
      showChronosNotification("ALL ACTIVE ALERTS UNMUTED", "success");
    }
  };

  function isValidDateTag(tag: string): boolean {
    const val = tag.substring(1).toLowerCase(); // remove '@'
    if (val === 'today' || val === 'tomorrow' || val === 'overmorrow') {
      return true;
    }
    // Check YYYY-MM-DD
    const ymdMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      const yr = parseInt(ymdMatch[1], 10);
      const mo = parseInt(ymdMatch[2], 10);
      const dy = parseInt(ymdMatch[3], 10);
      if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        const d = new Date(yr, mo - 1, dy);
        return d.getFullYear() === yr && d.getMonth() === mo - 1 && d.getDate() === dy;
      }
      return false;
    }
    // Check dayMonthName[Year]
    const dmyMatch = val.match(/^(\d{1,2})([a-z]+)(\d{4}|\d{2})?$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const monthStr = dmyMatch[2];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      let monthIndex = -1;
      for (let i = 0; i < 12; i++) {
        if (monthStr.startsWith(months[i])) {
          monthIndex = i;
          break;
        }
      }
      return monthIndex !== -1 && day >= 1 && day <= 31;
    }
    // Check Day Only (e.g. 17 or 20)
    const dayOnlyMatch = val.match(/^(\d{1,2})$/);
    if (dayOnlyMatch) {
      const day = parseInt(dayOnlyMatch[1], 10);
      if (day >= 1 && day <= 31) {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), day);
        return d.getDate() === day;
      }
    }
    return false;
  }

  function isValidTimeTag(tag: string): boolean {
    const val = tag.substring(1); // remove '#'
    const match = val.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (match) {
      const hh = parseInt(match[1], 10);
      const mm = match[2] ? parseInt(match[2], 10) : 0;
      return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
    }
    return false;
  }

  // Highlight syntax helper
  function highlightInputText(text: string, placeholder: string) {
    if (!text) {
      return `<span style="opacity: 0.35;">${placeholder}</span>`;
    }
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Highlight @date tags only if valid
    escaped = escaped.replace(/(@\S+)/g, (match) => {
      if (isValidDateTag(match)) {
        return `<span class="highlight-tag-date">${match}</span>`;
      }
      return match;
    });
    // Highlight #time tags only if valid
    escaped = escaped.replace(/(#\S+)/g, (match) => {
      if (isValidTimeTag(match)) {
        return `<span class="highlight-tag-time">${match}</span>`;
      }
      return match;
    });
    // Highlight %recurrence tags
    escaped = escaped.replace(/(%\S+)/g, (match) => {
      return `<span class="highlight-tag-recurrence">${match}</span>`;
    });
    
    return escaped;
  }

  onMount(() => {
    try {
      const savedReminderTemplates = localStorage.getItem('chronos_reminder_templates');
      if (savedReminderTemplates) {
        reminderTemplates = JSON.parse(savedReminderTemplates);
      } else {
        reminderTemplates = [
          "SYNCHRONIZE QUANTUM CORES",
          "REFRACT COGNITIVE MATRIX",
          "MONITOR TELEMETRY LINK",
          "AUDIT SECURE BRIDGE INTEGRITY",
          "PURGE KERNEL CACHED STACKS"
        ];
        localStorage.setItem('chronos_reminder_templates', JSON.stringify(reminderTemplates));
      }
    } catch (e) {
      console.error('Failed to parse reminder templates:', e);
    }
  });

  onDestroy(() => {
    if (alarmInterval) clearInterval(alarmInterval);
  });
</script>

{#if mode === 'overlay_only'}
  {#if activeAlarm}
    <div class="alarm-fullscreen-overlay" transition:fade={{ duration: 150 }}>
      <div class="alarm-flashing-bg"></div>
      <div class="alarm-modal-container circular-glow-ring">

        <div class="alarm-warning-glow"></div>
        <div class="alarm-header font-outfit" style="display: flex; align-items: center; justify-content: center; gap: 14px;">
          <!-- Left Pulsing Radar SVG -->
          <svg class="alarm-radar-icon left" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1" />
            <path d="M12 2a10 10 0 0 0-10 10" />
            <path d="M12 6a6 6 0 0 0-6 6" />
            <path d="M12 10a2 2 0 0 0-2 2" />
            <path d="M12 22a10 10 0 0 0 10-10" />
            <path d="M18 12a6 6 0 0 0-6-6" />
            <path d="M14 12a2 2 0 0 0-2-2" />
          </svg>

          <span class="warning-title text-shimmer" style="font-weight: 950 !important; letter-spacing: 0.15em; font-size: 32px !important;">CHRONOS INTERCEPT</span>

          <!-- Right Pulsing Radar SVG -->
          <svg class="alarm-radar-icon right" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1" />
            <path d="M12 2a10 10 0 0 0-10 10" />
            <path d="M12 6a6 6 0 0 0-6 6" />
            <path d="M12 10a2 2 0 0 0-2 2" />
            <path d="M12 22a10 10 0 0 0 10-10" />
            <path d="M18 12a6 6 0 0 0-6-6" />
            <path d="M14 12a2 2 0 0 0-2-2" />
          </svg>
        </div>
        
        <div class="alarm-hud-circle">
          <svg width="150" height="150" viewBox="0 0 100 100" class="alarm-hud-svg">
            <!-- 60 Seconds Countdown Circular Sweep -->
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(239, 68, 68, 0.12)" stroke-width="2" />
            <circle cx="50" cy="50" r="46" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="289" stroke-dashoffset="0" class="hud-countdown-sweep" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="8 6" class="hud-rotate-clockwise" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(239, 68, 68, 0.3)" stroke-width="1" stroke-dasharray="2 2" />
            <circle cx="50" cy="50" r="8" fill="#ef4444" class="hud-pulse-dot" />
            <line x1="50" y1="50" x2="50" y2="20" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" class="hud-hand-hour" />
            <line x1="50" y1="50" x2="70" y2="50" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" class="hud-hand-minute" />
          </svg>
        </div>

        <div class="alarm-body font-mono" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          <div class="alarm-label font-outfit" style="font-weight: 950 !important; letter-spacing: 0.15em; color: #ef4444;">ALERT LOG DETECTED</div>
          
          <div style="position: relative; width: 100%; display: flex; justify-content: center; margin-top: -6px; margin-bottom: 24px;">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
              class="alarm-message select-text font-outfit" 
              onmouseenter={() => showMessageTooltip = true}
              onmouseleave={() => showMessageTooltip = false}
              style="font-weight: 950 !important; max-width: 540px; width: 100%; display: flex !important; align-items: center !important; justify-content: center !important; line-height: 1.4; font-size: 17px !important; min-height: calc(1.4em * 3 + 32px) !important; max-height: calc(1.4em * 3 + 32px) !important; padding: 16px 24px !important; cursor: help; box-sizing: border-box !important;"
            >
              <div style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; text-align: center; width: 100%; max-height: calc(1.4em * 3); line-height: 1.4; font-family: 'Outfit', sans-serif; font-weight: 950 !important; color: #ffffff; text-shadow: 0 0 20px rgba(255, 255, 255, 0.35); letter-spacing: 0.05em;">
                {activeAlarm.text.toUpperCase()}
              </div>
            </div>

            {#if showMessageTooltip}
              <div class="alarm-tooltip-toast font-outfit" transition:fade={{ duration: 80 }}>
                <span class="tooltip-header font-mono">📡 FULL SENSOR IDENTIFIER:</span>
                <span class="tooltip-body">{activeAlarm.text.toUpperCase()}</span>
              </div>
            {/if}
          </div>

          <div class="alarm-meta" style="max-width: 480px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 950 !important; font-family: 'Share Tech Mono', monospace; font-size: 16px !important; color: #ffffff;">📡 TEMPORAL STAMP:</span>
            <span style="font-weight: 950 !important; font-family: 'Share Tech Mono', monospace; font-size: 16px !important; color: #67e8f9; text-shadow: 0 0 10px rgba(103,232,249,0.65);">
              {formatSchedulerDisplayDate(getLocalDateStr(activeAlarm.targetTime))} @ {new Date(activeAlarm.targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        
        <div class="alarm-action-buttons-row" style="display: flex; gap: 16px; width: 100%; max-width: 540px; margin-top: 10px; z-index: 20;">
          <button class="fui-button alarm-ack-btn font-outfit" onclick={acknowledgeAlarm} style="flex: 1;">
            ACKNOWLEDGE
          </button>
          <button 
            class="fui-button alarm-resched-btn font-outfit" 
            onclick={() => openReschedulerForAlarm(activeAlarm)}
            style="flex: 1;"
          >
            SCHEDULER
          </button>
        </div>
      </div>
    </div>
  {/if}

  <TemporalScheduler
    bind:isSchedulerOpen={isSchedulerOpen}
    bind:activeReminderScheduler={activeReminderScheduler}
    bind:reschedulingAlarmId={reschedulingAlarmId}
    bind:activeAlarm={activeAlarm}
    bind:remindersList={remindersList}
    bind:dispatchedReminders={dispatchedReminders}
    bind:newReminderText={newReminderText}
    addReminder={handleAddReminder}
    {saveRemindersToStorage}
    {saveDispatchedRemindersToStorage}
    {addLog}
    {showChronosNotification}
  />
{/if}

{#if mode === 'viewport'}
  <!-- Reminders View (Classified magenta alerts theme) -->
  <div class="reminders-view-wrapper" in:fade={{ duration: 80 }} out:fade={{ duration: 80 }}>
    <div class="panel-header">
      <span class="fui-label alert-themed-title">TEMPORAL ALERTS</span>
      <div style="display: flex; align-items: center; gap: 12px;">
        {#if remindersSubMode === 'active'}
          <button class="fui-button header-action-btn reminders-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); remindersSubMode = 'logs'; }}>
            VIEW LOGS
          </button>
        {:else}
          <button class="fui-button header-action-btn reminders-btn font-outfit" onclick={() => { AudioEngine.play('ui-click'); remindersSubMode = 'active'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            RETURN TO ALERTS
          </button>
        {/if}
      </div>
    </div>

    {#if remindersSubMode === 'active'}
      <div class="reminders-list" bind:this={remindersListEl}>
        {#each remindersList as r (r.id)}
          <div class="reminder-item-card" id="reminder-{r.id}" class:dispatched={r.triggered} class:muted={r.muted} class:highlight-flash={r.id === highlightedReminderId}>
            <div class="reminder-info">
              {#if editingReminderId === r.id}
                <div style="position: relative; width: 100%;">
                  <div bind:this={editReminderHighlightBgEl} class="reminder-edit-highlight-bg">
                    {@html highlightInputText(editingReminderText, "")}
                  </div>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input 
                    type="text" 
                    value={editingReminderText} 
                    onkeydown={(e) => {
                      if (e.key === 'Enter') {
                        saveReminderNameEdit(r.id, editingReminderText);
                      } else if (e.key === 'Escape') {
                        editingReminderId = '';
                      } else {
                        handleEditInputKeydown(e, e.currentTarget);
                      }
                    }}
                    onscroll={(e) => {
                      if (editReminderHighlightBgEl) {
                        editReminderHighlightBgEl.scrollLeft = e.currentTarget.scrollLeft;
                      }
                    }}
                    oninput={handleEditInput}
                    onblur={(e) => saveReminderNameEdit(r.id, editingReminderText)}
                    class="reminder-edit-input highlighted-input"
                    autofocus
                  />
                  {#if activeInputError}
                    <div class="reminder-input-error-toast font-mono" style="position: absolute; top: calc(100% + 4px); left: 0; z-index: 10; margin: 0; width: 100%; box-sizing: border-box; background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.5); border-radius: 4px; padding: 6px 12px; color: #ef4444; font-size: 11px; font-weight: 950 !important; text-align: center; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);" transition:fade={{ duration: 100 }}>
                      <span>⚠️ {activeInputError.toUpperCase()}</span>
                    </div>
                  {/if}
                </div>
              {:else}
                <span class="reminder-text-label" onclick={() => startEditingReminder(r.id, r.text)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditingReminder(r.id, r.text); } }} role="button" tabindex="0">{r.text}</span>
              {/if}
              <div class="reminder-meta font-mono" style="font-weight: 950 !important; color: #ffffff;">
                <span class="meta-label" style="font-weight: 950 !important; color: rgba(255, 255, 255, 0.5);">TRIGGER VECTOR:</span>
                <span class="meta-value" style="font-weight: 950 !important; color: var(--tertiary-accent);">{formatSchedulerDisplayDate(getLocalDateStr(r.targetTime))} {new Date(r.targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {#if r.scheduler && r.scheduler.type !== 'once'}
                  <span class="meta-label" style="margin-left: 8px; color: #d946ef; font-weight: 950 !important;">🔁 {r.scheduler.type.toUpperCase()}</span>
                {/if}
              </div>
            </div>

            <div class="reminder-card-actions">
              <button 
                class="reminder-icon-btn" 
                onclick={() => startEditingReminder(r.id, r.text)}
                title="Edit Name"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </button>

              <button 
                class="reminder-icon-btn mute-btn" 
                class:is-muted={r.muted}
                onclick={() => toggleMuteReminder(r.id)}
                title={r.muted ? "Unmute Sensor" : "Mute Sensor"}
              >
                {#if r.muted}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                    <path d="M18 8a6 6 0 0 0-9.33-5" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                {:else}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                {/if}
              </button>

              <button 
                class="reminder-icon-btn purge-btn" 
                onclick={() => purgeReminder(r.id)} 
                title="Purge Sensor"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
        {#if remindersList.length === 0}
          <div class="empty-alerts-placeholder font-mono">
            NO SENSORS DEPLOYED. INITIALIZE ALERTS MATRIX.
          </div>
        {/if}
      </div>

      <div class="reminder-input-row-wrapper">
        {#if activeInputError && !editingReminderId}
          <div class="reminder-input-error-toast" transition:fade={{ duration: 100 }}>
            <span>⚠️ {activeInputError.toUpperCase()}</span>
          </div>
        {/if}

        <div class="reminder-input-row">
          <div class="input-wrapper-relative">
            <!-- Dynamic Background Highlighting -->
            <div bind:this={highlightBgEl} class="reminder-desc-highlight-bg">
              {@html highlightInputText(newReminderText, "ALERT PROTOCOL DESCRIPTION...")}
            </div>
            <input 
              type="text" 
              bind:this={mainInputEl}
              value={newReminderText} 
              onkeydown={handleInputKeydown}
              onscroll={(e) => {
                if (highlightBgEl) {
                  highlightBgEl.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
              oninput={handleMainInput}
              class="reminder-desc-input highlighted-input" 
            />
            <span class="reminder-input-plus-icon" onclick={handleAddReminder} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAddReminder(); } }} role="button" tabindex="0" style="cursor: pointer; pointer-events: auto;">+</span>
          </div>
          
          <button class="clock-btn font-mono" onclick={openScheduler} title="Configure Schedule" class:configured={activeReminderScheduler.time || activeReminderScheduler.type !== 'once' || activeReminderScheduler.customTimes.length > 0}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
        </div>
        
        <!-- Interactive target time status indicator and validator -->
        {#if !activeInputError}
          <div class="scheduler-status-text font-mono" style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; opacity: 0.85; font-size: 11.5px; font-weight: 950 !important; letter-spacing: 0.05em;">
              <span>📅 TODAY: {formatSchedulerDisplayDate(getLocalDateStr())}</span>
              <span>{computedTargetDisplay.text.toUpperCase()}</span>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="reminders-list read-only-logs-list" in:fade={{ duration: 80 }} style="display: flex; flex-direction: column; gap: 12px;">
        <div class="panel-section-title" style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: none !important; padding-bottom: 0; margin-bottom: 14px;">
          <span>DISPATCHED ALERTS HISTORY</span>
          <button class="fui-button clear-logs-btn font-outfit" onclick={clearDispatchedReminders} style="font-weight: 950 !important; font-size: 10px; padding: 4px 12px; height: 26px; border-radius: 4px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; cursor: pointer; transition: all 0.2s;">
            CLEAR LOGS
          </button>
        </div>
        {#each dispatchedReminders as r}
          <div 
            class="reminder-item-card dispatched-log-card" 
            style="border-left: 5px solid {r.rescheduled ? '#06b6d4' : (r.acknowledged ? '#10b981' : '#ef4444')}; 
                   border-color: {r.rescheduled ? 'rgba(6, 182, 212, 0.4)' : (r.acknowledged ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)')}; 
                   background: {r.rescheduled
                     ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 10, 20, 0.85) 50%, rgba(6, 182, 212, 0.03) 100%)'
                     : (r.acknowledged 
                       ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(8, 10, 20, 0.85) 50%, rgba(16, 185, 129, 0.02) 100%)' 
                       : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(8, 10, 20, 0.85) 50%, rgba(239, 68, 68, 0.03) 100%)')};"
          >
            <div class="reminder-info">
              <span class="reminder-text-label font-outfit" style="font-size: 17px; font-weight: 950 !important; letter-spacing: 0.04em; color: #ffffff; text-decoration: none !important; margin-bottom: 6px; text-shadow: 0 0 10px rgba(255, 255, 255, 0.25);">{r.text.toUpperCase()}</span>
              <div class="reminder-meta font-mono" style="font-weight: 950 !important; font-size: 13px; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <span class="meta-label" style="color: rgba(255,255,255,0.55); font-weight: 950;">📡 TELEMETRY:</span>
                <span class="meta-value" style="color: #67e8f9; text-shadow: 0 0 8px rgba(103,232,249,0.5); font-weight: 950;">{formatSchedulerDisplayDate(getLocalDateStr(r.targetTime))} @ {new Date(r.targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="reminder-meta font-mono" style="font-weight: 950 !important; margin-top: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <span class="meta-label" style="color: rgba(255,255,255,0.55); font-weight: 950;">⚡ STATUS:</span>
                {#if r.rescheduled}
                  <span class="meta-value" style="color: #22d3ee; text-shadow: 0 0 10px rgba(34,211,238,0.5); font-weight: 950;">[ RESCHEDULED ]</span>
                {:else if r.acknowledged}
                  <span class="meta-value" style="color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.5); font-weight: 950;">[ VERIFIED / ACKNOWLEDGED ]</span>
                {:else}
                  <span class="meta-value" style="color: #ef4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); font-weight: 950 !important;">[ ACTIVE / UNACKNOWLEDGED ]</span>
                {/if}
              </div>
            </div>
            <div class="reminder-card-actions" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; justify-content: center;">
              {#if !r.acknowledged && !r.rescheduled}
                <!-- svelte-ignore a11y_mouse_events_have_key_events -->
                <button 
                  class="fui-button font-outfit" 
                  onclick={() => {
                    AudioEngine.play('success');
                    dispatchedReminders = dispatchedReminders.map(item => item.id === r.id ? { ...item, acknowledged: true } : item);
                    saveDispatchedRemindersToStorage();
                    showChronosNotification("ALERT ACKNOWLEDGED FROM LOGS", "success");
                  }}
                  style="font-weight: 950 !important; font-size: 10px; padding: 6px 12px; border-radius: 6px; background: #10b981; border: 1.5px solid #34d399; color: #080a14; cursor: pointer; box-shadow: 0 0 10px rgba(16,185,129,0.4); text-transform: uppercase; transition: all 0.2s ease;"
                  onmouseover={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.7)'; }}
                  onmouseout={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 10px rgba(16,185,129,0.4)'; }}
                >
                  ACKNOWLEDGE
                </button>
              {/if}
            </div>
          </div>
        {/each}
        {#if dispatchedReminders.length === 0}
          <div class="empty-laps-placeholder font-mono" style="opacity: 0.35;">
            AWAITING LOGGED ALERTS...
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else if mode === 'sidebar'}
  <div class="panel-section-title">QUICK ACTIONS</div>
  <div class="reminders-quick-actions">
    <div class="reminders-status-readout font-mono">
      STATUS: {remindersList.filter(r => r.triggered).length}/{remindersList.length} DISPATCHED
    </div>
    <button class="action-btn font-mono" onclick={toggleMuteAllReminders} disabled={remindersList.length === 0}>
      {remindersList.some(r => !r.muted) ? 'MUTE ALL SENSORS' : 'UNMUTE ALL SENSORS'}
    </button>
    <button class="action-btn font-mono reset-btn-reminders" onclick={resetRemindersMatrix}>RESET MATRIX</button>
  </div>

  <div class="panel-section-title">ALERT TEMPLATES</div>
  <div class="add-template-row">
    <input 
      type="text" 
      placeholder="NEW TEMPLATE..." 
      value={newReminderTemplateText}
      onkeydown={(e) => e.key === 'Enter' && addReminderTemplate()}
      onfocus={() => {
        const el = document.getElementById('reminder-template-list');
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }}
      oninput={handleNewTemplateInput}
      class="template-input font-mono"
    />
  </div>
  <div class="template-list" id="reminder-template-list">
    {#each reminderTemplates as template, idx}
      {#if editingReminderTemplateIdx === idx}
        <div style="margin-bottom: 4px; width: 100%; position: relative;">
          <div bind:this={editTemplateHighlightBgEl} class="template-edit-highlight-bg">
            {@html highlightTemplateText(editingReminderTemplateText, "")}
          </div>
          <!-- svelte-ignore a11y_autofocus -->
          <input 
            type="text" 
            value={editingReminderTemplateText} 
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                saveReminderTemplateEdit(idx, editingReminderTemplateText);
              } else if (e.key === 'Escape') {
                editingReminderTemplateIdx = -1;
              }
            }}
            onscroll={(e) => {
              if (editTemplateHighlightBgEl) {
                editTemplateHighlightBgEl.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
            oninput={handleTemplateEditInput}
            onblur={(e) => saveReminderTemplateEdit(idx, editingReminderTemplateText)}
            class="template-edit-inline-input highlighted-input"
            autofocus
          />
        </div>
      {:else}
        <div class="template-item-row" style="margin-bottom: 4px; position: relative;" class:highlight-flash={highlightedTemplateIdx === idx}>
          <span 
            class="template-text-clickable font-mono" 
            onclick={() => addReminderFromTemplate(template)} 
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addReminderFromTemplate(template); } }}
            role="button"
            tabindex="0"
          >
            {template}
          </span>
          <div class="template-actions">
            {#if idx > 0}
              <button class="template-act-btn move-up" onclick={(e) => { e.stopPropagation(); moveReminderTemplateUp(idx); }} title="Move Up">▲</button>
            {/if}
            <button class="template-act-btn edit" onclick={(e) => { e.stopPropagation(); editingReminderTemplateIdx = idx; editingReminderTemplateText = template; AudioEngine.play('ui-click'); }} title="Edit">✎</button>
            <button class="template-act-btn delete" onclick={(e) => { e.stopPropagation(); deleteReminderTemplate(idx); }} title="Delete">×</button>
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
