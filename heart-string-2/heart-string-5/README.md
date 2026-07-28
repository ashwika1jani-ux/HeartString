# Heart String

Play chords with either hand. Both shape fingers the same way — the left
hand plays at the normal pitch, the right hand plays the same shapes one
octave higher. Use one hand alone, or both together. No mic needed — just
your camera.

- Shape your fingers to pick a chord, on either hand. 1 finger = the 1st
  chord, 2 = the 2nd, up through 5 fingers = the 5th. A shaka (thumb + pinky
  out) plays the 6th. Thumb + index + pinky out plays the 7th.
- Tilt your **left** hand to the left to force whichever chord it's
  currently shaping into its minor version — straighten back up and it
  returns to normal. The key itself never changes from this, only that
  chord's quality. (The right hand doesn't tilt — it always plays its
  plain diatonic chord, an octave up.)
- Pick the key from the dropdown at the top.

Everything runs in the browser — camera video never leaves your device.

## Files

- `index.html` / `style.css` — the page and its look
- `music-theory.js` — works out which chord belongs to which finger shape and key
- `hands.js` — reads finger shapes on both hands and left-hand tilt, from the camera (via MediaPipe)
- `audio-engine.js` — the synth: two independent held pads, one per hand, an octave apart (via Tone.js)
- `visualizer.js` — the starfield and the two glowing hand skeletons
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
- Camera mirroring behaves differently across browsers and devices, so two
  things might need a nudge once you're actually testing: tap **Flip
  hands** near the top if your left/right hand comes out backwards, and
  tap **Mirror shape** if a hand's drawn shape looks reversed (like the
  thumb ending up on the wrong side). Both work instantly, no reload
  needed — they just reset if you refresh the page.
- Good, even lighting and both hands inside the frame help hand tracking
  a lot.
- The finger-shape recognition and the tilt threshold are tunable constants
  near the top of `hands.js` if anything feels too twitchy or too stiff
  once you've tried it.
