<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { quintOut, backOut } from 'svelte/easing';
  import { AudioEngine } from '../../../core/audio-engine';

  let { isOpen = false, onclose, onconfirm } = $props();

  const monthsList = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // Base state variables using Svelte 5 runes
  let currentDate = new Date();
  let viewingYear = $state(currentDate.getFullYear());
  let viewingMonth = $state(currentDate.getMonth());
  let selectedDate = $state(new Date());

  let isMonthDropdownOpen = $state(false);
  let isYearDropdownOpen = $state(false);

  let errorMessage = $state("");
  let errorTimeout: any;

  const showError = (msg: string) => {
    AudioEngine.play('fail');
    errorMessage = msg;
    if(errorTimeout) clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => { errorMessage = ""; }, 3000);
  };

  const isPastDay = (date: Date) => {
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return targetZero.getTime() < todayZero.getTime();
  };

  // Generate exactly 35-day (5 rows) calendar matrix for the selected month only
  // Overflow days seamlessly wrap into the empty cells of the first row
  let calendarGrid = $derived.by(() => {
    const firstDay = new Date(viewingYear, viewingMonth, 1);
    const startDayOfWeek = firstDay.getDay(); 
    const daysInMonth = new Date(viewingYear, viewingMonth + 1, 0).getDate();

    // Initialize 35 empty slots (5 rows)
    const grid = new Array(35).fill(null).map(() => ({
      day: null,
      isCurrentMonth: false,
      date: null
    }));

    // Populate days, wrapping around to the first row if exceeding 35
    for (let i = 1; i <= daysInMonth; i++) {
      let gridIndex = (startDayOfWeek + i - 1) % 35;
      grid[gridIndex] = {
        day: i,
        isCurrentMonth: true,
        date: new Date(viewingYear, viewingMonth, i)
      };
    }

    return grid;
  });

  // Calculate day difference reactively between today and selected deadline
  let temporalOffset = $derived.by(() => {
    const todayZero = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const targetZero = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const diffTime = targetZero.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });

  let limitDate = $derived.by(() => new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000));
  let canGoPrev = $derived.by(() => viewingYear > currentDate.getFullYear() || (viewingYear === currentDate.getFullYear() && viewingMonth > currentDate.getMonth()));
  let canGoNext = $derived.by(() => viewingYear < limitDate.getFullYear() || (viewingYear === limitDate.getFullYear() && viewingMonth < limitDate.getMonth()));

  const nextMonth = () => {
    if (!canGoNext) {
      showError("TEMPORAL LIMIT EXCEEDED: MAXIMUM ALLOWED PROJECTION IS 365 DAYS");
      return;
    }
    AudioEngine.play('ui-click');
    if (viewingMonth === 11) {
      viewingMonth = 0;
      viewingYear += 1;
    } else {
      viewingMonth += 1;
    }
  };

  const prevMonth = () => {
    if (!canGoPrev) {
      showError("INVALID PROTOCOL: TARGET DEADLINE CANNOT BE SET IN THE PAST");
      return;
    }
    AudioEngine.play('ui-click');
    if (viewingMonth === 0) {
      viewingMonth = 11;
      viewingYear -= 1;
    } else {
      viewingMonth -= 1;
    }
  };

  const isFutureLimit = (date: Date) => {
    const today = new Date();
    const limitDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 365);
    const targetZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return targetZero.getTime() > limitDate.getTime();
  };

  const selectDay = (dateObj: Date) => {
    if (isPastDay(dateObj)) {
      showError("INVALID PROTOCOL: PAST DEADLINES ARE STRICTLY PROHIBITED");
      AudioEngine.play('fail');
      return;
    }
    if (isFutureLimit(dateObj)) {
      showError("TEMPORAL LIMIT EXCEEDED: MAXIMUM ALLOWED PROJECTION IS 365 DAYS");
      AudioEngine.play('fail');
      return;
    }
    AudioEngine.play('ui-click');
    selectedDate = dateObj;
  };

  const isSelected = (date: Date) => {
    return date && date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  };

  const isToday = (date: Date) => {
    if (!date) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  // Format locally avoiding timezone-shifting to UTC
  let formattedSelectedDate = $derived.by(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const handleConfirm = () => {
    if (onconfirm) {
      onconfirm(formattedSelectedDate, selectedDate);
    }
    AudioEngine.play('data-lock');
    onclose();
  };

  const jumpToToday = () => {
    AudioEngine.play('ui-click');
    const today = new Date();
    viewingYear = today.getFullYear();
    viewingMonth = today.getMonth();
    selectedDate = today;
  };

  const selectMonth = (idx: number) => {
    viewingMonth = idx;
    isMonthDropdownOpen = false;
    AudioEngine.play('ui-click');
  };

  const selectYear = (y: number) => {
    viewingYear = y;

    // Clamp viewingMonth strictly to the valid 365-day limits
    const currentY = currentDate.getFullYear();
    const limitY = limitDate.getFullYear();

    let allowedMin = 0;
    let allowedMax = 11;

    if (viewingYear === currentY) allowedMin = currentDate.getMonth();
    if (viewingYear === limitY) allowedMax = limitDate.getMonth();

    if (viewingMonth < allowedMin) viewingMonth = allowedMin;
    if (viewingMonth > allowedMax) viewingMonth = allowedMax;

    isYearDropdownOpen = false;
    AudioEngine.play('ui-click');
  };

  const toggleMonthDropdown = () => {
    AudioEngine.play('ui-hover');
    isMonthDropdownOpen = !isMonthDropdownOpen;
    isYearDropdownOpen = false;
  };

  const toggleYearDropdown = () => {
    AudioEngine.play('ui-hover');
    isYearDropdownOpen = !isYearDropdownOpen;
    isMonthDropdownOpen = false;
  };
</script>

{#if isOpen}
  <!-- Overlay Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="nexus-backdrop" role="presentation" transition:fade={{ duration: 250, easing: quintOut }}>
    
    {#if errorMessage}
      <div class="nexus-error-toast font-outfit" in:fly={{ y: -20, duration: 350, easing: backOut }} out:fade={{ duration: 150, easing: quintOut }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Calendar Modal Frame -->
    <div class="nexus-container" onclick={(e) => e.stopPropagation()} role="presentation" in:scale={{ duration: 400, start: 0.94, easing: quintOut }} out:scale={{ duration: 300, start: 0.96, opacity: 0, easing: quintOut }}>
      
      <div class="nexus-inner">
        {#if isMonthDropdownOpen || isYearDropdownOpen}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="dropdown-focus-overlay" transition:fade={{duration: 200}} onclick={() => {isMonthDropdownOpen = false; isYearDropdownOpen = false;}}></div>
        {/if}

      <!-- Header Section -->
      <header class="nexus-header">
        <div class="header-left">
          <svg class="nexus-icon" width="85" height="85" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="chronoCoreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b5cf6" />
                <stop offset="50%" stop-color="#ec4899" />
                <stop offset="100%" stop-color="#06b6d4" />
              </linearGradient>
              <linearGradient id="hourglassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#06b6d4" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
              <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f472b6" />
                <stop offset="100%" stop-color="#ec4899" />
              </linearGradient>
              <linearGradient id="ringGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ef4444" />
                <stop offset="50%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#10b981" />
              </linearGradient>
              <filter id="glow-heavy" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Outer temporal rings -->
            <circle cx="50" cy="50" r="46" stroke="url(#ringGradient)" stroke-width="2.5" stroke-dasharray="10 20" stroke-linecap="round" class="temporal-ring-fast" />
            <circle cx="50" cy="50" r="46" stroke="url(#chronoCoreGlow)" stroke-width="1.5" stroke-dasharray="4 8" class="chrono-ring-ccw" opacity="0.6"/>

            <!-- Futuristic Calendar Outline -->
            <rect x="25" y="25" width="50" height="55" rx="8" stroke="url(#hourglassGradient)" stroke-width="4" filter="url(#glow-heavy)" class="calendar-pulse" />
            <!-- Calendar top bar -->
            <path d="M 25 42 L 75 42" stroke="url(#hourglassGradient)" stroke-width="4" />
            
            <!-- Binder Rings -->
            <line x1="36" y1="16" x2="36" y2="30" stroke="#06b6d4" stroke-width="4" stroke-linecap="round" class="binder-flash" />
            <line x1="64" y1="16" x2="64" y2="30" stroke="#06b6d4" stroke-width="4" stroke-linecap="round" class="binder-flash" style="animation-delay: 0.5s;" />

            <!-- Animated Countdown Blocks (Days) -->
            <rect x="34" y="52" width="12" height="8" rx="2" fill="url(#sandGradient)" class="data-block-1" />
            <rect x="54" y="52" width="12" height="8" rx="2" fill="url(#sandGradient)" class="data-block-2" />
            <rect x="34" y="66" width="12" height="8" rx="2" fill="url(#sandGradient)" class="data-block-3" />
            <rect x="54" y="66" width="12" height="8" rx="2" fill="#ef4444" filter="url(#glow-heavy)" class="deadline-block" />
          </svg>
          <div class="title-block">
            <h2 class="font-outfit">TEMPORAL NEXUS</h2>
          </div>
        </div>

        <div class="header-right">
          <button class="today-action-btn font-outfit" onclick={jumpToToday} aria-label="Go to Today">
            <div class="btn-slice-effect"></div>
            TODAY
          </button>

          <button class="close-action-btn font-outfit" onclick={onclose} aria-label="Close Nexus">
            <div class="btn-liquid-sweep"></div>
            <svg class="close-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Month Navigation -->
      <div class="nexus-navigation">
        <button type="button" class="nav-arrow" class:disabled-arrow={!canGoPrev} onclick={prevMonth} aria-label="Previous month">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19L8 12L15 5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div class="month-year-selects">
          
          {#if isMonthDropdownOpen || isYearDropdownOpen}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="dropdown-click-catcher" onclick={() => {isMonthDropdownOpen = false; isYearDropdownOpen = false;}}></div>
          {/if}

          <!-- Month Custom Select -->
          <div class="custom-select-wrapper">
            <button type="button" class="nexus-custom-btn month-btn font-outfit" onclick={toggleMonthDropdown}>
              <span>{monthsList[viewingMonth]}</span>
              <svg class="dropdown-chevron" class:open={isMonthDropdownOpen} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {#if isMonthDropdownOpen}
              <div class="custom-dropdown-list month-dropdown" transition:fly={{ y: -10, duration: 300, easing: quintOut }}>
                {#each monthsList as m, i}
                  {@const isPastMonth = viewingYear === currentDate.getFullYear() && i < currentDate.getMonth()}
                  {@const isFutureMonth = viewingYear === limitDate.getFullYear() && i > limitDate.getMonth()}
                  {@const isPastYear = viewingYear < currentDate.getFullYear()}
                  {@const isFutureYear = viewingYear > limitDate.getFullYear()}
                  {@const isInvalidMonth = isPastMonth || isFutureMonth || isPastYear || isFutureYear}
                  <button type="button" class="dropdown-item font-outfit" class:selected={viewingMonth === i} class:disabled={isInvalidMonth} aria-disabled={isInvalidMonth} 
                    onclick={() => {
                      if(isPastMonth || isPastYear) showError("INVALID PROTOCOL: TARGET DEADLINE CANNOT BE SET IN THE PAST");
                      else if(isFutureMonth || isFutureYear) showError("TEMPORAL LIMIT EXCEEDED: MAXIMUM ALLOWED PROJECTION IS 365 DAYS");
                      else selectMonth(i);
                    }}>
                    {m}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Year Custom Select -->
          <div class="custom-select-wrapper">
            <button type="button" class="nexus-custom-btn year-btn font-outfit" onclick={toggleYearDropdown}>
              <span>{viewingYear}</span>
              <svg class="dropdown-chevron" class:open={isYearDropdownOpen} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {#if isYearDropdownOpen}
              <div class="custom-dropdown-list year-dropdown" transition:fly={{ y: -10, duration: 300, easing: quintOut }}>
                {#each Array.from({length: 12}, (_, i) => currentDate.getFullYear() + i) as y}
                  {@const isFutureYear = y > limitDate.getFullYear()}
                  {@const isPastYear = y < currentDate.getFullYear()}
                  <button type="button" class="dropdown-item font-outfit" class:selected={viewingYear === y} class:disabled={isFutureYear || isPastYear} aria-disabled={isFutureYear || isPastYear} 
                    onclick={() => {
                      if(isPastYear) showError("INVALID PROTOCOL: PAST DEADLINES ARE STRICTLY PROHIBITED");
                      else if(isFutureYear) showError("TEMPORAL LIMIT EXCEEDED: MAXIMUM ALLOWED PROJECTION IS 365 DAYS");
                      else selectYear(y);
                    }}>
                    {y}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

        </div>

        <button type="button" class="nav-arrow" class:disabled-arrow={!canGoNext} onclick={nextMonth} aria-label="Next month">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Removed Binder Rings -->

      <!-- Calendar Matrix -->
      <div class="calendar-matrix">
        <!-- Tactical Weekday Strip -->
        <div class="weekdays-grid-strip">
          <span class="day-label weekend font-outfit" class:active-day={selectedDate.getDay() === 0}>SUN</span>
          <span class="day-label font-outfit" class:active-day={selectedDate.getDay() === 1}>MON</span>
          <span class="day-label font-outfit" class:active-day={selectedDate.getDay() === 2}>TUE</span>
          <span class="day-label font-outfit" class:active-day={selectedDate.getDay() === 3}>WED</span>
          <span class="day-label font-outfit" class:active-day={selectedDate.getDay() === 4}>THU</span>
          <span class="day-label font-outfit" class:active-day={selectedDate.getDay() === 5}>FRI</span>
          <span class="day-label weekend font-outfit" class:active-day={selectedDate.getDay() === 6}>SAT</span>
        </div>

        <!-- Days Grid with responsive key-rebuild transitions -->
        {#key `${viewingYear}-${viewingMonth}`}
          <div class="days-grid" in:fade={{ duration: 250 }}>
            {#each calendarGrid as item}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="day-cell font-outfit"
                class:today={item.date && isToday(item.date)}
                class:selected={item.date && isSelected(item.date)}
                class:disabled-day={item.date && (isPastDay(item.date) || isFutureLimit(item.date))}
                class:weekend-cell={item.date && (item.date.getDay() === 0 || item.date.getDay() === 6)}
                class:empty-cell={!item.day}
                onclick={() => item.date && selectDay(item.date)}
              >
                {#if item.day}
                  <!-- Purely the day number digit -->
                  <span class="day-number">{item.day}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/key}
      </div>

      <!-- Triple-Action Tactical Footer -->
      <footer class="nexus-footer">
        <!-- 1. Offset (Red) -->
        <button type="button" class="footer-action-btn offset-style font-outfit" class:overdue={temporalOffset < 0}>
          <div class="btn-liquid-sweep"></div>
          <svg class="footer-btn-icon offset-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 14px;">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" class="ticking-hand" />
          </svg>
          <span class="btn-inner-val">{Math.abs(temporalOffset)} DAYS</span>
        </button>

        <!-- 2. Marker (Cyan) -->
        <button type="button" class="footer-action-btn marker-style font-outfit">
          <div class="btn-liquid-sweep"></div>
          <svg class="footer-btn-icon scope-icon" width="28" height="28" viewBox="0 0 100 100" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 14px;">
            <circle cx="50" cy="50" r="38" stroke-dasharray="24 10" class="scope-spin" />
            <circle cx="50" cy="50" r="23" stroke-dasharray="12 6" class="scope-spin-reverse" />
            <line x1="50" y1="0" x2="50" y2="15" />
            <line x1="50" y1="100" x2="50" y2="85" />
            <line x1="0" y1="50" x2="15" y2="50" />
            <line x1="100" y1="50" x2="85" y2="50" />
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
          </svg>
          <span class="btn-inner-val">{formattedSelectedDate.split('-').reverse().join('-')}</span>
        </button>

        <!-- 3. Confirm (Orange) -->
        <button type="button" class="footer-action-btn launch-style font-outfit" onclick={handleConfirm}>
          <div class="btn-liquid-sweep"></div>
          <svg class="footer-btn-icon check-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 14px;">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span class="btn-inner-val">CONFIRM</span>
        </button>
      </footer>
      </div>
    </div>
  </div>
{/if}

<style>
  .nexus-backdrop {
    position: fixed;
    top: 80px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 80px);
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
    overflow: hidden;
  }

  :global(.nexus-ambient-glow) {
    position: absolute;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.02) 50%, transparent 100%);
    border-radius: 50%;
    pointer-events: none;
    filter: blur(80px);
    opacity: 0.5;
  }

  .nexus-container {
    position: relative;
    width: 1050px; /* Increased from 900px to expand calendar window */
    background: rgba(11, 7, 32, 0.85); /* Glassmorphic semi-transparent core */
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    border-radius: 40px;
    padding: 24px 44px; /* Decreased vertical padding to 24px */
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    box-shadow: 
      0 30px 100px rgba(0, 0, 0, 1), 
      0 0 40px rgba(139, 92, 246, 0.2),
      inset 0 0 30px rgba(139, 92, 246, 0.05);
    overflow: hidden;
    border: 3.5px solid rgba(139, 92, 246, 0.9);
    transition: box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    transform: scale(0.88);
  }

  .nexus-container:hover {
    box-shadow: 
      0 30px 80px rgba(0, 0, 0, 1), 
      0 0 60px rgba(139, 92, 246, 0.4),
      0 0 80px rgba(6, 182, 212, 0.2);
  }

  .nexus-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    margin-bottom: 16px;
    position: relative;
    z-index: 5;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nexus-icon {
    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.8));
    flex-shrink: 0;
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
  }

  .nexus-icon:hover {
    transform: scale(1.15) rotate(5deg);
    filter: drop-shadow(0 0 35px rgba(6, 182, 212, 1)) drop-shadow(0 0 15px rgba(236, 72, 153, 0.8));
  }

  @keyframes spin-clockwise { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin-counterclockwise { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
  @keyframes spin-fast-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse-cal { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; filter: brightness(1.3); } }
  @keyframes binder-glow { 0%, 100% { stroke: #06b6d4; } 50% { stroke: #ffffff; filter: drop-shadow(0 0 8px #06b6d4); } }
  @keyframes block-blink { 0%, 100% { opacity: 0.15; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); filter: drop-shadow(0 0 5px #ec4899); } }
  @keyframes deadline-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.6; } 50% { transform: scale(1.25); opacity: 1; fill: #ff0000; filter: drop-shadow(0 0 10px #ef4444); } }

  :global(.chrono-ring-cw) { transform-origin: 50px 50px; animation: spin-clockwise 20s linear infinite; }
  .chrono-ring-ccw { transform-origin: 50px 50px; animation: spin-counterclockwise 12s linear infinite; }
  
  .temporal-ring-fast { transform-origin: 50px 50px; animation: spin-fast-cw 4s linear infinite; }
  .calendar-pulse { animation: pulse-cal 3s ease-in-out infinite; transform-origin: 50px 50px; }
  .binder-flash { animation: binder-glow 1.5s infinite; }
  
  .data-block-1 { transform-origin: 40px 56px; animation: block-blink 2s infinite 0s; }
  .data-block-2 { transform-origin: 60px 56px; animation: block-blink 2s infinite 0.6s; }
  .data-block-3 { transform-origin: 40px 70px; animation: block-blink 2s infinite 1.2s; }
  .deadline-block { transform-origin: 60px 70px; animation: deadline-pulse 1s infinite alternate; }

  .title-block h2 {
    font-size: 46px; /* Increased */
    font-weight: 950;
    -webkit-text-stroke: 1.5px #d8b4fe; /* Heavy thickness for extra weight */
    letter-spacing: 5px;
    margin: 0;
    background: linear-gradient(90deg, #ffffff, #c084fc, #8b5cf6, #06b6d4, #ffffff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.4)); /* Reduced glow intensity */
    animation: text-gradient-flow 4s linear infinite;
  }

  @keyframes text-gradient-flow {
    to { background-position: 200% center; }
  }


  .close-action-btn {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #ef4444 0%, #3a0202 100%);
    border-radius: 50%; /* Pure circular design */
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
    outline: none;
    border: none;
  }
  .close-action-btn:hover {
    background: linear-gradient(135deg, #ff0000 0%, #7f1d1d 100%) !important; 
    transform: scale(1.1);
    box-shadow: 0 0 60px rgba(255, 0, 0, 0.8), inset 0 0 25px rgba(255, 255, 255, 0.2) !important; 
  }
  .close-icon-svg {
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .close-action-btn:hover .close-icon-svg {
    transform: rotate(90deg);
  }

  .today-action-btn {
    height: 44px;
    padding: 0 28px;
    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%);
    color: #ffffff;
    font-size: 15px;
    font-weight: 950;
    letter-spacing: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
    border: none;
    outline: none;
  }

  .today-action-btn:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #22d3ee 0%, #60a5fa 50%, #a78bfa 100%);
    box-shadow: 0 0 35px rgba(139, 92, 246, 0.8);
  }

  .btn-slice-effect {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
    transform: rotate(45deg) translateX(-100%);
    transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .today-action-btn:hover .btn-slice-effect {
    transform: rotate(45deg) translateX(100%);
  }

  .nexus-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    position: relative;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: 2px solid #c084fc;
    border-radius: 16px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    outline: none;
    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
  }

  .nav-arrow:hover {
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
    color: #ffffff;
    box-shadow: 0 10px 35px rgba(139, 92, 246, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.4);
    transform: scale(1.1) translateY(-3px);
  }

  .nav-arrow.disabled-arrow {
    opacity: 0.3;
    pointer-events: none;
    box-shadow: none;
    cursor: not-allowed;
  }

  .dropdown-click-catcher {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 100;
  }

  .dropdown-focus-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.15), rgba(236, 72, 153, 0.25), rgba(6, 182, 212, 0.15));
    backdrop-filter: blur(13px) saturate(140%);
    -webkit-backdrop-filter: blur(13px) saturate(140%);
    z-index: 90; /* Covers calendar and nav arrows */
    border-radius: 20px;
    box-shadow: inset 0 0 30px rgba(0,0,0,0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .month-year-selects {
    display: flex;
    gap: 24px;
    align-items: center;
    position: relative;
    z-index: 101; /* Above focus overlay */
  }

  .custom-select-wrapper {
    position: relative;
  }

  .nexus-custom-btn {
    height: 52px;
    padding: 0 24px;
    border-radius: 16px;
    color: #ffffff;
    font-size: 24px; /* Much larger */
    font-weight: 950;
    -webkit-text-stroke: 1px currentColor; /* Ultra heavy text */
    letter-spacing: 3px;
    outline: none;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    text-shadow: 0 4px 15px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .dropdown-chevron {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dropdown-chevron.open {
    transform: rotate(180deg);
  }

  .month-btn {
    width: 250px; /* Constant width to fit 'SEPTEMBER' without layout shifts */
    border: 2px solid rgba(6, 182, 212, 0.4);
    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
    box-shadow: 0 8px 25px rgba(6, 182, 212, 0.4);
  }
  .month-btn:hover, .month-btn:focus {
    background: linear-gradient(135deg, #0891b2 0%, #2563eb 100%);
    box-shadow: 0 10px 35px rgba(6, 182, 212, 0.6);
    transform: translateY(-2px);
    border-color: #22d3ee;
  }

  .year-btn {
    width: 140px; /* Constant width */
    border: 2px solid rgba(236, 72, 153, 0.4);
    background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
    box-shadow: 0 8px 25px rgba(236, 72, 153, 0.4);
  }
  .year-btn:hover, .year-btn:focus {
    background: linear-gradient(135deg, #db2777 0%, #7c3aed 100%);
    box-shadow: 0 10px 35px rgba(236, 72, 153, 0.6);
    transform: translateY(-2px);
    border-color: #f472b6;
  }

  .custom-dropdown-list {
    position: absolute;
    top: calc(100% + 12px);
    left: 0;
    width: 100%;
    border-radius: 12px;
    background: linear-gradient(180deg, #0b0720 0%, #03010b 100%);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    padding: 6px;
    gap: 4px;
  }
  
  .month-dropdown { 
    border: 2px solid #06b6d4; 
    box-shadow: inset 0 0 20px rgba(6, 182, 212, 0.15), 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(6, 182, 212, 0.3); 
  }
  .year-dropdown { 
    border: 2px solid #ec4899; 
    box-shadow: inset 0 0 20px rgba(236, 72, 153, 0.15), 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(236, 72, 153, 0.3); 
  }

  .dropdown-item {
    padding: 6px 12px;
    border-radius: 6px;
    background: #110b24; /* Subtle dark block */
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #c4b5fd;
    font-size: 14px;
    font-weight: 950;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    transform-origin: left center;
  }

  .month-dropdown .dropdown-item:hover {
    background: linear-gradient(90deg, #06b6d4 0%, #083344 100%);
    color: #ffffff;
    border-color: #67e8f9;
    box-shadow: 0 5px 15px rgba(6, 182, 212, 0.4), inset 4px 0 0 #ffffff;
    transform: translateX(4px);
  }
  .month-dropdown .dropdown-item.selected {
    background: linear-gradient(90deg, #06b6d4, #3b82f6);
    color: #ffffff;
    border-color: #3b82f6;
    box-shadow: 0 0 25px rgba(6, 182, 212, 0.6), inset 4px 0 0 #ffffff;
    text-shadow: 0 2px 5px rgba(0,0,0,0.5);
    transform: scale(1.02);
  }

  .year-dropdown .dropdown-item:hover {
    background: linear-gradient(90deg, #ec4899 0%, #500724 100%);
    color: #ffffff;
    border-color: #fbcfe8;
    box-shadow: 0 5px 15px rgba(236, 72, 153, 0.4), inset 4px 0 0 #ffffff;
    transform: translateX(4px);
  }
  .year-dropdown .dropdown-item.selected {
    background: linear-gradient(90deg, #ec4899, #8b5cf6);
    color: #ffffff;
    border-color: #8b5cf6;
    box-shadow: 0 0 25px rgba(236, 72, 153, 0.6), inset 4px 0 0 #ffffff;
    text-shadow: 0 2px 5px rgba(0,0,0,0.5);
    transform: scale(1.02);
  }

  .dropdown-item.disabled {
    opacity: 0.3 !important;
    cursor: not-allowed !important;
    background: transparent !important;
    color: rgba(255, 255, 255, 0.2) !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }

  .nexus-error-toast {
    position: absolute;
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(220, 38, 38, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.6);
    backdrop-filter: blur(11px);
    -webkit-backdrop-filter: blur(11px);
    padding: 14px 28px;
    border-radius: 12px;
    color: #fca5a5;
    font-weight: 900;
    letter-spacing: 2px;
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(220, 38, 38, 0.4);
    pointer-events: none;
  }

  /* Removed Binder Rings CSS */

  .calendar-matrix {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
    min-height: 380px;
    position: relative;
    z-index: 5;
  }

  .weekdays-grid-strip {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    background: linear-gradient(180deg, rgba(67, 20, 7, 0.9) 0%, rgba(20, 5, 5, 0.95) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 2px solid #ea580c;
    border-radius: 30px;
    margin-bottom: 24px;
    padding: 0;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(234, 88, 12, 0.2);
    position: relative;
    overflow: hidden;
  }

  .weekdays-grid-strip::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(234, 88, 12, 0.15) 1px, transparent 1px);
    background-size: 4px 4px;
    z-index: -2;
    pointer-events: none;
  }

  .weekdays-grid-strip::before {
    content: '';
    position: absolute;
    top: 0; left: -30%;
    width: 20%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(234, 88, 12, 1), transparent);
    animation: structural-sweep 2.5s linear infinite;
    pointer-events: none;
    mix-blend-mode: screen;
    z-index: -1;
    transform: skewX(-20deg);
  }

  @keyframes structural-sweep {
    0% { left: -30%; }
    100% { left: 130%; }
  }

  .day-label { 
    font-size: 21px; 
    font-weight: 900; 
    font-style: normal;
    letter-spacing: 2px; 
    color: #ffffff;
    text-shadow: none;
    padding: 13px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .day-label::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent, rgba(234, 88, 12, 0.25));
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
  }

  .day-label::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 2px;
    background: linear-gradient(180deg, transparent, rgba(234, 88, 12, 0.8), transparent);
    animation: separator-pulse 2s infinite ease-in-out;
    opacity: 0.8;
  }

  @keyframes separator-pulse {
    0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
    50% { opacity: 1; transform: scaleY(1); box-shadow: 0 0 8px rgba(234, 88, 12, 1); }
  }

  .day-label:hover::before { opacity: 1; }

  .day-label:hover {
    color: #ffffff;
    background-color: rgba(234, 88, 12, 0.2);
  }

  .day-label:last-child::after {
    display: none;
  }

  .day-label.weekend { 
    color: #ff3333 !important;
    text-shadow: none !important;
    background: linear-gradient(180deg, rgba(69, 10, 10, 0.3) 0%, rgba(127, 29, 29, 0.5) 100%) !important;
    border-color: rgba(239, 68, 68, 0.4) !important;
  }

  .day-label.weekend::before {
    background: linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.4));
  }

  .day-label.weekend:hover {
    color: #ff6666 !important;
    background: linear-gradient(180deg, rgba(153, 27, 27, 0.8) 0%, rgba(69, 10, 10, 0.9) 100%) !important;
  }

  /* Upgraded Active Highlight - Animated Floating Pill */
  .day-label.active-day {
    color: #ffffff !important;
    background: transparent !important;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.6) !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    z-index: 10;
  }

  .day-label.weekend.active-day {
    color: #ffffff !important;
    background: transparent !important;
    border-color: transparent !important;
  }

  .day-label.active-day::before {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 8px;
    right: 8px;
    border-radius: 20px;
    background: linear-gradient(90deg, #fb923c, #ea580c, #c2410c, #ea580c);
    background-size: 300% 100%;
    animation: pill-flow 3s ease infinite;
    z-index: -1;
    box-shadow: 0 0 10px rgba(234, 88, 12, 0.4), inset 0 0 8px rgba(255,255,255,0.3);
    opacity: 1 !important;
  }

  .day-label.weekend.active-day::before {
    background: linear-gradient(90deg, #fca5a5, #ef4444, #b91c1c, #ef4444);
    background-size: 300% 100%;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4), inset 0 0 8px rgba(255,255,255,0.3);
  }

  @keyframes pill-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    row-gap: 14px;
    column-gap: 20px; /* Increased gaps to naturally shrink circles */
  }

  .day-cell {
    position: relative;
    width: 44px;
    height: 44px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid transparent; /* Invisible border to prevent layout shift on hover */
    border-radius: 50%; 
    background: transparent;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: none;
  }

  /* Holographic Hover Ring */
  .day-cell:hover {
    background: rgba(234, 88, 12, 0.1);
    border-color: rgba(234, 88, 12, 0.6);
    box-shadow: 0 0 15px rgba(234, 88, 12, 0.3), inset 0 0 8px rgba(234, 88, 12, 0.2);
    transform: scale(1.1);
  }

  .day-cell.weekend-cell {
    background: transparent;
    border-color: transparent;
  }

  .day-cell.weekend-cell:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.6);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
  }

  .day-cell.disabled-day {
    opacity: 0.2;
    cursor: not-allowed;
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .day-cell.disabled-day:hover {
    transform: none;
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .day-cell.disabled-day .day-number {
    color: #666;
  }

  .day-cell.empty-cell {
    opacity: 0;
    pointer-events: none;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .day-number { 
    font-size: 19px; 
    font-weight: 950; 
    color: #ffffff; 
    margin: 0;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.2); 
  }

  .day-cell.weekend-cell .day-number {
    color: #ef4444;
  }

  .day-cell.selected .day-number, .day-cell.weekend-cell.selected .day-number {
    color: #ffffff;
  }

  .day-cell.selected {
    background: linear-gradient(135deg, #fdba74 0%, #ea580c 100%) !important;
    border: 1px solid #ffffff !important;
    box-shadow: 0 0 20px rgba(234, 88, 12, 0.8), inset 0 0 10px rgba(255,255,255,0.4);
    transform: scale(1.2) translateY(-2px);
    animation: selected-beat 1.5s infinite alternate;
    z-index: 5;
  }

  .day-cell.weekend-cell.selected {
    background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%) !important;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), inset 0 0 10px rgba(255,255,255,0.4);
    animation: selected-beat-weekend 1.5s infinite alternate;
  }

  @keyframes selected-beat {
    0% { box-shadow: 0 0 15px rgba(234, 88, 12, 0.6), inset 0 0 5px rgba(255,255,255,0.2); transform: scale(1.15) translateY(-2px); }
    100% { box-shadow: 0 0 30px rgba(234, 88, 12, 1), inset 0 0 15px rgba(255,255,255,0.5); transform: scale(1.25) translateY(-2px); }
  }

  @keyframes selected-beat-weekend {
    0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.6), inset 0 0 5px rgba(255,255,255,0.2); transform: scale(1.15) translateY(-2px); }
    100% { box-shadow: 0 0 30px rgba(239, 68, 68, 1), inset 0 0 15px rgba(255,255,255,0.5); transform: scale(1.25) translateY(-2px); }
  }

  .nexus-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 28px;
    margin-top: auto;
    position: relative;
    z-index: 5;
    gap: 20px;
  }

  .footer-action-btn {
    flex: 1;
    height: 74px; /* Increased from 68px */
    border-radius: 24px;
    font-size: 22px; /* Increased from 20px */
    font-weight: 950;
    letter-spacing: 5px;
    cursor: pointer;
    transition: all 0.5s;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3.5px solid rgba(255, 255, 255, 0.2);
    white-space: nowrap; /* Force single line */
  }

  .offset-style {
    background: linear-gradient(135deg, #ff3b30 0%, #7f1d1d 100%) !important; /* Bolder radish gradient */
    border-color: #fca5a5 !important;
    color: #ffffff !important;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.5);
  }

  .offset-style.overdue {
    background: linear-gradient(135deg, #991b1b 0%, #450a0a 100%) !important;
    border-color: #ef4444 !important;
    filter: brightness(1.2);
  }

  .marker-style {
    background: linear-gradient(135deg, #06b6d4 0%, #083344 100%) !important;
    border-color: #67e8f9 !important;
    color: #ffffff !important;
    box-shadow: 0 10px 30px rgba(6, 182, 212, 0.4);
  }

  .footer-action-btn:hover {
    transform: translateY(-8px) scale(1.03);
    box-shadow: 0 20px 60px rgba(255, 255, 255, 0.3), inset 0 0 30px rgba(255, 255, 255, 0.2) !important;
  }

  .offset-style:hover { box-shadow: 0 20px 60px rgba(239, 68, 68, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.2) !important; }
  .marker-style:hover { box-shadow: 0 20px 60px rgba(6, 182, 212, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.2) !important; }

  .ticking-hand { transform-origin: 12px 12px; animation: spin-clockwise 4s linear infinite; }
  .scope-spin { transform-origin: 50px 50px; animation: spin-clockwise 12s linear infinite; }
  .scope-spin-reverse { transform-origin: 50px 50px; animation: spin-counterclockwise 8s linear infinite; }
  
  @keyframes spin-clockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spin-counterclockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }

  .check-icon { transform-origin: center; animation: check-scale 2s ease-in-out infinite alternate; }
  
  @keyframes check-scale {
    0% { transform: scale(0.95); }
    100% { transform: scale(1.05); }
  }

  .btn-inner-val { font-size: 22px; font-weight: 950; text-shadow: 0 0 10px rgba(255,255,255,0.4); }

  :global(.abort-style) { background: linear-gradient(90deg, #ef4444 0%, #3a0202 100%); color: #fff; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); }
  :global(.abort-style):hover { 
    background: #ff0000 !important; 
    transform: translateY(-8px) scale(1.03);
    box-shadow: 0 0 80px rgba(255, 0, 0, 0.9), inset 0 0 35px rgba(255, 255, 255, 0.3) !important; 
  }

  .launch-style { 
    background: linear-gradient(135deg, #ea580c 0%, #7c2d12 100%) !important; 
    color: #fff !important; 
    border-color: #fb923c !important;
    box-shadow: 0 10px 30px rgba(234, 88, 12, 0.4); 
  }
  .launch-style:hover { 
    transform: translateY(-8px) scale(1.03); 
    box-shadow: 0 0 80px rgba(234, 88, 12, 0.9), inset 0 0 30px rgba(255, 255, 255, 0.3) !important; 
  }

  .btn-liquid-sweep {
    position: absolute;
    top: 0;
    left: -150%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    transform: skewX(-25deg);
    transition: 0.8s;
  }
  .footer-action-btn:hover .btn-liquid-sweep, .close-action-btn:hover .btn-liquid-sweep {
    left: 150%;
  }

  .font-outfit { 
    font-family: 'Montserrat', 'Inter', system-ui, -apple-system, sans-serif; 
    font-weight: 900; 
    -webkit-text-stroke: 0.5px currentColor; 
  }
</style>
