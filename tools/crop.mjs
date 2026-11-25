// Debug helper: crop (and optionally scale) part of a PNG.
// usage: node tools/crop.mjs <in.png> <out.png> x y w h [scale]
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
const [, , f, o, ...a] = process.argv;
const [x, y, w, h, s = 1] = a.map(Number);
const img = await loadImage(f);
const c = createCanvas(w * s, h * s), g = c.getContext("2d");
g.fillStyle = "#7fb";
g.fillRect(0, 0, w * s, h * s);
g.imageSmoothingEnabled = false;
g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
await fs.writeFile(o, await c.encode("png"));
