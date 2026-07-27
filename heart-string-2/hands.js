// hands.js
// Wraps MediaPipe Hands. There's no video shown on screen in this app —
// only the abstract skeleton drawing — so "screenLeft"/"screenRight" are
// assigned to match the player's own physical left/right hand, based on
// raw camera position.
//
// screenLeft hand: shapes fingers into a chord degree (1-7) and can tilt
// to force that chord minor.
// screenRight hand: raising it above chest height keeps the chord pulsing;
// lowering it stops the pulse.

const HandTracker = (() => {
  let hands = null;
  let camera = null;
  let videoEl = null;

  const state = {
    screenLeft: null,
    screenRight: null,
    degreeIndex: null,   // 0-6, or null if no recognizable shape
    mode: 'major',       // 'major' | 'minor', driven by tilt
    raised: false,       // true while the right hand is held up
    ready: false
  };

  const RAISE_THRESHOLD_Y = 0.5; // normalized — hand above the vertical middle of frame counts as "raised"

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

  // Positive return = tilted toward the player's actual left.
  function tiltAngle(landmarks) {
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    // Smaller raw x is the player's left (matching the same convention used
    // to assign screenLeft/screenRight above), so leaning toward smaller x
    // is a leftward tilt.
    return Math.atan2(-dx, -dy);
  }

  function processResults(results) {
    state.screenLeft = null;
    state.screenRight = null;
    state.degreeIndex = null;
    state.raised = false;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const found = results.multiHandLandmarks.map((landmarks) => {
      const wrist = landmarks[0];
      return { landmarks, x: wrist.x, y: wrist.y };
    });
    found.sort((a, b) => a.x - b.x);

    if (found.length === 1) {
      if (found[0].x < 0.5) state.screenLeft = found[0];
      else state.screenRight = found[0];
    } else {
      state.screenLeft = found[0];
      state.screenRight = found[found.length - 1];
    }

    // --- left hand: chord shape + tilt ---
    if (state.screenLeft) {
      const fingers = fingerStates(state.screenLeft.landmarks);
      state.degreeIndex = shapeToDegree(fingers);
      const angle = tiltAngle(state.screenLeft.landmarks);
      state.mode = angle > TILT_THRESHOLD_RAD ? 'minor' : 'major';
    }

    // --- right hand: raised keeps the chord pulsing ---
    if (state.screenRight) {
      state.raised = state.screenRight.y < RAISE_THRESHOLD_Y;
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
