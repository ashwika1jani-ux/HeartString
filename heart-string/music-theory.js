// music-theory.js
// Small, self-contained music theory helper. The root note and scale
// degree always come from the MAJOR scale of whichever key is selected —
// the key itself never changes. Tilting the hand left doesn't switch keys;
// it just forces whichever single chord is currently shaped to sound
// minor instead of its normal diatonic quality, and reverts the moment the
// hand goes back to straight.

const MusicTheory = (() => {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const MAJOR_STEPS   = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR_QUALITY = ['Major', 'minor', 'minor', 'Major', 'Major', 'minor', 'diminished'];
  const MAJOR_ROMAN   = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const FORCED_MINOR_ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']; // tilt overrides quality, so no diminished symbol

  const TRIAD_INTERVALS = {
    Major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6]
  };

  function rootIndexFromName(name) {
    return NOTE_NAMES.indexOf(name);
  }

  // degreeIndex is 0-based (0 = 1st degree, 6 = 7th degree).
  // forceMinor: true while the hand is tilted left — overrides this one
  // chord's quality to minor regardless of what it would normally be.
  function getChord(rootName, degreeIndex, forceMinor) {
    const rootIdx = rootIndexFromName(rootName);
    const chordRootIdx = (rootIdx + MAJOR_STEPS[degreeIndex] + 12) % 12;

    const quality = forceMinor ? 'minor' : MAJOR_QUALITY[degreeIndex];
    const roman = forceMinor ? FORCED_MINOR_ROMAN[degreeIndex] : MAJOR_ROMAN[degreeIndex];

    return {
      chordRootIdx,
      chordRootName: NOTE_NAMES[chordRootIdx],
      quality,
      roman,
      intervals: TRIAD_INTERVALS[quality],
      label: `${NOTE_NAMES[chordRootIdx]} ${quality}`
    };
  }

  // noteIndex 0-11 (C..B), octave as in scientific pitch notation (A4 = 440)
  function noteFreq(noteIndex, octave) {
    const midi = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  return { NOTE_NAMES, getChord, noteFreq };
})();
