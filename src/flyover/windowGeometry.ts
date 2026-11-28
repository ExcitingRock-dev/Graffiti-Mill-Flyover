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

import type { TanBrickWallSpec } from "./TanBrick";
import {
  BRICK_FACADES,
  CMU_BLOCK,
  DRAWING_ERASES,
  BrickFacade,
  BrickInfill,
  GX,
  GZ,
  STONE_SILL,
  TAN_BRICK,
  LIGHT_WELL,
  PIERS,
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

const rawOutline = (w: WindowSpec): Outline => {
  if (w.shape === "round") return { kind: "round", c: [0, w.y0], r: (w.w * IN) / 2 };
  if (w.shape === "raked") return { kind: "poly", pts: rakedCorners(w) };
  const half = (w.w * IN) / 2;
  return { kind: "rect", a: [-half, half], y: [w.y0, w.y0 + w.h * IN] };
};
// ---- walls with columns --------------------------------------------------
// The brick's plane on a straight wall: the TanBrickWall face is the drawing
// plane, so the brick takes the drawing's place exactly.
const brickPlane = (wall: WindowWall) => {
  const def = WINDOW_WALLS[wall];
  const plane: "x" | "z" = def.out[0] !== 0 ? "x" : "z";
  const [px, pz] = def.at(0);
  const out = (plane === "x" ? def.out[0] : def.out[1]) as 1 | -1;
  return { plane, out, face: (plane === "x" ? px : pz) + out * def.face, ui: plane === "z" ? 0 : 2 };
};
// a local a-range of a window as a range of the wall's elevation coordinate
const uSpan = (w: WindowSpec, a: Range): Range => {
  const ui = brickPlane(w.wall).ui;
  const p = toWorld(w, a[0], 0, 0)[ui];
  const q = toWorld(w, a[1], 0, 0)[ui];
  return [Math.min(p, q), Math.max(p, q)];
};
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1];
// the concrete columns (PIERS) standing on a straight wall: their extents
// along the wall
const wallColumns = (wall: WindowWall): Range[] => {
  const P = brickPlane(wall);
  const line = P.face - P.out * WINDOW_WALLS[wall].face; // the wall line
  const pi = P.ui === 0 ? 1 : 0; // the plan index across the wall
  const ai = P.ui === 0 ? 0 : 1; // and along it
  return PIERS.flatMap((p) => {
    const across = p.poly.map((q) => q[pi]);
    if (line < Math.min(...across) - 0.01 || line > Math.max(...across) + 0.01) return [];
    const along = p.poly.map((q) => q[ai]);
    return [[Math.min(...along), Math.max(...along)] as Range];
  });
};
// the facade a window stands in, if any
const brickFacadeRaw = (w: WindowSpec): BrickFacade | null => {
  const o = rawOutline(w);
  if (o.kind !== "rect") return null;
  return (
    // a window belongs to the facade its middle is in (one just poking into
    // the bottom of a facade, e.g. under the ring platform, does not)
    BRICK_FACADES.find((f) => {
      const ym = (o.y[0] + o.y[1]) / 2;
      return f.wall === w.wall && overlaps(uSpan(w, o.a), f.u) && ym > f.y[0] && ym < f.y[1];
    }) ?? null
  );
};
export const brickFacadeOf = brickFacadeRaw;
// local a <-> the wall's elevation coordinate u
const uAxis = (w: WindowSpec) => {
  const f = wallFrame(w);
  const ui = brickPlane(w.wall).ui;
  const s = ui === 0 ? f.right[0] : f.right[1]; // +1 or -1 on a straight wall
  const uc = ui === 0 ? f.x : f.z;
  return { toU: (a: number) => uc + s * a, toA: (u: number) => (u - uc) * s };
};
// In a 3D brick facade a jamb within COLUMN_SNAP of a column (or behind it)
// ends at the column: no brick between, the column's side is the jamb
// (Collin 2026-11-27). The frame and its lites stretch or shrink to fit.
const COLUMN_SNAP = 0.75;
const snapToColumns = (w: WindowSpec, a: Range, f: BrickFacade): Range => {
  const ax = uAxis(w);
  let [lo, hi] = [ax.toU(a[0]), ax.toU(a[1])].sort((p, q) => p - q);
  for (const [c0, c1] of wallColumns(w.wall)) {
    // a column just past a jamb, or covering it: the opening ends at its face
    if (c0 > lo && c0 < hi + COLUMN_SNAP && c1 > hi) hi = c0;
    if (c1 < hi && c1 > lo - COLUMN_SNAP && c0 < lo) lo = c1;
  }
  // a brick strip kept beside a wall standing out of the facade (BrickFacade.stops)
  const mid = (lo + hi) / 2;
  for (const s of f.stops ?? []) {
    if (mid < s.u) hi = Math.min(hi, s.u - s.brick);
    else lo = Math.max(lo, s.u + s.brick);
  }
  return [ax.toA(lo), ax.toA(hi)].sort((p, q) => p - q) as Range;
};
// a sill under an opening that stops at a facade end's brick strip ends at
// that jamb, no lug: the strip is brick all the way down (Collin 2026-11-27)
const sillToFacadeEnds = (w: WindowSpec, a: Range, opening: Range): Range => {
  const f = brickFacadeRaw(w);
  if (!f?.stops) return a;
  const ax = uAxis(w);
  let [lo, hi] = [ax.toU(a[0]), ax.toU(a[1])].sort((p, q) => p - q);
  const [o0, o1] = [ax.toU(opening[0]), ax.toU(opening[1])].sort((p, q) => p - q);
  for (const s of f.stops) {
    if (o1 <= s.u && o1 >= s.u - s.brick - 0.01) hi = o1;
    if (o0 >= s.u && o0 <= s.u + s.brick + 0.01) lo = o0;
  }
  return [ax.toA(lo), ax.toA(hi)].sort((p, q) => p - q) as Range;
};
// a sill's lugs stop at a column face
const clipToColumns = (w: WindowSpec, a: Range, opening: Range): Range => {
  const ax = uAxis(w);
  let [lo, hi] = [ax.toU(a[0]), ax.toU(a[1])].sort((p, q) => p - q);
  const [o0, o1] = [ax.toU(opening[0]), ax.toU(opening[1])].sort((p, q) => p - q);
  for (const [c0, c1] of wallColumns(w.wall)) {
    if (c0 >= o1 - 0.01 && c0 < hi) hi = c0;
    if (c1 <= o0 + 0.01 && c1 > lo) lo = c1;
  }
  return [ax.toA(lo), ax.toA(hi)].sort((p, q) => p - q) as Range;
};
export const outline = (w: WindowSpec): Outline => {
  const o = rawOutline(w);
  const f = o.kind === "rect" ? brickFacadeRaw(w) : null;
  if (o.kind !== "rect" || !f) return o;
  return { ...o, a: snapToColumns(w, o.a, f) };
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

// ---- 3D brick facades (BRICK_FACADES in plan.ts) ---------------------------
const infillSpec = (f: BrickFacade, i: BrickInfill): WindowSpec => ({
  tag: "infill",
  wall: f.wall,
  u: i.u,
  y0: i.y0,
  w: i.w,
  h: i.h,
  cols: [1],
  rows: [1],
  sys: "SF",
  stoneSill: true,
});
// a stone sill under a window's opening, in its local (a, y, d)
export const stoneSillLocal = (w: WindowSpec) => {
  const o = outline(w);
  if (o.kind !== "rect") return null;
  const face = WINDOW_WALLS[w.wall].face;
  const back = w.tag === "infill" ? face - TAN_BRICK.depth : windowDepths(w).back;
  return {
    a: sillToFacadeEnds(w, clipToColumns(w, [o.a[0] - STONE_SILL.lug, o.a[1] + STONE_SILL.lug], o.a), o.a),
    y: [o.y[0] - STONE_SILL.h, o.y[0]] as Range,
    d: [back, face + STONE_SILL.proud] as Range,
  };
};
const localBoxToWorld = (w: WindowSpec, a: Range, y: Range, d: Range): Box3 => {
  const p = toWorld(w, a[0], 0, d[0]);
  const q = toWorld(w, a[1], 0, d[1]);
  return { x: [Math.min(p[0], q[0]), Math.max(p[0], q[0])], y, z: [Math.min(p[2], q[2]), Math.max(p[2], q[2])] };
};
// everything one facade builds: the brick (with its openings) and the sills
export const brickFacadeParts = (f: BrickFacade) => {
  const P = brickPlane(f.wall);
  const windows = WINDOWS.filter((w) => brickFacadeOf(w) === f);
  const sillUnder = [...windows.filter((w) => w.stoneSill), ...f.infill.map((i) => infillSpec(f, i))];
  const holes: { u: Range; y: Range }[] = [...(f.openings ?? [])];
  for (const w of windows) {
    const o = outline(w);
    if (o.kind === "rect") holes.push({ u: uSpan(w, o.a), y: o.y });
  }
  const sills: Box3[] = [];
  for (const w of sillUnder) {
    const s = stoneSillLocal(w);
    if (!s) continue;
    holes.push({ u: uSpan(w, s.a), y: s.y });
    sills.push(localBoxToWorld(w, s.a, s.y, s.d));
  }
  // the mortar bed runs back into the core (its face 0.3 behind the wall
  // line), so the core's edges (window pockets) never show through the brick
  const bedDepth = WINDOW_WALLS[f.wall].face + 0.35;
  const brick: TanBrickWallSpec = {
    plane: P.plane,
    face: P.face,
    out: P.out,
    u: f.u,
    y: f.y,
    seed: f.seed,
    holes,
    bedDepth,
    unit: f.unit === "cmu" ? CMU_BLOCK : undefined,
  };
  return { brick, sills };
};
// where each facade clears its drawing, in sheet pixels
type URect = { u: Range; y: Range };
// rectangle minus rectangle, as up to four rectangles
const minusRect = (r: URect, h: URect): URect[] => {
  const u0 = Math.max(r.u[0], h.u[0]), u1 = Math.min(r.u[1], h.u[1]);
  const y0 = Math.max(r.y[0], h.y[0]), y1 = Math.min(r.y[1], h.y[1]);
  if (u0 >= u1 || y0 >= y1) return [r];
  const out: URect[] = [];
  if (r.u[0] < u0) out.push({ u: [r.u[0], u0], y: r.y });
  if (u1 < r.u[1]) out.push({ u: [u1, r.u[1]], y: r.y });
  if (r.y[0] < y0) out.push({ u: [u0, u1], y: [r.y[0], y0] });
  if (y1 < r.y[1]) out.push({ u: [u0, u1], y: [y1, r.y[1]] });
  return out;
};
const facadeClears = BRICK_FACADES.flatMap((f) => {
  const sheet = WINDOW_WALLS[f.wall].sheet;
  if (!sheet) return [];
  const s = SHEETS[sheet];
  const kept = (f.openings ?? []).filter((o) => o.keep);
  const rects = kept.reduce<URect[]>((acc, h) => acc.flatMap((q) => minusRect(q, h)), [{ u: f.u, y: f.y }]);
  return rects.map((q) => {
    const xs = q.u.map(s.px);
    return { sheet, x0: Math.min(...xs), x1: Math.max(...xs), y0: s.l1 - q.y[1] * PX, y1: s.l1 - q.y[0] * PX };
  });
});

// drawn windows taken out of the drawings (DRAWING_ERASES in plan.ts)
const erases = DRAWING_ERASES.map((e) => {
  const s = SHEETS[e.sheet];
  const xs = e.u.map(s.px);
  return { sheet: e.sheet, x0: Math.min(...xs), x1: Math.max(...xs), y0: s.l1 - e.y[1] * PX, y1: s.l1 - e.y[0] * PX, fill: e.fill };
});
export const BRICK_SHEET_CLEARS = [...facadeClears, ...erases.filter((e) => !e.fill)];
// areas painted over instead (DrawingErase.fill)
export const SHEET_FILLS = erases.filter((e): e is typeof e & { fill: string } => !!e.fill);
