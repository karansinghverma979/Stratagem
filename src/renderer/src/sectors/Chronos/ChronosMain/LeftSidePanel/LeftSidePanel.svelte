<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { AudioEngine } from '../../../../core/audio-engine';

  let timeString = $state('');
  let ampm = $state('');
  let dateString = $state('');
  
  let hours = $state(0);
  let minutes = $state(0);
  let seconds = $state(0);
  let waveOffset = $state(0);
  let filterSeed = $state(0);
  let is24HourFormat = $state(false);

  // Sector path helper function
  function getSectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const angleDiff = endAngle - startAngle;
    if (angleDiff <= 0) return '';
    if (angleDiff >= 360) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    }
    const rad = Math.PI / 180;
    const x1 = cx + r * Math.cos(startAngle * rad);
    const y1 = cy + r * Math.sin(startAngle * rad);
    const x2 = cx + r * Math.cos(endAngle * rad);
    const y2 = cy + r * Math.sin(endAngle * rad);
    
    const largeArc = angleDiff > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  let isFilling = $derived(minutes % 2 === 0);
  let liquidPath = $derived.by(() => {
    const theta = (seconds / 60) * 360;
    if (isFilling) {
      if (seconds === 0) return '';
      return getSectorPath(100, 100, 72, -90, -90 + theta);
    } else {
      if (seconds === 60) return '';
      return getSectorPath(100, 100, 72, -90 + theta, 270);
    }
  });

  let needleAngle = $derived(-90 + (seconds / 60) * 360);
  let needleX = $derived(100 + 74 * Math.cos(needleAngle * Math.PI / 180));
  let needleY = $derived(100 + 74 * Math.sin(needleAngle * Math.PI / 180));

  let activeBook = $state<string | null>(null);
  let activeQuote = $state('');
  let displayedQuote = $state('');
  let showFullQuoteOverlay = $state(false);
  let typingTimer: any;

  let intervalId: any;
  let animFrameId: any;

  function toggleFormat() {
    AudioEngine.play('ui-click');
    is24HourFormat = !is24HourFormat;
    updateTime();
  }

  function updateTime() {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
    seconds = now.getSeconds();

    if (is24HourFormat) {
      const displayHours = String(hours).padStart(2, '0');
      const displayMins = String(minutes).padStart(2, '0');
      const displaySecs = String(seconds).padStart(2, '0');
      timeString = `${displayHours}:${displayMins}:${displaySecs}`;
      ampm = '24HR';
    } else {
      let displayHours = hours % 12;
      if (displayHours === 0) displayHours = 12;
      const displayMins = String(minutes).padStart(2, '0');
      const displaySecs = String(seconds).padStart(2, '0');
      ampm = hours >= 12 ? 'PM' : 'AM';
      timeString = `${displayHours}:${displayMins}:${displaySecs}`;
    }

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    dateString = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  let start = Date.now();
  let lastSeedUpdate = 0;
  function animateWave() {
    const now = Date.now();
    const elapsed = now - start;
    waveOffset = Math.sin(elapsed * 0.003) * 6; // sloshing wave amplitude
    if (now - lastSeedUpdate > 100) {
      filterSeed = (filterSeed + 1) % 100;
      lastSeedUpdate = now;
    }
    animFrameId = requestAnimationFrame(animateWave);
  }

  const fallbackQuotes: Record<string, any> = {
    'laws_of_power.json': [
      "LAW 1: NEVER OUTSHINE THE MASTER. Make those above you feel superior.",
      "LAW 2: NEVER PUT TOO MUCH TRUST IN FRIENDS, LEARN HOW TO USE ENEMIES. Friends betray out of envy; a former enemy is more loyal.",
      "LAW 3: CONCEAL YOUR INTENTIONS. Keep people off-balance and in the dark.",
      "LAW 4: ALWAYS SAY LESS THAN NECESSARY. The more you say, the more common you appear.",
      "LAW 5: SO MUCH DEPENDS ON REPUTATION - GUARD IT WITH YOUR LIFE. Reputation is the cornerstone of power.",
      "LAW 6: COURT ATTENTION AT ALL COST. Be conspicuous; do not let yourself get lost in the crowd.",
      "LAW 7: GET OTHERS TO DO THE WORK FOR YOU, BUT ALWAYS TAKE THE CREDIT. Save your energy and make yourself look like a giant.",
      "LAW 8: MAKE OTHER PEOPLE COME TO YOU - USE BAIT IF NECESSARY. When you force the other person to act, you are in control.",
      "LAW 9: WIN THROUGH YOUR ACTIONS, NEVER THROUGH ARGUMENT. Demonstrations are more powerful.",
      "LAW 10: INFECTION: AVOID THE UNHAPPY AND UNLUCKY. Emotional states are as infectious as diseases.",
      "LAW 15: CRUSH YOUR ENEMY TOTALLY. If one ember is left alight, a fire will eventually break out.",
      "LAW 18: DO NOT BUILD FORTRESSES TO PROTECT YOURSELF. Isolation is dangerous. Strongholds cut you off from power.",
      "LAW 28: ENTER ACTION WITH BOLDNESS. Hesitation is dangerous. Boldness eliminates errors.",
      "LAW 29: PLAN ALL THE WAY TO THE END. The ending is everything.",
      "LAW 33: DISCOVER EACH MAN'S THUMBSCREW. Everyone has a weakness, a button you can press.",
      "LAW 48: ASSUME FORMLESSNESS. By having no visible plan, you are impossible to attack."
    ],
    '33_strategies_of_war.json': [
      "STRATEGY 1: THE POLARITY STRATEGY. Declare war on your enemies. Clear boundaries define your strength.",
      "STRATEGY 2: THE GUERILLA-WAR-OF-THE-MIND STRATEGY. Do not let the past dictate the present. Keep moving.",
      "STRATEGY 3: THE COUNTERBALANCE STRATEGY. Keep your presence of mind under fire. Master your emotions.",
      "STRATEGY 4: THE DEATH-GROUND STRATEGY. A lack of options forces absolute focus and fighting spirit.",
      "STRATEGY 5: THE AVOID-THE-MIRE STRATEGY. Guard your time and energy. Withdrawal can be a victory.",
      "STRATEGY 9: THE COUNTERATTACK STRATEGY. Let them make the first move, then strike their exposed flank.",
      "STRATEGY 11: THE KNOW-YOUR-ENEMY STRATEGY. Assess your opponent's psychology and weaknesses.",
      "STRATEGY 12: THE GRAND STRATEGY. Rise above the battlefield. Win the war, not just individual skirmishes.",
      "STRATEGY 16: THE VULNERABLE FLANK STRATEGY. Find their weaknesses and strike where they least expect.",
      "STRATEGY 23: THE MISDIRECTION STRATEGY. Force them to look elsewhere while you breach their main gate."
    ],
    'laws_of_human_nature.json': [
      "LAW OF IRRATIONALITY: Control your emotional self. Realize that feelings cloud clear strategic thinking.",
      "LAW OF NARCISSISM: Transform self-love into empathy. Learn to see others from their perspective.",
      "LAW OF ROLE-PLAYING: See through people's masks. Pay attention to body language and micro-expressions.",
      "LAW OF COMPULSIVE BEHAVIOR: Determine the strength of character. Do not judge by reputation alone.",
      "LAW OF DEFENSIVENESS: Soften people's resistance by confirming their self-opinion.",
      "LAW OF COVETOUSNESS: Become an elusive object of desire. People always want what they cannot have.",
      "LAW OF SHORT-SIGHTEDNESS: Keep a long-term perspective. Do not react to immediate situations without a broader plan.",
      "LAW OF GRANDIOSITY: Counteract self-inflation by remaining grounded in reality and limits.",
      "LAW OF ENVY: Spot envier tendencies before they manifest as sabotage."
    ],
    'daily_law.json': {
      "06-01": "DAILY LAW (JUNE 1): Find your life's task. Your vocational calling is the anchor of your power.",
      "06-02": "DAILY LAW (JUNE 2): Embrace your uniqueness. Do not conform to societal paths that dilute your identity.",
      "06-03": "DAILY LAW (JUNE 3): Choose a mentor wisely. Learn from those who have walked the path before you.",
      "06-04": "DAILY LAW (JUNE 4): Value practice over results. Mastery is built through tedious hours of deep repetition.",
      "06-05": "DAILY LAW (JUNE 5): The mind must adapt to reality. Refuse defensive responses that distort truth.",
      "06-06": "DAILY LAW (JUNE 6): Acquire tacit knowledge. Understand the unspoken rules of your environment.",
      "06-07": "DAILY LAW (JUNE 7): Reconnect with your childhood inclinations. They point to your natural strengths.",
      "06-08": "DAILY LAW (JUNE 8): Value feedback over approval. Constructive criticism is the engine of skill acquisition.",
      "06-09": "DAILY LAW (JUNE 9): Build emotional resilience. The path to power is paved with cognitive discipline.",
      "06-10": "DAILY LAW (JUNE 10): Keep a distance from negative influences. Toxic people drain strategic clarity.",
      "06-11": "DAILY LAW (JUNE 11): Cultivate patience. Major strategic victories require temporal cultivation.",
      "06-12": "DAILY LAW (JUNE 12): Trust actions, not words. Human nature reveals itself through history, not promises.",
      "06-13": "DAILY LAW (JUNE 13): Train your focus. Cognitive fragmentation is the ultimate enemy of strategic design.",
      "06-14": "DAILY LAW (JUNE 14): Mastery is not a product of time and intense focus. Absolute cognitive presence is required.",
      "06-15": "DAILY LAW (JUNE 15): See things as they are, not as you wish them to be. Absolute realism is power.",
      "06-16": "DAILY LAW (JUNE 16): Treat failures as diagnostic feedback, not personal indictments.",
      "06-17": "DAILY LAW (JUNE 17): The supreme law of self-reliance is to create your own opportunities.",
      "06-18": "DAILY LAW (JUNE 18): Master the art of timing. Waiting, speed, and patience are weapons of the strategist.",
      "06-19": "DAILY LAW (JUNE 19): Never show vulnerability to adversaries. Maintain an impenetrable outer demeanor.",
      "06-20": "DAILY LAW (JUNE 20): Control your emotional responses. Anger and pride are vectors of exploitation.",
      "default": "DAILY LAW: Focus entirely on the immediate task. Strategic mastery is born from absolute cognitive isolation."
    },
    'art_of_seduction.json': [
      "THE COQUETTE: The master of delay. Alternating between warmth and coldness keeps the target hooked.",
      "THE DANDY: A figure of romantic ambiguity. They subvert gender expectations to create fascination.",
      "THE CHARISMATIC: Radiating an inner intensity and vision that makes others want to follow blindly.",
      "THE NATURAL: Returning to childhood innocence and spontaneity to disarm the target's defenses.",
      "THE SIREN: Offering an escape from the boredom of daily life through theatrical and sensual presence.",
      "THE RAKE: Offering a dangerous, intense romance that promises absolute, if brief, devotion.",
      "THE IDEAL LOVER: Creating an illusion that matches the target's deepest unfulfilled dreams.",
      "THE CREATIVE: Engaging others through the power of aesthetic fascination and original thought."
    ],
    '50th_law.json': [
      "THE 50TH LAW: FEAR NOTHING. Fear is the ultimate barrier to power. Eliminate it.",
      "FEARLESSNESS DIRECTIVE: When you show no fear, others respect your authority and yield.",
      "TACTICAL INDEPENDENCE: Do not rely on others. Your own self-reliance is your ultimate shield.",
      "OPPORTUNISTIC VISION: See every obstacle as an opportunity to gain power and leverage.",
      "SUPREME BOLDNESS: Enter conflicts with absolute audacity. Hesitation invites destruction.",
      "HUSTLE DIRECTIVE: Work harder and faster than anyone else. Intensity defeats obstacles.",
      "REALISM RULE: Look at the world exactly as it is, not as you wish them to be. Truth is power."
    ],
    'tactical_axioms.json': [
      "The supreme art of war is to subdue the enemy without fighting. - Sun Tzu",
      "In the midst of chaos, there is also opportunity. - Sun Tzu",
      "He who fears being conquered is sure of defeat. - Napoleon Bonaparte",
      "Speed is the essence of war. Take advantage of the enemy's unpreparedness. - Sun Tzu",
      "Plans are nothing; planning is everything. - Dwight D. Eisenhower",
      "If you know the enemy and know yourself, you need not fear the result of a hundred battles. - Sun Tzu",
      "Regard your soldiers as your children, and they will follow you into the deepest valleys. - Sun Tzu",
      "Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat. - Sun Tzu",
      "Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt. - Sun Tzu"
    ]
  };

  function getFilenameForBook(book: string | null): string {
    switch (book) {
      case 'lawsOfPower': return 'laws_of_power.json';
      case 'warStrategies': return '33_strategies_of_war.json';
      case 'humanNature': return 'laws_of_human_nature.json';
      case 'dailyLaw': return 'daily_law.json';
      case 'artOfSeduction': return 'art_of_seduction.json';
      case 'fiftiethLaw': return '50th_law.json';
      case 'otherQuotes': return 'tactical_axioms.json';
      default: return '';
    }
  }

  function handleQuotesUpdated(e: Event) {
    const customEvent = e as CustomEvent<{ filename: string }>;
    const activeFilename = getFilenameForBook(activeBook);
    if (activeFilename && activeFilename === customEvent.detail.filename) {
      injectIntel(activeBook!, activeFilename);
    }
  }

  async function injectIntel(bookKey: string, filename: string) {
    try {
      activeBook = bookKey;
      displayedQuote = '';
      activeQuote = '';
      
      if (typingTimer) clearInterval(typingTimer);
      AudioEngine.play('data-lock');
      
      let quotesData = null;
      
      // 1. Try to read from edited in-memory database cache first
      if (typeof window !== 'undefined' && (window as any).localQuotesCache && (window as any).localQuotesCache[filename]) {
        quotesData = (window as any).localQuotesCache[filename];
      }
      
      // 2. Try to read from the secure Electron bridge next
      if (!quotesData && window.stratagemAPI) {
        try {
          const result = await window.stratagemAPI.intelReadQuotes(filename);
          if (result && result.success) {
            quotesData = result.data;
          }
        } catch (bridgeErr) {
          console.warn("Secure bridge invoke failed, falling back to local database:", bridgeErr);
        }
      }
      
      // 3. Fallback to hardcoded default dummy data
      if (!quotesData) {
        quotesData = fallbackQuotes[filename];
      }
      
      if (quotesData) {
        let targetQuote: any = '';
        if (bookKey === 'dailyLaw') {
          const now = new Date();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const dateKey = `${mm}-${dd}`;
          // Handle object or array formats for daily law
          targetQuote = quotesData[dateKey] || quotesData['default'] || "DAILY LAW: Focus entirely on the immediate task. Strategic mastery is born from absolute cognitive isolation.";
        } else {
          if (Array.isArray(quotesData) && quotesData.length > 0) {
            targetQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
          } else {
            targetQuote = "AWAITING COGNITIVE ENTRY VECTOR...";
          }
        }
        
        let quoteText = '';
        if (typeof targetQuote === 'string') {
          quoteText = targetQuote;
        } else if (targetQuote && typeof targetQuote === 'object') {
          quoteText = targetQuote.text || '';
          if (targetQuote.author) {
            quoteText += ` - ${targetQuote.author}`;
          }
        } else {
          quoteText = String(targetQuote || '');
        }

        activeQuote = quoteText;
        
        let charIdx = 0;
        typingTimer = setInterval(() => {
          if (charIdx < quoteText.length) {
            displayedQuote += quoteText[charIdx];
            charIdx++;
            if (charIdx % 3 === 0) {
              AudioEngine.play('ui-hover');
            }
          } else {
            clearInterval(typingTimer);
            typingTimer = null;
          }
        }, 15);
      } else {
        activeQuote = "ERROR: INTEL LINK REFUSED. VERIFY SOURCE CORE.";
        displayedQuote = activeQuote;
      }
    } catch (e: any) {
      console.error(e);
      // Clean fallback even on absolute failure
      const fallbackList = fallbackQuotes[filename] || ["COGNITIVE ALIGNMENT SEQUENCE INITIALIZED. VERIFY MATRIX INTEL."];
      const targetQuote = Array.isArray(fallbackList) ? fallbackList[0] : (fallbackList['default'] || fallbackList[0]);
      
      let quoteText = '';
      if (typeof targetQuote === 'string') {
        quoteText = targetQuote;
      } else if (targetQuote && typeof targetQuote === 'object') {
        quoteText = targetQuote.text || '';
        if (targetQuote.author) {
          quoteText += ` - ${targetQuote.author}`;
        }
      } else {
        quoteText = String(targetQuote || '');
      }

      activeQuote = quoteText;
      displayedQuote = activeQuote;
    }
  }

  let autoChangeInterval: any;

  onMount(() => {
    updateTime();
    intervalId = setInterval(updateTime, 1000);
    animateWave();
    window.addEventListener('quotes-updated', handleQuotesUpdated);
    
    // Auto change quote every 15 minutes
    autoChangeInterval = setInterval(() => {
      if (activeBook) {
        injectIntel(activeBook, getFilenameForBook(activeBook));
      }
    }, 15 * 60 * 1000);
  });

  onDestroy(() => {
    clearInterval(intervalId);
    cancelAnimationFrame(animFrameId);
    if (typingTimer) clearInterval(typingTimer);
    if (autoChangeInterval) clearInterval(autoChangeInterval);
    window.removeEventListener('quotes-updated', handleQuotesUpdated);
  });
</script>

<aside class="chronos-side-panel left-panel font-mono">
  <div class="left-sidebar-container">
    <div class="panel-section-title">CHRONOS QUANTUM TIME</div>
    
    <div class="clock-wrapper">
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <svg width="230" height="230" viewBox="0 0 200 200" class="liquid-clock-svg" onclick={toggleFormat} onmouseenter={() => AudioEngine.play('ui-hover')} aria-label="Toggle clock format">
        <defs>
          <clipPath id="circle-clip">
            <circle cx="100" cy="100" r="72" />
          </clipPath>
          <linearGradient id="liquid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(6, 182, 212, 0.85)" />
            <stop offset="50%" stop-color="rgba(8, 47, 73, 0.9)" />
            <stop offset="100%" stop-color="rgba(3, 7, 18, 0.95)" />
          </linearGradient>
          <linearGradient id="ring-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#06b6d4" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
          <linearGradient id="ring-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
          <linearGradient id="ring-grad-3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#06b6d4" />
            <stop offset="50%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
          <filter id="liquid-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.04" numOctaves="2" seed={filterSeed} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        <!-- Extra Concentric Outer Rings (Counter-rotating and color shifting) with increased spacing (r=83, 89, 95) -->
        <circle cx="100" cy="100" r="83" fill="none" stroke="url(#ring-grad-1)" stroke-width="0.8" stroke-dasharray="8 6" class="extra-ring ccw-ring" />
        <circle cx="100" cy="100" r="89" fill="none" stroke="url(#ring-grad-2)" stroke-width="0.6" stroke-dasharray="2 10" class="extra-ring cw-ring" />
        <circle cx="100" cy="100" r="95" fill="none" stroke="url(#ring-grad-3)" stroke-width="1.0" stroke-dasharray="40 10 5 10" class="extra-ring ccw-slow-ring" />

        <!-- Outer Glass Ring -->
        <circle cx="100" cy="100" r="77" fill="none" stroke="rgba(6, 182, 212, 0.2)" stroke-width="2" />
        <circle cx="100" cy="100" r="75" fill="rgba(8, 10, 20, 0.4)" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1.5" style="backdrop-filter: blur(8px);" />

        <!-- Ticking outer indicators -->
        <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(6, 182, 212, 0.08)" stroke-width="1" stroke-dasharray="4 6" class="rotating-ring" />

        <!-- Liquid Level Area (clipped to circle) -->
        <g clip-path="url(#circle-clip)">
          <!-- Liquid Sector Path with rippling liquid filter -->
          {#if liquidPath}
            <path
              d={liquidPath}
              fill="url(#liquid-grad)"
              filter="url(#liquid-filter)"
            />
          {/if}
          
          <!-- Concentric Grid lines inside the liquid for a tech look -->
          <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
          <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
        </g>

        <!-- 1-Minute needle (Clock hand) -->
        <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" style="filter: drop-shadow(0 0 5px #06b6d4);" />
        <circle cx={needleX} cy={needleY} r="3" fill="#ffffff" stroke="#06b6d4" stroke-width="1.5" style="filter: drop-shadow(0 0 4px #06b6d4);" />

        <!-- Digital time inside the clock dial -->
        <text x="100" y="92" fill="#ffffff" font-family="'Share Tech Mono', monospace" font-size="24px" font-weight="950" text-anchor="middle" style="letter-spacing: 0.02em; filter: drop-shadow(0 0 6px rgba(255,255,255,0.6)); pointer-events: none;">
          {timeString || "00:00:00"}
        </text>
        <text x="100" y="115" fill="rgba(255, 255, 255, 0.85)" font-family="'Outfit', sans-serif" font-size="11px" font-weight="950" text-anchor="middle" style="letter-spacing: 0.05em; text-shadow: 0 0 4px rgba(255,255,255,0.3); pointer-events: none;">
          {ampm} | {dateString}
        </text>

        <!-- Glowing Center Pivot dot -->
        <circle cx="100" cy="100" r="4" fill="#06b6d4" style="filter: drop-shadow(0 0 4px #06b6d4);" />
      </svg>
    </div>

    <div class="panel-section-title" style="margin-top: 10px;">TACTICAL INTEL DECK</div>
    
    <div class="intel-grid">
      <button 
        type="button" 
        class="intel-btn btn-power" 
        class:active={activeBook === 'lawsOfPower'}
        onclick={() => injectIntel('lawsOfPower', 'laws_of_power.json')}
      >
        48 Laws
      </button>
      <button 
        type="button" 
        class="intel-btn btn-war" 
        class:active={activeBook === 'warStrategies'}
        onclick={() => injectIntel('warStrategies', '33_strategies_of_war.json')}
      >
        Strategies
      </button>
      <button 
        type="button" 
        class="intel-btn btn-human" 
        class:active={activeBook === 'humanNature'}
        onclick={() => injectIntel('humanNature', 'laws_of_human_nature.json')}
      >
        Human Nature
      </button>
      <button 
        type="button" 
        class="intel-btn btn-daily" 
        class:active={activeBook === 'dailyLaw'}
        onclick={() => injectIntel('dailyLaw', 'daily_law.json')}
      >
        Daily Law
      </button>
      <button 
        type="button" 
        class="intel-btn btn-seduction" 
        class:active={activeBook === 'artOfSeduction'}
        onclick={() => injectIntel('artOfSeduction', 'art_of_seduction.json')}
      >
        Seduction
      </button>
      <button 
        type="button" 
        class="intel-btn btn-50th" 
        class:active={activeBook === 'fiftiethLaw'}
        onclick={() => injectIntel('fiftiethLaw', '50th_law.json')}
      >
        50th Law
      </button>
      <button 
        type="button" 
        class="intel-btn btn-axioms full-width" 
        class:active={activeBook === 'otherQuotes'}
        onclick={() => injectIntel('otherQuotes', 'tactical_axioms.json')}
      >
        Tactical Axioms
      </button>
    </div>

    <div class="intel-readout-title font-mono" style="margin-top: 10px;">CLASSIFIED INTEL READOUT</div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="intel-readout-box font-mono select-text"
      onmouseenter={() => { if (activeQuote) showFullQuoteOverlay = true; }}
      onmouseleave={() => showFullQuoteOverlay = false}
    >
      {#if activeQuote}
        <div class="quote-content">
          {displayedQuote}<span class="text-cursor">|</span>
        </div>
      {:else}
        <div class="quote-placeholder">
          AWAITING INTEL DECRYPTION... INJECT SECTOR VECTOR.
        </div>
      {/if}

      <!-- Floating Tooltip showing full quote on hover -->
      {#if showFullQuoteOverlay && activeQuote}
        <div class="full-quote-overlay" transition:fade={{ duration: 150 }}>
          <div class="overlay-header">FULL INTEL</div>
          <div class="overlay-body">{activeQuote}</div>
        </div>
      {/if}
    </div>
  </div>
</aside>

<style>
  .left-sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  }

  .clock-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin: 8px 0;
  }

  .liquid-clock-svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease, filter 0.4s ease;
    cursor: pointer;
    border-radius: 50%;
  }

  .liquid-clock-svg:hover {
    transform: scale(1.08);
    filter: drop-shadow(0 0 16px rgba(6, 182, 212, 0.35));
  }

  .rotating-ring {
    transform-origin: 100px 100px;
    animation: rotateRing 25s linear infinite;
    transition: animation-duration 0.3s ease;
  }

  .liquid-clock-svg:hover .rotating-ring {
    animation-duration: 8s;
  }

  /* Extra concentric outer rings styles */
  .extra-ring {
    transform-origin: 100px 100px;
    opacity: 0.25;
    transition: opacity 0.4s ease, stroke-width 0.4s ease, filter 0.4s ease;
  }

  .cw-ring {
    animation: rotateCW 18s linear infinite;
  }

  .ccw-ring {
    animation: rotateCCW 22s linear infinite;
  }

  .ccw-slow-ring {
    animation: rotateCCW 36s linear infinite;
  }

  /* Hover transitions for extra rings */
  .liquid-clock-svg:hover .extra-ring {
    opacity: 0.85;
    stroke-width: 1.6px;
    filter: drop-shadow(0 0 5px rgba(6, 182, 212, 0.45));
  }

  .liquid-clock-svg:hover .cw-ring {
    animation-duration: 5s;
  }

  .liquid-clock-svg:hover .ccw-ring {
    animation-duration: 6s;
  }

  .liquid-clock-svg:hover .ccw-slow-ring {
    animation-duration: 10s;
  }

  @keyframes rotateRing {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes rotateCW {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes rotateCCW {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  .intel-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 4px;
  }

  .intel-btn {
    border-radius: 9999px; /* Pill-shaped fully rounded corners */
    font-family: 'Outfit', sans-serif;
    font-size: 11px; /* Slightly adjusted to fit text in single line */
    font-weight: 950 !important; /* Extra bold */
    padding: 8px 12px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.02em !important;
    word-spacing: 0.06em !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    box-sizing: border-box;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }

  /* 48 Laws: Orange/Red Greene theme */
  .intel-btn.btn-power {
    background: linear-gradient(135deg, #ea580c, #dc2626);
    border: 1px solid #f97316;
    color: #ffffff;
  }
  .intel-btn.btn-power:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(234, 88, 12, 0.75);
    background: linear-gradient(135deg, #ff6b1a, #ef4444);
  }
  .intel-btn.btn-power:active, .intel-btn.btn-power.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(234, 88, 12, 0.5);
  }

  /* 33 Strategies of War: White/Gray military theme */
  .intel-btn.btn-war {
    background: linear-gradient(135deg, #f1f5f9, #94a3b8);
    border: 1px solid #cbd5e1;
    color: #0f172a;
    text-shadow: none;
  }
  .intel-btn.btn-war:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.55);
    background: linear-gradient(135deg, #ffffff, #cbd5e1);
  }
  .intel-btn.btn-war:active, .intel-btn.btn-war.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  }

  /* Human Nature: Red/Blue gradient flow */
  .intel-btn.btn-human {
    background: linear-gradient(135deg, #ef4444, #3b82f6);
    border: 1px solid #60a5fa;
    color: #ffffff;
  }
  .intel-btn.btn-human:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(59, 130, 246, 0.75);
    background: linear-gradient(135deg, #f87171, #60a5fa);
  }
  .intel-btn.btn-human:active, .intel-btn.btn-human.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }

  /* Daily Law: Violet/Teal gradient (same as old human nature) */
  .intel-btn.btn-daily {
    background: linear-gradient(135deg, #7c3aed, #0d9488);
    border: 1px solid #a78bfa;
    color: #ffffff;
  }
  .intel-btn.btn-daily:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(124, 58, 237, 0.75);
    background: linear-gradient(135deg, #8b5cf6, #14b8a6);
  }
  .intel-btn.btn-daily:active, .intel-btn.btn-daily.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.5);
  }

  /* Art of Seduction: Pink/Purple mixture gradient */
  .intel-btn.btn-seduction {
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    border: 1px solid #f472b6;
    color: #ffffff;
  }
  .intel-btn.btn-seduction:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(236, 72, 153, 0.75);
    background: linear-gradient(135deg, #f472b6, #a78bfa);
  }
  .intel-btn.btn-seduction:active, .intel-btn.btn-seduction.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(236, 72, 153, 0.5);
  }

  /* 50th Law: Sharp heavy polished gold with pure black background */
  .intel-btn.btn-50th {
    background: #000000;
    border: 2px solid #ffd700;
    color: #ffd700;
    border-radius: 9999px !important; /* Reverted to circular pill shape */
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.2);
  }
  .intel-btn.btn-50th:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 20px #ffd700, inset 0 0 10px rgba(255, 215, 0, 0.4);
    background: #000000;
  }
  .intel-btn.btn-50th:active, .intel-btn.btn-50th.active {
    transform: scale(0.97);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  /* Tactical Axioms: Slate/Charcoal */
  .intel-btn.btn-axioms {
    background: linear-gradient(135deg, #475569, #0f172a);
    border: 1px solid #94a3b8;
    color: #ffffff;
  }
  .intel-btn.btn-axioms:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 16px rgba(71, 85, 105, 0.75);
    background: linear-gradient(135deg, #64748b, #1e293b);
  }
  .intel-btn.btn-axioms:active, .intel-btn.btn-axioms.active {
    transform: scale(0.97);
    box-shadow: 0 0 8px rgba(71, 85, 105, 0.5);
  }

  .intel-btn.full-width {
    grid-column: span 2;
  }

  .intel-readout-title {
    font-size: 10.5px;
    color: var(--secondary-accent);
    letter-spacing: 0.12em;
    margin-top: 10px;
    margin-bottom: 6px;
    opacity: 0.85;
    font-weight: 950 !important;
  }

  .intel-readout-box {
    flex: 1;
    background: transparent; /* Open space style - no boxy black background */
    border: none; /* No boxy dashed border */
    border-radius: 0;
    padding: 6px 0;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.85);
    min-height: 75px;
    max-height: 78px;
    box-sizing: border-box;
    position: relative;
  }

  .quote-content {
    white-space: pre-wrap;
    font-weight: 950 !important;
    background: linear-gradient(135deg, #ec4899, #8b5cf6, #0ea5e9);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradientShift 6s ease infinite;
    font-family: 'Rajdhani', sans-serif;
    font-size: 17px;
    line-height: 1.35;
    letter-spacing: 0.03em;
    
    /* Clamp to exactly 3 lines max */
    max-height: 4.05em; /* 3 lines * 1.35 line-height */
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .quote-placeholder {
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 6px;
    font-weight: 950 !important;
  }

  .text-cursor {
    display: inline-block;
    width: 2px;
    color: #06b6d4;
    -webkit-text-fill-color: #06b6d4;
    animation: blink 0.8s steps(2, start) infinite;
    margin-left: 2px;
  }

  /* Floating full decrypted quote card on hover - Glassmorphic Liquid Glass Style */
  .full-quote-overlay {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    right: 0;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(8, 10, 20, 0.75) 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.2), 
      0 20px 40px rgba(0, 0, 0, 0.8), 
      0 0 15px rgba(6, 182, 212, 0.25);
    z-index: 99999;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    pointer-events: none; /* Avoid flickering */
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .overlay-header {
    font-size: 9px;
    color: #06b6d4;
    letter-spacing: 0.12em;
    font-weight: 950 !important;
    border-bottom: 1px solid rgba(6, 182, 212, 0.25);
    padding-bottom: 4px;
    text-transform: uppercase;
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
  }

  .overlay-body {
    font-size: 15px;
    line-height: 1.35;
    color: #ffffff;
    white-space: pre-wrap;
    font-weight: 950 !important;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.02em;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
  }

  @keyframes blink {
    to { visibility: hidden; }
  }
</style>
