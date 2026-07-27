// audio-engine.js
// A held pad plays whatever chord the right hand is currently shaping.
// When the left hand strums, the same chord's notes are plucked in quick
// succession instead — like running a hand across strings.

const AudioEngine = (() => {
  let reverb, delay, masterGain;
  let padVoices = [];  // { osc, gain }
  let pluck, pluckGain; // reusable pluck synth for strums, and its own gain so strum intensity can control loudness

  const PAD_OCTAVE = 3;
  const MAX_PAD_VOICES = 4; // root, third, fifth, root+octave

  const params = {
    rootName: 'C',
    degreeIndex: 0,
    mode: 'major',
    chord: null,       // current MusicTheory.getChord(...) result, or null if silent
    active: false,
    lastStrum: null    // { direction, intensity, at } — read once by the visualizer, then cleared there
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

    pluck = new Tone.PluckSynth({ attackNoise: 1, dampening: 3500, resonance: 0.85 });
    pluckGain = new Tone.Gain(0.8);
    pluck.connect(pluckGain);
    pluckGain.connect(reverb);
  }

  function chordFrequencies(chord) {
    const rootIdx = chord.chordRootIdx;
    const [i0, i1, i2] = chord.intervals;
    const freqs = [
      MusicTheory.noteFreq((rootIdx + i0) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i1) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i2) % 12, PAD_OCTAVE),
      MusicTheory.noteFreq((rootIdx + i0) % 12, PAD_OCTAVE + 1)
    ];
    return freqs;
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
        padVoices[i].gain.gain.rampTo(0.16, 0.15);
      }
    } else {
      padVoices.forEach(v => v.gain.gain.rampTo(0, 0.25));
    }

    // --- strum: pluck through the same chord ---
    if (handState.strum && params.active) {
      const freqs = chordFrequencies(params.chord).slice(0, 3); // root, third, fifth
      const order = handState.strum.direction === 'down' ? freqs : [...freqs].reverse();
      const velocity = 0.5 + handState.strum.intensity * 0.5;
      pluckGain.gain.rampTo(velocity, 0.01);
      const now = Tone.now();
      order.forEach((f, i) => {
        pluck.triggerAttack(f, now + i * 0.035);
      });
      params.lastStrum = handState.strum;
    }
  }

  return { init, update, params };
})();
