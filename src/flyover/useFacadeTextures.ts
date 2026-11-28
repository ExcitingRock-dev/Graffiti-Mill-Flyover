import { useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import * as THREE from "three";
import { CUTS } from "./geometry";
import { BRICK_SHEET_CLEARS, SHEET_FILLS, SHEET_HOLES, SheetHole, SheetName } from "./windowGeometry";

export type CutKey = keyof typeof CUTS;
export type FacadeTextures = Record<CutKey, THREE.Texture>;

// which BKV sheet each texture cut comes from
const SHEET_OF: Record<CutKey, SheetName> = {
  east: "east",
  eastTower: "east",
  west: "west",
  westPrecast: "west",
  south: "south",
  southTower: "south",
  northUpper: "north",
  northPrecast: "north",
  northTower: "north",
  northWing: "north",
};
// cuts that only carry the windows (everything else already transparent)
const WINDOWS_ONLY = new Set<CutKey>(["eastTower", "westPrecast", "southTower", "northPrecast", "northTower"]);

// ---- the shop-drawing windows in the drawings --------------------------------
// The 3D windows (Windows.tsx) replace the drawn ones: each one's opening is
// cut out of the drawing, and the old drawn glass and frames around it (the
// 040 set's windows, not always the same size) are painted over with the wall
// next to them. Colors from tools/colorize.mjs.
const ERASE_MARGIN = 14; // px (~1 ft) around each opening
const BRICK_PERIOD = 9; // px: the brick hatch repeats this far along a row
const PALETTE = [
  [216, 196, 154], [178, 158, 118], // brick
  [42, 38, 34], [70, 64, 56], // metal
  [190, 189, 184], [150, 149, 144], // concrete
  [198, 197, 192], [160, 159, 154], // cmu
  [214, 210, 202], [120, 118, 114], // plain
  [178, 177, 172], [128, 127, 123], // precast
];
const isFrame = (r: number, g: number, b: number) => r === 26 && g === 26 && b === 28;
const isGlazing = (r: number, g: number, b: number) =>
  isFrame(r, g, b) || (r - b > 30 && !PALETTE.some((p) => p[0] === r && p[1] === g && p[2] === b));

type Rect = { x0: number; y0: number; x1: number; y1: number };
const holeRect = (h: SheetHole, ox: number, oy: number, m: number): Rect => {
  if (h.round) {
    const { cx, cy, r } = h.round;
    return { x0: cx - r - ox - m, y0: cy - r - oy - m, x1: cx + r - ox + m, y1: cy + r - oy + m };
  }
  const xs = h.pts.map((p) => p[0] - ox);
  const ys = h.pts.map((p) => p[1] - oy);
  return { x0: Math.min(...xs) - m, y0: Math.min(...ys) - m, x1: Math.max(...xs) + m, y1: Math.max(...ys) + m };
};

const editCut = (key: CutKey, img: CanvasImageSource & { width: number; height: number }) => {
  const cut = CUTS[key];
  const W = img.width;
  const H = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("no 2d context");
  g.drawImage(img, 0, 0);
  const holes = SHEET_HOLES.filter((h) => h.sheet === SHEET_OF[key]);
  const regions = holes
    .map((h) => holeRect(h, cut.x, cut.y, ERASE_MARGIN))
    .map((r) => ({
      x0: Math.max(0, Math.floor(r.x0)),
      y0: Math.max(0, Math.floor(r.y0)),
      x1: Math.min(W, Math.ceil(r.x1)),
      y1: Math.min(H, Math.ceil(r.y1)),
    }))
    .filter((r) => r.x1 > r.x0 && r.y1 > r.y0);

  if (WINDOWS_ONLY.has(key)) {
    // only windows are drawn on these: clear the old ones outright
    for (const r of regions) g.clearRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  } else {
    const data = g.getImageData(0, 0, W, H);
    const d = data.data;
    const mask = new Uint8Array(W * H);
    for (const r of regions)
      for (let y = r.y0; y < r.y1; y++)
        for (let x = r.x0; x < r.x1; x++) {
          const i = (y * W + x) * 4;
          if (d[i + 3] > 0 && isGlazing(d[i], d[i + 1], d[i + 2])) mask[y * W + x] = 1;
        }
    // paint each old glazing pixel with the wall a whole number of brick
    // periods along the same row
    for (const r of regions)
      for (let y = r.y0; y < r.y1; y++)
        for (let x = r.x0; x < r.x1; x++) {
          if (mask[y * W + x] !== 1) continue;
          for (let k = 1; k < 80; k++) {
            const sx = x + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * BRICK_PERIOD;
            if (sx < 0 || sx >= W || mask[y * W + sx]) continue;
            const si = (y * W + sx) * 4;
            if (d[si + 3] === 0) continue;
            const i = (y * W + x) * 4;
            d[i] = d[si];
            d[i + 1] = d[si + 1];
            d[i + 2] = d[si + 2];
            mask[y * W + x] = 2;
            break;
          }
        }
    g.putImageData(data, 0, 0);
  }
  // cut each opening out of the drawing
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  for (const h of holes) {
    g.beginPath();
    if (h.round) g.arc(h.round.cx - cut.x, h.round.cy - cut.y, h.round.r, 0, Math.PI * 2);
    else h.pts.forEach(([x, y], i) => (i ? g.lineTo(x - cut.x, y - cut.y) : g.moveTo(x - cut.x, y - cut.y)));
    g.closePath();
    g.fill();
  }
  // the 3D brick facades (BrickFacades.tsx) take the drawing's place there
  for (const r of BRICK_SHEET_CLEARS.filter((c) => c.sheet === SHEET_OF[key]))
    g.fillRect(r.x0 - cut.x, r.y0 - cut.y, r.x1 - r.x0, r.y1 - r.y0);
  // areas painted over (DrawingErase.fill), on the full drawings only
  g.globalCompositeOperation = "source-over";
  if (!WINDOWS_ONLY.has(key))
    for (const r of SHEET_FILLS.filter((c) => c.sheet === SHEET_OF[key])) {
      g.fillStyle = r.fill;
      g.fillRect(r.x0 - cut.x, r.y0 - cut.y, r.x1 - r.x0, r.y1 - r.y0);
    }
  return new THREE.CanvasTexture(canvas);
};

// every facade drawing, with the window edits; `url` turns a public file
// name into a URL (Remotion: staticFile; the explorer: "/" + file)
export const loadFacadeTextures = async (url: (file: string) => string): Promise<FacadeTextures> => {
  const loader = new THREE.ImageLoader();
  const keys = Object.keys(CUTS) as CutKey[];
  const list = await Promise.all(keys.map((k) => loader.loadAsync(url(CUTS[k].file))));
  const out = {} as FacadeTextures;
  list.forEach((img, i) => {
    const t = editCut(keys[i], img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    out[keys[i]] = t;
  });
  return out;
};

// Load all facade drawings BEFORE the ThreeCanvas mounts. Remotion only
// redraws the canvas on frame changes, so textures must exist on first draw.
export const useFacadeTextures = () => {
  const [textures, setTextures] = useState<FacadeTextures | null>(null);
  const [handle] = useState(() => delayRender("Loading facade drawings"));

  useEffect(() => {
    loadFacadeTextures(staticFile)
      .then((out) => {
        setTextures(out);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);

  return textures;
};
