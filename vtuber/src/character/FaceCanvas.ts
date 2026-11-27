import * as THREE from 'three';
import { clamp, lerp } from '../utils/math';

/**
 * Hand-drawn anime facial features (eyes, lashes, brows, mouth, blush)
 * rendered to a canvas each time the expression changes, then projected
 * onto a curved "face shell" around the placeholder's head.
 *
 * Canvas layout (512²) maps azimuth [-0.75, 0.75] rad → x and polar angle
 * [0.28π, 0.80π] → y on the head sphere.
 */
export const FACE_PHI = 0.75;
export const FACE_THETA0 = 0.28 * Math.PI;
export const FACE_THETA1 = 0.8 * Math.PI;

export interface FaceParams {
  blinkL: number; // character's left eye (screen right)
  blinkR: number;
  lookX: number; // -1..1 (screen right positive)
  lookY: number; // -1..1 (up positive)
  happy: number;
  angry: number;
  sad: number;
  surprised: number;
  relaxed: number;
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
}

const S = 512;

export class FaceCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private lastKey = '';
  eyeColor = '#3f8fe0';
  browColor = '#4a2f26';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = S;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  draw(p: FaceParams) {
    const q = (v: number) => Math.round(v * 60);
    const key = [p.blinkL, p.blinkR, p.lookX, p.lookY, p.happy, p.angry, p.sad, p.surprised, p.relaxed, p.aa, p.ih, p.ou, p.ee, p.oh]
      .map(q)
      .join(',') + this.eyeColor + this.browColor;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const c = this.ctx;
    c.clearRect(0, 0, S, S);
    this.drawBlush(p);
    this.drawNose();
    this.drawEye(377, 272, 1, p.blinkL, p);
    this.drawEye(135, 272, -1, p.blinkR, p);
    this.drawBrow(374, 172, 1, p);
    this.drawBrow(138, 172, -1, p);
    this.drawMouth(256, 398, p);
    this.texture.needsUpdate = true;
  }

  private drawBlush(p: FaceParams) {
    const c = this.ctx;
    const a = 0.22 + p.happy * 0.25 + p.surprised * 0.08;
    for (const x of [112, 400]) {
      const g = c.createRadialGradient(x, 338, 2, x, 338, 46);
      g.addColorStop(0, `rgba(255,120,150,${a})`);
      g.addColorStop(1, 'rgba(255,120,150,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(x, 338, 52, 30, 0, 0, Math.PI * 2);
      c.fill();
      if (p.happy > 0.6) {
        c.strokeStyle = `rgba(230,90,120,${(p.happy - 0.6) * 1.2})`;
        c.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(x + i * 12 - 4, 344);
          c.lineTo(x + i * 12 + 4, 332);
          c.stroke();
        }
      }
    }
  }

  private drawNose() {
    const c = this.ctx;
    c.strokeStyle = 'rgba(190,120,110,0.55)';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(252, 336);
    c.quadraticCurveTo(258, 342, 262, 338);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(258, 322, 3, 7, 0, 0, Math.PI * 2);
    c.fill();
  }

  private eyePath(o: number, W: number, H: number, open: number, smile: number, p: FaceParams) {
    // o = +1 outer corner towards +x
    const c = this.ctx;
    const innerY = H * 0.14 + p.angry * H * 0.05;
    const outerY = -H * 0.06 + p.sad * H * 0.22 - p.angry * H * 0.05;
    const upperOpen = -H * (0.66 + p.surprised * 0.12);
    const upperClosed = H * 0.42;
    const u1 = lerp(upperClosed, upperOpen + p.angry * H * 0.34, open); // inner side of upper lid
    const u2 = lerp(upperClosed, upperOpen + p.sad * H * 0.25 - p.angry * H * 0.05, open);
    const lower = lerp(H * 0.58, -H * 0.2, smile);
    c.beginPath();
    c.moveTo(-o * W * 0.5, innerY);
    c.bezierCurveTo(-o * W * 0.3, u1, o * W * 0.28, u2, o * W * 0.5, outerY);
    c.bezierCurveTo(o * W * 0.3, lower, -o * W * 0.25, lower * 1.02, -o * W * 0.5, innerY);
    c.closePath();
    return { innerY, outerY, u1, u2 };
  }

  private drawEye(cx: number, cy: number, o: number, blink: number, p: FaceParams) {
    const c = this.ctx;
    const smile = clamp((p.happy - 0.55) * 2.2) * 0.85 + p.relaxed * 0.3;
    const W = 126 * (1 + p.surprised * 0.06);
    const H = 108 * (1 + p.surprised * 0.1);
    const open = clamp(1 - blink) * (1 - smile * 0.25) * (1 - p.relaxed * 0.35);

    c.save();
    c.translate(cx, cy);

    if (open < 0.12 || smile > 0.92) {
      // Closed eye: a curved lash line ("^" when smiling).
      c.strokeStyle = '#2a171d';
      c.lineWidth = 6;
      c.lineCap = 'round';
      c.beginPath();
      if (smile > 0.5) {
        c.moveTo(-W * 0.45, H * 0.15);
        c.quadraticCurveTo(0, -H * 0.45, W * 0.45, H * 0.15);
      } else {
        c.moveTo(-W * 0.48, H * 0.12);
        c.quadraticCurveTo(0, H * 0.42, W * 0.48, H * 0.05);
        // lashes
        c.moveTo(o * W * 0.45, H * 0.07);
        c.lineTo(o * W * 0.6, -H * 0.02);
      }
      c.stroke();
      c.restore();
      return;
    }

    const shape = this.eyePath(o, W, H, open, smile, p);
    c.save();
    c.clip();
    // sclera
    c.fillStyle = '#fbf8ff';
    c.fillRect(-W, -H, W * 2, H * 2);
    // iris
    const ix = p.lookX * W * 0.2;
    const iy = -p.lookY * H * 0.16 + H * 0.06;
    const irx = W * 0.34 * (1 - p.surprised * 0.12);
    const iry = H * 0.52 * (1 - p.surprised * 0.08);
    const g = c.createLinearGradient(0, iy - iry, 0, iy + iry);
    g.addColorStop(0, shade(this.eyeColor, -0.55));
    g.addColorStop(0.45, this.eyeColor);
    g.addColorStop(1, shade(this.eyeColor, 0.55));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = shade(this.eyeColor, -0.65);
    c.stroke();
    // inner iris detail ring
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(ix, iy + 2, irx * 0.72, iry * 0.75, 0, 0, Math.PI * 2);
    c.stroke();
    // pupil
    c.fillStyle = shade(this.eyeColor, -0.75);
    c.beginPath();
    c.ellipse(ix, iy, irx * 0.36, iry * 0.4 * (1 - p.surprised * 0.3), 0, 0, Math.PI * 2);
    c.fill();
    // lid shadow
    const ls = c.createLinearGradient(0, -H * 0.7, 0, H * 0.1);
    ls.addColorStop(0, 'rgba(70,30,80,0.55)');
    ls.addColorStop(1, 'rgba(70,30,80,0)');
    c.fillStyle = ls;
    c.fillRect(-W, -H, W * 2, H * 1.1);
    // highlights
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath();
    c.ellipse(ix - irx * 0.35, iy - iry * 0.4, irx * 0.3, iry * 0.22, -0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath();
    c.ellipse(ix + irx * 0.35, iy + iry * 0.42, irx * 0.13, iry * 0.09, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(200,235,255,0.35)';
    c.beginPath();
    c.ellipse(ix, iy + iry * 0.55, irx * 0.6, iry * 0.18, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // upper lash line
    c.strokeStyle = '#24141a';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 7.5;
    c.beginPath();
    c.moveTo(-o * W * 0.52, shape.innerY + 2);
    c.bezierCurveTo(-o * W * 0.3, shape.u1, o * W * 0.28, shape.u2, o * W * 0.5, shape.outerY);
    c.stroke();
    // lash flick + individual lashes at the outer corner
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(o * W * 0.48, shape.outerY);
    c.quadraticCurveTo(o * W * 0.62, shape.outerY - H * 0.12, o * W * 0.7, shape.outerY - H * 0.26);
    c.moveTo(o * W * 0.4, shape.outerY - H * 0.25 * open);
    c.lineTo(o * W * 0.58, shape.outerY - H * 0.42 * open);
    c.moveTo(o * W * 0.28, (shape.u2 * 0.75) );
    c.lineTo(o * W * 0.4, shape.u2 * 0.75 - H * 0.18);
    c.stroke();
    // double-eyelid crease
    c.strokeStyle = 'rgba(150,80,90,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-o * W * 0.22, shape.u1 * 0.9 - H * 0.1);
    c.quadraticCurveTo(o * W * 0.05, Math.min(shape.u1, shape.u2) - H * 0.16, o * W * 0.4, shape.u2 * 0.82 - H * 0.1);
    c.stroke();
    // lower lashes
    const lower = lerp(H * 0.58, -H * 0.2, smile);
    c.strokeStyle = 'rgba(60,30,40,0.7)';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(o * W * 0.46, shape.outerY + H * 0.1);
    c.quadraticCurveTo(o * W * 0.2, lower * 0.98, -o * W * 0.05, lower * 0.95);
    c.stroke();
    c.restore();
  }

  private drawBrow(cx: number, cy: number, o: number, p: FaceParams) {
    const c = this.ctx;
    const innerDy = p.angry * 18 - p.sad * 16 - p.surprised * 16 + p.happy * -3;
    const outerDy = -p.angry * 6 + p.sad * 8 - p.surprised * 14 - p.happy * 2;
    c.save();
    c.translate(cx, cy);
    c.fillStyle = this.browColor;
    c.beginPath();
    const ix = -o * 46;
    const ox = o * 52;
    c.moveTo(ix, innerDy + 3);
    c.quadraticCurveTo(0, -12 + (innerDy + outerDy) * 0.5, ox, outerDy + 2);
    c.quadraticCurveTo(0, -4 + (innerDy + outerDy) * 0.5, ix, innerDy + 9);
    c.closePath();
    c.fill();
    c.restore();
  }

  private drawMouth(cx: number, cy: number, p: FaceParams) {
    const c = this.ctx;
    const open = clamp(p.aa + p.oh * 0.8 + p.ou * 0.55 + p.ih * 0.4 + p.ee * 0.35 + p.surprised * 0.15);
    const wide = p.ee * 0.5 + p.ih * 0.35 - p.ou * 0.55 - p.oh * 0.3 + p.happy * 0.3 - p.surprised * 0.2;
    const smile = p.happy * 1.0 - p.sad * 0.9 - p.angry * 0.6;
    const w = 40 * (1 + wide);
    c.save();
    c.translate(cx, cy);
    c.lineCap = 'round';
    if (open < 0.06) {
      c.strokeStyle = '#a24d55';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-w / 2, -smile * 5);
      c.quadraticCurveTo(0, smile * 9, w / 2, -smile * 5);
      c.stroke();
      c.restore();
      return;
    }
    const h = 6 + open * 40;
    const topY = -smile * 4 - h * 0.15;
    c.beginPath();
    c.moveTo(-w / 2, -smile * 5);
    c.quadraticCurveTo(0, topY, w / 2, -smile * 5);
    c.quadraticCurveTo(w * 0.42, h * 0.9, 0, h);
    c.quadraticCurveTo(-w * 0.42, h * 0.9, -w / 2, -smile * 5);
    c.closePath();
    c.fillStyle = '#6a1d2c';
    c.fill();
    c.save();
    c.clip();
    // tongue
    c.fillStyle = '#e07282';
    c.beginPath();
    c.ellipse(0, h * 0.95, w * 0.34, h * 0.35, 0, 0, Math.PI * 2);
    c.fill();
    // upper teeth
    if (open > 0.25) {
      c.fillStyle = '#fffafa';
      c.fillRect(-w / 2, topY - 4, w, 4 + h * 0.13);
    }
    c.restore();
    c.strokeStyle = '#8c3a45';
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();
  }

  dispose() {
    this.texture.dispose();
  }
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  r = Math.round(r + (t - r) * a);
  g = Math.round(g + (t - g) * a);
  b = Math.round(b + (t - b) * a);
  return `rgb(${r},${g},${b})`;
}
