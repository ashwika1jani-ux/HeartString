// visualizer.js
// Draws the nebula starfield, a big centered "vein" skeleton for the
// chord-shaping hand, a smaller one for the strumming hand, and the wave
// rings: a slow continuous pulse while a chord is held, plus a brighter
// burst every time a strum fires.

const Visualizer = (() => {
  let stars = [];
  let bursts = []; // { start, direction }

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
  // rather than literally mirroring camera distance/position.
  function projectHand(hand, anchorX, anchorY, scale) {
    const wrist = hand.landmarks[0];
    return hand.landmarks.map(p => ({
      x: anchorX + (p.x - wrist.x) * scale,
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

  function drawRing(ctx, cx, cy, radius, alpha, width) {
    ctx.save();
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    grad.addColorStop(0, `rgba(255,95,174,${alpha})`);
    grad.addColorStop(1, `rgba(79,227,255,${alpha})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function registerStrum() {
    bursts.push({ start: performance.now() });
  }

  function draw(ctx, canvas, t, handState, audioParams) {
    resizeCanvasToDisplaySize(canvas);
    const w = canvas.width, h = canvas.height;

    drawBackground(ctx, w, h, t);

    const cx = w / 2, cy = h * 0.46;

    // continuous breathing pulse while a chord is held
    if (audioParams.active) {
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.4);
      for (let i = 0; i < 3; i++) {
        const r = (Math.min(w, h) * 0.24) + i * 26 + breathe * 10;
        drawRing(ctx, cx, cy, r, 0.10 + 0.05 * breathe, 1.4);
      }
    }

    // strum bursts — expanding, fading rings
    const now = performance.now();
    bursts = bursts.filter(b => now - b.start < 700);
    bursts.forEach(b => {
      const age = (now - b.start) / 700; // 0..1
      const r = Math.min(w, h) * (0.2 + age * 0.5);
      drawRing(ctx, cx, cy, r, (1 - age) * 0.5, 2.5);
    });

    // left hand — big, centered, the chord shape
    if (handState.screenLeft) {
      const scale = Math.min(w, h) * 0.55;
      const pts = projectHand(handState.screenLeft, cx, cy, scale);
      drawHandSkeleton(ctx, pts, Math.max(2, w * 0.0028), 10);
    }

    // right hand — smaller, lower, the strumming hand
    if (handState.screenRight) {
      const scale = Math.min(w, h) * 0.3;
      const anchorX = w * 0.78;
      const anchorY = h * 0.78;
      const pts = projectHand(handState.screenRight, anchorX, anchorY, scale);
      drawHandSkeleton(ctx, pts, Math.max(1.4, w * 0.0018), 6);
    }
  }

  return { draw, registerStrum };
})();
