// Dark-pixel profile: columns (v) or rows (h) inside a band, prints runs of dark lines.
// usage: node tools/line-scan.mjs <in.png> v|h x0 y0 x1 y1 [frac]
import { createCanvas, loadImage } from "@napi-rs/canvas";
const [, , f, dir, ...a] = process.argv;
const [X0, Y0, X1, Y1, frac = 0.5] = a.map(Number);
const img = await loadImage(f);
const W = X1 - X0, H = Y1 - Y0;
const c = createCanvas(W, H), g = c.getContext("2d");
g.drawImage(img, X0, Y0, W, H, 0, 0, W, H);
const d = g.getImageData(0, 0, W, H).data;
const n = dir === "v" ? W : H, m = dir === "v" ? H : W;
const prof = new Array(n).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4] < 128) prof[dir === "v" ? x : y]++;
const out = [];
for (let i = 0; i < n; i++) if (prof[i] >= frac * m) {
  const s = i; while (i + 1 < n && prof[i + 1] >= frac * m) i++;
  out.push(((s + i) / 2 + (dir === "v" ? X0 : Y0)).toFixed(1));
}
console.log(out.join(" "));
