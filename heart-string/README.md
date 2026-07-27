# Heart String

Play chords with your left hand, strum them with your right — like fretting
and strumming a guitar. No mic needed — just your camera.

- **Left hand**: shape your fingers to pick a chord. 1 finger = the 1st
  chord, 2 = the 2nd, up through 5 fingers = the 5th. A shaka (thumb + pinky
  out) plays the 6th. Thumb + index + pinky out plays the 7th.
- Tilt that hand to the left to force whichever chord you're currently
  shaping into its minor version — straighten back up and it returns to
  normal. The key itself never changes from this, only that one chord's
  quality.
- **Right hand**: move it up or down to strum the current chord.
- Pick the key from the dropdown at the top.

Everything runs in the browser — camera video never leaves your device.

## Files

- `index.html` / `style.css` — the page and its look
- `music-theory.js` — works out which chord belongs to which finger shape and key
- `hands.js` — reads finger shapes, hand tilt, and strum motion from the camera (via MediaPipe)
- `audio-engine.js` — the synth: a held pad for the chord, plus a plucked strum (via Tone.js)
- `visualizer.js` — the starfield, the glowing hand skeletons, and the wave rings
- `main.js` — wires it all together and handles camera permission

No build step, no server — plain static site.

## Deploying to Vercel for free

**GitHub + Vercel (recommended)**

1. On your existing `vocal-aura` GitHub repo (or a fresh one — up to you),
   upload these files **directly at the repository root**, not inside any
   subfolder. If you're not sure it landed at the root, click into the repo
   on github.com right after uploading and confirm you see `index.html`
   sitting right there in the top-level file list — not one click away.
2. On [vercel.com](https://vercel.com), either create a new project from
   this repo, or if you're reusing the old one, go to the project's
   **Settings → General → Root Directory** and make sure it points at
   wherever these files actually are (blank/`./` if they're at the repo
   root).
3. Framework Preset: **Other**. Leave Build Command / Output Directory blank.
4. Deploy. You'll get a live `.vercel.app` link in about a minute.

## Notes

- Only camera permission is needed this time — no microphone — which
  should make the permission prompt noticeably more reliable than before.
- Good, even lighting and both hands inside the frame help hand tracking
  a lot.
- The finger-shape recognition, the tilt threshold, and the strum
  sensitivity are all tunable constants near the top of `hands.js` if
  anything feels too twitchy or too stiff once you've tried it.
