// audio-engine.js
// A held pad plays whatever chord the left hand is currently shaping.
// Raising the right hand keeps that pad gated on and off rhythmically —
// a quick chop down and back up, repeated on a steady beat — so it sounds
// like "DO DO DO DO" for as long as the hand stays up, and settles back
// into one continuous "DOOOOO" the moment it's lowered.

const AudioEngine = (() => {
  let reverb, delay, masterGain;
  let padVoices = [];  // { osc, gain }

  const PAD_OCTAVE = 3;
  const MAX_PAD_VOICES = 4; // root, third, fifth, root+octave
  const SUSTAIN_LEVEL = 0.16;
  const CHOP_FLOOR = 0.015;   // how far the gate dips on each chop, near-silent but not a hard cut
  const CHOP_INTERVAL = 0.22; // seconds between chops while the hand is raised (~4.5 pulses/sec)
  const CHOP_DOWN_TIME = 0.03;
  const CHOP_UP_TIME = 0.09;

  let lastChopAt = 0; // Tone's audio-clock time of the last chop

  const params = {
    rootName: 'C',
    degreeIndex: 0,
    mode: 'major',
    chord: null,       // current MusicTheory.getChord(...) result, or null if silent
    active: false,
    lastChopAt: 0      // updated whenever a chop fires — the visualizer watches this to trigger its burst
  };

  async function init() {
    await Tone.start();

    reverb = new Tone.Reverb({ decay: 4, wet: 0.35, preDelay: 0.03 });
    await reverb.generate();
    delay = new Tone.FeedbackDelay({ delayTime: 0.28, feedback: 0.25, wet: 0.18 });
    masterGain = new Tone.Gain(0.85);

    reverb.connect(delay);
    delay.connect(masterGain);
    masterGain.toDestination();

    for (let i = 0; i < MAX_PAD_VOICES; i++) {
      const osc = new Tone.FatOscillator({ type: 'sine', count: 3, spread: 12 }).start();
      const gain = new Tone.Gain(0);
      osc.connect(gain);
      gain.connect(reverb);
      padVoices.push({ osc, gain, targetFreq: 220 });
    }
  }

  function chordFrequencies(chord) {
    const rootIdx = chord.chordRootIdx;
    const [i0, i1, i2] = chord.intervals;
    return [
      MusicTheory.noteFreq((rootIdx + i0) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i1) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i2) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i0) % 12, PAD_OCTAVE + 1)
    ];
  }

  function chop(now) {
    padVoices.forEach(v => {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(SUSTAIN_LEVEL, now);
      v.gain.gain.linearRampToValueAtTime(CHOP_FLOOR, now + CHOP_DOWN_TIME);
      v.gain.gain.linearRampToValueAtTime(SUSTAIN_LEVEL, now + CHOP_DOWN_TIME + CHOP_UP_TIME);
    });
  }

  // Called once per animation frame with the latest gesture state and the
  // currently selected key root (from the dropdown).
  function update(handState, rootName) {
    params.rootName = rootName;
    params.mode = handState.mode;

    const hasShape = handState.degreeIndex !== null && handState.screenLeft;
    if (hasShape) {
      params.degreeIndex = handState.degreeIndex;
      params.chord = MusicTheory.getChord(rootName, handState.degreeIndex, handState.mode === 'minor');
      params.active = true;
    } else {
      params.active = false;
    }

    // --- pad: hold the current chord ---
    if (params.active) {
      const freqs = chordFrequencies(params.chord);
      for (let i = 0; i < MAX_PAD_VOICES; i++) {
        padVoices[i].osc.frequency.rampTo(freqs[i], 0.12);
        padVoices[i].gain.gain.rampTo(SUSTAIN_LEVEL, 0.15);
      }
    } else {
      padVoices.forEach(v => v.gain.gain.rampTo(0, 0.25));
    }

    // --- pulse: while the right hand is raised, chop the held chord on a steady beat ---
    if (params.active && handState.raised) {
      const now = Tone.now();
      if (now - lastChopAt >= CHOP_INTERVAL) {
        chop(now);
        lastChopAt = now;
        params.lastChopAt = performance.now();
      }
    }
  }

  return { init, update, params };
})();
