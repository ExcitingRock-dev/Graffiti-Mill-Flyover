// Copy a rect of a full drawing sheet into a facade cut-out, fully opaque.
// Used where the cut-out step dropped isolated windows on a blank wall.
// usage: node tools/paste-sheet.mjs <facade.png> <sheet.png> cutX cutY x0 y0 x1 y1
// (cutX, cutY = the facade's origin on the sheet; x0..y1 = rect in facade px)
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs/promises";
const [, , facade, sheet, cx, cy, ...r] = process.argv;
const [x0, y0, x1, y1] = r.map(Number);
const f = await loadImage(facade), s = await loadImage(sheet);
const c = createCanvas(f.width, f.height), g = c.getContext("2d");
g.drawImage(f, 0, 0);
g.clearRect(x0, y0, x1 - x0, y1 - y0);
g.fillStyle = "#fff";
g.fillRect(x0, y0, x1 - x0, y1 - y0);
g.drawImage(s, x0 + Number(cx), y0 + Number(cy), x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
await fs.writeFile(facade, await c.encode("png"));
console.log("pasted", facade, [x0, y0, x1, y1]);
