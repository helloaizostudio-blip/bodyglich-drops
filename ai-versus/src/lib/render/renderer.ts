import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { FFMPEG, probe } from "../audio/ffmpeg";
import { rng } from "../audio/synth";
import { ASSETS_DIR } from "../store";
import { drawProcedural, PROCEDURAL_HOLE, type ProceduralScene } from "./procedural";
import {
  CHARACTER_ORDER,
  type CharacterId,
  type CharacterProfile,
  type Expression,
  type Hazard,
  type Scene,
  type Script,
  type Settings,
  type Timeline,
  type WordTiming,
} from "../types";

/**
 * Layered 2D animation renderer.
 *
 * Draws every frame on a Skia canvas (background, characters built from aligned expression
 * sprites, environment effects, captions, cards) and streams raw frames into FFmpeg. Mouth
 * movement is driven by the real voice envelope; captions by real word timings.
 */

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(path.join(ASSETS_DIR, "fonts", "LilitaOne-Regular.ttf"), "Lilita");
  fontsReady = true;
}
const DISPLAY = "Lilita";
const UI = "Inter, 'DejaVu Sans', sans-serif";

export interface RenderAssets {
  background: Image | null;
  /** animated environment drawn in code instead of an image */
  procedural?: ProceduralScene;
  backgroundVideo?: string;
  characters: Record<CharacterId, CharacterProfile>;
  sprites: Record<CharacterId, Partial<Record<Expression, Image>>>;
  envelopes: Partial<Record<string, number[]>>;
  script: Script;
}

export async function loadRenderAssets(opts: {
  backgroundPath?: string;
  procedural?: ProceduralScene;
  backgroundVideoPath?: string;
  characters: Record<CharacterId, CharacterProfile>;
  spritePath: (key: string) => Promise<string>;
  envelopes: RenderAssets["envelopes"];
  script: Script;
}): Promise<RenderAssets> {
  const sprites = {} as RenderAssets["sprites"];
  for (const id of CHARACTER_ORDER) {
    sprites[id] = {};
    for (const [expr, ref] of Object.entries(opts.characters[id].sprites)) {
      if (ref) sprites[id][expr as Expression] = await loadImage(await opts.spritePath(ref.key));
    }
  }
  return {
    background: opts.backgroundPath ? await loadImage(opts.backgroundPath) : null,
    procedural: opts.procedural,
    backgroundVideo: opts.backgroundVideoPath,
    characters: opts.characters,
    sprites,
    envelopes: opts.envelopes,
    script: opts.script,
  };
}

// ---------------------------------------------------------------------------------------------
// math helpers
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  t = clamp(t);
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const elastic = (t: number) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
/** smooth value noise in [-1,1] */
function noise(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 101.3) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

// ---------------------------------------------------------------------------------------------
// sprite cache (pre-scaled bitmaps, optional dimming)
class SpriteCache {
  private m = new Map<string, Canvas>();
  get(img: Image, key: string, w: number, h: number, dim = 0): Canvas {
    const W = Math.max(1, Math.round(w));
    const H = Math.max(1, Math.round(h));
    const k = `${key}|${W}x${H}|${dim}`;
    let c = this.m.get(k);
    if (!c) {
      c = createCanvas(W, H);
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(img, 0, 0, W, H);
      if (dim > 0) {
        x.globalCompositeOperation = "source-atop";
        x.fillStyle = `rgba(10,20,40,${dim})`;
        x.fillRect(0, 0, W, H);
      }
      if (this.m.size > 600) this.m.clear();
      this.m.set(k, c);
    }
    return c;
  }
}

// ---------------------------------------------------------------------------------------------
// layout constants (1080x1920 reference; scaled for other sizes)
const ROW_X = [150, 345, 540, 735, 930];
const ROW_FEET = 1525;
const ROW_H = 410;
const SPEAKER_FEET = 1935;
const SPEAKER_H = 1010;
const BACK_X = [115, 285, 795, 965];
const BACK_FEET = 1315;
const BACK_H = 300;
const CAPTION_Y = 770;

interface FrameCtx {
  t: number; // absolute seconds
  local: number; // seconds since scene start
  frame: number;
  scene: Scene;
  next?: Scene;
  tl: Timeline;
}

export class SceneRenderer {
  private canvas: Canvas;
  private ctx: SKRSContext2D;
  private cache = new SpriteCache();
  private blinkTimes: Record<string, number[]> = {};
  private k: number; // layout scale
  private bgFrame: Canvas | null = null;

  constructor(
    private a: RenderAssets,
    private tl: Timeline,
    private s: Settings,
  ) {
    ensureFonts();
    this.canvas = createCanvas(tl.width, tl.height);
    this.ctx = this.canvas.getContext("2d");
    this.k = tl.width / 1080;
    // deterministic blink schedule per character
    for (const id of CHARACTER_ORDER) {
      const r = rng(tl.seed * 31 + id.length * 7 + id.charCodeAt(0));
      const times: number[] = [];
      for (let t = 0.4 + r() * 1.5; t < tl.duration + 5; t += 2.2 + r() * 2.6) times.push(t);
      this.blinkTimes[id] = times;
    }
  }

  get hazard(): Hazard {
    return this.a.script.environment.hazard;
  }

  // ---- per-character state ----
  private envelopeAt(role: string, sc: Scene, t: number): number {
    const env = this.a.envelopes[role];
    if (!env || t < sc.voiceStart || t > sc.voiceEnd) return 0;
    return env[Math.floor((t - sc.voiceStart) * this.tl.fps)] ?? 0;
  }
  private blinking(id: CharacterId, t: number) {
    return this.blinkTimes[id].some((b) => t >= b && t < b + 0.12);
  }
  private sprite(id: CharacterId, want: Expression): { img: Image; key: string } {
    const sp = this.a.sprites[id];
    const fallback: Expression[] =
      want === "happy" ? ["happy", "neutral"] : want === "confused" ? ["confused", "surprised", "neutral"] : [want, "neutral"];
    for (const e of fallback) if (sp[e]) return { img: sp[e]!, key: `${id}:${e}` };
    throw new Error(`no sprite for ${id}`);
  }

  /** Draw one character with its feet at (x, feetY) and body height h. */
  private drawCharacter(
    id: CharacterId,
    x: number,
    feetY: number,
    h: number,
    o: { expr: Expression; talkEnv?: number; t: number; dim?: number; rot?: number; hop?: number; sx?: number; sy?: number; alpha?: number },
  ) {
    const ch = this.a.characters[id];
    const anchor = ch.anchor ?? { x: 0, y: 0, bodyHeight: 1 };
    const { img, key } = this.sprite(id, o.expr);
    const scale = h / anchor.bodyHeight;
    const w = img.width * scale;
    const H = img.height * scale;
    const bmp = this.cache.get(img, key, w, H, o.dim ?? 0);
    const ctx = this.ctx;
    if (this.hazard !== "water") {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.max(0.3, 1 - (o.hop ?? 0) / (h * 0.3))})`;
      ctx.beginPath();
      ctx.ellipse(x, feetY, h * 0.26, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.translate(x, feetY - (o.hop ?? 0));
    ctx.rotate(o.rot ?? 0);
    ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.drawImage(bmp, -anchor.x * scale, -anchor.y * scale, w, H);
    ctx.restore();
  }

  /** Mouth + blink + mood → sprite for a speaking/idle character. */
  private faceFor(id: CharacterId, t: number, env: number, frame: number, base: Expression = "neutral"): Expression {
    if (env > 0.16) {
      // flap at ~7.5 Hz while voiced; stay open on loud syllables
      const open = env > 0.72 || ((frame >> 1) & 1) === 0;
      return open ? "talking" : "neutral";
    }
    if (this.blinking(id, t)) return "blink";
    return base;
  }

  // ---- background + environment ----
  private drawBackground(f: FrameCtx, zoom: number, focusY: number, shake: number) {
    const { ctx } = this;
    const W = this.tl.width,
      H = this.tl.height;
    const sxn = noise(f.t * 9, 1) * shake * this.k,
      syn = noise(f.t * 9, 2) * shake * this.k;
    if (!this.bgFrame && this.a.procedural) {
      // camera: zoom about the focus point, plus a slow "gravity" wobble for space scenes
      const fx = W / 2,
        fy = focusY * this.k;
      ctx.save();
      ctx.translate(fx + sxn, fy + syn);
      if (this.hazard === "space") ctx.rotate(Math.sin(f.t * 0.9) * 0.018);
      ctx.scale(zoom * 1.04, zoom * 1.04);
      ctx.translate(-fx, -fy);
      drawProcedural(this.a.procedural, ctx, f.t, this.k);
      ctx.restore();
      return;
    }
    const src: Image | Canvas = this.bgFrame ?? this.a.background!;
    const c0 = Math.max(W / src.width, H / src.height);
    const w0 = src.width * c0,
      h0 = src.height * c0;
    const x0 = (W - w0) / 2,
      y0 = (H - h0) / 2;
    const fx = W / 2,
      fy = focusY * this.k;
    ctx.drawImage(src, fx + (x0 - fx) * zoom + sxn, fy + (y0 - fy) * zoom + syn, w0 * zoom, h0 * zoom);
  }

  private drawEmergencyLight(t: number) {
    if (this.hazard === "none" || this.hazard === "snow") return;
    const { ctx, k } = this;
    const flick = 0.55 + 0.45 * Math.max(0, Math.sin(t * 5.2)) * (0.7 + 0.3 * noise(t * 6, 9));
    const color =
      this.hazard === "space"
        ? Math.floor(t * 1.6) % 2
          ? "255,40,60"
          : "60,120,255"
        : this.hazard === "water" || this.hazard === "fire" || this.hazard === "zombies"
          ? "255,40,40"
          : "80,140,255";
    const g = ctx.createRadialGradient(540 * k, 190 * k, 10, 540 * k, 190 * k, 900 * k);
    g.addColorStop(0, `rgba(${color},${0.22 * flick})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.tl.width, this.tl.height);
  }

  private waterRise(t: number) {
    return easeInOut(clamp(t / Math.max(1, this.tl.duration)));
  }

  private drawWaterBand(top: number, t: number, alpha: number, seed: number) {
    if (this.hazard !== "water") return;
    const { ctx, k } = this;
    const W = this.tl.width,
      H = this.tl.height;
    const y = (x: number) => top * k + (9 * Math.sin(x / (95 * k) + t * 2.1 + seed) + 5 * Math.sin(x / (37 * k) - t * 3.3 + seed * 2)) * k;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top * k, 0, H);
    g.addColorStop(0, `rgba(90,210,215,${0.5 * alpha})`);
    g.addColorStop(0.25, `rgba(30,140,160,${0.62 * alpha})`);
    g.addColorStop(1, `rgba(8,60,80,${0.8 * alpha})`);
    ctx.fillStyle = g;
    ctx.fill();
    // foam highlight
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, y(x));
    ctx.strokeStyle = `rgba(230,255,255,${0.75 * alpha})`;
    ctx.lineWidth = 5 * k;
    ctx.stroke();
    // caustic sparkles
    const r = rng(seed * 13 + 5);
    for (let i = 0; i < 26; i++) {
      const px = r() * W;
      const py = top * k + 30 * k + r() * (H - top * k);
      const tw = 0.5 + 0.5 * Math.sin(t * (2 + r() * 3) + i);
      ctx.fillStyle = `rgba(200,255,255,${0.25 * tw * alpha})`;
      ctx.beginPath();
      ctx.ellipse(px + Math.sin(t + i) * 8 * k, py, 16 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRipples(x: number, y: number, t: number, w: number) {
    if (this.hazard !== "water") return;
    const { ctx, k } = this;
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.7 + i / 3) % 1;
      ctx.strokeStyle = `rgba(220,255,255,${0.45 * (1 - p)})`;
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.ellipse(x, y, (w * 0.35 + p * w * 0.5) * k, (14 + p * 22) * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawParticles(t: number, layer: "back" | "front") {
    const { ctx, k } = this;
    const W = this.tl.width,
      H = this.tl.height;
    const r = rng(layer === "back" ? 4242 : 777);
    const n = layer === "back" ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const x0 = r() * W,
        speed = 0.5 + r() * 0.9,
        ph = r(),
        size = (layer === "back" ? 3 : 5) + r() * 4;
      if (this.hazard === "water") {
        // drips falling from the ceiling seam
        const p = (t * speed * 0.6 + ph) % 1;
        const y = lerp(150, 1350, p) * k;
        ctx.fillStyle = `rgba(200,240,255,${0.55 * (1 - p * 0.6)})`;
        ctx.beginPath();
        ctx.ellipse(x0, y, size * 0.55 * k, size * 1.6 * k, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.hazard === "fire") {
        const p = (t * speed * 0.35 + ph) % 1;
        ctx.fillStyle = `rgba(255,${140 + r() * 80},40,${0.8 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(x0 + Math.sin(t * 2 + i) * 30 * k, lerp(H, H * 0.25, p), size * 0.6 * k, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.hazard === "snow") {
        const p = (t * speed * 0.15 + ph) % 1;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(x0 + Math.sin(t + i) * 40 * k, lerp(-20, H, p), size * 0.8 * k, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.hazard === "space") {
        // glowing dust being pulled toward the black hole
        const p = (t * speed * 0.18 + ph) % 1;
        const y0 = (0.55 + r() * 0.4) * H;
        const x = lerp(x0, PROCEDURAL_HOLE.x * k, p * p);
        const y = lerp(y0, PROCEDURAL_HOLE.y * k, p * p);
        ctx.fillStyle = `rgba(${i % 2 ? "255,190,120" : "190,160,255"},${0.75 * (1 - p)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.9 * k, size * 0.45 * k, Math.atan2(PROCEDURAL_HOLE.y * k - y, PROCEDURAL_HOLE.x * k - x), 0, Math.PI * 2);
        ctx.fill();
      } else if (this.hazard === "sand" || this.hazard === "zombies") {
        const p = (t * speed * 0.12 + ph) % 1;
        ctx.fillStyle = this.hazard === "sand" ? "rgba(240,210,150,0.5)" : "rgba(170,200,170,0.25)";
        ctx.beginPath();
        ctx.arc(lerp(-50, W + 50, p), (0.3 + r() * 0.6) * H + Math.sin(t + i) * 20, size * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- UI ----
  private text(
    str: string,
    x: number,
    y: number,
    o: { size: number; color: string; font?: string; stroke?: number; strokeColor?: string; align?: CanvasTextAlign; alpha?: number; maxWidth?: number },
  ) {
    const { ctx, k } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    let size = o.size * k;
    ctx.font = `${size}px ${o.font ?? DISPLAY}`;
    if (o.maxWidth) {
      const w = ctx.measureText(str).width;
      if (w > o.maxWidth * k) {
        size *= (o.maxWidth * k) / w;
        ctx.font = `${size}px ${o.font ?? DISPLAY}`;
      }
    }
    ctx.textAlign = o.align ?? "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (o.stroke) {
      ctx.strokeStyle = o.strokeColor ?? "#0b0b14";
      ctx.lineWidth = o.stroke * k;
      ctx.strokeText(str, x * k, y * k);
    }
    ctx.fillStyle = o.color;
    ctx.fillText(str, x * k, y * k);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 6) {
    const { ctx, k } = this;
    ctx.beginPath();
    ctx.roundRect(x * k, y * k, w * k, h * k, r * k);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw * k;
      ctx.stroke();
    }
  }

  private wrap(str: string, size: number, maxW: number, font = DISPLAY): string[] {
    const { ctx, k } = this;
    ctx.font = `${size * k}px ${font}`;
    const words = str.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW * k && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  private drawDisclaimer() {
    if (!this.s.video.showDisclaimer) return;
    this.text(this.a.script.disclaimer, 70, 118, { size: 30, color: "rgba(255,255,255,0.82)", font: UI, align: "left", stroke: 6, strokeColor: "rgba(0,0,0,0.55)" });
  }

  /** Word-synced captions: 1–4 words at a time, active word highlighted, emphasis in colour. */
  private drawCaptions(words: WordTiming[], t: number, emphasis: string[], accent: string) {
    if (!words.length) return;
    const chunks = chunkWords(words);
    const idx = chunks.findIndex((c, i) => t >= c[0].start - 0.08 && (i === chunks.length - 1 ? t <= c[c.length - 1].end + 0.6 : t < chunks[i + 1][0].start - 0.08));
    if (idx < 0) return;
    const chunk = chunks[idx];
    const { ctx, k } = this;
    const pop = easeOutBack(clamp((t - chunk[0].start + 0.08) / 0.16));
    const base = 96;
    ctx.font = `${base * k}px ${DISPLAY}`;
    const space = base * k * 0.42;
    const widths = chunk.map((w) => ctx.measureText(upper(w.text)).width);
    let total = widths.reduce((a, b) => a + b, 0) + space * (chunk.length - 1);
    const maxW = 880 * k;
    const fit = total > maxW ? maxW / total : 1;
    total *= fit;
    const emph = new Set(emphasis.map((e) => norm(e)));
    ctx.save();
    ctx.translate(540 * k, CAPTION_Y * k);
    ctx.scale(lerp(0.75, 1, pop) * fit, lerp(0.75, 1, pop) * fit);
    let x = -total / fit / 2;
    chunk.forEach((w, i) => {
      const active = t >= w.start - 0.03 && t <= w.end + 0.05;
      const isEmph = emph.has(norm(w.text));
      const txt = upper(w.text);
      const s = active ? 1.08 : 1;
      ctx.save();
      ctx.translate(x + widths[i] / 2, 0);
      ctx.scale(s, s);
      ctx.font = `${base * k}px ${DISPLAY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 14 * k;
      ctx.shadowOffsetY = 6 * k;
      ctx.strokeStyle = "#0b0b14";
      ctx.lineWidth = 18 * k;
      ctx.strokeText(txt, 0, 0);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = isEmph ? accent : active ? "#FFE14D" : "#FFFFFF";
      ctx.fillText(txt, 0, 0);
      ctx.restore();
      x += widths[i] + space;
    });
    ctx.restore();
  }

  private drawNameLabel(id: CharacterId, x: number, y: number, appear: number) {
    const c = this.a.characters[id];
    const p = easeOutBack(appear);
    if (p <= 0) return;
    const { ctx, k } = this;
    ctx.save();
    ctx.translate(x * k, y * k);
    ctx.scale(p, p);
    ctx.font = `${34 * k}px ${DISPLAY}`;
    const w = ctx.measureText(c.displayName).width / k + 34;
    this.ctx.translate(-x * k, -y * k);
    this.roundRect(x - w / 2, y - 26, w, 52, 26, c.color, "#ffffff", 4);
    this.text(c.displayName, x, y + 2, { size: 34, color: c.textOnColor });
    ctx.restore();
  }

  private drawCharacterCard(id: CharacterId, sc: Scene, f: FrameCtx) {
    const c = this.a.characters[id];
    const { ctx, k } = this;
    const appear = elastic(clamp((f.local - 0.12) / 0.55));
    if (appear <= 0) return;
    const x = 90,
      y = 168,
      w = 820,
      h = 150;
    ctx.save();
    ctx.translate(540 * k, (y + h / 2) * k);
    ctx.scale(appear, appear);
    ctx.translate(-540 * k, -(y + h / 2) * k);
    // card
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 10 * k;
    this.roundRect(x, y, w, h, 40, c.color, "#ffffff", 7);
    ctx.shadowColor = "transparent";
    // portrait: head crop of neutral sprite inside a circle
    const img = this.a.sprites[id].neutral!;
    const cx = x + 82,
      cy = y + h / 2,
      r = 58;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2);
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.clip();
    const headH = img.height * 0.5;
    const sc2 = ((r * 2.2) / headH) * k;
    ctx.drawImage(img, cx * k - (img.width * sc2) / 2, (cy - r * 0.95) * k, img.width * sc2, img.height * sc2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6 * k;
    ctx.stroke();
    // name + index
    const n = CHARACTER_ORDER.indexOf(id) + 1;
    this.text(c.displayName, x + 160, cy - 14, { size: 70, color: c.textOnColor, align: "left", stroke: 10, strokeColor: "rgba(0,0,0,0.25)", maxWidth: 380 });
    this.text(`AI ${n} OF 5`, x + 162, cy + 42, { size: 28, color: "rgba(255,255,255,0.85)", align: "left", font: UI });
    // speaking indicator: live waveform bars from the real voice envelope
    const env = this.a.envelopes[id] ?? [];
    const fi = Math.floor((f.t - sc.voiceStart) * this.tl.fps);
    const bars = 9;
    for (let i = 0; i < bars; i++) {
      const v = f.t >= sc.voiceStart && f.t <= sc.voiceEnd ? env[Math.max(0, fi - (bars - 1 - i) * 2)] ?? 0 : 0;
      const bh = 12 + v * 90 * (0.75 + 0.25 * Math.sin(i * 1.7 + f.t * 12));
      const bx = x + w - 230 + i * 22;
      this.roundRect(bx, cy - bh / 2, 13, bh, 6, "rgba(255,255,255,0.95)");
    }
    ctx.restore();
  }

  private drawTransition(f: FrameCtx) {
    const { ctx, k } = this;
    const W = this.tl.width,
      H = this.tl.height;
    const drawPanel = (progress: number, color: string, accent: string) => {
      // progress 0 → panel fully off-screen left, 1 → fully covering, 2 → off-screen right
      const off = (progress - 1) * (W + 400 * k);
      ctx.save();
      ctx.translate(off, 0);
      ctx.beginPath();
      ctx.moveTo(-200 * k, 0);
      ctx.lineTo(W + 200 * k, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(-400 * k, H);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.18;
        ctx.fillRect(((i * 260 - 100) * k), 0, 70 * k, H);
      }
      ctx.restore();
    };
    const sc = f.scene;
    const inDur = 0.32;
    if (sc.kind !== "intro" && f.local < inDur) {
      const c = sc.characterId ? this.a.characters[sc.characterId] : null;
      drawPanel(1 + easeInOut(f.local / inDur), c?.color ?? "#6A5CFF", c?.accent ?? "#ffffff");
    }
    const outDur = 0.22;
    const remain = sc.end - f.t;
    if (f.next && remain < outDur) {
      const c = f.next.characterId ? this.a.characters[f.next.characterId] : null;
      drawPanel(easeInOut(1 - remain / outDur), c?.color ?? "#6A5CFF", c?.accent ?? "#ffffff");
    }
  }

  // ---- scenes ----
  private drawGroupScene(f: FrameCtx) {
    const { scene: sc, t, local } = f;
    const intro = sc.kind === "intro";
    const zoom = intro ? lerp(1.0, 1.07, easeInOut(clamp(local / (sc.end - sc.start)))) : lerp(1.08, 1.02, easeOut(local / 1.2));
    const shake = intro && local < 1.4 ? 4 * (1 - local / 1.4) : 0;
    this.drawBackground(f, zoom, 1150, shake);
    this.drawEmergencyLight(t);
    this.drawParticles(t, "back");

    const dur = sc.voiceEnd - sc.voiceStart;
    const rise = this.waterRise(t);
    CHARACTER_ORDER.forEach((id, i) => {
      const r = rng(i * 17 + 3);
      const phase = r() * 6;
      let expr: Expression = "neutral";
      let hop = 0;
      let rot = Math.sin(t * 1.6 + phase) * 0.02;
      if (intro) {
        const p = (t - sc.voiceStart) / dur;
        if (p > 0.38 + i * 0.03 && p < 0.92) {
          expr = "surprised";
          hop = Math.abs(Math.sin((t - sc.voiceStart) * 9 + i)) * 10 * Math.max(0, 1 - (p - 0.4) * 2);
        }
      } else {
        // ending: staggered happy hops
        expr = "happy";
        const hp = (local - 0.25 - i * 0.12) / 0.45;
        if (hp > 0 && hp < 1) hop = Math.sin(hp * Math.PI) * 46;
        rot += Math.sin(t * 3 + phase) * 0.03;
      }
      const face = this.faceFor(id, t, 0, f.frame, expr);
      const breath = 1 + 0.012 * Math.sin(t * 2.4 + phase);
      const feet = ROW_FEET + (i % 2) * 10;
      this.drawCharacter(id, ROW_X[i] * this.k, feet * this.k, ROW_H * this.k, { expr: face, t, hop: hop * this.k, rot, sy: breath, sx: 2 - breath });
      this.drawRipples(ROW_X[i] * this.k, (feet - 50 + -rise * 40) * this.k, t + i * 0.3, 150);
      const appear = intro ? clamp((local - 0.5 - i * 0.12) / 0.35) : clamp((local - 0.1) / 0.3);
      this.drawNameLabel(id, ROW_X[i], feet - ROW_H - 64 + (i % 2) * 0, appear);
    });
    this.drawWaterBand(1478 - rise * 70, t, 1, 1);
    this.drawParticles(t, "front");
    this.drawDisclaimer();

    if (intro) {
      const sc0 = this.a.script;
      const ap = easeOutBack(clamp((local - 0.05) / 0.35));
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(540 * this.k, 330 * this.k);
      ctx.scale(ap, ap);
      ctx.translate(-540 * this.k, -330 * this.k);
      this.text(upper(sc0.hookTop), 540, 250, { size: 92, color: "#FFFFFF", stroke: 18, maxWidth: 900 });
      const lines = this.wrap(upper(sc0.hookBottom), 72, 900);
      lines.slice(0, 3).forEach((l, i) => this.text(l, 540, 345 + i * 80, { size: 72, color: "#FFE14D", stroke: 16, maxWidth: 940 }));
      ctx.restore();
      this.drawCaptions(sc.words, t, [], "#7CF5D9");
    } else {
      const p = easeOutBack(clamp((t - sc.voiceStart + 0.15) / 0.45));
      const lines = this.wrap(upper(this.a.script.endingCaption), 100, 880);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(540 * this.k, 620 * this.k);
      ctx.scale(p, p);
      ctx.rotate(Math.sin(t * 2) * 0.015);
      ctx.translate(-540 * this.k, -620 * this.k);
      const top = 620 - ((lines.length - 1) * 108) / 2;
      this.roundRect(70, top - 100, 940, lines.length * 108 + 150, 50, "rgba(15,15,35,0.55)");
      lines.forEach((l, i) => this.text(l, 540, top + i * 108, { size: 100, color: i === lines.length - 1 ? "#FFE14D" : "#FFFFFF", stroke: 18, maxWidth: 900 }));
      this.text("COMMENT YOUR PICK BELOW!", 540, top + lines.length * 108 + 10, { size: 40, color: "#FFFFFF", stroke: 10 });
      ctx.restore();
    }
  }

  private drawResponseScene(f: FrameCtx) {
    const { scene: sc, t, local } = f;
    const id = sc.characterId!;
    const ch = this.a.characters[id];
    const emphasisWords = sc.words.filter((w) => sc.emphasis.some((e) => norm(e) === norm(w.text)));
    // punch-zoom on emphasised words
    const punch = emphasisWords.reduce((a, w) => a + (t >= w.start ? Math.exp(-(t - w.start) * 9) * 0.035 : 0), 0);
    const zoom = lerp(1.03, 1.09, easeInOut(clamp(local / (sc.end - sc.start)))) + punch;
    this.drawBackground(f, zoom, 1200, 0);
    this.drawEmergencyLight(t);
    this.drawParticles(t, "back");

    // listeners in the back row
    const listeners = CHARACTER_ORDER.filter((c) => c !== id);
    const dur = sc.voiceEnd - sc.voiceStart;
    const r = rng(sc.index * 97 + this.tl.seed);
    const reactors = new Set(listeners.filter(() => r() < 0.55).slice(0, 2));
    listeners.forEach((lid, i) => {
      const p = (t - sc.voiceStart) / dur;
      let expr: Expression = "neutral";
      if (sc.listenerReaction !== "none" && reactors.has(lid) && p > 0.35 + i * 0.04 && p < 0.8) expr = sc.listenerReaction;
      const face = this.faceFor(lid, t, 0, f.frame, expr);
      const breath = 1 + 0.01 * Math.sin(t * 2.2 + i * 1.3);
      // listeners turn slightly toward the speaker
      const lean = (BACK_X[i] < 540 ? 1 : -1) * 0.04;
      this.drawCharacter(lid, BACK_X[i] * this.k, BACK_FEET * this.k, BACK_H * this.k, { expr: face, t, dim: 0.28, rot: lean, sy: breath, sx: 2 - breath });
    });
    this.drawWaterBand(1268, t, 0.75, 2);

    // speaker steps forward
    const enter = easeOutBack(clamp((local - 0.06) / 0.5));
    const env = this.envelopeAt(id, sc, t);
    const moodEnergy = { excited: 1.4, cheerful: 1.2, smug: 0.9, calm: 0.6, thoughtful: 0.6, worried: 1.1 }[sc.mood] ?? 1;
    const hopW = emphasisWords.reduce((a, w) => a + (t >= w.start ? Math.exp(-(t - w.start) * 7) * Math.sin(Math.min(Math.PI, (t - w.start) * 9)) : 0), 0);
    const talking = t >= sc.voiceStart && t <= sc.voiceEnd;
    const rot =
      Math.sin(t * 2.1) * (talking ? 0.03 : 0.012) * moodEnergy +
      hopW * 0.05 * (emphasisWords.length % 2 ? 1 : -1) +
      noise(t * 2.5, CHARACTER_ORDER.indexOf(id)) * 0.02 * env * moodEnergy;
    const sy = 1 + 0.03 * env * moodEnergy + 0.012 * Math.sin(t * 2.4);
    const sx = 1 - 0.015 * env * moodEnergy;
    const hop = (env * 12 + hopW * 26) * moodEnergy;
    const base: Expression = sc.mood === "cheerful" || sc.mood === "excited" ? "happy" : "neutral";
    const face = this.faceFor(id, t, env, f.frame, talking ? "neutral" : base);
    const feetY = SPEAKER_FEET + (1 - enter) * 520;
    this.drawCharacter(id, 540 * this.k, feetY * this.k, SPEAKER_H * this.k * lerp(0.8, 1, enter), {
      expr: face,
      t,
      rot,
      sx,
      sy,
      hop: hop * this.k,
    });
    const rise = this.waterRise(t);
    this.drawRipples(540 * this.k, (1660 - rise * 60) * this.k, t, 420);
    this.drawWaterBand(1650 - rise * 70, t, 1, 3);
    this.drawParticles(t, "front");
    this.drawDisclaimer();
    this.drawCharacterCard(id, sc, f);
    this.drawCaptions(sc.words, t, sc.emphasis, ch.accent);
  }

  /** Render one frame into the canvas and return its raw RGBA bytes. */
  renderFrame(sceneIndex: number, frame: number): Buffer {
    const sc = this.tl.scenes[sceneIndex];
    const t = frame / this.tl.fps;
    const f: FrameCtx = { t, local: t - sc.start, frame, scene: sc, next: this.tl.scenes[sceneIndex + 1], tl: this.tl };
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = "#101018";
    this.ctx.fillRect(0, 0, this.tl.width, this.tl.height);
    if (sc.kind === "response") this.drawResponseScene(f);
    else this.drawGroupScene(f);
    this.drawTransition(f);
    return this.canvas.data();
  }

  setBackgroundFrame(rgba: Buffer | null, w: number, h: number) {
    if (!rgba) {
      this.bgFrame = null;
      return;
    }
    if (!this.bgFrame || this.bgFrame.width !== w) this.bgFrame = createCanvas(w, h);
    const ctx = this.bgFrame.getContext("2d");
    const id = ctx.createImageData(w, h);
    id.data.set(rgba);
    ctx.putImageData(id, 0, 0);
  }

  snapshotPng(sceneIndex: number, frame: number): Buffer {
    this.renderFrame(sceneIndex, frame);
    return this.canvas.toBuffer("image/png");
  }
}

/** Uppercase for display, but keep "AIs" readable. */
export const upper = (s: string) => s.toUpperCase().replace(/\bAIS\b/g, "AIs");

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/** Group words into caption chunks: ≤3 words / ≤18 chars, breaking after punctuation. */
export function chunkWords(words: WordTiming[]): WordTiming[][] {
  const out: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  let chars = 0;
  for (const w of words) {
    const len = w.text.length;
    if (cur.length && (cur.length >= 3 || chars + len > 18)) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(w);
    chars += len + 1;
    if (/[.!?,;:…]$/.test(w.text)) {
      out.push(cur);
      cur = [];
      chars = 0;
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Background video frame source (optional fal image-to-video ambience)
class VideoFrameSource {
  private proc: ReturnType<typeof spawn> | null = null;
  private buf = Buffer.alloc(0);
  private waiters: (() => void)[] = [];
  private ended = false;
  constructor(
    private file: string,
    private w: number,
    private h: number,
    private fps: number,
  ) {}
  async start(atSeconds: number) {
    const dur = parseFloat((await probe(this.file)).format?.duration ?? "5") || 5;
    const ss = (atSeconds % dur).toFixed(3);
    this.proc = spawn(FFMPEG, [
      "-v", "error", "-stream_loop", "-1", "-ss", ss, "-i", this.file,
      "-vf", `scale=${this.w}:${this.h}:force_original_aspect_ratio=increase,crop=${this.w}:${this.h},fps=${this.fps}`,
      "-f", "rawvideo", "-pix_fmt", "rgba", "-",
    ]);
    this.proc.stdout!.on("data", (d: Buffer) => {
      this.buf = Buffer.concat([this.buf, d]);
      this.waiters.splice(0).forEach((f) => f());
      if (this.buf.length > this.w * this.h * 4 * 8) this.proc!.stdout!.pause();
    });
    this.proc.on("close", () => {
      this.ended = true;
      this.waiters.splice(0).forEach((f) => f());
    });
  }
  async next(): Promise<Buffer | null> {
    const size = this.w * this.h * 4;
    while (this.buf.length < size) {
      if (this.ended) return null;
      this.proc!.stdout!.resume();
      await new Promise<void>((r) => this.waiters.push(r));
    }
    const f = this.buf.subarray(0, size);
    this.buf = this.buf.subarray(size);
    return Buffer.from(f);
  }
  stop() {
    this.proc?.kill("SIGKILL");
  }
}

/** Render a scene to an H.264 mp4 (video only). Returns number of frames. */
export async function renderSceneToFile(
  renderer: SceneRenderer,
  tl: Timeline,
  sceneIndex: number,
  out: string,
  s: Settings,
  backgroundVideo?: string,
  onProgress?: (p: number) => void,
): Promise<number> {
  const sc = tl.scenes[sceneIndex];
  const f0 = Math.round(sc.start * tl.fps);
  const f1 = Math.round(sc.end * tl.fps);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn(FFMPEG, [
    "-hide_banner", "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${tl.width}x${tl.height}`, "-r", String(tl.fps), "-i", "-",
    "-c:v", "libx264", "-preset", s.video.preset, "-crf", String(s.video.crf), "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-r", String(tl.fps), "-movflags", "+faststart", out,
  ]);
  let err = "";
  ff.stderr.on("data", (d) => (err += d.toString()));
  const done = new Promise<void>((res, rej) => {
    ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg encode failed: ${err.slice(-800)}`))));
    ff.on("error", rej);
  });
  let bg: VideoFrameSource | null = null;
  if (backgroundVideo) {
    bg = new VideoFrameSource(backgroundVideo, tl.width, tl.height, tl.fps);
    await bg.start(sc.start);
  }
  try {
    for (let f = f0; f < f1; f++) {
      if (bg) renderer.setBackgroundFrame(await bg.next(), tl.width, tl.height);
      const frame = renderer.renderFrame(sceneIndex, f);
      if (!ff.stdin.write(frame)) await new Promise((r) => ff.stdin.once("drain", r));
      if (onProgress && (f - f0) % 30 === 0) onProgress((f - f0) / (f1 - f0));
    }
  } finally {
    bg?.stop();
    ff.stdin.end();
  }
  await done;
  return f1 - f0;
}
