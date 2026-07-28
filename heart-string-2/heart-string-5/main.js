// main.js
window.addEventListener('DOMContentLoaded', () => {
  const introOverlay = document.getElementById('intro');
  const beginBtn = document.getElementById('begin-btn');
  const keySelect = document.getElementById('key-select');
  const chordReadout = document.getElementById('chord-readout');
  const chordRoman = document.getElementById('chord-roman');
  const chordLetter = document.getElementById('chord-letter');
  const chordReadoutRight = document.getElementById('chord-readout-right');
  const chordRomanRight = document.getElementById('chord-roman-right');
  const chordLetterRight = document.getElementById('chord-letter-right');
  const flipBtn = document.getElementById('flip-btn');
  const shapeFlipBtn = document.getElementById('shape-flip-btn');

  const canvas = document.getElementById('aura-canvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('webcam');

  let started = false;
  let startTime = null;

  async function begin() {
    if (started) return;
    started = true;

    introOverlay.classList.add('gone');

    // Ask for the camera immediately, as the very first thing after the
    // click, before any slower setup (loading the hand-tracking model,
    // generating reverb, etc). Some browsers will silently refuse to
    // prompt at all if too much time passes between the click and the
    // permission request, since it stops looking tied to a real user
    // action. No microphone is needed at all this time around.
    let permissionStream;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      console.error(err);
      started = false;
      introOverlay.classList.remove('gone');
      alert('Heart String needs camera access to see your hands. Please allow it, then try again.');
      return;
    }
    permissionStream.getTracks().forEach(t => t.stop());

    chordReadout.classList.remove('hidden');
    chordReadoutRight.classList.remove('hidden');

    try {
      await AudioEngine.init();
    } catch (err) {
      console.error(err);
      alert('Something went wrong setting up audio. Please reload and try again.');
      return;
    }

    try {
      await HandTracker.init(video);
    } catch (err) {
      console.error(err);
      alert('Something went wrong setting up the camera. Please reload and try again.');
      return;
    }

    startTime = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    const t = (now - startTime) / 1000;
    const rootName = keySelect.value;

    AudioEngine.update(HandTracker.state, rootName);

    Visualizer.draw(ctx, canvas, t, HandTracker.state, AudioEngine.params);

    if (AudioEngine.params.active && AudioEngine.params.chord) {
      chordRoman.textContent = AudioEngine.params.chord.roman;
      chordLetter.textContent = AudioEngine.params.chord.label;
    } else {
      chordRoman.textContent = '—';
      chordLetter.textContent = '';
    }

    if (AudioEngine.params.activeRight && AudioEngine.params.chordRight) {
      chordRomanRight.textContent = AudioEngine.params.chordRight.roman;
      chordLetterRight.textContent = AudioEngine.params.chordRight.label;
    } else {
      chordRomanRight.textContent = '—';
      chordLetterRight.textContent = '';
    }

    requestAnimationFrame(loop);
  }

  beginBtn.addEventListener('click', begin);

  flipBtn.addEventListener('click', () => {
    const flipped = HandTracker.toggleMirrorFlip();
    flipBtn.classList.toggle('active', flipped);
  });

  shapeFlipBtn.addEventListener('click', () => {
    const flipped = Visualizer.toggleShapeFlip();
    shapeFlipBtn.classList.toggle('active', flipped);
  });
});
