// Crop an elevation and make the exterior background transparent.
// usage: node cutout.mjs <png> <out.png> x0 y0 x1 y1
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
const [, , file, out, ...b] = process.argv;
const [x0, y0, x1, y1] = b.map(Number);
const img = await loadImage(file);
const W = x1 - x0, H = y1 - y0;
const c = createCanvas(W, H);
const g = c.getContext("2d");
g.drawImage(img, -x0, -y0);
const id = g.getImageData(0, 0, W, H);
const d = id.data;
const N = W * H;
const isPurple = (i) => d[i + 2] > 150 && d[i + 2] - d[i + 1] > 70;
const isColored = (i) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60;
// ink = dark, uncolored pixels (linework, hatch). Dilate ink by R to seal hatch gaps.
const R = Number(process.env.R || 7);
const ink = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * 4;
  const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
  ink[p] = l < 140 && !isColored(i) ? 1 : 0;
}
const dilate = (src, r) => {
  const tmp = new Uint8Array(N), dst = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    let run = -1e9;
    for (let x = 0; x < W; x++) { if (src[y * W + x]) run = x; tmp[y * W + x] = x - run <= r ? 1 : 0; }
    run = 1e9;
    for (let x = W - 1; x >= 0; x--) { if (src[y * W + x]) run = x; if (run - x <= r) tmp[y * W + x] = 1; }
  }
  for (let x = 0; x < W; x++) {
    let run = -1e9;
    for (let y = 0; y < H; y++) { if (tmp[y * W + x]) run = y; dst[y * W + x] = y - run <= r ? 1 : 0; }
    run = 1e9;
    for (let y = H - 1; y >= 0; y--) { if (tmp[y * W + x]) run = y; if (run - y <= r) dst[y * W + x] = 1; }
  }
  return dst;
};
const sealed = dilate(ink, R);
const pass = new Uint8Array(N);
for (let p = 0; p < N; p++) pass[p] = sealed[p] ? 0 : 1;
// flood fill from all edges except bottom (bottom is ground)
const outside = new Uint8Array(N);
const stack = [];
const push = (p) => { if (pass[p] && !outside[p]) { outside[p] = 1; stack.push(p); } };
for (let x = 0; x < W; x++) push(x);
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
while (stack.length) {
  const p = stack.pop();
  const x = p % W, y = (p / W) | 0;
  if (x > 0) push(p - 1);
  if (x < W - 1) push(p + 1);
  if (y > 0) push(p - W);
  if (y < H - 1) push(p + W);
}
// grow outside back toward the real outline, but never over ink
// (geodesic growth: only steps through non-ink pixels, so it can't jump an outline)
{
  let frontier = [];
  for (let p = 0; p < N; p++) if (outside[p]) frontier.push(p);
  for (let step = 0; step < R + 2; step++) {
    const next = [];
    for (const p of frontier) {
      const x = p % W, y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
        if (q >= 0 && !outside[q] && !ink[q]) { outside[q] = 1; next.push(q); }
    }
    frontier = next;
  }
}
// largest connected component of inside pixels
const label = new Int32Array(N).fill(-1);
let best = -1, bestSize = 0, lab = 0;
const sizes = [];
for (let s = 0; s < N; s++) {
  if (outside[s] || label[s] >= 0) continue;
  let size = 0; stack.push(s); label[s] = lab;
  while (stack.length) {
    const p = stack.pop(); size++;
    const x = p % W, y = (p / W) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
    for (const q of nb) if (q >= 0 && !outside[q] && label[q] < 0) { label[q] = lab; stack.push(q); }
  }
  sizes[lab] = size;
  if (size > bestSize) { bestSize = size; best = lab; }
  lab++;
}
// Silhouette: open the kept mask (drops thin leader lines), then every column is solid
// from its top-most solid pixel down to the ground. Prevents leaks into light walls.
const kept = new Uint8Array(N);
// keep every large piece (a narrow gap can split one facade into several)
for (let p = 0; p < N; p++) kept[p] = label[p] >= 0 && sizes[label[p]] > N * 0.01 ? 1 : 0;
const notKept = new Uint8Array(N);
for (let p = 0; p < N; p++) notKept[p] = kept[p] ? 0 : 1;
const OR = 4;
const eroded = dilate(notKept, OR);
for (let p = 0; p < N; p++) eroded[p] = eroded[p] ? 0 : 1;
const opened = dilate(eroded, OR);
const solid = new Uint8Array(N);
for (let x = 0; x < W; x++) {
  let y = 0;
  while (y < H && !opened[y * W + x]) y++;
  for (; y < H; y++) solid[y * W + x] = 1;
}
// close thin vertical slits (grid lines the fill leaked down): gaps <= 39 px (pilasters) with solid both sides
for (let y = 0; y < H; y++) {
  let last = -1;
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!solid[p]) continue;
    if (last >= 0 && x - last > 1 && x - last <= 40) for (let k = last + 1; k < x; k++) solid[y * W + k] = 1;
    last = x;
  }
}
for (let p = 0; p < N; p++) {
  const i = p * 4;
  if (!solid[p] && !kept[p]) { d[i + 3] = 0; continue; }
  if (solid[p] && !kept[p] && !isPurple(i)) { d[i] = d[i + 1] = d[i + 2] = 250; d[i + 3] = 255; }
  d[i + 3] = 255;
  if (isPurple(i)) {
    // paint over grid lines with nearest non-purple horizontal neighbour
    const x = p % W;
    for (let k = 2; k < 8; k++) {
      const q = x + k < W ? i + k * 4 : i - k * 4;
      if (!isPurple(q)) { d[i] = d[q]; d[i + 1] = d[q + 1]; d[i + 2] = d[q + 2]; break; }
    }
  }
}
g.putImageData(id, 0, 0);
await fs.writeFile(out, await c.encode("png"));
console.log(out, W, H, "components", lab, "kept", bestSize);
