import type { SoundCue } from './world-game';

/**
 * Procedural Web Audio for the /world game. Everything is synthesized at
 * runtime, so no third-party recordings are downloaded or redistributed.
 */
export type WorldAudioState = {
  dt: number;
  /** Horizontal speed in world units per second. */
  speed: number;
  rain: number;
  danger: number;
  nearLamp: number;
  ringing: number;
  blackout: boolean;
  dawn: boolean;
  paused: boolean;
};

export type WorldAudio = {
  resume(): void;
  setVolume(volume: number): void;
  update(state: WorldAudioState): void;
  cue(name: SoundCue): void;
  dispose(): void;
};

type AudioContextConstructor = typeof AudioContext;

export function createWorldAudio(): WorldAudio | null {
  if (typeof window === 'undefined') return null;
  const Context: AudioContextConstructor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!Context) return null;
  let ctx: AudioContext;
  try {
    ctx = new Context();
  } catch {
    return null;
  }
  const master = ctx.createGain();
  master.gain.value = 0;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.ratio.value = 4;
  master.connect(compressor).connect(ctx.destination);
  let volume = 0.7;
  let disposed = false;

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  {
    const data = noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = white * 0.6 + brown * 2.4;
    }
  }
  const loopNoise = () => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.start();
    return source;
  };
  const gain = (value: number) => {
    const node = ctx.createGain();
    node.gain.value = value;
    return node;
  };
  const filter = (type: BiquadFilterType, frequency: number, q = 0.7) => {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  };
  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = rate;
    const amount = gain(depth);
    osc.connect(amount).connect(target);
    osc.start();
    return osc;
  };

  // Low drone: two detuned saws and a sine fifth under a breathing low-pass.
  const droneGain = gain(0.05);
  const droneFilter = filter('lowpass', 190, 5);
  droneFilter.connect(droneGain).connect(master);
  const droneOscillators = [55, 55.35, 82.4].map((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 2 ? 'sine' : 'sawtooth';
    osc.frequency.value = frequency;
    osc.connect(droneFilter);
    osc.start();
    return osc;
  });
  lfo(0.045, 70, droneFilter.frequency);

  // Dawn pad replaces the drone after the ending.
  const padGain = gain(0);
  const padFilter = filter('lowpass', 1400, 0.5);
  padFilter.connect(padGain).connect(master);
  [220, 277.2, 329.6, 440].forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = Math.random() * 8 - 4;
    osc.connect(padFilter);
    osc.start();
  });

  const windGain = gain(0.035);
  const windFilter = filter('bandpass', 420, 0.8);
  loopNoise().connect(windFilter).connect(windGain).connect(master);
  lfo(0.07, 220, windFilter.frequency);
  lfo(0.11, 0.015, windGain.gain);

  const rainGain = gain(0);
  loopNoise()
    .connect(filter('highpass', 1300, 0.5))
    .connect(filter('lowpass', 7000, 0.4))
    .connect(rainGain)
    .connect(master);

  const humGain = gain(0);
  const hum = ctx.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 60;
  hum.connect(filter('bandpass', 180, 3)).connect(humGain).connect(master);
  hum.start();

  const staticGain = gain(0);
  const staticFilter = filter('bandpass', 2600, 6);
  loopNoise().connect(staticFilter).connect(staticGain).connect(master);
  lfo(5.5, 900, staticFilter.frequency);

  const ringGain = gain(0);
  const ringGate = gain(0);
  [440, 480].forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;
    osc.connect(ringGate);
    osc.start();
  });
  ringGate.connect(filter('bandpass', 900, 0.8)).connect(ringGain).connect(master);

  const envelope = (
    param: AudioParam,
    start: number,
    peak: number,
    attack: number,
    decay: number
  ) => {
    param.cancelScheduledValues(start);
    param.setValueAtTime(0.0001, start);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    param.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  };
  const tone = (
    frequency: number,
    when: number,
    peak: number,
    decay: number,
    type: OscillatorType = 'sine',
    destination: AudioNode = master,
    endFrequency?: number
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    if (endFrequency)
      osc.frequency.exponentialRampToValueAtTime(endFrequency, when + decay);
    const amp = gain(0);
    osc.connect(amp).connect(destination);
    envelope(amp.gain, when, peak, 0.01, decay);
    osc.start(when);
    osc.stop(when + decay + 0.05);
  };
  const burst = (
    when: number,
    peak: number,
    decay: number,
    type: BiquadFilterType,
    frequency: number,
    q = 0.8,
    rate = 1
  ) => {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = rate;
    const amp = gain(0);
    source.connect(filter(type, frequency, q)).connect(amp).connect(master);
    envelope(amp.gain, when, peak, 0.005, decay);
    source.start(when, Math.random() * 1.5);
    source.stop(when + decay + 0.05);
  };
  const echo = gain(1);
  {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.29;
    const feedback = gain(0.38);
    echo.connect(master);
    echo.connect(delay).connect(feedback).connect(delay);
    delay.connect(filter('lowpass', 2400)).connect(master);
  }

  let stepDistance = 0;
  let stepSide = 0;
  let heartbeat = 0;
  let ringClock = 0;

  const set = (param: AudioParam, value: number, time = 0.25) =>
    param.setTargetAtTime(value, ctx.currentTime, time);

  return {
    resume() {
      if (disposed) return;
      void ctx.resume?.();
      set(master.gain, volume * 0.9, 0.4);
    },
    setVolume(next) {
      volume = Math.max(0, Math.min(1, next));
      if (!disposed && ctx.state === 'running') set(master.gain, volume * 0.9, 0.1);
    },
    update(state) {
      if (disposed || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const quiet = state.paused ? 0.35 : 1;
      set(droneGain.gain, (state.dawn ? 0.012 : state.blackout ? 0.075 : 0.05) * quiet, 1.2);
      set(padGain.gain, state.dawn ? 0.018 * quiet : 0, 2);
      set(rainGain.gain, state.rain * 0.09 * quiet, 1.5);
      set(humGain.gain, state.blackout ? 0 : state.nearLamp * 0.014 * quiet, 0.3);
      set(staticGain.gain, state.danger * state.danger * 0.06 * quiet, 0.3);
      droneOscillators[2].frequency.setTargetAtTime(state.danger > 0.3 ? 77.8 : 82.4, now, 0.8);

      ringClock += state.dt;
      const ringOn = state.ringing > 0 && ringClock % 3 < 1.2 && Math.floor((ringClock % 3) * 20) % 2 === 0;
      set(ringGate.gain, ringOn ? 1 : 0, 0.005);
      set(ringGain.gain, state.ringing * 0.06 * quiet, 0.1);

      if (!state.paused && state.speed > 0.2) {
        stepDistance += state.speed * state.dt;
        const stride = state.speed > 2.6 ? 0.62 : 0.5;
        if (stepDistance > stride) {
          stepDistance = 0;
          stepSide = 1 - stepSide;
          const wet = state.rain > 0.2;
          burst(now, 0.22, 0.07, 'lowpass', wet ? 1500 : 900 + stepSide * 120, 0.9, 0.8 + Math.random() * 0.3);
          if (wet) burst(now + 0.01, 0.06, 0.09, 'highpass', 3500, 0.7);
        }
      }
      if (!state.paused && state.danger > 0.12) {
        heartbeat -= state.dt;
        if (heartbeat <= 0) {
          heartbeat = 1.15 - state.danger * 0.6;
          tone(58, now, 0.5 * state.danger + 0.1, 0.16, 'sine', master, 40);
          tone(52, now + 0.2, 0.35 * state.danger + 0.06, 0.18, 'sine', master, 38);
        }
      }
    },
    cue(name) {
      if (disposed || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      switch (name) {
        case 'bark':
          tone(155, now, 0.12, 0.13, 'sawtooth', master, 90);
          burst(now, 0.16, 0.12, 'bandpass', 650, 1.8);
          tone(125, now + 0.18, 0.07, 0.12, 'triangle', master, 80);
          break;
        case 'growl':
          tone(66, now, 0.1, 0.7, 'sawtooth', master, 49);
          burst(now, 0.12, 0.6, 'lowpass', 290, 1.1);
          break;
        case 'pickup':
          tone(660, now, 0.12, 0.18, 'triangle');
          tone(990, now + 0.08, 0.1, 0.3, 'triangle');
          break;
        case 'fragment':
          [880, 1318.5, 1760, 2637].forEach((frequency, index) =>
            tone(frequency, now + index * 0.07, 0.07, 0.9, 'sine', echo)
          );
          burst(now, 0.05, 1.2, 'bandpass', 5000, 4);
          break;
        case 'paper':
          burst(now, 0.12, 0.06, 'bandpass', 3200, 1.5);
          burst(now + 0.09, 0.08, 0.08, 'bandpass', 2600, 1.5);
          break;
        case 'battery':
          tone(180, now, 0.12, 0.04, 'square');
          tone(440, now + 0.06, 0.08, 0.2, 'triangle', master, 880);
          break;
        case 'clue':
          tone(220, now, 0.16, 2.2, 'sine', echo);
          tone(331, now + 0.02, 0.1, 2, 'sine', echo);
          tone(441.5, now + 0.04, 0.05, 1.6, 'triangle', echo);
          break;
        case 'blackout':
          tone(140, now, 0.22, 1.4, 'sawtooth', master, 28);
          burst(now, 0.4, 0.25, 'lowpass', 300);
          burst(now + 0.05, 0.2, 0.05, 'highpass', 4000);
          break;
        case 'power':
          tone(30, now, 0.15, 1.2, 'sawtooth', master, 120);
          for (let i = 0; i < 5; i++) burst(now + i * 0.12, 0.08, 0.03, 'highpass', 5000);
          break;
        case 'train': {
          const rumble = ctx.createBufferSource();
          rumble.buffer = noise;
          rumble.loop = true;
          const amp = gain(0);
          rumble.connect(filter('lowpass', 140, 1)).connect(amp).connect(master);
          amp.gain.setValueAtTime(0.0001, now);
          amp.gain.exponentialRampToValueAtTime(0.9, now + 1.2);
          amp.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
          rumble.start(now);
          rumble.stop(now + 4.3);
          for (let i = 0; i < 10; i++)
            burst(now + 0.6 + i * 0.32, 0.18, 0.05, 'bandpass', 1800, 2);
          tone(311, now + 0.3, 0.06, 1.3, 'sawtooth', master);
          tone(370, now + 0.3, 0.05, 1.3, 'sawtooth', master);
          break;
        }
        case 'ring':
          ringClock = 0;
          break;
        case 'hangup':
          tone(120, now, 0.2, 0.06, 'square');
          break;
        case 'door':
          [110, 164.8, 220, 329.6].forEach((frequency, index) =>
            tone(frequency, now + index * 0.25, 0.09, 3.5, 'sine', echo)
          );
          break;
        case 'wake':
          tone(220, now, 0.2, 1.6, 'sawtooth', master, 30);
          burst(now, 0.35, 1.4, 'lowpass', 600);
          break;
        case 'click':
          burst(now, 0.12, 0.02, 'highpass', 2500);
          break;
        case 'empty':
          tone(90, now, 0.12, 0.05, 'square');
          tone(70, now + 0.1, 0.1, 0.06, 'square');
          break;
        case 'ending':
          [
            [261.6, 329.6, 392],
            [220, 277.2, 329.6],
            [293.7, 349.2, 440],
            [261.6, 329.6, 392, 523.3]
          ].forEach((chord, index) =>
            chord.forEach((frequency) =>
              tone(frequency, now + index * 1.6, 0.05, 2.8, 'triangle', echo)
            )
          );
          break;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      void ctx.close?.();
    }
  };
}
