/**
 * Procedural spiral-galaxy starfield background (HTML5 Canvas, no assets).
 *
 * One particle set runs an endless, seamless cycle:
 *   formed spiral galaxy
 *     -> rigid counterclockwise rotation
 *     -> staggered outward scatter (cosmic explosion)
 *     -> swirling scattered starfield
 *     -> centre-out reformation along curved orbital paths
 *     -> repeat.
 *
 * Every star's position is a pure function of (a) its formation polar
 * coordinates and (b) time. All phase terms are smootherstep ramps that are
 * flat at their ends and return to their "formed" values before the cycle
 * wraps, so the loop is C1-continuous: nothing ever snaps, flashes or
 * teleports at the seam.
 *
 * Honours prefers-reduced-motion, pauses on hidden tabs, reacts to resizing
 * live and scales its particle budget to the device.
 */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;

  // Lifecycle state is declared before any early exit so every helper is safe.
  let rafId = null;
  let last = 0;
  let enabled = true;

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function start() {
    if (!enabled || rafId !== null || document.hidden) return;
    last = 0; // first frame after (re)start contributes no dt => no time jump
    rafId = requestAnimationFrame(render);
  }

  // --- Respect reduced motion: drop the decorative background entirely. ---
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function disableBackground() {
    enabled = false;
    stop();
    canvas.style.display = 'none';
    const bg = document.getElementById('galaxy-bg');
    if (bg) bg.remove();
  }

  if (motionQuery.matches) {
    disableBackground();
    return;
  }
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', (e) => {
      if (e.matches) disableBackground();
    });
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // ------------------------------------------------------------------ setup
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const vw = window.innerWidth;

  // Particle budget: dense on desktop, lighter on phones (dpr is capped at 2).
  const COUNT = (coarse || vw < 768) ? 900 : (vw > 1700 ? 2800 : 2100);
  const BACKDROP_STARS = coarse ? 130 : 210;

  // Cycle timeline (seconds). ct wraps at T_CYCLE.
  const T_FORMED = 6.0;  // pure rotation
  const T_SCATTER = 7.0; // staggered outward scatter
  const T_HOLD = 5.0;    // swirling scattered field
  const T_REFORM = 9.0;  // reformation, centre first, spreading outward
  const T_CYCLE = T_FORMED + T_SCATTER + T_HOLD + T_REFORM; // 27s
  const T_S0 = T_FORMED;              // scatter begins
  const T_H0 = T_S0 + T_SCATTER;      // scattered hold begins
  const T_R0 = T_H0 + T_HOLD;         // reformation begins

  // Rigid disk rotation, rad/s. Applied with a negative sign (below) so the
  // galaxy turns counterclockwise on screen: right-to-left across the top.
  const OMEGA = 0.115;

  const ARMS = 2;         // grand-design primaries + 2 nested secondary arms
  const SPIRAL_K = 0.30;  // log-spiral tightness (~17deg pitch)
  const R_MIN = 0.09;     // arm origin, in galaxy radii

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // Smootherstep: zero 1st and 2nd derivative at both ends => seamless joins.
  const smooth = (v) => {
    const x = clamp01(v);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  // Sum of three uniforms: mean 0, sigma 0.5.
  const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;

  // ---------------------------------------------------- glow sprite atlas
  const PALETTE = [
    '255,255,255',   // white
    '212,228,255',   // blue-white
    '150,187,255',   // ice blue
    '108,144,255',   // deep blue
    '186,150,255',   // violet
    '130,238,255',   // cyan
    '255,226,192',   // warm (core stars)
  ];
  const COLOR_W = [0.26, 0.2, 0.16, 0.1, 0.14, 0.08, 0.06];

  const SPRITE_PX = 64;

  function radialSprite(rgb, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = SPRITE_PX;
    const g = c.getContext('2d');
    const half = SPRITE_PX / 2;
    const grd = g.createRadialGradient(half, half, 0, half, half, half);
    for (let i = 0; i < stops.length; i++) {
      grd.addColorStop(stops[i][0], 'rgba(' + rgb + ',' + stops[i][1] + ')');
    }
    g.fillStyle = grd;
    g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    return c;
  }

  const STAR_STOPS = [[0, 1], [0.09, 0.92], [0.2, 0.34], [0.42, 0.08], [1, 0]];
  const SPRITES = PALETTE.map((rgb) => radialSprite(rgb, STAR_STOPS));
  const CORE_HOT = radialSprite('255,244,224', [[0, 1], [0.12, 0.85], [0.32, 0.2], [1, 0]]);
  const CORE_GLOW = radialSprite('146,178,255', [[0, 0.5], [0.25, 0.24], [0.6, 0.06], [1, 0]]);
  const DISK_HAZE = radialSprite('112,124,232', [[0, 0.3], [0.35, 0.12], [0.7, 0.035], [1, 0]]);

  function pickColor(bulge) {
    if (bulge && Math.random() < 0.34) return Math.random() < 0.45 ? 6 : 0;
    let r = Math.random();
    for (let i = 0; i < COLOR_W.length; i++) {
      r -= COLOR_W[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  // ------------------------------------------------------------- particles
  // Parallel typed arrays, one entry per star. r0/th0 are the *formation*
  // polar coordinates (galaxy radii / radians); everything else describes the
  // scatter -> hold -> reform excursion around them, so the very same stars
  // explode outward and later fly back into the arms.
  const r0A = new Float32Array(COUNT);  // formation radius (0..1)
  const th0A = new Float32Array(COUNT); // formation angle
  const fA = new Float32Array(COUNT);   // scatter target, fraction of screen cover
  const dThA = new Float32Array(COUNT); // angular swing while scattered (rad)
  const shA = new Float32Array(COUNT);  // differential shear coefficient
  const dSA = new Float32Array(COUNT);  // scatter delay / duration
  const uSA = new Float32Array(COUNT);
  const dRA = new Float32Array(COUNT);  // reform delay / duration (delay ~ radius)
  const uRA = new Float32Array(COUNT);
  const szA = new Float32Array(COUNT);  // glow sprite diameter, px
  const alA = new Float32Array(COUNT);  // base alpha
  const twRA = new Float32Array(COUNT); // twinkle rate / phase
  const twPA = new Float32Array(COUNT);
  const sprA = new Uint8Array(COUNT);   // palette sprite index
  const rSA = new Float32Array(COUNT);  // scatter radius, galaxy units (layout)

  function logSpiralTheta(r, k) {
    return Math.log(Math.max(r, R_MIN) / R_MIN) / k;
  }

  for (let i = 0; i < COUNT; i++) {
    const kind = Math.random();
    let r0;
    let th0;

    if (kind < 0.55) {
      // Primary spiral arm: logarithmic, widening as it unwinds.
      r0 = R_MIN + 0.01 + Math.pow(Math.random(), 0.72) * 0.88;
      const arm = (Math.random() * ARMS) | 0;
      const spread = 0.1 + 0.3 * r0;
      th0 = logSpiralTheta(r0, SPIRAL_K) + arm * (TAU / ARMS) + gauss() * spread * 2.2;
    } else if (kind < 0.7) {
      // Secondary, shorter arm nested between the primaries.
      r0 = 0.22 + Math.pow(Math.random(), 0.8) * 0.52;
      const arm = (Math.random() * 2) | 0;
      const spread = 0.12 + 0.34 * r0;
      th0 = logSpiralTheta(r0, 0.34) + Math.PI / 2 + arm * Math.PI + gauss() * spread * 2.2;
    } else if (kind < 0.9) {
      // Inter-arm disk fill, loosely pulled toward the nearest arm.
      r0 = 0.06 + Math.sqrt(Math.random()) * 0.9;
      th0 = Math.random() < 0.62
        ? logSpiralTheta(r0, SPIRAL_K) + ((Math.random() * ARMS) | 0) * (TAU / ARMS) + gauss() * 1.6
        : Math.random() * TAU;
    } else {
      // Central bulge.
      r0 = 0.015 + Math.pow(Math.random(), 2.0) * 0.16;
      th0 = Math.random() * TAU;
    }

    r0A[i] = r0;
    th0A[i] = th0;

    // Scatter target: always outward, spread from "hovers near the core" to
    // "reaches the far corners of the viewport".
    fA[i] = 0.1 + Math.pow(Math.random(), 0.95) * 0.88;
    // Shared counterclockwise bias + wide per-star variation => curved,
    // individually shaped trajectories instead of one uniform blast.
    dThA[i] = 0.55 + gauss() * 1.9;
    // Differential swirl: inner stars swing faster, a minority counter-rotate.
    shA[i] = (0.08 + Math.random() * 0.42) *
      (Math.random() < 0.82 ? 1 : -1) * (1.25 - r0 * 0.5);

    dSA[i] = Math.random() * 1.6 + r0 * 0.9; // max 2.5s
    uSA[i] = 2.6 + Math.random() * 1.7;      // max 4.3s => always inside the 7s window
    dRA[i] = r0 * 3.4 + Math.random() * 1.0; // max ~4.4s => centre returns first
    uRA[i] = 3.0 + Math.random() * 1.2;      // max 4.2s => always inside the 9s window

    let sz = 2.7 + Math.pow(Math.random(), 3.1) * 15;
    if (Math.random() < 0.045) sz += 4 + Math.random() * 5; // occasional bright giant
    if (r0 < 0.18) sz += 0.8;                               // bulge reads brighter
    szA[i] = Math.min(sz, 24);
    alA[i] = Math.min(1, 0.3 + ((sz - 2.7) / 21) * 0.45 + Math.random() * 0.2);

    twRA[i] = rand(0.5, 2.6);
    twPA[i] = Math.random() * TAU;
    sprA[i] = pickColor(r0 < 0.18);
  }

  // ---------------------------------------------------------------- layout
  let w = 0;
  let h = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let R = 1;     // galaxy disk radius, px
  let cover = 1; // circumscribed screen radius expressed in galaxy units

  let backdrop = null;

  function buildBackdrop() {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const g = c.getContext('2d');
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Baked, motionless far field: depth for the empty sky at one blit per frame.
    const tints = ['255,255,255', '196,214,255', '226,214,255'];
    for (let i = 0; i < BACKDROP_STARS; i++) {
      g.globalAlpha = Math.min(rand(0.07, 0.4) * (Math.random() < 0.07 ? 1.7 : 1), 0.7);
      g.fillStyle = tints[(Math.random() * tints.length) | 0];
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, rand(0.3, 1.1), 0, TAU);
      g.fill();
    }
    return c;
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = w * 0.5;
    cy = h * 0.5;
    R = Math.max(90, Math.min(w, h) * 0.42);
    cover = Math.hypot(w, h) * 0.5 / R;

    // Scatter targets are normalised, so a resize only re-scales the field:
    // no reseeding, no visible reset.
    for (let i = 0; i < COUNT; i++) {
      const target = fA[i] * cover;                 // fills the viewport circle
      const minOut = r0A[i] * (1.06 + fA[i] * 0.6); // ...but always outward
      rSA[i] = target > minOut ? target : minOut;
    }

    backdrop = buildBackdrop();
  }

  // ---------------------------------------------------------- phase curves
  // gH   : differential shear accumulator (returns to 0 before the wrap)
  // gHr  : extra outward drift while scattered
  // gCore: core / disk luminance (1 formed, ~0.14 scattered)
  let gH = 0;
  let gHr = 0;
  let gCore = 1;

  function updateGlobals(ct) {
    if (ct < T_S0) {
      gH = 0; gHr = 0; gCore = 1;
    } else if (ct < T_H0) {
      const x = smooth((ct - T_S0) / T_SCATTER);
      gH = 0.55 * x;
      gHr = 0;
      gCore = 1 - 0.86 * x;
    } else if (ct < T_R0) {
      const x = smooth((ct - T_H0) / T_HOLD);
      gH = 0.55 + 0.75 * x;
      gHr = 0.35 * x;
      gCore = 0.14;
    } else {
      const x = smooth((ct - T_R0) / T_REFORM);
      gH = 1.3 * (1 - x);
      gHr = 0.35 * (1 - x);
      gCore = 0.14 + 0.86 * x;
    }
  }

  // Per-star scatter progress. Smoothstep is flat at both ends, per-star
  // delays keep every star inside its phase window, and the value is exactly
  // 0 (with zero slope) both at the cycle wrap and at every phase boundary:
  // no jumps, flicker or teleporting, ever.
  function scatterAmount(i, ct) {
    if (ct < T_S0) return 0;
    if (ct < T_H0) return smooth((ct - T_S0 - dSA[i]) / uSA[i]);
    if (ct < T_R0) return 1;
    return 1 - smooth((ct - T_R0 - dRA[i]) / uRA[i]);
  }

  // ------------------------------------------------------------ rendering
  let elapsed = 0;
  let activeN = COUNT;

  // Cheap adaptive quality: if the device cannot hold ~45fps, thin the field.
  // Particles are unsorted, so any prefix is still a complete galaxy.
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;

  function throttle(dt) {
    fpsAcc += dt;
    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer < 2.5) return;
    const fps = fpsFrames / fpsAcc;
    if (fps < 45 && activeN > COUNT * 0.5) {
      activeN = Math.max(Math.floor(COUNT * 0.5), Math.floor(activeN * 0.75));
    } else if (fps > 57 && activeN < COUNT) {
      activeN = Math.min(COUNT, Math.ceil(activeN / 0.75));
    }
    fpsAcc = 0;
    fpsFrames = 0;
    fpsTimer = 0;
  }

  function render(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    elapsed += dt;
    throttle(dt);

    const ct = elapsed % T_CYCLE;
    updateGlobals(ct);

    ctx.clearRect(0, 0, w, h);
    // Additive blending: overlapping stars bloom into the bright core.
    ctx.globalCompositeOperation = 'lighter';

    if (backdrop) ctx.drawImage(backdrop, 0, 0, w, h);

    if (gCore > 0.01) {
      const haze = R * 3.1;
      ctx.globalAlpha = 0.2 * gCore;
      ctx.drawImage(DISK_HAZE, cx - haze * 0.5, cy - haze * 0.5, haze, haze);
      const glow = R * 1.44;
      ctx.globalAlpha = 0.42 * gCore;
      ctx.drawImage(CORE_GLOW, cx - glow * 0.5, cy - glow * 0.5, glow, glow);
      const hot = R * 0.48;
      ctx.globalAlpha = 0.85 * gCore;
      ctx.drawImage(CORE_HOT, cx - hot * 0.5, cy - hot * 0.5, hot, hot);
    }

    // Grows forever (never resets) => perfectly smooth, endless rotation.
    const spin = OMEGA * elapsed;

    for (let i = 0; i < activeN; i++) {
      const s = scatterAmount(i, ct);
      const base = r0A[i];

      // Radius: formation -> scattered target -> formation.
      const rr = (base + (rSA[i] * (1 + 0.12 * gHr) - base) * s) *
        (1 + 0.022 * Math.sin(elapsed * (0.25 + twRA[i] * 0.18) + twPA[i]));

      // Angle: rigid counterclockwise spin + scatter swing + differential
      // shear + tiny orbital wobble. The shear term closes back to zero, so
      // the arms unwind exactly into their original shape.
      const th = th0A[i] - spin + dThA[i] * s + shA[i] * gH +
        0.022 * Math.sin(elapsed * (0.18 + twRA[i] * 0.12) + twPA[i] * 1.7);

      const d = szA[i];
      const x = cx + Math.cos(th) * rr * R;
      const y = cy + Math.sin(th) * rr * R;

      if (x < -d || x > w + d || y < -d || y > h + d) continue;

      let a = alA[i] * (0.68 + 0.32 * Math.sin(elapsed * twRA[i] + twPA[i]));
      if (s > 0 && s < 1) a *= 1 + 2 * s * (1 - s); // flare while in transit

      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(SPRITES[sprA[i]], x - d * 0.5, y - d * 0.5, d, d);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    rafId = requestAnimationFrame(render);
  }

  // ------------------------------------------------------------- lifecycle
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  layout();
  start();
})();
