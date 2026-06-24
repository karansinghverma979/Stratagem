<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../core/audio-engine';

  let {
    isSchedulerOpen = $bindable(false),
    activeReminderScheduler = $bindable(),
    reschedulingAlarmId = $bindable(null),
    activeAlarm = $bindable(null),
    remindersList = $bindable([]),
    dispatchedReminders = $bindable([]),
    newReminderText = $bindable(''),
    addReminder,
    saveRemindersToStorage,
    saveDispatchedRemindersToStorage,
    addLog,
    showChronosNotification
  } = $props();

  // Temporary editing states
  let tempSchedulerType = $state<'once' | 'daily' | 'weekly' | 'custom'>('once');
  let tempSchedulerDate = $state('');
  let tempSchedulerTime = $state('');
  let tempSchedulerWeeklyDays = $state<number[]>([]);
  let tempSchedulerCustomTimes = $state<{ date: string; time: string }[]>([]);

  // Clock & Calendar states
  let clockHour = $state(12);
  let clockMinute = $state(0);
  let clockAMPM = $state<'AM' | 'PM'>('PM');
  let clockSelectMode = $state<'hours' | 'minutes'>('hours');
  let isDraggingClockNeedle = $state(false);

  let calendarYear = $state(new Date().getFullYear());
  let calendarMonth = $state(new Date().getMonth());

  const hourMarkers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteMarkers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const daysOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  // Derived properties
  let clockNeedleAngle = $derived(clockSelectMode === 'hours' ? (clockHour * 30) - 90 : (clockMinute * 6) - 90);
  let clockNeedleRad = $derived(clockNeedleAngle * Math.PI / 180);
  let clockNeedleTargetX = $derived(100 + 60 * Math.cos(clockNeedleRad));
  let clockNeedleTargetY = $derived(100 + 60 * Math.sin(clockNeedleRad));

  // Helper date methods
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

  function get24HourTimeStr(hr: number, mn: number, ampm: 'AM' | 'PM'): string {
    let h24 = hr;
    if (ampm === 'PM') {
      if (hr !== 12) h24 = hr + 12;
    } else {
      if (hr === 12) h24 = 0;
    }
    return `${String(h24).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
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

  // Real-time error validation
  let schedulerError = $derived.by(() => {
    if (tempSchedulerType === 'custom') {
      if (tempSchedulerCustomTimes.length === 0) {
        return "AT LEAST ONE VECTOR REQUIRED";
      }
      return "";
    }

    if (!tempSchedulerTime) {
      return "TARGET TIME IS REQUIRED";
    }

    const parts = tempSchedulerTime.split(':');
    if (parts.length === 2) {
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23) {
        return "INVALID HOUR FORMAT (MUST BE 0-23)";
      }
      if (mm < 0 || mm > 59) {
        return "INVALID MINUTE: LIMIT EXCEEDED PHYSICALLY REALIZABLE VALUE (MAX 59M)";
      }
    } else {
      return "TIME FORMAT MUST BE HH:MM";
    }

    if (tempSchedulerType === 'once') {
      if (!tempSchedulerDate) {
        return "TARGET DATE IS REQUIRED";
      }
      const [yr, mo, dy] = tempSchedulerDate.split('-').map(Number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const testDate = new Date(yr, mo - 1, dy, 23, 59, 59);
      if (testDate.getTime() < today.getTime()) {
        return "INVALID VECTOR: CHRONO TARGET IN THE PAST";
      }
    }

    if (tempSchedulerType === 'weekly') {
      if (tempSchedulerWeeklyDays.length === 0) {
        return "AT LEAST ONE ACTIVE DAY REQUIRED FOR RECURRENCE";
      }
    }

    const targetTime = calculateNextTargetTime({
      type: tempSchedulerType,
      date: tempSchedulerDate,
      time: tempSchedulerTime,
      weeklyDays: tempSchedulerWeeklyDays,
      customTimes: tempSchedulerCustomTimes
    });

    if (!targetTime || targetTime < Date.now()) {
      return "INVALID DETECTION: TEMPORAL VECTOR PRECEDES CURRENT REALITY (PAST CHRONO VECTOR)";
    }

    return "";
  });

  let selectedVectorLiveText = $derived.by(() => {
    const targetTime = calculateNextTargetTime({
      type: tempSchedulerType,
      date: tempSchedulerDate,
      time: tempSchedulerTime,
      weeklyDays: tempSchedulerWeeklyDays,
      customTimes: tempSchedulerCustomTimes
    });
    if (!targetTime) return "NO ACTIVE VECTOR";
    const dateDisplay = formatSchedulerDisplayDate(getLocalDateStr(targetTime));
    const timeDisplay = new Date(targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateDisplay} @ ${timeDisplay} (${tempSchedulerType.toUpperCase()})`;
  });

  function updateTextTagsFromScheduler(text: string, type: string, date: string, time: string) {
    let result = text;

    // 1. Recurrence Tag (%) - Strip % tags
    result = result.replace(/%\S+/g, '');

    // 2. Date Tag (@)
    if (type === 'once' && date) {
      const dateTag = `@${date}`;
      if (result.match(/@\S+/)) {
        result = result.replace(/@\S+/, dateTag);
      } else {
        result += ` ${dateTag}`;
      }
    } else {
      result = result.replace(/@\S+/g, '');
    }

    // 3. Time Tag (#)
    if (time) {
      const timeTag = `#${time}`;
      if (result.match(/#\S+/)) {
        result = result.replace(/#\S+/, timeTag);
      } else {
        result += ` ${timeTag}`;
      }
    } else {
      result = result.replace(/#\S+/g, '');
    }

    let cleaned = result.replace(/\s+/g, ' ').trim();
    const datePattern = /@(?:today|tomorrow|overmorrow|\d{4}-\d{2}-\d{2})$/i;
    const timePattern = /#(?:2|8|12|14|16|18|20|22|\d{1,2}:\d{2})$/i;

    if (datePattern.test(cleaned) || timePattern.test(cleaned)) {
      cleaned += ' ';
    }
    return cleaned;
  }

  const getMarkerCoords = (index: number, radius = 65) => {
    const angle = (index * 30) - 90;
    const rad = angle * Math.PI / 180;
    return {
      x: 100 + radius * Math.cos(rad),
      y: 100 + radius * Math.sin(rad)
    };
  };

  // Clock methods
  const parseSchedulerTime = (timeStr: string) => {
    if (!timeStr) {
      const d = new Date();
      let hr = d.getHours() + 2;
      clockAMPM = hr >= 24 ? 'AM' : (hr >= 12 ? 'PM' : 'AM');
      hr = hr % 12;
      if (hr === 0) hr = 12;
      clockHour = hr;
      clockMinute = 0;
      return;
    }
    const [h24, m] = timeStr.split(':').map(Number);
    clockMinute = m;
    clockAMPM = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    clockHour = h12;
  };

  const updateClockTimeFromEvent = (clientX: number, clientY: number) => {
    const svgEl = document.querySelector('.radial-clock-dial');
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angleDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
    angleDegrees = (angleDegrees + 90 + 360) % 360;

    if (clockSelectMode === 'hours') {
      let hr = Math.round(angleDegrees / 30);
      if (hr === 0) hr = 12;
      if (clockHour !== hr) {
        clockHour = hr;
        AudioEngine.play('ui-hover');
      }
    } else {
      let mn = Math.round(angleDegrees / 6) % 60;
      if (clockMinute !== mn) {
        clockMinute = mn;
        AudioEngine.play('ui-hover');
      }
    }
  };

  const handleClockMouseMove = (e: MouseEvent) => {
    if (!isDraggingClockNeedle) return;
    updateClockTimeFromEvent(e.clientX, e.clientY);
  };

  const handleClockMouseUp = () => {
    if (isDraggingClockNeedle) {
      isDraggingClockNeedle = false;
      window.removeEventListener('mousemove', handleClockMouseMove);
      window.removeEventListener('mouseup', handleClockMouseUp);
      AudioEngine.play('ui-click');
    }
  };

  const handleClockMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingClockNeedle = true;
    updateClockTimeFromEvent(e.clientX, e.clientY);
    window.addEventListener('mousemove', handleClockMouseMove);
    window.addEventListener('mouseup', handleClockMouseUp);
  };

  const handleClockTouchMove = (e: TouchEvent) => {
    if (!isDraggingClockNeedle) return;
    if (e.touches.length > 0) {
      updateClockTimeFromEvent(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleClockTouchEnd = () => {
    if (isDraggingClockNeedle) {
      isDraggingClockNeedle = false;
      window.removeEventListener('touchmove', handleClockTouchMove);
      window.removeEventListener('touchend', handleClockTouchEnd);
      AudioEngine.play('ui-click');
    }
  };

  const handleClockTouchStart = (e: TouchEvent) => {
    isDraggingClockNeedle = true;
    if (e.touches.length > 0) {
      updateClockTimeFromEvent(e.touches[0].clientX, e.touches[0].clientY);
    }
    window.addEventListener('touchmove', handleClockTouchMove);
    window.addEventListener('touchend', handleClockTouchEnd);
  };

  const toggleAMPM = (val: 'AM' | 'PM') => {
    AudioEngine.play('ui-click');
    clockAMPM = val;
  };

  // Calendar methods
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    AudioEngine.play('ui-click');
    if (calendarMonth === 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    } else {
      calendarMonth -= 1;
    }
  };

  const nextMonth = () => {
    AudioEngine.play('ui-click');
    if (calendarMonth === 11) {
      calendarMonth = 0;
      calendarYear += 1;
    } else {
      calendarMonth += 1;
    }
  };

  const handleCalendarDayClick = (dateStr: string | null) => {
    if (!dateStr) return;
    AudioEngine.play('ui-click');
    tempSchedulerDate = dateStr;
  };

  let calendarDaysGrid = $derived.by(() => {
    const totalDays = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: null, isToday: false, isPast: false, isSelected: false });
    }
    const today = new Date();
    const todayStr = getLocalDateStr(today);
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const fullDateStr = `${calendarYear}-${monthStr}-${dayStr}`;
      const cellDate = new Date(calendarYear, calendarMonth, day, 23, 59, 59);
      const isPast = cellDate.getTime() < today.getTime() && fullDateStr !== todayStr;
      cells.push({
        day,
        dateStr: fullDateStr,
        isToday: fullDateStr === todayStr,
        isPast,
        isSelected: tempSchedulerDate === fullDateStr
      });
    }
    return cells;
  });

  // Watchers and Initializer (Bidirectional Time Sync)
  let lastParsedTime = $state('');
  $effect(() => {
    if (tempSchedulerTime && tempSchedulerTime !== lastParsedTime) {
      untrack(() => {
        parseSchedulerTime(tempSchedulerTime);
        lastParsedTime = tempSchedulerTime;
      });
    }
  });

  $effect(() => {
    const formatted = get24HourTimeStr(clockHour, clockMinute, clockAMPM);
    if (tempSchedulerTime !== formatted) {
      tempSchedulerTime = formatted;
      lastParsedTime = formatted;
    }
  });

  let lastTempDate = $state('');
  $effect(() => {
    const currentDate = tempSchedulerDate;
    if (currentDate && currentDate !== lastTempDate) {
      const todayStr = getLocalDateStr();
      const isToday = currentDate === todayStr;
      if (!isToday) {
        clockHour = 8;
        clockMinute = 0;
        clockAMPM = 'AM';
      } else {
        const future = new Date();
        future.setHours(future.getHours() + 2);
        let hr = future.getHours();
        clockAMPM = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12;
        if (hr === 0) hr = 12;
        clockHour = hr;
        clockMinute = 0;
      }
      lastTempDate = currentDate;
    }
  });

  // Handle opening and closing configurations
  $effect(() => {
    if (isSchedulerOpen) {
      untrack(() => {
        const sch = (reschedulingAlarmId && activeAlarm && activeAlarm.scheduler) 
          ? activeAlarm.scheduler 
          : activeReminderScheduler;

        tempSchedulerType = sch.type || 'once';
        tempSchedulerDate = sch.date || getLocalDateStr();
        tempSchedulerTime = sch.time || '';
        tempSchedulerWeeklyDays = [...(sch.weeklyDays || [])];
        tempSchedulerCustomTimes = [...(sch.customTimes || [])];
        
        parseSchedulerTime(tempSchedulerTime);
      });
    }
  });

  // Real-time synchronization of scheduler state back to text input removed

  // Action methods
  const selectSchedulerType = (type: 'once' | 'daily' | 'weekly' | 'custom') => {
    AudioEngine.play('ui-click');
    tempSchedulerType = type;
  };

  const toggleWeeklyDay = (dayIndex: number) => {
    AudioEngine.play('ui-click');
    if (tempSchedulerWeeklyDays.includes(dayIndex)) {
      tempSchedulerWeeklyDays = tempSchedulerWeeklyDays.filter(d => d !== dayIndex);
    } else {
      tempSchedulerWeeklyDays = [...tempSchedulerWeeklyDays, dayIndex].sort();
    }

    if (tempSchedulerWeeklyDays.length === 7) {
      tempSchedulerType = 'daily';
      tempSchedulerWeeklyDays = [];
      showChronosNotification("ALL 7 DAYS SELECTED: AUTO-SWITCHED TO DAILY RECURRENCE", "success");
    }
  };

  const addCustomTimeVectorFromWidgets = () => {
    const timeVal = tempSchedulerTime;
    const dateVal = tempSchedulerDate;
    if (!dateVal || !timeVal) {
      AudioEngine.play('fail');
      return;
    }
    const [yr, mo, dy] = dateVal.split('-').map(Number);
    const [hr, mn] = timeVal.split(':').map(Number);
    const testDate = new Date(yr, mo - 1, dy, hr, mn, 0);
    if (testDate.getTime() <= Date.now()) {
      AudioEngine.play('fail');
      showChronosNotification("SCHEDULER: CUSTOM VECTORS MUST BE IN FUTURE", "error");
      return;
    }

    const isDuplicate = tempSchedulerCustomTimes.some(t => t.date === dateVal && t.time === timeVal);
    if (isDuplicate) {
      AudioEngine.play('fail');
      return;
    }

    AudioEngine.play('ui-click');
    tempSchedulerCustomTimes = [...tempSchedulerCustomTimes, { date: dateVal, time: timeVal }].sort((a, b) => {
      return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });
  };

  const removeCustomTimeVector = (idx: number) => {
    AudioEngine.play('fail');
    tempSchedulerCustomTimes = tempSchedulerCustomTimes.filter((_, i) => i !== idx);
  };

  const confirmSchedulerSettings = () => {
    if (schedulerError) {
      AudioEngine.play('fail');
      showChronosNotification(`SCHEDULER ERROR: ${schedulerError}`, "error");
      return;
    }

    const targetTime = calculateNextTargetTime({
      type: tempSchedulerType,
      date: tempSchedulerDate,
      time: tempSchedulerTime,
      weeklyDays: tempSchedulerWeeklyDays,
      customTimes: tempSchedulerCustomTimes
    });

    if (!targetTime) return;

    if (reschedulingAlarmId) {
      // Remove the old reminder if it still exists in the active list
      let cleanReminders = remindersList.filter(r => r.id !== reschedulingAlarmId);

      const newSch = {
        type: tempSchedulerType,
        date: tempSchedulerDate,
        time: tempSchedulerTime,
        weeklyDays: [...tempSchedulerWeeklyDays],
        customTimes: [...tempSchedulerCustomTimes]
      };

      const newReminder = {
        id: Math.random().toString(36).substring(2, 9),
        text: activeAlarm ? activeAlarm.text : "TACTICAL CHRONO DEPLOYMENT",
        targetTime: targetTime,
        triggered: false,
        muted: false,
        scheduler: newSch
      };

      remindersList = [...cleanReminders, newReminder].sort((a, b) => a.targetTime - b.targetTime);
      saveRemindersToStorage();
      
      if (activeAlarm && activeAlarm.logId) {
        const logId = activeAlarm.logId;
        dispatchedReminders = dispatchedReminders.map(dr => 
          dr.id === logId ? { ...dr, acknowledged: true, rescheduled: true } : dr
        );
        saveDispatchedRemindersToStorage();
      }
      
      activeAlarm = null;
      reschedulingAlarmId = null;
      isSchedulerOpen = false;
      addLog("ALERT LOG RESCHEDULED & REDEPLOYED");
      showChronosNotification("TEMPORAL VECTOR RESCHEDULED SUCCESS", "success");
      return;
    }

    activeReminderScheduler = {
      type: tempSchedulerType,
      date: tempSchedulerDate,
      time: tempSchedulerTime,
      weeklyDays: [...tempSchedulerWeeklyDays],
      customTimes: [...tempSchedulerCustomTimes]
    };

    const cleanedBefore = newReminderText
      .replace(/@\S+/g, '')
      .replace(/#\S+/g, '')
      .replace(/%\S+/g, '')
      .trim();

    // Update tags in text input box to match confirmed settings
    newReminderText = updateTextTagsFromScheduler(
      newReminderText,
      tempSchedulerType,
      tempSchedulerDate,
      tempSchedulerTime
    );

    isSchedulerOpen = false;
    AudioEngine.play('success');
    addLog("SCHEDULER CONFIGURATION CONFIRMED");
    showChronosNotification("TEMPORAL SENSOR VECTOR ARMED", "success");
  };

  const resetSchedulerSettings = () => {
    AudioEngine.play('shutdown');
    tempSchedulerType = 'once';
    tempSchedulerDate = getLocalDateStr();
    tempSchedulerTime = '';
    tempSchedulerWeeklyDays = [];
    tempSchedulerCustomTimes = [];
    showChronosNotification("SCHEDULER CONFIG RESET TO DEFAULT", "info");
  };

  onDestroy(() => {
    window.removeEventListener('mousemove', handleClockMouseMove);
    window.removeEventListener('mouseup', handleClockMouseUp);
    window.removeEventListener('touchmove', handleClockTouchMove);
    window.removeEventListener('touchend', handleClockTouchEnd);
  });
</script>

{#if isSchedulerOpen}
  <div class="scheduler-modal-overlay" transition:fade={{ duration: 120 }} onclick={() => isSchedulerOpen = false} onkeydown={(e) => { if (e.key === 'Escape') { isSchedulerOpen = false; } }} role="button" tabindex="-1" aria-label="Close scheduler">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="scheduler-modal-container" onclick={(e) => e.stopPropagation()}>
      <div class="scheduler-modal-header font-outfit">
        <div class="scheduler-title-group">
          <svg class="scheduler-title-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span class="scheduler-title-text">TEMPORAL SCHEDULER</span>
        </div>

        <!-- Inline error toast in header row center -->
        <div class="scheduler-header-error-container">
          {#if schedulerError}
            <div class="scheduler-error-toast font-mono">
              ⚠️ {schedulerError.toUpperCase()}
            </div>
          {/if}
        </div>

        <button type="button" class="scheduler-close-btn shine-slash-effect" onclick={() => isSchedulerOpen = false} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="scheduler-form-body">
        <div class="scheduler-widgets-row">
          <!-- Left Widget: Recurrence & Date (Calendar) Selection -->
          <div class="scheduler-left-widget">
            <div class="scheduler-field-group">
              <span class="scheduler-field-label">RECURRENCE MODE</span>
              <div class="scheduler-type-tabs">
                <button type="button" class="scheduler-tab-btn font-mono" class:active={tempSchedulerType === 'once'} onclick={() => selectSchedulerType('once')}>ONCE</button>
                <button type="button" class="scheduler-tab-btn font-mono" class:active={tempSchedulerType === 'daily'} onclick={() => selectSchedulerType('daily')}>DAILY</button>
                <button type="button" class="scheduler-tab-btn font-mono" class:active={tempSchedulerType === 'weekly'} onclick={() => selectSchedulerType('weekly')}>WEEKLY</button>
                <button type="button" class="scheduler-tab-btn font-mono" class:active={tempSchedulerType === 'custom'} onclick={() => selectSchedulerType('custom')}>CUSTOM</button>
              </div>
            </div>

            {#if tempSchedulerType === 'once' || tempSchedulerType === 'custom'}
              <div class="scheduler-field-group calendar-field-group" style="display: flex; flex-direction: column; flex: 1; margin-top: 14px; gap: 14px;">
                <div class="calendar-header-row calendar-nav-row">
                  <button type="button" class="calendar-nav-btn" onclick={prevMonth}>&lt;</button>
                  <span class="calendar-month-title font-outfit">{monthNames[calendarMonth]} {calendarYear}</span>
                  <button type="button" class="calendar-nav-btn" onclick={nextMonth}>&gt;</button>
                </div>
                
                <div class="calendar-weekdays-row font-mono">
                  {#each daysOfWeek as day}
                    <div class="weekday-cell">{day}</div>
                  {/each}
                </div>

                <div class="calendar-days-grid">
                  {#each calendarDaysGrid as cell}
                    {#if cell.day === null}
                      <div class="empty-cell"></div>
                    {:else}
                      <button 
                        type="button" 
                        class="day-cell-btn" 
                        class:today={cell.isToday}
                        class:past={cell.isPast}
                        class:selected={cell.isSelected}
                        disabled={cell.isPast}
                        onclick={() => handleCalendarDayClick(cell.dateStr)}
                      >
                        {cell.day}
                      </button>
                    {/if}
                  {/each}
                </div>
              </div>
            {:else if tempSchedulerType === 'weekly'}
              <div class="scheduler-field-group">
                <span class="scheduler-field-label">ACTIVE DAYS</span>
                <div class="weekly-days-grid">
                  {#each ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as day, i}
                    <div 
                      class="weekly-day-checkbox" 
                      class:active={tempSchedulerWeeklyDays.includes(i)}
                      onclick={() => toggleWeeklyDay(i)}
                      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleWeeklyDay(i); } }}
                      role="checkbox"
                      aria-checked={tempSchedulerWeeklyDays.includes(i)}
                      tabindex="0"
                    >
                      {day}
                    </div>
                  {/each}
                </div>
              </div>
            {:else if tempSchedulerType === 'daily'}
              <div class="scheduler-info-widget font-mono" style="display: flex; flex-direction: column; justify-content: center; align-items: center; flex: 1; opacity: 0.8; gap: 8px;">
                <span style="font-size: 28px; filter: drop-shadow(0 0 5px #22d3ee);">🔁</span>
                <span style="font-size: 13.5px; letter-spacing: 0.1em; color: #22d3ee; font-weight: 900;">DAILY RECURRENCE ACTIVE</span>
                <span style="font-size: 11.5px; color: rgba(255,255,255,0.4); text-align: center; max-width: 240px; line-height: 1.4;">This sensor will trigger every day at the designated timestamp.</span>
              </div>
            {/if}
          </div>

          <!-- Right Widget: Time Picker & Dial face -->
          <div class="scheduler-right-widget">


            <div class="tactical-clock-widget">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <svg 
                class="radial-clock-dial chrono-clock-face" 
                width="185" 
                height="185"
                viewBox="0 0 200 200"
                onmousedown={handleClockMouseDown}
                ontouchstart={handleClockTouchStart}
                style="border-radius: 50%; background: radial-gradient(circle, rgba(34,211,238,0.03) 0%, rgba(8,10,20,0.95) 70%); border: 1.5px solid rgba(34, 211, 238, 0.2); box-shadow: 0 0 15px rgba(34,211,238,0.1); user-select: none;"
              >
                <circle cx="100" cy="100" r="6" fill="#22d3ee" style="filter: drop-shadow(0 0 4px #22d3ee);" />
                
                <line 
                  x1="100" 
                  y1="100" 
                  x2={clockNeedleTargetX} 
                  y2={clockNeedleTargetY} 
                  stroke="#22d3ee" 
                  stroke-width="2.5" 
                  stroke-linecap="round"
                  style="filter: drop-shadow(0 0 6px #22d3ee);"
                />

                {#each clockSelectMode === 'hours' ? hourMarkers : minuteMarkers as marker, i}
                  {@const coords = getMarkerCoords(i, 78)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <text 
                    x={coords.x} 
                    y={coords.y + 4} 
                    text-anchor="middle"
                    class="clock-dial-number font-mono"
                    fill={(clockSelectMode === 'hours' ? clockHour === marker : clockMinute === marker) ? '#22d3ee' : 'rgba(255,255,255,0.35)'}
                    style="font-size: 13px; font-weight: 950 !important; cursor: pointer;"
                    onclick={() => {
                      AudioEngine.play('ui-click');
                      if (clockSelectMode === 'hours') {
                        clockHour = marker;
                      } else {
                        clockMinute = marker;
                      }
                    }}
                  >
                    {clockSelectMode === 'hours' ? marker : String(marker).padStart(2, '0')}
                  </text>
                {/each}
              </svg>

              <div class="clock-digital-readout-column">
                <div class="clock-feature-selector">
                  <button 
                    type="button" 
                    class="cf-btn font-mono" 
                    class:active={clockSelectMode === 'hours'} 
                    onclick={() => { AudioEngine.play('ui-click'); clockSelectMode = 'hours'; }}
                  >HR</button>
                  <button 
                    type="button" 
                    class="cf-btn font-mono" 
                    class:active={clockSelectMode === 'minutes'} 
                    onclick={() => { AudioEngine.play('ui-click'); clockSelectMode = 'minutes'; }}
                  >MIN</button>
                </div>

                <div class="digital-time-readout-row" style="display: flex; align-items: center; justify-content: center; gap: 20px; width: 100%; box-sizing: border-box;">
                  <button 
                    type="button" 
                    class="fine-tune-btn minus" 
                    onclick={() => { 
                      AudioEngine.play('ui-click'); 
                      clockMinute = (clockMinute - 1 + 60) % 60; 
                    }}
                    title="Decrement 1 Minute"
                  >
                    -
                  </button>

                  <div class="digital-time-readout font-mono" style="font-size: 28px; font-weight: 950 !important; color: #ffffff; text-shadow: 0 0 10px rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; user-select: none;">
                    <span>{String(clockHour).padStart(2, '0')}</span>
                    <span class="pulse-colon" style="margin: 0 2px;">:</span>
                    <span>{String(clockMinute).padStart(2, '0')}</span>
                  </div>

                  <button 
                    type="button" 
                    class="fine-tune-btn plus" 
                    onclick={() => { 
                      AudioEngine.play('ui-click'); 
                      clockMinute = (clockMinute + 1) % 60; 
                    }}
                    title="Increment 1 Minute"
                  >
                    +
                  </button>
                </div>

                <div class="ampm-switch-row" style="display: flex; gap: 4px; width: 100%; box-sizing: border-box;">
                  <button 
                    type="button" 
                    class="ampm-btn font-mono" 
                    class:active={clockAMPM === 'AM'} 
                    onclick={() => toggleAMPM('AM')}
                  >AM</button>
                  <button 
                    type="button" 
                    class="ampm-btn font-mono" 
                    class:active={clockAMPM === 'PM'} 
                    onclick={() => toggleAMPM('PM')}
                  >PM</button>
                </div>
              </div>
            </div>

            {#if tempSchedulerType === 'custom'}
              <div class="custom-vectors-section" style="display: flex; flex-direction: column; gap: 14px; flex-shrink: 0; width: 100%; margin-top: 18px;">
                <div class="custom-vector-actions font-mono">
                  <button type="button" class="deploy-vector-btn font-outfit" onclick={addCustomTimeVectorFromWidgets} style="width: 100%; font-weight: 950 !important;">
                    + DEPLOY TIMING VECTOR
                  </button>
                </div>

                <div class="scheduler-field-group">
                  <span class="scheduler-field-label">CONFIGURED CHRONO-VECTORS ({tempSchedulerCustomTimes.length})</span>
                  <div class="custom-vectors-list">
                    {#each tempSchedulerCustomTimes as t, idx}
                      <div class="custom-vector-item">
                        <span>{formatSchedulerDisplayDate(t.date)} @ {t.time}</span>
                        <button type="button" class="remove-vector-btn" onclick={() => removeCustomTimeVector(idx)}>×</button>
                      </div>
                    {/each}
                    {#if tempSchedulerCustomTimes.length === 0}
                      <div style="text-align: center; color: rgba(255,255,255,0.25); font-size: 13px; font-weight: 900; padding: 10px;">
                        NO VECTORS CONFIGURED
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {:else}
              <div class="custom-vectors-section-spacer" style="height: 124px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1.5px dashed rgba(34, 211, 238, 0.12); border-radius: 24px; background: rgba(34, 211, 238, 0.01); width: 100%;">
                <span style="font-size: 12.5px; color: rgba(34, 211, 238, 0.35); font-family: 'Share Tech Mono', monospace; letter-spacing: 0.12em; font-weight: 900;">REPETITION LOGIC LOCK ACTIVE</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="scheduler-modal-actions">
          <button type="button" class="scheduler-confirm-btn font-outfit" onclick={confirmSchedulerSettings}>
            SAVE & DEPLOY
          </button>
          <button type="button" class="scheduler-live-status-btn font-mono" disabled>
            {selectedVectorLiveText}
          </button>
          <button type="button" class="scheduler-reset-btn font-outfit" onclick={resetSchedulerSettings}>
            RESET
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
