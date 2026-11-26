// Make the concrete in a colorized facade transparent, keeping windows,
// frames and other colored elements, so the drawing can sit over a 3D
// concrete wall (the New Precast Structure, grid 5-9).
// usage: node tools/mask-precast.mjs <in.png> <out.png>
// A pixel is dropped when it is grey (channel spread <= SPREAD) and lighter
// than DARK: that removes the precast field, its speckle and the thin grey
// joint / center lines, and keeps near-black frames and orange glazing.
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";

const SPREAD = 14;
const DARK = 100;
const [, , input, output] = process.argv;
const img = await loadImage(input);
const c = createCanvas(img.width, img.height);
const g = c.getContext("2d");
g.drawImage(img, 0, 0);
const data = g.getImageData(0, 0, img.width, img.height);
const d = data.data;
let dropped = 0;
for (let i = 0; i < d.length; i += 4) {
  const r = d[i], gg = d[i + 1], b = d[i + 2];
  const spread = Math.max(r, gg, b) - Math.min(r, gg, b);
  if (spread <= SPREAD && Math.min(r, gg, b) > DARK) {
    // frame-black under the clear pixels: texture filtering blends their color
    // into the window edges, so a light color would show as a halo
    d[i] = d[i + 1] = d[i + 2] = 26;
    d[i + 3] = 0;
    dropped++;
  }
}
g.putImageData(data, 0, 0);
await fs.writeFile(output, await c.encode("png"));
console.log(`${output}: ${((100 * dropped) / (d.length / 4)).toFixed(1)}% transparent`);
