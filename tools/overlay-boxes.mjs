// Draw JSON-line boxes (x0,y0,x1,y1) over a PNG crop, numbered.
// usage: node tools/overlay-boxes.mjs <in.png> <boxes.txt> <out.png> x y w h scale [minSide]
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
const [, , f, bf, o, ...a] = process.argv;
const [x, y, w, h, s, minS = 0] = a.map(Number);
const img = await loadImage(f);
const c = createCanvas(w * s, h * s), g = c.getContext("2d");
g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
const bs = (await fs.readFile(bf, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
g.lineWidth = 2; g.font = "bold 16px sans-serif";
bs.forEach((b, i) => {
  if (b.x1 - b.x0 < minS || b.y1 - b.y0 < minS) return;
  g.strokeStyle = "rgba(255,0,0,0.9)"; g.fillStyle = "rgba(0,120,255,1)";
  g.strokeRect((b.x0 - x) * s, (b.y0 - y) * s, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);
  g.fillText(String(i), (b.x0 - x) * s + 3, (b.y0 - y) * s + 16);
});
await fs.writeFile(o, await c.encode("png"));
