// Windows: where each one sits and what it is made of (data: WINDOWS in
// plan.ts). Pure geometry, no React, so Massing (wall pockets), the facade
// texture loader (holes in the drawings) and Windows.tsx (the 3D units) all
// work from the same numbers.
//
// Every window is built in its wall's LOCAL frame:
//   a: along the wall, 0 at the window's center, + to the right as seen from
//      outside
//   y: height (ft above Level 1)
//   d: out of the wall, 0 on the wall line (the plan line the drawings are
//      mapped to), + toward the outside
// and placed with wallFrame(): position (x, z) and a rotation about y.

import {
  GX,
  GZ,
  LIGHT_WELL,
  RAKED_W6,
  ROUND_CW6,
  ROUND_W22,
  TOWER,
  WINDOW_SETTINGS,
  WINDOW_SYSTEMS,
  WING_EAST,
  WING_WEST,
  WindowSetting,
  WindowSpec,
  WindowWall,
  WINDOWS,
  XZ,
  wingEastZ,
} from "./plan";

type Range = [number, number];
export type Box3 = { x: Range; y: Range; z: Range };

// the facade drawings float this far proud of the wall line (Building.tsx)
export const DRAWING_PROUD = 0.15;

const unit = (dx: number, dz: number): XZ => {
  const l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
};
const wingWestZ = (x: number) =>
  WING_WEST.z9 + ((x - GX.g9) * (WING_WEST.z13 - WING_WEST.z9)) / (GX.g13 - GX.g9);
// outward normals of the two oblique wing walls
const EW_OUT = (() => {
  const [dx, dz] = unit(GX.g13 - GX.g10, WING_EAST.z13 - WING_EAST.z10);
  return [-dz, dx] as XZ; // east-ish
})();
const WW_OUT = (() => {
  const [dx, dz] = unit(GX.g13 - GX.g9, WING_WEST.z13 - WING_WEST.z9);
  return [dz, -dx] as XZ; // west-ish
})();

type WallDef = {
  at: (u: number) => XZ; // point on the wall line at elevation coordinate u
  out: XZ;
  setting: WindowSetting;
  // the wall's visible face (d): the drawing plane, or the concrete / siding face
  face: number;
  // straight walls on a grid axis get pockets cut in their solids
  pocket: boolean;
  // which facade sheet draws it (null: none, e.g. inside the light well)
  sheet: "east" | "west" | "south" | "north" | null;
};
export const WINDOW_WALLS: Record<WindowWall, WallDef> = {
  E: { at: (u) => [u, GZ.B], out: [0, 1], setting: "brick", face: DRAWING_PROUD, pocket: true, sheet: "east" },
  ET: { at: (u) => [u, TOWER.z1], out: [0, 1], setting: "tower", face: 0, pocket: true, sheet: "east" },
  EW: { at: (u) => [u, wingEastZ(u)], out: EW_OUT, setting: "brick", face: DRAWING_PROUD, pocket: false, sheet: "east" },
  W: { at: (u) => [u, GZ.K], out: [0, -1], setting: "brick", face: DRAWING_PROUD, pocket: true, sheet: "west" },
  // the New Precast skin stands 0.1 proud of grid K (NEW_PRECAST.skin)
  WP: { at: (u) => [u, GZ.K], out: [0, -1], setting: "precast", face: 0.1, pocket: true, sheet: "west" },
  WW: { at: (u) => [u, wingWestZ(u)], out: WW_OUT, setting: "brick", face: DRAWING_PROUD, pocket: false, sheet: "west" },
  S: { at: (u) => [GX.g2, u], out: [-1, 0], setting: "brick", face: DRAWING_PROUD, pocket: true, sheet: "south" },
  ST: { at: (u) => [TOWER.x0, u], out: [-1, 0], setting: "tower", face: 0, pocket: true, sheet: "south" },
  N: { at: (u) => [GX.g9, u], out: [1, 0], setting: "brick", face: DRAWING_PROUD, pocket: true, sheet: "north" },
  NT: { at: (u) => [TOWER.x1, u], out: [1, 0], setting: "tower", face: 0, pocket: true, sheet: "north" },
  NW: { at: (u) => [GX.g13, u], out: [1, 0], setting: "brick", face: DRAWING_PROUD, pocket: false, sheet: "north" },
  // TreeBox: on the light well's walls, facing into the well
  LB: { at: (u) => [u, LIGHT_WELL.z0], out: [0, 1], setting: "interior", face: 0, pocket: false, sheet: null },
  LS: { at: (u) => [LIGHT_WELL.x[0], u], out: [1, 0], setting: "interior", face: 0, pocket: false, sheet: null },
  LN: { at: (u) => [LIGHT_WELL.x[1], u], out: [-1, 0], setting: "interior", face: 0, pocket: false, sheet: null },
};

// world placement of a window's local frame
export const wallFrame = (w: WindowSpec) => {
  const wall = WINDOW_WALLS[w.wall];
  const [x, z] = wall.at(w.u);
  const [nx, nz] = wall.out;
  // three.js rotation about y: local +z -> out, local +x -> right seen from outside
  const rotY = Math.atan2(nx, nz);
  return { x, z, rotY, out: wall.out, right: [nz, -nx] as XZ };
};
// local (a, y, d) -> world (x, y, z)
export const toWorld = (w: WindowSpec, a: number, y: number, d: number): [number, number, number] => {
  const f = wallFrame(w);
  return [f.x + f.right[0] * a + f.out[0] * d, y, f.z + f.right[1] * a + f.out[1] * d];
};

// ---- sizes in feet ---------------------------------------------------------
export const IN = 1 / 12;
// a window's outline in local (a, y): the frame's outer edge
export type Outline =
  | { kind: "rect"; a: Range; y: Range }
  | { kind: "round"; c: [number, number]; r: number }
  | { kind: "poly"; pts: [number, number][] };

// W6: the raked parallelogram, corners counter-clockwise from bottom left.
// It rises toward +a (true south on the precast west face).
export const rakedCorners = (w: WindowSpec, inset = 0): [number, number][] => {
  const t = Math.tan((RAKED_W6.angle * Math.PI) / 180);
  const L = RAKED_W6.along * IN * Math.cos((RAKED_W6.angle * Math.PI) / 180) - 2 * inset;
  const e = RAKED_W6.end * IN - (2 * inset) / Math.cos((RAKED_W6.angle * Math.PI) / 180);
  const yc = w.y0;
  const bl = yc - e / 2 - (L / 2) * t;
  const br = yc - e / 2 + (L / 2) * t;
  return [
    [-L / 2, bl],
    [L / 2, br],
    [L / 2, br + e],
    [-L / 2, bl + e],
  ];
};

export const outline = (w: WindowSpec): Outline => {
  if (w.shape === "round") return { kind: "round", c: [0, w.y0], r: (w.w * IN) / 2 };
  if (w.shape === "raked") return { kind: "poly", pts: rakedCorners(w) };
  const half = (w.w * IN) / 2;
  return { kind: "rect", a: [-half, half], y: [w.y0, w.y0 + w.h * IN] };
};
// bounding box of the outline in local (a, y)
export const outlineBox = (o: Outline): { a: Range; y: Range } => {
  if (o.kind === "rect") return { a: o.a, y: o.y };
  if (o.kind === "round") return { a: [-o.r, o.r], y: [o.c[1] - o.r, o.c[1] + o.r] };
  const as = o.pts.map((p) => p[0]);
  const ys = o.pts.map((p) => p[1]);
  return { a: [Math.min(...as), Math.max(...as)], y: [Math.min(...ys), Math.max(...ys)] };
};

// depths (local d) of one window's layers
export const windowDepths = (w: WindowSpec) => {
  const wall = WINDOW_WALLS[w.wall];
  const set = WINDOW_SETTINGS[wall.setting];
  const sys = WINDOW_SYSTEMS[w.sys];
  const D = sys.depth * IN;
  // interior (TreeBox) units stand on the well wall's face
  const frontOfFrame = wall.setting === "interior" ? D + 0.02 : wall.face - set.setback;
  return {
    face: wall.face,
    front: frontOfFrame,
    back: frontOfFrame - D,
    glass: frontOfFrame - 0.4 * D,
    sillProud: set.sillProud,
  };
};

// ---- pockets: the opening cut through each solid behind the drawings ----
// (main core, New Precast body, tower siding). Only for walls on a grid axis;
// the wing's core is inset instead (Massing.tsx).
const POCKET_EXTRA = 0.05; // past the reveals, so the reveal faces win
export const windowPocket = (w: WindowSpec): Box3 | null => {
  const wall = WINDOW_WALLS[w.wall];
  if (!wall.pocket) return null;
  const b = outlineBox(outline(w));
  const dep = windowDepths(w);
  const a: Range = [b.a[0] - POCKET_EXTRA, b.a[1] + POCKET_EXTRA];
  const y: Range = [b.y[0] - POCKET_EXTRA, b.y[1] + POCKET_EXTRA];
  const d: Range = [dep.back - 0.6, 1.0];
  const p = [toWorld(w, a[0], 0, d[0]), toWorld(w, a[1], 0, d[1])];
  return {
    x: [Math.min(p[0][0], p[1][0]), Math.max(p[0][0], p[1][0])],
    y,
    z: [Math.min(p[0][2], p[1][2]), Math.max(p[0][2], p[1][2])],
  };
};
const pocketsOn = (walls: WindowWall[]) =>
  WINDOWS.filter((w) => walls.includes(w.wall))
    .map(windowPocket)
    .filter((p): p is Box3 => p !== null);
export const MAIN_CORE_POCKETS = pocketsOn(["E", "W", "WP", "S", "N"]);
export const PRECAST_POCKETS = pocketsOn(["WP"]);
export const TOWER_POCKETS = pocketsOn(["ET", "ST", "NT"]);

// ---- frame members ---------------------------------------------------------
// split [lo, hi] into lites of the given relative sizes with `bar` between
// them; returns the bars' ranges
export const mullionRanges = (lo: number, hi: number, sizes: number[], bar: number): Range[] => {
  const n = sizes.length;
  if (n < 2) return [];
  const total = sizes.reduce((s, v) => s + v, 0);
  const free = hi - lo - (n - 1) * bar;
  const out: Range[] = [];
  let at = lo;
  for (let i = 0; i < n - 1; i++) {
    at += (free * sizes[i]) / total;
    out.push([at, at + bar]);
    at += bar;
  }
  return out;
};

export { ROUND_CW6, ROUND_W22 };

// ---- texture edits: where each window cuts the facade drawings ----------
// Sheet pixel mapping, as in geometry.ts (13.5 px / ft)
const PX = 13.5;
const SHEETS = {
  east: { px: (x: number) => 896 + x * PX, l1: 2824 },
  west: { px: (x: number) => 2107 + (GX.g9 - x) * PX, l1: 2821 },
  south: { px: (z: number) => 832 + (z - GZ.K) * PX, l1: 2794 },
  north: { px: (z: number) => 2678 - z * PX, l1: 2794 },
};
export type SheetName = keyof typeof SHEETS;
// a window's outline on its sheet, in sheet pixels (elevations are
// projections: an oblique wall's widths shrink by the wall's angle)
export type SheetHole = { sheet: SheetName; pts: [number, number][]; round?: { cx: number; cy: number; r: number } };
export const sheetHole = (w: WindowSpec): SheetHole | null => {
  const wall = WINDOW_WALLS[w.wall];
  if (!wall.sheet) return null;
  const s = SHEETS[wall.sheet];
  const f = wallFrame(w);
  // elevation coordinate of local (a): u axis is x on east / west sheets, z on
  // south / north ones
  const uAxis = wall.sheet === "east" || wall.sheet === "west" ? 0 : 1;
  const uOf = (a: number) => (uAxis === 0 ? f.x + f.right[0] * a : f.z + f.right[1] * a);
  const P = (a: number, y: number): [number, number] => [s.px(uOf(a)), s.l1 - y * PX];
  const o = outline(w);
  if (o.kind === "round") {
    const [cx, cy] = P(0, o.c[1]);
    const r = o.r * PX * Math.abs(uAxis === 0 ? f.right[0] : f.right[1]);
    return { sheet: wall.sheet, pts: [], round: { cx, cy, r } };
  }
  const pts =
    o.kind === "rect"
      ? [P(o.a[0], o.y[0]), P(o.a[1], o.y[0]), P(o.a[1], o.y[1]), P(o.a[0], o.y[1])]
      : o.pts.map(([a, y]) => P(a, y));
  return { sheet: wall.sheet, pts };
};
export const SHEET_HOLES: SheetHole[] = WINDOWS.map(sheetHole).filter((h): h is SheetHole => h !== null);
