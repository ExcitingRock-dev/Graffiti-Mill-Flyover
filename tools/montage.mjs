import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
const [, , out, ...files] = process.argv;
const cols = 3, w = 640, h = 360;
const rows = Math.ceil(files.length / cols);
const c = createCanvas(cols * w, rows * h), g = c.getContext("2d");
for (let i = 0; i < files.length; i++) {
  const im = await loadImage(files[i]);
  g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h);
  g.fillStyle = "#c00"; g.font = "bold 22px sans-serif"; g.fillText(files[i].split(/[\\/]/).pop(), (i % cols) * w + 8, Math.floor(i / cols) * h + 350);
}
await fs.writeFile(out, await c.encode("jpeg", 80));
