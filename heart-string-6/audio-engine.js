// audio-engine.js
// Two independent held pads: the left hand's chord at the normal octave,
// and the right hand's chord — shaped the same way, with the same finger
// shapes — one octave higher. Either hand can play on its own, or both
// together for a two-hand harmony.

const AudioEngine = (() => {
  let reverb, delay, masterGain;
  let padVoicesLeft = [];  // { osc, gain } — left hand's chord, normal octave
  let padVoicesRight = []; // { osc, gain } — right hand's chord, one octave up

  const PAD_OCTAVE = 3;
  const VOICES_PER_HAND = 4; // root, third, fifth, root+octave
  const SUSTAIN_LEVEL = 0.16;

  const params = {
    rootName: 'C',
    chord: null,        // left hand's current chord, or null if silent
    active: false,
    chordRight: null,   // right hand's current chord, or null if silent
    activeRight: false
  };

  function makePadBank(count) {
    const bank = [];
    for (let i = 0; i < count; i++) {
      const osc = new Tone.FatOscillator({ type: 'sine', count: 3, spread: 12 }).start();
      const gain = new Tone.Gain(0);
      osc.connect(gain);
      gain.connect(reverb);
      bank.push({ osc, gain });
    }
    return bank;
  }

  async function init() {
    await Tone.start();

    reverb = new Tone.Reverb({ decay: 4, wet: 0.35, preDelay: 0.03 });
    await reverb.generate();
    delay = new Tone.FeedbackDelay({ delayTime: 0.28, feedback: 0.25, wet: 0.18 });
    masterGain = new Tone.Gain(0.85);

    reverb.connect(delay);
    delay.connect(masterGain);
    masterGain.toDestination();

    padVoicesLeft = makePadBank(VOICES_PER_HAND);
    padVoicesRight = makePadBank(VOICES_PER_HAND);
  }

  function chordFrequencies(chord, octave) {
    const rootIdx = chord.chordRootIdx;
    const [i0, i1, i2] = chord.intervals;
    return [
      MusicTheory.noteFreq((rootIdx + i0) % 12, octave),
      MusicTheory.noteFreq((rootIdx + i1) % 12, octave),
      MusicTheory.noteFreq((rootIdx + i2) % 12, octave),
      MusicTheory.noteFreq((rootIdx + i0) % 12, octave + 1)
    ];
  }

  function updateBank(bank, chord, active, octave) {
    if (active) {
      const freqs = chordFrequencies(chord, octave);
      for (let i = 0; i < bank.length; i++) {
        bank[i].osc.frequency.rampTo(freqs[i], 0.12);
        bank[i].gain.gain.rampTo(SUSTAIN_LEVEL, 0.15);
      }
    } else {
      bank.forEach(v => v.gain.gain.rampTo(0, 0.25));
    }
  }

  // Called once per animation frame with the latest gesture state and the
  // currently selected key root (from the dropdown).
  function update(handState, rootName) {
    params.rootName = rootName;

    params.active = handState.degreeIndex !== null && !!handState.screenLeft;
    params.chord = params.active
      ? MusicTheory.getChord(rootName, handState.degreeIndex, handState.tiltLeft)
      : null;

    params.activeRight = handState.degreeIndexRight !== null && !!handState.screenRight;
    params.chordRight = params.activeRight
      ? MusicTheory.getChord(rootName, handState.degreeIndexRight, handState.tiltRight)
      : null;

    updateBank(padVoicesLeft, params.chord, params.active, PAD_OCTAVE);
    updateBank(padVoicesRight, params.chordRight, params.activeRight, PAD_OCTAVE + 1);
  }

  return { init, update, params };
})();
