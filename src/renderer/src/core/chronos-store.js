import { writable, derived } from 'svelte/store';

const DEFAULT_TIME = 25 * 60;

function createChronosStore() {
  const { subscribe, set, update } = writable({
    timeLeft: DEFAULT_TIME,
    isRunning: false,
    totalTime: DEFAULT_TIME
  });

  let timerId = null;

  return {
    subscribe,
    start: () => {
      update(s => {
        if (s.isRunning) return s;
        
        if (timerId) clearInterval(timerId);
        
        timerId = setInterval(() => {
          update(state => {
            if (state.timeLeft > 0) {
              return { ...state, timeLeft: state.timeLeft - 1 };
            } else {
              clearInterval(timerId);
              timerId = null;
              return { ...state, isRunning: false };
            }
          });
        }, 1000);

        return { ...s, isRunning: true };
      });
    },
    pause: () => {
      update(s => {
        if (timerId) clearInterval(timerId);
        timerId = null;
        return { ...s, isRunning: false };
      });
    },
    reset: () => {
      update(s => {
        if (timerId) clearInterval(timerId);
        timerId = null;
        return { ...s, timeLeft: s.totalTime, isRunning: false };
      });
    },
    setTime: (seconds) => {
      update(s => ({ ...s, timeLeft: seconds, totalTime: seconds }));
    }
  };
}

export const chronosStore = createChronosStore();

export const chronosProgress = derived(chronosStore, $s => {
  return 1 - ($s.timeLeft / $s.totalTime);
});
