// hands.js
// Wraps MediaPipe Hands. There's no video shown on screen in this app —
// only the abstract skeleton drawing — so "screenLeft"/"screenRight" are
// assigned to match the player's own physical left/right hand, based on
// raw camera position.
//
// Both hands shape fingers into a chord degree (1-7) the same way. The
// left hand's chord plays at the normal octave and can tilt to force it
// minor; the right hand's chord plays independently, one octave higher.

const HandTracker = (() => {
  let hands = null;
  let camera = null;
  let videoEl = null;
  let mirrorFlip = false; // toggled from the UI if left/right ever comes out backwards

  const state = {
    screenLeft: null,
    screenRight: null,
    degreeIndex: null,      // 0-6, or null if no recognizable shape — left hand
    mode: 'major',          // 'major' | 'minor', driven by left-hand tilt
    degreeIndexRight: null, // 0-6, or null if no recognizable shape — right hand
    ready: false
  };

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
    state.degreeIndexRight = null;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const found = results.multiHandLandmarks.map((landmarks) => {
      const wrist = landmarks[0];
      return { landmarks, x: wrist.x, y: wrist.y };
    });
    found.sort((a, b) => a.x - b.x);

    let leftFound, rightFound;
    if (found.length === 1) {
      if (found[0].x < 0.5) { leftFound = found[0]; } else { rightFound = found[0]; }
    } else {
      leftFound = found[0];
      rightFound = found[found.length - 1];
    }
    if (mirrorFlip) { [leftFound, rightFound] = [rightFound, leftFound]; }
    state.screenLeft = leftFound || null;
    state.screenRight = rightFound || null;

    // --- left hand: chord shape + tilt ---
    if (state.screenLeft) {
      const fingers = fingerStates(state.screenLeft.landmarks);
      state.degreeIndex = shapeToDegree(fingers);
      const angle = tiltAngle(state.screenLeft.landmarks);
      state.mode = angle > TILT_THRESHOLD_RAD ? 'minor' : 'major';
    }

    // --- right hand: same chord shapes, played an octave up ---
    if (state.screenRight) {
      const fingers = fingerStates(state.screenRight.landmarks);
      state.degreeIndexRight = shapeToDegree(fingers);
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

  function toggleMirrorFlip() {
    mirrorFlip = !mirrorFlip;
    return mirrorFlip;
  }

  return { init, state, toggleMirrorFlip };
})();
