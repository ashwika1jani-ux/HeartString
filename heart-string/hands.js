// hands.js
// Wraps MediaPipe Hands. As before, hands are assigned by their position on
// the mirrored screen ("screenLeft" / "screenRight") rather than trusting
// MediaPipe's own handedness label, since that's simpler to reason about
// once the preview is mirrored for a natural selfie view.
//
// screenLeft hand: shapes fingers into a chord degree (1-7) and can tilt
// to force that chord minor.
// screenRight hand: its up/down movement triggers a strum — mirroring how
// a right-handed guitarist frets with the left hand and strums with the right.

const HandTracker = (() => {
  let hands = null;
  let camera = null;
  let videoEl = null;

  const state = {
    screenLeft: null,
    screenRight: null,
    degreeIndex: null,   // 0-6, or null if no recognizable shape
    mode: 'major',       // 'major' | 'minor', driven by tilt
    strum: null,         // { direction: 'up'|'down', intensity: 0..1, at: timestamp } — cleared after one frame of use
    ready: false
  };

  let prevStrumY = null;
  let lastStrumAt = 0;
  const STRUM_COOLDOWN_MS = 220;
  const STRUM_THRESHOLD = 0.045; // normalized y movement per frame needed to count as a strum

  const TILT_THRESHOLD_RAD = 0.38; // ~22 degrees — a clear, deliberate tilt, not a twitch

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Returns [thumb, index, middle, ring, pinky] extended-or-not
  function fingerStates(landmarks) {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const states = [dist(thumbTip, wrist) > dist(thumbMcp, wrist) * 1.15];

    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    for (let i = 0; i < 4; i++) {
      states.push(landmarks[tips[i]].y < landmarks[pips[i]].y - 0.02);
    }
    return states;
  }

  // Maps a finger shape to a 0-based scale degree (0=I .. 6=vii).
  // Shaka (thumb+pinky only) = degree 6 (the "6th" chord).
  // "I love you" sign (thumb+index+pinky) = degree 7 (the "7th" chord).
  // Otherwise, plain finger count 1-5 maps directly to degrees 1-5.
  function shapeToDegree(states) {
    const [thumb, index, middle, ring, pinky] = states;
    const count = states.filter(Boolean).length;

    if (thumb && pinky && !index && !middle && !ring) return 5; // shaka -> 6th
    if (thumb && index && pinky && !middle && !ring) return 6;  // ILY -> 7th
    if (count >= 1 && count <= 5) return count - 1;
    return null;
  }

  // Positive return = tilted toward the screen-LEFT on the mirrored preview.
  function tiltAngle(landmarks) {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    // Raw camera x is mirrored relative to what the player sees, so a
    // positive raw dx corresponds to an apparent left-ward tilt on screen.
    return Math.atan2(dx, -dy);
  }

  function processResults(results) {
    state.screenLeft = null;
    state.screenRight = null;
    state.degreeIndex = null;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      prevStrumY = null;
      return;
    }

    const found = results.multiHandLandmarks.map((landmarks) => {
      const wrist = landmarks[0];
      return { landmarks, x: wrist.x, y: wrist.y };
    });
    found.sort((a, b) => a.x - b.x);

    if (found.length === 1) {
      if (found[0].x < 0.5) state.screenRight = found[0];
      else state.screenLeft = found[0];
    } else {
      state.screenRight = found[0];
      state.screenLeft = found[found.length - 1];
    }

    // --- left hand: chord shape + tilt ---
    if (state.screenLeft) {
      const fingers = fingerStates(state.screenLeft.landmarks);
      state.degreeIndex = shapeToDegree(fingers);
      const angle = tiltAngle(state.screenLeft.landmarks);
      state.mode = angle > TILT_THRESHOLD_RAD ? 'minor' : 'major';
    }

    // --- right hand: strum via vertical velocity ---
    state.strum = null;
    if (state.screenRight) {
      const y = state.screenRight.y;
      if (prevStrumY !== null) {
        const delta = y - prevStrumY;
        const now = performance.now();
        if (Math.abs(delta) > STRUM_THRESHOLD && (now - lastStrumAt) > STRUM_COOLDOWN_MS) {
          state.strum = {
            direction: delta > 0 ? 'down' : 'up',
            intensity: Math.max(0, Math.min(1, Math.abs(delta) / 0.09)),
            at: now
          };
          lastStrumAt = now;
        }
      }
      prevStrumY = y;
    } else {
      prevStrumY = null;
    }
  }

  async function init(videoElement) {
    videoEl = videoElement;

    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });
    hands.onResults(processResults);

    camera = new Camera(videoEl, {
      onFrame: async () => { await hands.send({ image: videoEl }); },
      width: 640,
      height: 480
    });
    await camera.start();
    state.ready = true;
  }

  return { init, state };
})();
