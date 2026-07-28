// music-theory.js
// Small, self-contained music theory helper. The root note and scale
// degree always come from the MAJOR scale of whichever key is selected —
// the key itself never changes. Tilting a hand left doesn't switch keys;
// it flips whichever single chord is currently shaped to the opposite of
// its normal diatonic quality — major becomes minor, minor (or
// diminished) becomes major — and reverts the moment the hand goes back
// to straight.

const MusicTheory = (() => {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ROMAN_BASE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  const MAJOR_STEPS   = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR_QUALITY = ['Major', 'minor', 'minor', 'Major', 'Major', 'minor', 'diminished'];

  const TRIAD_INTERVALS = {
    Major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6]
  };

  function rootIndexFromName(name) {
    return NOTE_NAMES.indexOf(name);
  }

  function romanFor(degreeIndex, quality) {
    const base = ROMAN_BASE[degreeIndex];
    if (quality === 'Major') return base;
    if (quality === 'minor') return base.toLowerCase();
    return base.toLowerCase() + '°'; // diminished
  }

  // degreeIndex is 0-based (0 = 1st degree, 6 = 7th degree).
  // invertQuality: true while the hand is tilted left — flips this one
  // chord to the opposite of its normal diatonic quality (major <-> minor;
  // diminished flips to major, since it's neither).
  function getChord(rootName, degreeIndex, invertQuality) {
    const rootIdx = rootIndexFromName(rootName);
    const chordRootIdx = (rootIdx + MAJOR_STEPS[degreeIndex] + 12) % 12;
    const baseQuality = MAJOR_QUALITY[degreeIndex];
    const quality = invertQuality
      ? (baseQuality === 'Major' ? 'minor' : 'Major')
      : baseQuality;
    const roman = romanFor(degreeIndex, quality);

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
