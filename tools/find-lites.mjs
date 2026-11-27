// Find glass lites on a linework elevation (white, near-rectangular regions),
// then group lites split by mullions into frames. Prints sheet-pixel boxes.
// usage: node tools/find-lites.mjs <in.png> x0 y0 x1 y1 [minArea] [gap]
import { createCanvas, loadImage } from "@napi-rs/canvas";
const [, , f, ...a] = process.argv;
const [X0, Y0, X1, Y1, minA = 1500, gap = 14] = a.map(Number);
const img = await loadImage(f);
const W = X1 - X0, H = Y1 - Y0;
const c = createCanvas(W, H), g = c.getContext("2d");
g.drawImage(img, X0, Y0, W, H, 0, 0, W, H);
const d = g.getImageData(0, 0, W, H).data;
const white = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) white[i] = d[i * 4] > 200 && d[i * 4 + 1] > 200 && d[i * 4 + 2] > 200 ? 1 : 0;
const seen = new Uint8Array(W * H);
const lites = [];
const st = new Int32Array(W * H);
for (let s = 0; s < W * H; s++) {
  if (!white[s] || seen[s]) continue;
  let sp = 0; st[sp++] = s; seen[s] = 1;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  while (sp) {
    const p = st[--sp]; const x = p % W, y = (p / W) | 0; n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x > 0 && white[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st[sp++] = p - 1; }
    if (x < W - 1 && white[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st[sp++] = p + 1; }
    if (y > 0 && white[p - W] && !seen[p - W]) { seen[p - W] = 1; st[sp++] = p - W; }
    if (y < H - 1 && white[p + W] && !seen[p + W]) { seen[p + W] = 1; st[sp++] = p + W; }
  }
  const area = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (n >= minA && n / area > +(process.env.FILL ?? 0.85) && x0 > 0 && y0 > 0 && x1 < W - 1 && y1 < H - 1) lites.push({ x0, y0, x1, y1, k: 1 });
}
let bs = lites, merged = true;
while (merged) {
  merged = false;
  outer: for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const A = bs[i], B = bs[j];
    const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
    const oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
    const gx = Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1);
    const gy = Math.max(A.y0, B.y0) - Math.min(A.y1, B.y1);
    if ((oy > 0.6 * Math.min(A.y1 - A.y0, B.y1 - B.y0) && gx <= gap) || (ox > 0.6 * Math.min(A.x1 - A.x0, B.x1 - B.x0) && gy <= gap)) {
      bs[i] = { x0: Math.min(A.x0, B.x0), y0: Math.min(A.y0, B.y0), x1: Math.max(A.x1, B.x1), y1: Math.max(A.y1, B.y1), k: A.k + B.k,
        cols: [...new Set([...(A.cols ?? [A.x0]), ...(B.cols ?? [B.x0])])], rows: [...new Set([...(A.rows ?? [A.y0]), ...(B.rows ?? [B.y0])])] };
      bs.splice(j, 1); merged = true; break outer;
    }
  }
}
for (const b of bs) console.log(JSON.stringify({ x0: b.x0 + X0, y0: b.y0 + Y0, x1: b.x1 + X0 + 1, y1: b.y1 + Y0 + 1, k: b.k, nc: (b.cols ?? [0]).length, nr: (b.rows ?? [0]).length }));
