// Make the dark corrugated siding in a colorized facade transparent, keeping
// the windows (orange glazing) and a thin ring of frame around them, so the
// drawing can sit over a 3D siding skin (the round-window stair tower).
// usage: node tools/mask-siding.mjs <in.png> <out.png>
// A pixel is glazing when it is clearly colored (channel spread > GLASS); it is
// kept, along with every pixel within FRAME px of glazing (the window frames).
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";

const GLASS = 40;
const FRAME = 4;
const THIN = 2; // colored lines up to ~2 px wide are not glazing
const [, , input, output] = process.argv;
const img = await loadImage(input);
const W = img.width, H = img.height;
const c = createCanvas(W, H);
const g = c.getContext("2d");
g.drawImage(img, 0, 0);
const data = g.getImageData(0, 0, W, H);
const d = data.data;
const glass = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = d[4 * i], gg = d[4 * i + 1], b = d[4 * i + 2];
  if (d[4 * i + 3] > 128 && Math.max(r, gg, b) - Math.min(r, gg, b) > GLASS) glass[i] = 1;
}
// square dilation by r px (separable)
const grow = (m, r) => {
  const row = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let last = -1e9;
    for (let x = 0; x < W; x++) { if (m[y * W + x]) last = x; if (x - last <= r) row[y * W + x] = 1; }
    last = 1e9;
    for (let x = W - 1; x >= 0; x--) { if (m[y * W + x]) last = x; if (last - x <= r) row[y * W + x] = 1; }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let last = -1e9;
    for (let y = 0; y < H; y++) { if (row[y * W + x]) last = y; if (y - last <= r) out[y * W + x] = 1; }
    last = 1e9;
    for (let y = H - 1; y >= 0; y--) { if (row[y * W + x]) last = y; if (last - y <= r) out[y * W + x] = 1; }
  }
  return out;
};
const not = (m) => m.map((v) => 1 - v);
// panes only: erode away thin colored lines (the rib lines drawn around the
// round windows), then grow back past the pane edge by FRAME for the frames
const panes = not(grow(not(glass), THIN));
const keep = grow(panes, THIN + FRAME);
let dropped = 0;
for (let i = 0; i < W * H; i++) {
  if (keep[i]) continue;
  // frame-dark under the clear pixels so texture filtering doesn't halo
  d[4 * i] = 30; d[4 * i + 1] = 28; d[4 * i + 2] = 26; d[4 * i + 3] = 0;
  dropped++;
}
g.putImageData(data, 0, 0);
await fs.writeFile(output, await c.encode("png"));
console.log(`${output}: ${((100 * dropped) / (W * H)).toFixed(1)}% transparent`);
