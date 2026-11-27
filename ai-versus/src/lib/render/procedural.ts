import type { SKRSContext2D } from "@napi-rs/canvas";
import { rng } from "../audio/synth";

/**
 * Procedural, fully animated environments drawn in code (no image generation needed).
 * Coordinates use the 1080x1920 reference space; `k` scales to the output size.
 */
export const PROCEDURAL_SCENES = ["blackhole-cockpit"] as const;
export type ProceduralScene = (typeof PROCEDURAL_SCENES)[number];

const HOLE = { x: 540, y: 560 };

interface Star {
  a: number;
  r: number;
  size: number;
  speed: number;
  hue: number;
}
const stars: Star[] = (() => {
  const r = rng(2024);
  return Array.from({ length: 260 }, () => ({ a: r() * Math.PI * 2, r: 60 + r() * 900, size: 0.6 + r() * 2.4, speed: 0.4 + r(), hue: r() }));
})();

/** Window outline (arched) used for clipping and the frame. */
function windowPath(ctx: SKRSContext2D, k: number, newPath = true) {
  if (newPath) ctx.beginPath();
  ctx.moveTo(80 * k, 1120 * k);
  ctx.lineTo(80 * k, 420 * k);
  ctx.bezierCurveTo(80 * k, 150 * k, 1000 * k, 150 * k, 1000 * k, 420 * k);
  ctx.lineTo(1000 * k, 1120 * k);
  ctx.closePath();
}

function drawSpace(ctx: SKRSContext2D, t: number, k: number, intensity: number) {
  const g = ctx.createRadialGradient(HOLE.x * k, HOLE.y * k, 40 * k, HOLE.x * k, HOLE.y * k, 1100 * k);
  g.addColorStop(0, "#2a0f3d");
  g.addColorStop(0.45, "#120827");
  g.addColorStop(1, "#05030c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080 * k, 1300 * k);

  // stars spiralling inward (time-parametric, so any frame can be rendered independently)
  for (const s of stars) {
    const life = 14 / s.speed;
    const p = ((t * intensity) / life + s.hue) % 1; // 0 → far, 1 → swallowed
    const rad = s.r * (1 - p * 0.92);
    const ang = s.a + p * (2.5 + 600 / (rad + 80));
    const x = HOLE.x + Math.cos(ang) * rad;
    const y = HOLE.y + Math.sin(ang) * rad * 0.62;
    const ang2 = ang - 0.06;
    const rad2 = rad * 1.04;
    const alpha = Math.min(1, (1 - p) * 2) * (0.5 + 0.5 * Math.sin(t * 3 + s.a * 10));
    ctx.strokeStyle = s.hue > 0.7 ? `rgba(255,190,140,${alpha})` : `rgba(210,220,255,${alpha})`;
    ctx.lineWidth = s.size * k;
    ctx.beginPath();
    ctx.moveTo(x * k, y * k);
    ctx.lineTo((HOLE.x + Math.cos(ang2) * rad2) * k, (HOLE.y + Math.sin(ang2) * rad2 * 0.62) * k);
    ctx.stroke();
  }

  // accretion disk: many rotating, flattened rings (back half first)
  const tilt = -0.22;
  const ringCount = 26;
  const drawDisk = (front: boolean) => {
    for (let i = 0; i < ringCount; i++) {
      const rr = 150 + i * 11;
      const hueMix = i / ringCount;
      const col = `rgba(${Math.round(255 - hueMix * 60)},${Math.round(170 - hueMix * 120)},${Math.round(60 + hueMix * 180)},${0.55 - hueMix * 0.35})`;
      ctx.save();
      ctx.translate(HOLE.x * k, HOLE.y * k);
      ctx.rotate(tilt);
      ctx.strokeStyle = col;
      ctx.lineWidth = (7 - hueMix * 4) * k;
      const spin = t * (1.6 - hueMix) + i;
      ctx.setLineDash([60 * k * (1 + hueMix), 25 * k]);
      ctx.lineDashOffset = -spin * 140 * k;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr * k, rr * 0.28 * k, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
  };
  drawDisk(false);
  // lensed glow ring + event horizon
  const pulse = 1 + 0.04 * Math.sin(t * 4);
  const glow = ctx.createRadialGradient(HOLE.x * k, HOLE.y * k, 95 * k, HOLE.x * k, HOLE.y * k, 230 * k * pulse);
  glow.addColorStop(0, "rgba(255,200,120,0.95)");
  glow.addColorStop(0.25, "rgba(255,110,80,0.55)");
  glow.addColorStop(0.6, "rgba(170,60,255,0.25)");
  glow.addColorStop(1, "rgba(80,20,160,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(HOLE.x * k, HOLE.y * k, 240 * k * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(HOLE.x * k, HOLE.y * k, 108 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,230,190,0.9)";
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.arc(HOLE.x * k, HOLE.y * k, 112 * k, 0, Math.PI * 2);
  ctx.stroke();
  drawDisk(true);

  // debris tumbling into the hole
  const r = rng(77);
  for (let i = 0; i < 9; i++) {
    const p = ((t * intensity) / 9 + r()) % 1;
    const a0 = r() * Math.PI * 2;
    const rad = 700 * (1 - p);
    const ang = a0 + p * 5;
    const x = HOLE.x + Math.cos(ang) * rad;
    const y = HOLE.y + Math.sin(ang) * rad * 0.6;
    const sz = (10 + r() * 22) * (1 - p * 0.8);
    ctx.save();
    ctx.translate(x * k, y * k);
    ctx.rotate(t * (1 + i) + i);
    ctx.fillStyle = i % 3 === 0 ? "#8a8fa8" : "#5d5470";
    ctx.strokeStyle = "#1b1726";
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(-sz * k, -sz * 0.6 * k);
    ctx.lineTo(sz * 0.8 * k, -sz * k);
    ctx.lineTo(sz * k, sz * 0.5 * k);
    ctx.lineTo(-sz * 0.4 * k, sz * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawCabin(ctx: SKRSContext2D, t: number, k: number) {
  const W = 1080 * k;
  // walls around the window
  const wall = ctx.createLinearGradient(0, 0, W, 0);
  wall.addColorStop(0, "#1d2033");
  wall.addColorStop(0.5, "#2a2e47");
  wall.addColorStop(1, "#1d2033");
  ctx.save();
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.rect(0, 0, W, 1300 * k);
  windowPath(ctx, k, false);
  ctx.fill("evenodd");
  ctx.restore();
  // window frame + rivets + glare
  windowPath(ctx, k);
  ctx.strokeStyle = "#4a5072";
  ctx.lineWidth = 34 * k;
  ctx.stroke();
  windowPath(ctx, k);
  ctx.strokeStyle = "#11131f";
  ctx.lineWidth = 8 * k;
  ctx.stroke();
  ctx.fillStyle = "#8d94b8";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(80 * k, (460 + i * 75) * k, 6 * k, 0, Math.PI * 2);
    ctx.arc(1000 * k, (460 + i * 75) * k, 6 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  windowPath(ctx, k);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(140 * k, 300 * k);
  ctx.lineTo(300 * k, 230 * k);
  ctx.lineTo(160 * k, 1000 * k);
  ctx.lineTo(110 * k, 1000 * k);
  ctx.fill();
  ctx.restore();

  // hazard stripe under the window
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 1120 * k, W, 46 * k);
  ctx.clip();
  ctx.fillStyle = "#f5c518";
  ctx.fillRect(0, 1120 * k, W, 46 * k);
  ctx.fillStyle = "#15151c";
  for (let x = -60; x < 1140; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x * k, 1166 * k);
    ctx.lineTo((x + 35) * k, 1120 * k);
    ctx.lineTo((x + 70) * k, 1120 * k);
    ctx.lineTo((x + 35) * k, 1166 * k);
    ctx.fill();
  }
  ctx.restore();

  // floor in perspective
  const floor = ctx.createLinearGradient(0, 1166 * k, 0, 1920 * k);
  floor.addColorStop(0, "#2b2f49");
  floor.addColorStop(1, "#141626");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 1166 * k, W, 760 * k);
  ctx.strokeStyle = "rgba(140,160,255,0.18)";
  ctx.lineWidth = 3 * k;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((540 + i * 60) * k, 1166 * k);
    ctx.lineTo((540 + i * 260) * k, 1920 * k);
    ctx.stroke();
  }
  for (let j = 0; j < 7; j++) {
    const y = 1166 + Math.pow(j / 6, 1.6) * 754;
    ctx.beginPath();
    ctx.moveTo(0, y * k);
    ctx.lineTo(W, y * k);
    ctx.stroke();
  }

  // side consoles with blinking buttons
  const r = rng(5);
  for (const side of [0, 1]) {
    ctx.save();
    if (side) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = "#363b5c";
    ctx.strokeStyle = "#0e0f18";
    ctx.lineWidth = 6 * k;
    ctx.beginPath();
    ctx.moveTo(0, 1080 * k);
    ctx.lineTo(150 * k, 1110 * k);
    ctx.lineTo(120 * k, 1460 * k);
    ctx.lineTo(0, 1500 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const bx = 22 + (i % 3) * 34;
      const by = 1150 + Math.floor(i / 3) * 70;
      const on = Math.sin(t * (2 + r() * 5) + i * 1.7) > 0;
      const c = ["255,80,80", "80,220,255", "255,210,60", "120,255,140"][i % 4];
      ctx.fillStyle = on ? `rgb(${c})` : `rgba(${c},0.25)`;
      ctx.beginPath();
      ctx.arc(bx * k, by * k, 11 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // floating mug + bolt drifting toward the window
  const drift = (seed: number, x0: number, y0: number) => {
    const p = (t * 0.07 + seed) % 1;
    return { x: x0 + (HOLE.x - x0) * p * 0.5 + Math.sin(t * 1.3 + seed * 9) * 20, y: y0 + (HOLE.y + 600 - y0) * p * 0.15 + Math.cos(t + seed) * 16, rot: t * (0.8 + seed) };
  };
  const m = drift(0.1, 230, 1010);
  ctx.save();
  ctx.translate(m.x * k, m.y * k);
  ctx.rotate(m.rot);
  ctx.fillStyle = "#f2efe9";
  ctx.strokeStyle = "#1b1726";
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.roundRect(-22 * k, -26 * k, 44 * k, 52 * k, 8 * k);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(26 * k, 0, 12 * k, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
  const b = drift(0.55, 860, 980);
  ctx.save();
  ctx.translate(b.x * k, b.y * k);
  ctx.rotate(b.rot);
  ctx.fillStyle = "#b8bdd6";
  ctx.strokeStyle = "#1b1726";
  ctx.lineWidth = 3 * k;
  ctx.fillRect(-8 * k, -26 * k, 16 * k, 44 * k);
  ctx.strokeRect(-8 * k, -26 * k, 16 * k, 44 * k);
  ctx.fillRect(-18 * k, -34 * k, 36 * k, 12 * k);
  ctx.strokeRect(-18 * k, -34 * k, 36 * k, 12 * k);
  ctx.restore();
}

/** Draw a procedural scene in reference coordinates (caller applies camera transform). */
export function drawProcedural(name: ProceduralScene, ctx: SKRSContext2D, t: number, k: number) {
  if (name === "blackhole-cockpit") {
    ctx.save();
    windowPath(ctx, k);
    ctx.clip();
    drawSpace(ctx, t, k, 1 + t * 0.02); // the pull slowly gets stronger
    ctx.restore();
    drawCabin(ctx, t, k);
  }
}

export const PROCEDURAL_HOLE = HOLE;
