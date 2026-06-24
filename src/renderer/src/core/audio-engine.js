let audioEnabled = true;
let audioVolume = 0.8;
let audioTheme = 'cyberpunk';
let lastPlayTime = 0;

let audioCtx = null;
let masterGainNode = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(audioVolume, audioCtx.currentTime);
    masterGainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Reusable noise generator for mechanical/tactical bursts
function createNoiseSource(ctx, duration) {
  try {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  } catch (e) {
    return null;
  }
}

export const AudioEngine = {
  setAudioEnabled(val) {
    audioEnabled = val !== false;
  },
  setAudioVolume(val) {
    const volVal = parseFloat(val);
    audioVolume = isNaN(volVal) ? 0.8 : volVal;
    if (audioCtx && masterGainNode) {
      masterGainNode.gain.setValueAtTime(audioVolume, audioCtx.currentTime);
    }
  },
  setAudioTheme(val) {
    audioTheme = val || 'cyberpunk';
  },
  play(soundName) {
    if (!audioEnabled) return;

    if (soundName !== 'ui-hover' && soundName !== 'tick') {
      lastPlayTime = Date.now();
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const time = ctx.currentTime;
    const masterGain = masterGainNode;

    try {
      // Branch playbacks by theme
      if (audioTheme === 'retro') {
        switch (soundName) {
          case 'ui-click':
          case 'click':
          case 'switch-flip': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(700, time);
            osc.frequency.exponentialRampToValueAtTime(300, time + 0.03);
            gainNode.gain.setValueAtTime(0.12, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.04);
            break;
          }

          case 'ui-hover': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1000, time);
            gainNode.gain.setValueAtTime(0.04, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.03);
            break;
          }

          case 'victory':
          case 'success': {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, index) => {
              const noteTime = time + index * 0.06;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(freq, noteTime);
              gainNode.gain.setValueAtTime(0.15, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.15);
            });
            break;
          }

          case 'fail':
          case 'error': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, time);
            osc.frequency.linearRampToValueAtTime(80, time + 0.25);
            gainNode.gain.setValueAtTime(0.25, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.28);
            break;
          }

          case 'warning':
          case 'alarm_warning': {
            const pulses = 3;
            for (let i = 0; i < pulses; i++) {
              const noteTime = time + i * 0.2;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(i % 2 === 0 ? 650 : 500, noteTime);
              gainNode.gain.setValueAtTime(0.18, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.2);
            }
            break;
          }

          case 'critical_breach':
          case 'critical-warning': {
            const laserSweeps = 3;
            for (let i = 0; i < laserSweeps; i++) {
              const sweepTime = time + i * 0.15;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(1000, sweepTime);
              osc.frequency.exponentialRampToValueAtTime(150, sweepTime + 0.12);
              gainNode.gain.setValueAtTime(0.15, sweepTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, sweepTime + 0.12);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(sweepTime);
              osc.stop(sweepTime + 0.13);
            }
            break;
          }

          case 'tick': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, time);
            gainNode.gain.setValueAtTime(0.08, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.02);
            break;
          }

          case 'ping': {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(987.77, time);
            gain1.gain.setValueAtTime(0.12, time);
            gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
            osc1.connect(gain1);
            gain1.connect(masterGain);

            const time2 = time + 0.07;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1318.51, time2);
            gain2.gain.setValueAtTime(0.15, time2);
            gain2.gain.exponentialRampToValueAtTime(0.001, time2 + 0.25);
            osc2.connect(gain2);
            gain2.connect(masterGain);

            osc1.start(time);
            osc1.stop(time + 0.07);
            osc2.start(time2);
            osc2.stop(time2 + 0.26);
            break;
          }

          case 'shutdown': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.45);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.47);
            break;
          }

          case 'data_decode':
          case 'data-decode': {
            const beeps = 6;
            for (let i = 0; i < beeps; i++) {
              const beepTime = time + i * 0.04;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(400 + (i * 150), beepTime);
              gainNode.gain.setValueAtTime(0.08, beepTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.035);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(beepTime);
              osc.stop(beepTime + 0.04);
            }
            break;
          }

          case 'data-lock': {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(600, time);
            gain1.gain.setValueAtTime(0.15, time);
            gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
            osc1.connect(gain1);
            gain1.connect(masterGain);

            const time2 = time + 0.05;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(150, time2);
            gain2.gain.setValueAtTime(0.2, time2);
            gain2.gain.exponentialRampToValueAtTime(0.001, time2 + 0.05);
            osc2.connect(gain2);
            gain2.connect(masterGain);

            osc1.start(time);
            osc1.stop(time + 0.03);
            osc2.start(time2);
            osc2.stop(time2 + 0.06);
            break;
          }

          case 'access_handshake': {
            [523.25, 659.25, 783.99].forEach((freq) => {
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(freq, time);
              gainNode.gain.setValueAtTime(0.08, time);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(time);
              osc.stop(time + 0.25);
            });
            break;
          }

          default:
            break;
        }
      } else if (audioTheme === 'tactical') {
        switch (soundName) {
          case 'ui-click':
          case 'click':
          case 'switch-flip': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(50, time + 0.04);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            osc.connect(gainNode);
            gainNode.connect(masterGain);

            const noise = createNoiseSource(ctx, 0.015);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'highpass';
              filter.frequency.setValueAtTime(3000, time);
              const noiseGain = ctx.createGain();
              noiseGain.gain.setValueAtTime(0.18, time);
              noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
              noise.connect(filter);
              filter.connect(noiseGain);
              noiseGain.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.02);
            }

            osc.start(time);
            osc.stop(time + 0.05);
            break;
          }

          case 'ui-hover': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, time);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.05);
            break;
          }

          case 'victory':
          case 'success': {
            const notes = [600, 800, 1000];
            notes.forEach((freq, index) => {
              const noteTime = time + index * 0.12;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              gainNode.gain.setValueAtTime(0.25, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.65);
            });
            break;
          }

          case 'fail':
          case 'error': {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(90, time);
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(92.2, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(280, time);

            gainNode.gain.setValueAtTime(0.45, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + 0.5);
            osc2.stop(time + 0.5);
            break;
          }

          case 'warning':
          case 'alarm_warning': {
            const pulses = 3;
            for (let i = 0; i < pulses; i++) {
              const noteTime = time + i * 0.35;
              const osc1 = ctx.createOscillator();
              const osc2 = ctx.createOscillator();
              const filter = ctx.createBiquadFilter();
              const gainNode = ctx.createGain();

              osc1.type = 'sawtooth';
              osc1.frequency.setValueAtTime(140, noteTime);
              osc2.type = 'sawtooth';
              osc2.frequency.setValueAtTime(142, noteTime);

              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(400, noteTime);

              gainNode.gain.setValueAtTime(0.35, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

              osc1.connect(filter);
              osc2.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);

              osc1.start(noteTime);
              osc2.start(noteTime);
              osc1.stop(noteTime + 0.3);
              osc2.stop(noteTime + 0.3);
            }
            break;
          }

          case 'critical_breach':
          case 'critical-warning': {
            const duration = 0.8;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gainNode = ctx.createGain();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(250, time);
            osc1.frequency.linearRampToValueAtTime(380, time + duration * 0.4);
            osc1.frequency.linearRampToValueAtTime(250, time + duration);

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(252.5, time);
            osc2.frequency.linearRampToValueAtTime(382.5, time + duration * 0.4);
            osc2.frequency.linearRampToValueAtTime(252.5, time + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(700, time);

            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
            break;
          }

          case 'tick': {
            const noise = createNoiseSource(ctx, 0.006);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.frequency.setValueAtTime(4500, time);
              filter.Q.setValueAtTime(10, time);
              const gainNode = ctx.createGain();
              gainNode.gain.setValueAtTime(0.08, time);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.006);
              noise.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.01);
            }
            break;
          }

          case 'ping': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, time);
            osc.frequency.exponentialRampToValueAtTime(1150, time + 1.6);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.6);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 1.65);
            break;
          }

          case 'shutdown': {
            const noise = createNoiseSource(ctx, 0.7);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(800, time);
              filter.frequency.exponentialRampToValueAtTime(30, time + 0.7);
              const gainNode = ctx.createGain();
              gainNode.gain.setValueAtTime(0.3, time);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
              noise.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.75);
            }
            break;
          }

          case 'data_decode':
          case 'data-decode': {
            const noise = createNoiseSource(ctx, 0.15);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.frequency.setValueAtTime(1000, time);
              const gainNode = ctx.createGain();
              gainNode.gain.setValueAtTime(0.12, time);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
              noise.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.2);
            }
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, time);
            osc.frequency.exponentialRampToValueAtTime(200, time + 0.15);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.16);
            break;
          }

          case 'data-lock': {
            const noise = createNoiseSource(ctx, 0.08);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(500, time);
              const gainNode = ctx.createGain();
              gainNode.gain.setValueAtTime(0.25, time);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
              noise.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.1);
            }
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, time);
            osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);
            gainNode.gain.setValueAtTime(0.45, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.1);
            break;
          }

          case 'access_handshake': {
            [800, 1000].forEach((freq, idx) => {
              const delay = idx * 0.12;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, time + delay);
              gainNode.gain.setValueAtTime(0.25, time + delay);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.2);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(time + delay);
              osc.stop(time + delay + 0.25);
            });
            break;
          }

          default:
            break;
        }
      } else if (audioTheme === 'industrial') {
        switch (soundName) {
          case 'ui-click':
          case 'click':
          case 'switch-flip': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90, time);
            osc.frequency.linearRampToValueAtTime(40, time + 0.06);
            gainNode.gain.setValueAtTime(0.35, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
            osc.connect(gainNode);
            gainNode.connect(masterGain);

            const noise = createNoiseSource(ctx, 0.02);
            if (noise) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.frequency.setValueAtTime(800, time);
              const noiseGain = ctx.createGain();
              noiseGain.gain.setValueAtTime(0.12, time);
              noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
              noise.connect(filter);
              filter.connect(noiseGain);
              noiseGain.connect(masterGain);
              noise.start(time);
              noise.stop(time + 0.025);
            }
            osc.start(time);
            osc.stop(time + 0.07);
            break;
          }

          case 'ui-hover': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(75, time);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.04);
            break;
          }

          case 'victory':
          case 'success': {
            const notes = [140, 220, 280, 350];
            notes.forEach((freq, index) => {
              const noteTime = time + index * 0.08;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, noteTime);
              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(600, noteTime);
              gainNode.gain.setValueAtTime(0.22, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);
              osc.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.4);
            });
            break;
          }

          case 'fail':
          case 'error': {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, time);
            osc.frequency.linearRampToValueAtTime(30, time + 0.45);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, time);
            gainNode.gain.setValueAtTime(0.5, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.48);
            break;
          }

          case 'warning':
          case 'alarm_warning': {
            const pulses = 2;
            for (let i = 0; i < pulses; i++) {
              const noteTime = time + i * 0.4;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              const filter = ctx.createBiquadFilter();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(110, noteTime);
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(300, noteTime);
              gainNode.gain.setValueAtTime(0.3, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
              osc.connect(filter);
              filter.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.35);
            }
            break;
          }

          case 'critical_breach':
          case 'critical-warning': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, time);
            osc.frequency.linearRampToValueAtTime(60, time + 0.7);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, time);
            gainNode.gain.setValueAtTime(0.45, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.75);
            break;
          }

          case 'tick': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, time);
            gainNode.gain.setValueAtTime(0.15, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.01);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.015);
            break;
          }

          case 'ping': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, time);
            osc.frequency.exponentialRampToValueAtTime(50, time + 0.8);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.85);
            break;
          }

          case 'shutdown': {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, time);
            osc.frequency.exponentialRampToValueAtTime(20, time + 0.8);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(180, time);
            gainNode.gain.setValueAtTime(0.45, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.85);
            break;
          }

          case 'data_decode':
          case 'data-decode': {
            const count = 4;
            for (let i = 0; i < count; i++) {
              const noteTime = time + i * 0.08;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(150 + i * 40, noteTime);
              gainNode.gain.setValueAtTime(0.15, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.07);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.08);
            }
            break;
          }

          case 'data-lock': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, time);
            osc.frequency.setValueAtTime(60, time + 0.08);
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, time);
            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.2);
            break;
          }

          case 'access_handshake': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, time);
            osc.frequency.linearRampToValueAtTime(320, time + 0.3);
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, time);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.4);
            break;
          }

          default:
            break;
        }
      } else if (audioTheme === 'neural') {
        switch (soundName) {
          case 'ui-click':
          case 'click':
          case 'switch-flip': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, time);
            osc.frequency.exponentialRampToValueAtTime(1200, time + 0.025);
            gainNode.gain.setValueAtTime(0.12, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.03);
            break;
          }

          case 'ui-hover': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2400, time);
            gainNode.gain.setValueAtTime(0.06, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.02);
            break;
          }

          case 'victory':
          case 'success': {
            const freqs = [1200, 1500, 1800, 2400];
            freqs.forEach((freq, idx) => {
              const noteTime = time + idx * 0.05;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              gainNode.gain.setValueAtTime(0.12, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.2);
            });
            break;
          }

          case 'fail':
          case 'error': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, time);
            osc.frequency.exponentialRampToValueAtTime(150, time + 0.22);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.25);
            break;
          }

          case 'warning':
          case 'alarm_warning': {
            const pulses = 3;
            for (let i = 0; i < pulses; i++) {
              const noteTime = time + i * 0.22;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(1500, noteTime);
              gainNode.gain.setValueAtTime(0.12, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.18);
            }
            break;
          }

          case 'critical_breach':
          case 'critical-warning': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1600, time);
            osc.frequency.exponentialRampToValueAtTime(600, time + 0.45);
            gainNode.gain.setValueAtTime(0.25, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.5);
            break;
          }

          case 'tick': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(3000, time);
            gainNode.gain.setValueAtTime(0.05, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.01);
            break;
          }

          case 'ping': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, time);
            osc.frequency.exponentialRampToValueAtTime(2000, time + 0.6);
            gainNode.gain.setValueAtTime(0.22, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.65);
            break;
          }

          case 'shutdown': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, time);
            osc.frequency.exponentialRampToValueAtTime(200, time + 0.5);
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.55);
            break;
          }

          case 'data_decode':
          case 'data-decode': {
            const notes = [1600, 1800, 2000, 2200, 2400];
            notes.forEach((freq, i) => {
              const noteTime = time + i * 0.04;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              gainNode.gain.setValueAtTime(0.08, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.03);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.04);
            });
            break;
          }

          case 'data-lock': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2200, time);
            osc.frequency.setValueAtTime(1400, time + 0.06);
            gainNode.gain.setValueAtTime(0.18, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.15);
            break;
          }

          case 'access_handshake': {
            const notes = [1500, 2200];
            notes.forEach((freq, idx) => {
              const delay = idx * 0.08;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, time + delay);
              gainNode.gain.setValueAtTime(0.1, time + delay);
              gainNode.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.15);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(time + delay);
              osc.stop(time + delay + 0.2);
            });
            break;
          }

          default:
            break;
        }
      } else {
        // Fallback to default 'cyberpunk' theme
        switch (soundName) {
          case 'ui-click':
          case 'click':
          case 'switch-flip': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1400, time);
            osc.frequency.exponentialRampToValueAtTime(300, time + 0.04);
            gainNode.gain.setValueAtTime(0.5, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.05);
            break;
          }

          case 'ui-hover': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, time);
            osc.frequency.exponentialRampToValueAtTime(1500, time + 0.03);
            gainNode.gain.setValueAtTime(0.12, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.04);
            break;
          }

          case 'victory':
          case 'success': {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, index) => {
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              const noteTime = time + index * 0.08;
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              gainNode.gain.setValueAtTime(0.25, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.3);
            });
            break;
          }

          case 'fail':
          case 'error': {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(120, time);
            osc1.frequency.linearRampToValueAtTime(80, time + 0.3);

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(122.5, time);
            osc2.frequency.linearRampToValueAtTime(81.5, time + 0.3);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, time);
            filter.frequency.exponentialRampToValueAtTime(150, time + 0.3);

            gainNode.gain.setValueAtTime(0.4, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + 0.4);
            osc2.stop(time + 0.4);
            break;
          }

          case 'warning':
          case 'alarm_warning': {
            const pulses = 3;
            for (let i = 0; i < pulses; i++) {
              const noteTime = time + i * 0.28;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(800, noteTime);
              osc.frequency.setValueAtTime(600, noteTime + 0.1);
              gainNode.gain.setValueAtTime(0.35, noteTime);
              gainNode.gain.setValueAtTime(0.35, noteTime + 0.1);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.25);
            }
            break;
          }

          case 'critical_breach':
          case 'critical-warning': {
            const duration = 0.5;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.linearRampToValueAtTime(1100, time + duration * 0.5);
            osc.frequency.linearRampToValueAtTime(600, time + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, time);

            gainNode.gain.setValueAtTime(0.3, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc.start(time);
            osc.stop(time + duration);
            break;
          }

          case 'tick': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2200, time);
            gainNode.gain.setValueAtTime(0.1, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.02);
            break;
          }

          case 'ping': {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1900, time);
            osc.frequency.exponentialRampToValueAtTime(1800, time + 0.8);
            gainNode.gain.setValueAtTime(0.35, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + 0.85);
            break;
          }

          case 'shutdown': {
            const duration = 0.6;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, time);
            filter.frequency.exponentialRampToValueAtTime(80, time + duration);

            gainNode.gain.setValueAtTime(0.45, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(masterGain);

            osc.start(time);
            osc.stop(time + duration);
            break;
          }

          case 'data_decode':
          case 'data-decode': {
            const freqs = [1700, 1100, 2400, 1400, 2600, 1900];
            freqs.forEach((freq, index) => {
              const noteTime = time + index * 0.05;
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, noteTime);
              osc.frequency.exponentialRampToValueAtTime(freq - 300, noteTime + 0.04);
              gainNode.gain.setValueAtTime(0.12, noteTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.04);
              osc.connect(gainNode);
              gainNode.connect(masterGain);
              osc.start(noteTime);
              osc.stop(noteTime + 0.05);
            });
            break;
          }

          case 'data-lock': {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            const gain2 = ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(1000, time);
            gain1.gain.setValueAtTime(0.35, time);
            gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

            const time2 = time + 0.07;
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(400, time2);
            gain2.gain.setValueAtTime(0.45, time2);
            gain2.gain.exponentialRampToValueAtTime(0.001, time2 + 0.06);

            osc1.connect(gain1);
            gain1.connect(masterGain);
            osc2.connect(gain2);
            gain2.connect(masterGain);

            osc1.start(time);
            osc1.stop(time + 0.04);
            osc2.start(time2);
            osc2.stop(time2 + 0.07);
            break;
          }

          case 'access_handshake': {
            const duration = 0.2;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.exponentialRampToValueAtTime(1800, time + duration);
            gainNode.gain.setValueAtTime(0.15, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
            osc.connect(gainNode);
            gainNode.connect(masterGain);
            osc.start(time);
            osc.stop(time + duration + 0.05);
            break;
          }

          default:
            break;
        }
      }
    } catch (e) {
      console.warn('[AudioEngine] Synthesis playback failed:', e);
    }
  },

  playClickFeedback() {
    if (Date.now() - lastPlayTime < 50) return;
    this.play('ui-click');
  }
};

