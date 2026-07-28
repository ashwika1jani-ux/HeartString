// visualizer.js
// Draws the nebula starfield and two gradient "vein" hand skeletons — one
// for each hand's chord, positioned symmetrically left and right of center
// at the same size.

const Visualizer = (() => {
  let stars = [];
  let shapeFlip = true; // toggled from the UI — mirrors the drawn hand shape left/right

  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
  ];

  function resizeCanvasToDisplaySize(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function ensureStars(w, h) {
    if (stars.length) return;
    const count = Math.floor((w * h) / 9000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.3
      });
    }
  }

  function drawBackground(ctx, w, h, t) {
    const grad = ctx.createRadialGradient(w/2, h*0.4, 0, w/2, h*0.4, Math.max(w,h)*0.75);
    grad.addColorStop(0, '#201232');
    grad.addColorStop(0.55, '#0c0616');
    grad.addColorStop(1, '#050208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ensureStars(w, h);
    stars.forEach(s => {
      const twinkle = 0.35 + 0.35 * Math.sin(t * s.speed + s.phase);
      ctx.fillStyle = `rgba(237,231,250,${Math.max(0, twinkle)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function veinGradient(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#ff5fae');
    g.addColorStop(1, '#4fe3ff');
    return g;
  }

  // Recenters a hand's landmarks around an anchor point on canvas, at a
  // given scale, regardless of where the real hand is in the camera frame —
  // this keeps the instrument feeling like a stylized, consistent presence
  // rather than literally mirroring camera distance/position. The x-axis
  // flip is toggleable (see shapeFlip) since whether the raw camera feed
  // needs mirroring to look like a normal hand varies by browser/device.
  function projectHand(hand, anchorX, anchorY, scale) {
    const wrist = hand.landmarks[0];
    const xSign = shapeFlip ? -1 : 1;
    return hand.landmarks.map(p => ({
      x: anchorX + xSign * (p.x - wrist.x) * scale,
      y: anchorY + (p.y - wrist.y) * scale
    }));
  }

  function drawHandSkeleton(ctx, pts, boneWidth, jointGlow) {
    ctx.save();
    ctx.lineCap = 'round';
    HAND_CONNECTIONS.forEach(([a, b]) => {
      ctx.strokeStyle = veinGradient(ctx, pts[a].x, pts[a].y, pts[b].x, pts[b].y);
      ctx.lineWidth = boneWidth;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    pts.forEach((p, i) => {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = isTip ? '#d17bff' : '#8fd8ff';
      ctx.shadowBlur = isTip ? jointGlow * 1.4 : jointGlow * 0.7;
      ctx.arc(p.x, p.y, isTip ? boneWidth * 1.8 : boneWidth * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw(ctx, canvas, t, handState, audioParams) {
    resizeCanvasToDisplaySize(canvas);
    const w = canvas.width, h = canvas.height;

    drawBackground(ctx, w, h, t);

    const cy = h * 0.46;
    const handScale = Math.min(w, h) * 0.42;

    // left hand — the chord shape
    if (handState.screenLeft) {
      const anchorX = w * 0.32;
      const pts = projectHand(handState.screenLeft, anchorX, cy, handScale);
      drawHandSkeleton(ctx, pts, Math.max(2, w * 0.0024), 9);
    }

    // right hand — the same chord shapes, an octave up
    if (handState.screenRight) {
      const anchorX = w * 0.68;
      const pts = projectHand(handState.screenRight, anchorX, cy, handScale);
      drawHandSkeleton(ctx, pts, Math.max(2, w * 0.0024), 9);
    }
  }

  function toggleShapeFlip() {
    shapeFlip = !shapeFlip;
    return shapeFlip;
  }

  return { draw, toggleShapeFlip };
})();
