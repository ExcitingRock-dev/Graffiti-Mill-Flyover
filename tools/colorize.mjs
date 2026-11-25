// Turn a cut-out elevation (linework PNG) into a material-colored facade.
// Classifies each pixel by the hatch pattern around it (A601 wall types):
//   brick hatch -> EXB existing brick, vertical lines -> PM metal panel,
//   speckle -> EXC existing concrete, block grid -> EXM existing CMU,
//   closed rectangular white areas -> glazing (warm lit interior).
// usage: node tools/colorize.mjs <in.png> <out.png> [debug.png]
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
import path from "node:path";

// ---- Palette (edit here) -------------------------------------------------
const MAT = {
  brick: { base: [216, 196, 154], line: [178, 158, 118] }, // cream / buff
  metal: { base: [42, 38, 34], line: [70, 64, 56] }, // black / dark bronze
  concrete: { base: [190, 189, 184], line: [150, 149, 144] }, // natural light gray
  cmu: { base: [198, 197, 192], line: [160, 159, 154] }, // natural light gray
  plain: { base: [214, 210, 202], line: [120, 118, 114] }, // unhatched (precast etc.)
  precast: { base: [178, 177, 172], line: [128, 127, 123] }, // grey precast concrete (zone only), mottled + speckled
};
const FRAME = [26, 26, 28]; // black anodized
const GLOW_TOP = [255, 222, 170];
const GLOW_BOT = [236, 160, 86];
// ---------------------------------------------------------------------------

const [, , inFile, outFile, debugFile] = process.argv;
const facadeName = path.basename(inFile, ".png");
const overrides = JSON.parse(
  await fs.readFile(new URL("./colorize-overrides.json", import.meta.url), "utf8"),
)[facadeName] ?? {};
overrides.zones ??= [];
overrides.notGlass ??= [];
overrides.erase ??= [];
const inRects = (rects, x, y) => rects.some(([a, b, c, e]) => x >= a && x <= c && y >= b && y <= e);
const img = await loadImage(inFile);
const W = img.width, H = img.height, N = W * H;
const cv = createCanvas(W, H);
const g = cv.getContext("2d");
g.drawImage(img, 0, 0);
const id = g.getImageData(0, 0, W, H);
const d = id.data;

// 00) Hand patches on the raw linework, in order (colorize-overrides.json
// "patches"). Used to take drawn-over elements (stairs, guards now built in 3D)
// off a facade and restore what is behind them.
//   tile:   fill polygon `poly` by repeating raw tile `src` [x, y, w, h]
//           (w, h = multiples of the hatch period so seams line up)
//   clone:  copy rect [x0, y0, x1, y1] from the same rect shifted by `from` [dx, dy]
//   window: clean frame: white rect, 2 px outline, mullions at x in `v`, transoms at y in `h`
//   lines:  ink segments [[x0, y0, x1, y1], ...] (2 px)
//   white:  rect filled white
{
  const src = new Uint8ClampedArray(d);
  const put = (x, y, v) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  };
  const copy = (x, y, sx, sy) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, j = (sy * W + sx) * 4;
    for (let k = 0; k < 4; k++) d[i + k] = src[j + k];
  };
  const inPoly = (poly, x, y) => {
    let c = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a], [xb, yb] = poly[b];
      if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c;
    }
    return c;
  };
  const seg = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let t = 0; t <= n; t++) {
      const x = Math.round(x0 + ((x1 - x0) * t) / n), y = Math.round(y0 + ((y1 - y0) * t) / n);
      put(x, y, 30); put(x + (x1 === x0 ? 1 : 0), y + (y1 === y0 ? 1 : 0), 30);
    }
  };
  for (const pt of overrides.patches ?? []) {
    if (pt.op === "tile") {
      const [sx, sy, tw, th] = pt.src;
      const xs = pt.poly.map((p) => p[0]), ys = pt.poly.map((p) => p[1]);
      for (let y = Math.min(...ys); y <= Math.max(...ys); y++)
        for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
          if (inPoly(pt.poly, x + 0.5, y + 0.5))
            copy(x, y, sx + (((x - sx) % tw) + tw) % tw, sy + (((y - sy) % th) + th) % th);
    } else if (pt.op === "clone") {
      const [x0, y0, x1, y1] = pt.rect, [dx, dy] = pt.from;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) copy(x, y, x + dx, y + dy);
    } else if (pt.op === "white") {
      const [x0, y0, x1, y1] = pt.rect;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, 255);
    } else if (pt.op === "window") {
      const [x0, y0, x1, y1] = pt.rect;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, 255);
      seg(x0, y0, x1, y0); seg(x0, y1, x1, y1); seg(x0, y0, x0, y1); seg(x1 - 1, y0, x1 - 1, y1);
      for (const x of pt.v ?? []) seg(x, y0, x, y1);
      for (const y of pt.h ?? []) seg(x0, y, x1, y);
    } else if (pt.op === "lines") {
      for (const [x0, y0, x1, y1] of pt.segs) seg(x0, y0, x1, y1);
    }
  }
  if (process.env.PATCHED) {
    g.putImageData(id, 0, 0);
    await fs.writeFile(process.env.PATCHED, await cv.encode("png"));
  }
}

const alpha = new Uint8Array(N);
const ink = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * 4;
  alpha[p] = d[i + 3] > 128 && !inRects(overrides.erase, p % W, (p / W) | 0) ? 1 : 0;
  ink[p] = alpha[p] && (d[i] + d[i + 1] + d[i + 2]) / 3 < 150 ? 1 : 0;
}

// 0) Window tags: diamond symbols ("W4", "W68") drawn over the lites. Found by
// their four 45-degree edges (nothing else on these sheets has long diagonals),
// then outline + text are erased. Long straight lines that run through the
// diamond (frames, mullions, metal ribs) are kept.
const TAG = { rMin: 10, rMax: 34, minRun: 8, edgeScore: 0.8, pad: 3 };
let tagCount = 0;
{
  // "dark" is looser than ink: thin anti-aliased diagonals render mid-gray
  const dk = new Uint8Array(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    dk[p] = alpha[p] && (d[i] + d[i + 1] + d[i + 2]) / 3 < 200 ? 1 : 0;
  }
  const isDk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && dk[y * W + x];
  const near = (x, y) => isDk(x, y) || isDk(x - 1, y) || isDk(x + 1, y);
  // diagonal run lengths going down-right (DR) and down-left (DL)
  const DR = new Uint16Array(N), DL = new Uint16Array(N);
  for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!dk[p]) continue;
    DR[p] = 1 + (y < H - 1 && x < W - 1 ? DR[p + W + 1] : 0);
    DL[p] = 1 + (y < H - 1 && x > 0 ? DL[p + W - 1] : 0);
  }
  const edge = (pts) => pts.filter(([x, y]) => near(x, y)).length / pts.length;
  const tags = [];
  for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (DL[p] < TAG.minRun || Math.max(DR[p], DR[p + 1]) < TAG.minRun) continue;
    if (tags.some(([cx, cy, r]) => Math.abs(cx - x) <= 4 && Math.abs(cy - r - y) <= 4)) continue;
    let best = null;
    for (let r = TAG.rMin; r <= TAG.rMax; r++) {
      const ul = [], ur = [], ll = [], lr = [];
      for (let t = 1; t < r; t++) {
        ul.push([x - t, y + t]); ur.push([x + t, y + t]);
        ll.push([x - r + t, y + r + t]); lr.push([x + r - t, y + r + t]);
      }
      const s = Math.min(edge(ul), edge(ur), edge(ll), edge(lr));
      if (s >= TAG.edgeScore && (!best || s > best.s)) best = { r, s };
    }
    if (!best) continue;
    const { r } = best, cx = x, cy = y + r;
    // reject solid dark blobs: a tag's inside is mostly white
    let dark = 0, tot = 0;
    for (let yy = cy - r + 2; yy <= cy + r - 2; yy++) for (let xx = cx - r + 2; xx <= cx + r - 2; xx++)
      if (Math.abs(xx - cx) + Math.abs(yy - cy) < r - 2) { tot++; dark += isDk(xx, yy) ? 1 : 0; }
    if (dark / tot > 0.45) continue;
    tags.push([cx, cy, r]);
  }
  for (const [cx, cy, r] of tags) {
    const R = Math.ceil(r + TAG.pad);
    const inD = (x, y) => Math.abs(x - cx) + Math.abs(y - cy) <= R;
    const isInk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ink[y * W + x];
    const set = (x, y, v) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const p = y * W + x;
      ink[p] = v;
      const i = p * 4;
      d[i] = d[i + 1] = d[i + 2] = v ? 40 : 255;
    };
    // a real line arrives at the tag and leaves it as a solid straight run
    // and is not part of a hatch: metal ribs have 2+ other lines within 7 px on
    // BOTH sides; a frame or mullion (even a doubled one) has at most its twin
    // on at least one side.
    const run = (f) => [0, 1, 2, 3, 4, 5, 6, 7].every(f);
    const lines = (f) => {
      let n = 0, prev = 1; // start "on ink" so the line itself is not counted
      for (let k = 1; k <= 7; k++) { const v = f(k) ? 1 : 0; if (v && !prev) n++; prev = v; }
      return n;
    };
    // (counted with the looser "dark" test: half the ribs render light gray)
    const vLine = (x, y) => Math.min(lines((k) => isDk(x - k, y)), lines((k) => isDk(x + k, y))) <= 1;
    const hLine = (x, y) => Math.min(lines((k) => isDk(x, y - k)), lines((k) => isDk(x, y + k))) <= 1;
    const bridges = [];
    for (let dx = -R; dx <= R; dx++) {
      const x = cx + dx, span = R - Math.abs(dx);
      const yt = cy - span - 1, yb = cy + span + 1;
      if (run((k) => isInk(x, yt - k)) && run((k) => isInk(x, yb + k)) &&
        [2, 6].every((k) => vLine(x, yt - k) && vLine(x, yb + k)))
        for (let y = yt; y <= yb; y++) bridges.push([x, y]);
    }
    for (let dy = -R; dy <= R; dy++) {
      const y = cy + dy, span = R - Math.abs(dy);
      const xl = cx - span - 1, xr = cx + span + 1;
      if (run((k) => isInk(xl - k, y)) && run((k) => isInk(xr + k, y)) &&
        [2, 6].every((k) => hLine(xl - k, y) && hLine(xr + k, y)))
        for (let x = xl; x <= xr; x++) bridges.push([x, y]);
    }
    // erase outline + text, then redraw the lines the tag was hiding
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++)
      if (inD(x, y)) set(x, y, 0);
    for (const [x, y] of bridges) set(x, y, 1);
    tagCount++;
  }
}

// 1) Glazing: connected non-ink areas that are clean rectangles of window size.
const comp = new Int32Array(N).fill(-1);
const glass = new Uint8Array(N);
const glassBoxes = [];
const liteBox = new Map();
{
  const stack = [];
  let lab = 0;
  for (let s = 0; s < N; s++) {
    if (!alpha[s] || ink[s] || comp[s] >= 0) continue;
    let area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    const pix = [];
    stack.push(s); comp[s] = lab;
    while (stack.length) {
      const p = stack.pop(); area++; pix.push(p);
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
        if (q >= 0 && alpha[q] && !ink[q] && comp[q] < 0) { comp[q] = lab; stack.push(q); }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const fill = area / (bw * bh);
    const squareish = Math.abs(bw - bh) / Math.max(bw, bh) < 0.08;
    const forced = inRects(overrides.notGlass, (x0 + x1) >> 1, (y0 + y1) >> 1);
    if (!forced && (fill > 0.8 || (squareish && fill > 0.72)) && Math.min(bw, bh) >= 18 && Math.max(bw, bh) / Math.min(bw, bh) <= 8 && area >= 600 && area <= 90000) {
      for (const p of pix) glass[p] = 1;
      glassBoxes.push([x0, y0, x1, y1, lab]);
      liteBox.set(lab, [y0, y1]);
    }
    lab++;
  }
}
// Tag diamonds / text inside a lite become glass too
for (const [x0, y0, x1, y1, lab] of glassBoxes) {
  for (let y = y0 + 3; y <= y1 - 3; y++) for (let x = x0 + 3; x <= x1 - 3; x++) {
    const p = y * W + x;
    if (ink[p]) { glass[p] = 1; comp[p] = lab; }
  }
}

// 2) Windowed hatch statistics over non-glass pixels (integral images).
const R = 15;
const mk = () => new Float64Array((W + 1) * (H + 1));
const S = { n: mk(), ink: mk(), h: mk(), v: mk(), th: mk(), tv: mk() };
for (let y = 0; y < H; y++) {
  const rs = { n: 0, ink: 0, h: 0, v: 0, th: 0, tv: 0 };
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (alpha[p] && !glass[p]) {
      rs.n++;
      const a = ink[p];
      const r = x < W - 1 ? ink[p + 1] : 0;
      const b = y < H - 1 ? ink[p + W] : 0;
      if (a) { rs.ink++; if (r) rs.h++; if (b) rs.v++; }
      if (a !== r) rs.th++;
      if (a !== b) rs.tv++;
    }
    const k = (y + 1) * (W + 1) + (x + 1);
    for (const key in S) S[key][k] = S[key][k - (W + 1)] + rs[key];
  }
}
const box = (A, x, y, r = R) => {
  const xa = Math.max(0, x - r), ya = Math.max(0, y - r);
  const xb = Math.min(W, x + r + 1), yb = Math.min(H, y + r + 1);
  return A[yb * (W + 1) + xb] - A[ya * (W + 1) + xb] - A[yb * (W + 1) + xa] + A[ya * (W + 1) + xa];
};

const CLS = { plain: 0, brick: 1, metal: 2, concrete: 3, cmu: 4, precast: 5 };
const NAMES = ["plain", "brick", "metal", "concrete", "cmu", "precast"];
const cls = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (!alpha[p] || glass[p]) continue;
  const n = box(S.n, x, y) || 1;
  const k = box(S.ink, x, y);
  const dens = k / n;
  const hr = k ? box(S.h, x, y) / k : 0;
  const vr = k ? box(S.v, x, y) / k : 0;
  const tH = box(S.th, x, y) / n;
  const tV = box(S.tv, x, y) / n;
  const tHa = box(S.th, x, y) / ((2 * R + 1) * (2 * R + 1)); // full-area rate
  // metal: vertical ribs across a wide window, normalized by full area so a lone
  // mullion next to glass does not qualify
  const R2 = 30;
  const k2 = box(S.ink, x, y, R2);
  const vr2 = k2 ? box(S.v, x, y, R2) / k2 : 0;
  const hr2 = k2 ? box(S.h, x, y, R2) / k2 : 0;
  const tH2 = box(S.th, x, y, R2) / ((2 * R2 + 1) * (2 * R2 + 1));
  let c = CLS.plain;
  if ((vr2 > 0.85 && hr2 < 0.2 && tH2 > 0.08) || (vr > 0.8 && hr < 0.25 && tHa > 0.14)) c = CLS.metal;
  else if (dens > 0.3 && tV > 0.27) c = CLS.brick;
  else if (dens > 0.1 && dens <= 0.38 && tV <= 0.27) c = CLS.cmu;
  else if (dens > 0.008 && dens <= 0.12 && hr < 0.85 && vr < 0.85) c = CLS.concrete;
  cls[p] = c;
}

// 2b) Majority smoothing so materials read as clean areas, not speckle
{
  const RS = 16;
  const K = 5;
  const I = Array.from({ length: K }, () => new Float64Array((W + 1) * (H + 1)));
  for (let y = 0; y < H; y++) {
    const rs = new Float64Array(K);
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (alpha[p] && !glass[p]) rs[cls[p]]++;
      const k = (y + 1) * (W + 1) + (x + 1);
      for (let c = 0; c < K; c++) I[c][k] = I[c][k - (W + 1)] + rs[c];
    }
  }
  const out = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!alpha[p] || glass[p]) continue;
    let best = cls[p], bestN = -1;
    for (let c = 0; c < K; c++) {
      const n = box(I[c], x, y, RS);
      if (n > bestN) { bestN = n; best = c; }
    }
    out[p] = best;
  }
  cls.set(out);
}

// 2c) Hand-placed material zones from the drawings (later zones win)
for (const z of overrides.zones) {
  const c = CLS[z.mat];
  const [x0, y0, x1, y1] = z.rect;
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) cls[y * W + x] = c;
}

// 3) Paint
const nearGlass = (x, y) => {
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && glass[yy * W + xx]) return true;
  }
  return false;
};
// per-lite brightness so rooms don't all look identical
const liteTone = new Map();
for (const [, , , , lab] of glassBoxes) liteTone.set(lab, 0.82 + ((lab * 2654435761) % 1000) / 1000 * 0.18);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x, i = p * 4;
  if (!alpha[p]) { d[i + 3] = 0; continue; }
  let col;
  if (glass[p]) {
    // find lite bbox for vertical gradient (approx: use whole-image row fraction within lite)
    const lab = comp[p] >= 0 && liteTone.has(comp[p]) ? comp[p] : null;
    const tone = lab !== null ? liteTone.get(lab) : 0.9;
    const yb = lab !== null ? liteBox.get(lab) : [y - 1, y + 1];
    const t = 0.15 + 0.7 * ((y - yb[0]) / Math.max(1, yb[1] - yb[0]));
    col = GLOW_TOP.map((v, j) => (v + (GLOW_BOT[j] - v) * t) * tone);
  } else if (ink[p] && nearGlass(x, y)) {
    col = FRAME;
  } else {
    const m = MAT[NAMES[cls[p]]];
    col = ink[p] ? m.line : m.base;
    if (cls[p] === CLS.precast && !ink[p]) {
      // concrete texture: soft mottling + fine aggregate speckle (deterministic hash)
      const hsh = (a, b) => (((a * 374761393 + b * 668265263) ^ 0x5bd1e995) * 1274126177 >>> 0) / 4294967296;
      const mott = (hsh(x >> 3, y >> 3) + hsh((x + 4) >> 3, (y + 4) >> 3)) * 6 - 6;
      const r = hsh(x, y);
      const sp = r < 0.035 ? -26 : r > 0.975 ? 14 : (r - 0.5) * 8;
      col = col.map((v) => v + mott + sp);
    }
  }
  d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
}
g.putImageData(id, 0, 0);
await fs.writeFile(outFile, await cv.encode("png"));

if (debugFile) {
  const dc = createCanvas(W, H), dg = dc.getContext("2d");
  const dd = dg.createImageData(W, H);
  const pal = [[230, 230, 230], [230, 120, 60], [40, 40, 160], [120, 200, 120], [200, 200, 60], [90, 90, 90]];
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (!alpha[p]) continue;
    const c = glass[p] ? [255, 0, 255] : pal[cls[p]];
    dd.data[i] = c[0]; dd.data[i + 1] = c[1]; dd.data[i + 2] = c[2]; dd.data[i + 3] = 255;
  }
  dg.putImageData(dd, 0, 0);
  await fs.writeFile(debugFile, await dc.encode("png"));
}
console.log(outFile, "tags removed:", tagCount, "lites:", glassBoxes.length);
