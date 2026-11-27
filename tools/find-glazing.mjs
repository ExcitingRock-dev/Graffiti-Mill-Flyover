// Find glazed openings on a colorized facade: connected warm-glow regions,
// merged across mullions, reported as sheet-pixel bounding boxes.
// usage: node tools/find-glazing.mjs <in.png> [minArea]
import { createCanvas, loadImage } from "@napi-rs/canvas";
const [, , f, minA = "60"] = process.argv;
const img = await loadImage(f);
const W = img.width, H = img.height;
const c = createCanvas(W, H), g = c.getContext("2d");
g.drawImage(img, 0, 0);
const d = g.getImageData(0, 0, W, H).data;
const glow = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
  if (a > 128 && r >= 230 && gg >= 140 && gg <= 235 && b >= 70 && b <= 185 && r - b > 50) glow[i] = 1;
}
const lab = new Int32Array(W * H).fill(-1);
const boxes = [];
for (let s = 0; s < W * H; s++) {
  if (!glow[s] || lab[s] >= 0) continue;
  const st = [s]; lab[s] = boxes.length;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  while (st.length) {
    const p = st.pop(); const x = p % W, y = (p / W) | 0; n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H || !glow[q] || lab[q] >= 0) continue;
      if (Math.abs((q % W) - x) > 1) continue;
      lab[q] = boxes.length; st.push(q);
    }
  }
  boxes.push({ x0, y0, x1, y1, n });
}
let bs = boxes.filter((b) => b.n >= +minA);
// merge lites separated by mullions (gap <= 7 px) that overlap in the other axis
const gap = 7;
let merged = true;
while (merged) {
  merged = false;
  outer: for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j];
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
    const gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
    if ((oy > 0 && gx <= gap) || (ox > 0 && gy <= gap)) {
      bs[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n, k: (a.k ?? 1) + (b.k ?? 1) };
      bs.splice(j, 1); merged = true; break outer;
    }
  }
}
bs.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
for (const b of bs) console.log([b.x0, b.y0, b.x1, b.y1, b.k ?? 1].join(" "));
