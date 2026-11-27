import sharp from "sharp";

/**
 * Character-sheet slicer.
 *
 * Takes an expression sheet (grid of panels showing the same character), isolates the
 * character in each panel (removing grid lines / white backgrounds), then registers every panel
 * against the first one using the lower body (which does not change between expressions) so
 * that swapping sprites frame-to-frame only changes the face — no jitter.
 */

export interface SlicedSprite {
  name: string;
  png: Buffer;
  width: number;
  height: number;
}
export interface SliceResult {
  sprites: SlicedSprite[];
  anchor: { x: number; y: number; bodyHeight: number };
  shifts: Record<string, { dx: number; dy: number; score: number }>;
}

interface Rgba {
  data: Buffer;
  width: number;
  height: number;
}

async function loadRgba(input: string | Buffer): Promise<Rgba> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function crop(src: Rgba, x0: number, y0: number, w: number, h: number): Rgba {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const s = ((y0 + y) * src.width + x0) * 4;
    src.data.copy(out, y * w * 4, s, s + w * 4);
  }
  return { data: out, width: w, height: h };
}

/** Remove a near-white background connected to the panel border (for sheets without alpha). */
function keyOutBorderWhite(img: Rgba, tol = 26) {
  const { data, width, height } = img;
  const isBg = (i: number) =>
    data[i + 3] > 0 && data[i] > 255 - tol && data[i + 1] > 255 - tol && data[i + 2] > 255 - tol;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const p = y * width + x;
    if (!seen[p] && isBg(p * 4)) {
      seen[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    data[p * 4 + 3] = 0;
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
}

function hasTransparency(img: Rgba): boolean {
  let transparent = 0;
  const n = img.width * img.height;
  for (let i = 3; i < img.data.length; i += 16) if (img.data[i] < 16) transparent++;
  return transparent / (n / 4) > 0.2;
}

interface Component {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  pixels: Int32Array;
}

function components(img: Rgba, thr = 24): Component[] {
  const { data, width, height } = img;
  const label = new Int32Array(width * height).fill(-1);
  const comps: Component[] = [];
  const stack = new Int32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    if (label[p] !== -1 || data[p * 4 + 3] < thr) continue;
    let sp = 0;
    stack[sp++] = p;
    label[p] = comps.length;
    const px: number[] = [];
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;
    while (sp) {
      const q = stack[--sp];
      px.push(q);
      const x = q % width;
      const y = (q / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const nb = [x > 0 ? q - 1 : -1, x < width - 1 ? q + 1 : -1, y > 0 ? q - width : -1, y < height - 1 ? q + width : -1];
      for (const n of nb) {
        if (n >= 0 && label[n] === -1 && data[n * 4 + 3] >= thr) {
          label[n] = comps.length;
          stack[sp++] = n;
        }
      }
    }
    comps.push({ minX, minY, maxX, maxY, area: px.length, pixels: Int32Array.from(px) });
  }
  return comps;
}

/** Keep the character (largest component) plus decorative bits; drop grid lines and specks. */
function cleanPanel(img: Rgba): Component {
  const comps = components(img);
  if (!comps.length) throw new Error("empty panel: no character found");
  comps.sort((a, b) => b.area - a.area);
  const main = comps[0];
  const keep = new Set<Component>([main]);
  for (const c of comps.slice(1)) {
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    const thinLine = (w > img.width * 0.5 && h < 10) || (h > img.height * 0.5 && w < 10);
    if (!thinLine && c.area >= main.area * 0.0015) keep.add(c);
  }
  // also detect lines fused to the panel edge: rows/cols that are opaque across >85% of width
  const alphaOut = Buffer.alloc(img.width * img.height);
  for (const c of keep) for (const p of c.pixels) alphaOut[p] = 1;
  for (let p = 0; p < img.width * img.height; p++) if (!alphaOut[p]) img.data[p * 4 + 3] = 0;
  return main;
}

function alphaMask(img: Rgba, scale: number): { m: Float32Array; w: number; h: number } {
  const w = Math.floor(img.width / scale);
  const h = Math.floor(img.height / scale);
  const m = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = y * scale;
    for (let x = 0; x < w; x++) m[y * w + x] = img.data[(sy * img.width + x * scale) * 4 + 3] / 255;
  }
  return { m, w, h };
}

function iou(a: Float32Array, b: Float32Array, w: number, h: number, dx: number, dy: number, rows?: [number, number]): number {
  let inter = 0,
    uni = 0;
  const r0 = rows ? Math.max(0, rows[0]) : 0;
  const r1 = rows ? Math.min(h - 1, rows[1]) : h - 1;
  for (let y = r0; y <= r1; y++) {
    const by = y - dy;
    for (let x = 0; x < w; x++) {
      const av = a[y * w + x];
      const bx = x - dx;
      const bv = by >= 0 && by < h && bx >= 0 && bx < w ? b[by * w + bx] : 0;
      inter += Math.min(av, bv);
      uni += Math.max(av, bv);
    }
  }
  return uni ? inter / uni : 0;
}

/** Find (dx,dy) that moves `img` onto `ref`, using only the lower body region. */
function register(ref: Rgba, img: Rgba, body: { y0: number; y1: number }) {
  const coarse = 4;
  // seed with centroid difference of the opaque pixels (handles panels drawn off-centre)
  const centroid = (im: Rgba) => {
    let sx = 0,
      sy = 0,
      n = 0;
    for (let y = 0; y < im.height; y += 2)
      for (let x = 0; x < im.width; x += 2)
        if (im.data[(y * im.width + x) * 4 + 3] > 128) {
          sx += x;
          sy += y;
          n++;
        }
    return { x: n ? sx / n : 0, y: n ? sy / n : 0 };
  };
  const cr = centroid(ref);
  const ci = centroid(img);
  const gx = Math.round((cr.x - ci.x) / coarse);
  const gy = Math.round((cr.y - ci.y) / coarse);
  const A = alphaMask(ref, coarse);
  const B = alphaMask(img, coarse);
  const rowsC: [number, number] = [Math.floor(body.y0 / coarse), Math.ceil(body.y1 / coarse)];
  let best = { dx: 0, dy: 0, score: -1 };
  for (let dy = gy - 14; dy <= gy + 14; dy++)
    for (let dx = gx - 14; dx <= gx + 14; dx++) {
      const s = iou(A.m, B.m, A.w, A.h, dx, dy, rowsC);
      if (s > best.score) best = { dx, dy, score: s };
    }
  const fine = 2;
  const A2 = alphaMask(ref, fine);
  const B2 = alphaMask(img, fine);
  const rowsF: [number, number] = [Math.floor(body.y0 / fine), Math.ceil(body.y1 / fine)];
  let best2 = { dx: best.dx * 2, dy: best.dy * 2, score: -1 };
  for (let dy = best.dy * 2 - 3; dy <= best.dy * 2 + 3; dy++)
    for (let dx = best.dx * 2 - 3; dx <= best.dx * 2 + 3; dx++) {
      const s = iou(A2.m, B2.m, A2.w, A2.h, dx, dy, rowsF);
      if (s > best2.score) best2 = { dx, dy, score: s };
    }
  return { dx: best2.dx * fine, dy: best2.dy * fine, score: best2.score };
}

/** Scale a panel about its centre, keeping the canvas size. */
async function scalePanel(img: Rgba, scale: number): Promise<Rgba> {
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const resized = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .resize(w, h)
    .raw()
    .toBuffer();
  const out = Buffer.alloc(img.width * img.height * 4);
  const ox = Math.round((img.width - w) / 2);
  const oy = Math.round((img.height - h) / 2);
  for (let y = 0; y < img.height; y++) {
    const sy = y - oy;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < img.width; x++) {
      const sx = x - ox;
      if (sx < 0 || sx >= w) continue;
      resized.copy(out, (y * img.width + x) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
    }
  }
  return { data: out, width: img.width, height: img.height };
}

export async function sliceSheet(
  input: string | Buffer,
  opts: { rows: number; cols: number; names: string[]; referenceName?: string },
): Promise<SliceResult> {
  const sheet = await loadRgba(input);
  const pw = Math.floor(sheet.width / opts.cols);
  const ph = Math.floor(sheet.height / opts.rows);
  const margin = Math.round(Math.min(pw, ph) * 0.012);
  const transparent = hasTransparency(sheet);

  const panels: { name: string; img: Rgba; main: Component }[] = [];
  for (let r = 0; r < opts.rows; r++)
    for (let c = 0; c < opts.cols; c++) {
      const name = opts.names[r * opts.cols + c];
      if (!name) continue;
      const img = crop(sheet, c * pw + margin, r * ph + margin, pw - 2 * margin, ph - 2 * margin);
      if (!transparent) keyOutBorderWhite(img);
      const main = cleanPanel(img);
      panels.push({ name, img, main });
    }

  const refIdx = Math.max(0, panels.findIndex((p) => p.name === (opts.referenceName ?? "neutral")));
  const ref = panels[refIdx];
  const bodyH = ref.main.maxY - ref.main.minY;
  // lower ~45% of the body (torso + legs) never changes between expressions
  const bodyRegion = { y0: ref.main.minY + bodyH * 0.55, y1: ref.main.maxY };

  const shifts: SliceResult["shifts"] = {};
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  // Image models sometimes draw a panel at a slightly different scale: search scale too.
  for (let i = 0; i < panels.length; i++) {
    if (i === refIdx) continue;
    const base = register(ref.img, panels[i].img, bodyRegion);
    if (base.score >= 0.97) continue;
    let best = { img: panels[i].img, score: base.score };
    for (let k = -10; k <= 10; k++) {
      const sc = 1 + k * 0.01;
      if (k === 0) continue;
      const scaled = await scalePanel(panels[i].img, sc);
      const r = register(ref.img, scaled, bodyRegion);
      if (r.score > best.score) best = { img: scaled, score: r.score };
    }
    panels[i].img = best.img;
  }

  const placed = panels.map((p, i) => {
    const s = i === refIdx ? { dx: 0, dy: 0, score: 1 } : register(ref.img, p.img, bodyRegion);
    shifts[p.name] = s;
    // bounding box of all opaque pixels after shift
    const { data, width, height } = p.img;
    const bb = { x0: width, y0: height, x1: -1, y1: -1 };
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (x < bb.x0) bb.x0 = x;
          if (x > bb.x1) bb.x1 = x;
          if (y < bb.y0) bb.y0 = y;
          if (y > bb.y1) bb.y1 = y;
        }
    minX = Math.min(minX, bb.x0 + s.dx);
    maxX = Math.max(maxX, bb.x1 + s.dx);
    minY = Math.min(minY, bb.y0 + s.dy);
    maxY = Math.max(maxY, bb.y1 + s.dy);
    return { ...p, s, bb };
  });

  const pad = 12;
  const ox = Math.floor(minX) - pad;
  const oy = Math.floor(minY) - pad;
  const W = Math.ceil(maxX - minX) + 2 * pad + 1;
  const H = Math.ceil(maxY - minY) + 2 * pad + 1;

  const sprites: SlicedSprite[] = [];
  for (const p of placed) {
    const piece = crop(p.img, p.bb.x0, p.bb.y0, p.bb.x1 - p.bb.x0 + 1, p.bb.y1 - p.bb.y0 + 1);
    const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        {
          input: await sharp(piece.data, { raw: { width: piece.width, height: piece.height, channels: 4 } }).png().toBuffer(),
          left: p.bb.x0 + p.s.dx - ox,
          top: p.bb.y0 + p.s.dy - oy,
        },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();
    sprites.push({ name: p.name, png, width: W, height: H });
  }

  // feet anchor: centre of mass of the lowest 12% of the reference body
  const { data, width } = ref.img;
  let sx = 0,
    n = 0;
  const yStart = ref.main.maxY - bodyH * 0.12;
  for (const q of ref.main.pixels) {
    const y = (q / width) | 0;
    if (y >= yStart && data[q * 4 + 3] > 128) {
      sx += q % width;
      n++;
    }
  }
  const anchor = {
    x: Math.round((n ? sx / n : (ref.main.minX + ref.main.maxX) / 2) - ox),
    y: Math.round(ref.main.maxY - oy),
    bodyHeight: bodyH,
  };
  return { sprites, anchor, shifts };
}
