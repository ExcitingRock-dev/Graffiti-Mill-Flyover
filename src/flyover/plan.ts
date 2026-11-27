import type { CorrugatedLook } from "./Sheds";

// 3D geometry of the East Building, from the GM Window Order Plan Set (10/9/2026):
// G160 axons, A100-A106 plans, A140 roof plan, 401-403 elevations.
// World units are FEET. y = 0 is Level 1 (100'-0"). x runs grid 1 -> 13
// (true south -> true north). z: grid A = 0, + is true east, grid K = -62.

export type XZ = [number, number];

export const GX = {
  g1: 0,
  g2: 16.07,
  g3: 37.1,
  g4: 57.1,
  g5: 76.4,
  g6: 87.4,
  g7: 97.4,
  g8: 107.4,
  g9: 118.44,
  g10: 139.7,
  g11: 160.7,
  g12: 181.7,
  g13: 202.67,
};
export const GZ = {
  A: 0,
  B: -6,
  C: -16,
  D: -21.6,
  E: -26,
  F: -34,
  G: -43,
  H: -44.9,
  J: -51.6,
  K: -62,
};

// Heights above Level 1 (ft)
export const H = {
  l2: 12, // 112'
  l3: 24, // 124'
  l4: 38, // 138'
  l5: 52, // 152' (A403 sills at grid 3-4)
  e6: 70.0, // Level E6 (170'-0"): the Level 6 South Deck (A402, 3/G160)
  auger: 77, // 177'-0"
  wingParapet: 27.5,
};

// ---- Main block (5 stories + E6) ------------------------------------------
export const MAIN = { x0: GX.g2, x1: GX.g9, z0: GZ.K, z1: GZ.B, top: H.auger };
// the Auger roof slab: rests on the columns and runs out flush with their outer
// faces on the south (x0) and west (z0) edges (Collin 2026-11-26)
export const MAIN_ROOF_SLAB = 0.5;

// ---- Roof over the north end (grid 7-9, above the Speakeasy) ---------------
// Collin 2026-11-26 from 4/G160 NE axon + 1/G160 NW axon, measured on A402
// north, A403 east, A401 west and the A140 roof plan:
// - the masonry stops at the first roofline, 170'-0" (A403 brick top, A402 band
//   bottom); two gabled metal sheds sit on it
// - the north face is capped by a slightly pitched stone (speckled precast)
//   band: flat bottom at 170'-0", 172'-9" at the ends, 175'-0" at the peak over
//   the middle column; it projects past the face and overhangs both ends
// - the precast tower (grid 7-9 x K to the shed wall) tops out at 154'-0"; the
//   massing above it does not exist (the elevation's background linework there
//   had been painted black)
export const NORTH_ROOFLINE = 70.0;
// underside of the 8" east roof edge: the east columns stop here
export const EAST_EDGE_UNDERSIDE = NORTH_ROOFLINE - 0.67;
export const NORTH_BAND = {
  z: [-5.3, -47.7] as [number, number], // overhangs the walls at z -6 and -46.3 (A402)
  bottom: NORTH_ROOFLINE,
  endTop: 72.7,
  peakTop: 75.0,
  peakZ: -25.85,
  proud: 0.9, // projection past the north face
  back: 0.3, // into the wall
};
// the 170' roofline on the east face: a precast edge standing proud of the
// wall, its face flush with the stone band's east butt end (Collin 2026-11-26).
// Runs from the stair tower under the band's end, out flush with the band's
// north face; the sheds sit on top of it. At the NE corner it widens into a cap
// over the corner column, so the column tops out under it (no shared planes).
export const EAST_ROOF_EDGE = {
  x: [87.7, GX.g9 + NORTH_BAND.proud] as [number, number], // TOWER.x1 to the band's face
  y: [EAST_EDGE_UNDERSIDE, NORTH_ROOFLINE] as [number, number], // 8" thick
  z: [GZ.B - 0.3, NORTH_BAND.z[0]] as [number, number], // into the wall, out to the band's end
  // over the 1.5 ft corner column: the edge's north face runs on to z[0], the
  // column's west face (x[1] is only the column's own face, PIER.proud 0.3)
  cornerCap: { x: [GX.g9 - 1.5, GX.g9 + 0.3] as [number, number], z: [GZ.B - 1.5, GZ.B + 0.3] as [number, number] },
};

export const PRECAST_TOWER = {
  x: [94.6, GX.g9] as [number, number], // A140: parapet to the elevator enclosure wall
  z: [GZ.K, -46.3] as [number, number], // to the west shed's wall
  top: 54.0, // 154'-0" parapet top (A402, A401)
  roof: 53.0,
  parapetT: 0.67,
};
// The New Precast Structure (Collin 2026-11-26): the precast tower plus the
// elevator shaft and stair beside it, grid 5 to grid 9. One concrete skin
// (concrete.ts) from grade to the roofs, no horizontal seams; its walls stand
// `skin` proud of the grid lines so the north and west faces meet in one clean
// 90-degree corner. Only the drawing's windows are laid over it.
export const NEW_PRECAST = {
  x: [75.6, GX.g9] as [number, number], // grid 5 to grid 9
  skin: 0.1,
  grade: -1.2,
};
// Openings in the two corrugated sheds (A402 north, A403 east)
export const NORTH_SHEDS = {
  // north gable of the west shed, the box with an X just above the stone band:
  // a louvered vent recessed 2" (Collin 2026-11-26)
  vent: { z: [-43.3, -40.3] as [number, number], y: [75.26, 77.11] as [number, number], recess: 2 / 12 },
  // east shed, east wall: new sectional overhead door replacing the blown-out one
  // (horizontal-panel box on A403, 10'-0" x 10'-8" on the roofline)
  door: { x: [105.8, 115.8] as [number, number], y: [70.3, 81.0] as [number, number], color: "#cfcdc6" },
  // no glazed enclosure at the east wall's south end, despite the A403 note: that
  // wall stays weathered corrugated steel (Collin 2026-11-26)
  roofThick: 0.25,
};
// the north block's west wall above the precast roof (A401 + 1/G160, Collin
// 2026-11-26): brick to 161'-6", a 6" tan stone sill, then the old window
// opening to 167'-0", filled with framing and new dark corrugated panel set 1"
// into the opening; a concrete head up to the roof edge. Two columns (NW corner,
// grid 7) stop under the roof edge; past grid 7 a narrow bay and the end jamb
// at the elevator enclosure.
export const NORTH_WEST_WALL = {
  z: PRECAST_TOWER.z[1], // wall face; outward is -z
  brickTop: 61.5,
  sill: { top: 62.0, proud: 2 / 12, color: "#d3c29a" }, // typical: 2" past the wall
  head: 67.0,
  infillRecess: 1 / 12,
  columns: [
    { name: "north block west, NW corner", x: [GX.g9 - 1.4, GX.g9] as [number, number] },
    { name: "north block west, grid 7", x: [96.66, 98.5] as [number, number] },
  ],
  bays: [
    [98.5, GX.g9 - 1.4],
    [95.45, 96.66],
  ] as [number, number][],
  endJamb: [PRECAST_TOWER.x[0], 95.45] as [number, number],
};
// same 8" roof edge as the east side, along this west wall: from the elevator
// enclosure out flush with the band's north face, its west face flush with the
// band's west butt end (Collin 2026-11-26)
export const WEST_ROOF_EDGE = {
  x: [PRECAST_TOWER.x[0], GX.g9 + NORTH_BAND.proud] as [number, number],
  y: EAST_ROOF_EDGE.y,
  z: [NORTH_BAND.z[1], PRECAST_TOWER.z[1] + 0.3] as [number, number], // band's end, into the wall
  // as on the east side: over the NW corner column the edge widens east to the
  // column's east side, so the column tops out under it (Collin 2026-11-26)
  cornerCap: { x0: NORTH_WEST_WALL.columns[0].x[0], z1: -44.1 },
};

// Stair 1 tower with the round windows; gable roof, ridge along x
export const TOWER = {
  x0: 69.2,
  x1: 87.7,
  z0: -6.0,
  z1: 8.8,
  // single-slope roof (4/G160, A402): high on the west side (z0) at the
  // ridge, falling to the eave on the east face
  eave: 94.5,
  ridge: 99.2,
};

// Open observation level in the tower, Level 3 -> Level 4 (403 true east,
// 402 true south, 3/G160). Open on the south, east and north sides; the back
// is the building's east wall with a door in. Mesh guard on the three open
// sides, steel corner columns, a beam band under the upper tower, X-bracing.
export const TOWER_OPEN = {
  y0: H.l3, // deck at 124'-0"
  y1: H.l4, // upper tower starts at 138'-0"
  slab: 1.2,
  beam: 2, // beam band under the upper tower (403: ~136'-138')
  col: 0.9,
  guard: 3.5,
  // door from the building: position along x is an estimate (not dimensioned)
  door: { x: [72.5, 76] as [number, number], h: 7.5 },
};

// Glazed entry vestibule at the tower's south side, grid 4 -> tower (A100
// level 1, 403, 3/G160). Storefront to ~9'-6", sloped metal canopy roof.
export const ENTRY_VESTIBULE = {
  x: [GX.g4, 68.7] as [number, number],
  z: [GZ.B, 0.7] as [number, number],
  glassTop: 9.5,
  roof: { x: [56.6, 69.2] as [number, number], zOut: 1.6, high: 12.3, low: 10.2 },
  mullionEvery: 4,
};

// ---- North wing: bent / oblique east wall (A100, A140) ----------------------
// The wing's true-west wall is oblique too (040 set, 1/A100, measured on the
// sheet): its exterior face leaves grid K at grid 9 and is 4.5 ft inside K at
// grid 13, so the NW corner is NOT square.
export const WING_WEST = { z9: -62.0, z13: -57.47 };
// The wing's true-east wall is ONE straight oblique line (2/A102, 1/A100):
// from the grid 10 corner to grid 13, measured on the sheet.
export const WING_EAST = { z10: 13.8, z13: -6.85 };
export const wingEastZ = (x: number) =>
  WING_EAST.z10 + ((x - GX.g10) * (WING_EAST.z13 - WING_EAST.z10)) / (GX.g13 - GX.g10);
// Wing roof (Level 3, 124'): columns stop at 124', brick to the cap 126'-7"
// (A402 / A403). The brick is a 6" parapet (parapetT) standing above the roof
// deck; the black horizontal slat guard runs behind it, from the deck up to
// 128'-7" (4/G160 NE axon, Collin 2026-11-25). guardIn = guard centerline
// inside the facade plane (just behind the parapet).
export const WING_ROOF = { y: 24.1, cap: 26.7, parapetT: 0.5, guardTop: 28.6, guardIn: 0.65 };
// Roof deck access: the north stair lands on a small landing outside the north
// wall (z -30.2 to -26.25) and steps onto the roof through an opening in the
// brick band; the landing guard rises to meet the roof guard (A402 north).
export const NORTH_STAIR_GAP = { z0: -30.2, z1: -26.25 };
// Light well: trapezoid room from grade (100') to the roof, under a metal
// grate with a round opening for a tree (2/A102: 19'-1 5/8" wide, 11'-10" and
// 5'-7" deep to the wall). Opening size is "coordinate with L.A.": estimate.
export const LIGHT_WELL = {
  x: [161.5, 180.6] as [number, number],
  z0: GZ.B, // inside edge
  // tree opening: still undefined; Collin 2026-11-26 wants it smaller (~2 ft
  // across), same center
  hole: { x: 170.6, z: -1.4, r: 1.0 },
};
export const WING_POLY: XZ[] = [
  [GX.g9, WING_WEST.z9],
  [GX.g13, WING_WEST.z13],
  [GX.g13, WING_EAST.z13],
  [GX.g10, WING_EAST.z10],
  [GX.g10, GZ.B],
  [GX.g9, GZ.B],
];

// ---- Concrete wall columns (pilasters) -------------------------------------
// Light-gray concrete columns standing slightly proud of the brick. Collin
// (2026-11-25): "these columns exist all over the building". Each one is
// measured on the 040 elevations (A401 west, A402 south + north, A403 east) as
// an unhatched vertical strip; top = where that strip meets the brick band.
export const PIER = { proud: 0.3, depth: 1 };
export type Pier = { name: string; y0: number; top: number; poly: XZ[] };
const GRADE = -1.2;
const unit = (a: XZ, b: XZ): XZ => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
};
// a column on a straight wall: centered at `c`, `out` = outward wall normal
const wallPier = (name: string, c: XZ, out: XZ, w: number, y0: number, top: number): Pier => {
  const along: XZ = [-out[1], out[0]];
  const pt = (s: number, o: number): XZ => [
    c[0] + along[0] * s + out[0] * o,
    c[1] + along[1] * s + out[1] * o,
  ];
  const h = w / 2;
  return {
    name,
    y0,
    top,
    poly: [pt(-h, PIER.proud), pt(h, PIER.proud), pt(h, -PIER.depth), pt(-h, -PIER.depth)],
  };
};
// a column wrapping a convex corner `v`; uA / uB run along the two walls away from it
const cornerPier = (name: string, v: XZ, uA: XZ, uB: XZ, w: number, y0: number, top: number): Pier => {
  // outward normal of wall u: perpendicular to u, pointing away from the other wall
  const perp = (u: XZ, other: XZ): XZ => {
    const n: XZ = [-u[1], u[0]];
    const s = n[0] * other[0] + n[1] * other[1] > 0 ? -1 : 1;
    return [n[0] * s, n[1] * s];
  };
  const nA = perp(uA, uB);
  const nB = perp(uB, uA);
  const e = PIER.proud;
  const P = (a: number, b: number, oa: number, ob: number): XZ => [
    v[0] + uA[0] * a + uB[0] * b + nA[0] * oa + nB[0] * ob,
    v[1] + uA[1] * a + uB[1] * b + nA[1] * oa + nB[1] * ob,
  ];
  return { name, y0, top, poly: [P(0, 0, e, e), P(w, 0, e, 0), P(w, w, 0, 0), P(0, w, 0, e)] };
};

const wingWestZ = (x: number) =>
  WING_WEST.z9 + ((x - GX.g9) * (WING_WEST.z13 - WING_WEST.z9)) / (GX.g13 - GX.g9);
const WING_W_IN = unit([GX.g13, WING_WEST.z13], [GX.g9, WING_WEST.z9]); // NW corner -> grid 9
const WING_W_OUT: XZ = [-WING_W_IN[1], WING_W_IN[0]]; // outward, toward -z
// Tops. Main block: under the Auger roof slab (176'-6"), which caps them;
// on the east face the columns stop under the top brick band at ~171'-5".
const MAIN_TOP = MAIN.top - MAIN_ROOF_SLAB; // under the roof slab
// W53's north jamb (A401, west face) and the precast face: the column spans them
const W53_NORTH_JAMB = 73.6;
const GRID5_WEST_COLUMN = (W53_NORTH_JAMB + NEW_PRECAST.x[0]) / 2;
const DECK_CURB_TOP = 72.0; // see SOUTH_DECK
// the Level 6 South Deck's roof edge (Collin 2026-11-27): the grey band on
// A403 / A402 at the deck line (170'-0" to 170'-7") is the roofline, the brick
// above it a parapet. An 8" slab edge like the north roof edges, out flush with
// the columns' outer faces; the columns under it stop at its underside (just
// below the deck surface, so their tops stay hidden inside the deck slab).
// Runs along the east face from the SE corner over the grid-4 column (x 57.2),
// and around the corner along the south face to the grid-G column (z -43.1),
// which keeps rising to the Auger roof.
export const SOUTH_DECK_EDGE = {
  y: [70.6 - 0.67, 70.6] as [number, number],
  out: PIER.proud, // outer face, past the wall plane
  in: 0.25, // inner face, inside the wall (hidden in the brick curb)
  x1: 57.2 + 1, // east face: to the grid-4 column's north side
  z0: -43.1 + 1, // south face: to the grid-G column's east side
};
const DECK_EDGE_UNDERSIDE = SOUTH_DECK_EDGE.y[0];
// Wing: every face's columns stop at the roof (124'), brick infill above them
// to the cap, mesh guard above that (Collin 2026-11-25: east matches north).
const WING_BAND = 24;

// wing east wall: outward normal (toward +z, true east)
const WING_E_DIR = unit([GX.g10, WING_EAST.z10], [GX.g13, WING_EAST.z13]);
const WING_E_OUT: XZ = [-WING_E_DIR[1], WING_E_DIR[0]];

// the NW corner column's plan extent (see PIERS)
export const NW_CORNER_COLUMN = {
  x: [NORTH_WEST_WALL.columns[0].x[0], GX.g9 + PIER.proud] as [number, number],
  z: [PRECAST_TOWER.z[1] - PIER.proud, WEST_ROOF_EDGE.cornerCap.z1] as [number, number], // west edge, east edge
};
// the door and low window on the precast north face (A402, z -46.4 to -55.0 on
// the sheet) move west to clear that column's west edge
export const NORTH_DOOR_SHIFT = { z: [PRECAST_TOWER.z[1], -56.0] as [number, number], by: 0.4 };
export const PIERS: Pier[] = [
  // ---- main block corners
  // stops under the Level 6 South Deck's roof edge (SOUTH_DECK_EDGE)
  cornerPier("main SE corner", [GX.g2, GZ.B], [1, 0], [0, -1], 2, GRADE, DECK_EDGE_UNDERSIDE),
  cornerPier("main SW corner", [GX.g2, GZ.K], [1, 0], [0, 1], 2, GRADE, MAIN_TOP),
  // stops under the stone band (A402)
  cornerPier("main NE corner, above wing roof", [GX.g9, GZ.B], [-1, 0], [0, -1], 1.5, H.l3, EAST_EDGE_UNDERSIDE),
  // ---- main east (A403): grids 3, 4, 7
  // grid 7 stops at the 170' roofline under the sheds (Collin 2026-11-26);
  // grids 3 and 4 under the South Deck's roof edge (Collin 2026-11-27)
  ...[37.1, 57.2, 97.4].map((x) =>
    wallPier(`main east x ${x}`, [x, GZ.B], [0, 1], 2, GRADE, x === 97.4 ? EAST_EDGE_UNDERSIDE : DECK_EDGE_UNDERSIDE),
  ),
  // ---- main west (A401): grids 3, 4, and grid 5 beside the elevator enclosure.
  // The grid-5 column is not where A401 draws it: Google Earth shows it filling
  // the gap from the New Precast Structure to W53's north jamb (Collin 2026-11-26)
  ...[37.35, 57.2, GRID5_WEST_COLUMN].map((x) =>
    wallPier(`main west x ${x}`, [x, GZ.K], [0, -1], 2, GRADE, MAIN_TOP),
  ),
  // ---- main south (A402 left): near grids G and D/E
  ...[-43.1, -25.4].map((z) =>
    wallPier(`main south z ${z}`, [GX.g2, z], [-1, 0], 2, GRADE, z > -42.4 ? DECK_EDGE_UNDERSIDE : MAIN_TOP),
  ),
  // ---- main north above the wing roof (A402 right)
  wallPier("main north z -26.1", [GX.g9, -26.1], [1, 0], 2, H.l3, NORTH_BAND.bottom),
  // NW corner: ONE column, from the wing roof up to the roof edge. It wraps the
  // grid -45.1 pier on the north face and the north block's NW corner column
  // above the precast roof; its west edge (z -46.6) runs down the New Precast
  // Structure's north face, proud of the concrete (Collin 2026-11-26)
  {
    name: "main NW corner column",
    y0: H.l3,
    top: EAST_EDGE_UNDERSIDE,
    poly: [
      [NW_CORNER_COLUMN.x[1], NW_CORNER_COLUMN.z[0]],
      [NW_CORNER_COLUMN.x[1], NW_CORNER_COLUMN.z[1]],
      [NW_CORNER_COLUMN.x[0], NW_CORNER_COLUMN.z[1]],
      [NW_CORNER_COLUMN.x[0], NW_CORNER_COLUMN.z[0]],
    ],
  },
  // ---- north block west wall above the precast roof: stop under the roof edge
  ...NORTH_WEST_WALL.columns.filter((c) => c !== NORTH_WEST_WALL.columns[0]).map((c) =>
    wallPier(c.name, [(c.x[0] + c.x[1]) / 2, NORTH_WEST_WALL.z], [0, -1], c.x[1] - c.x[0], PRECAST_TOWER.roof, EAST_EDGE_UNDERSIDE),
  ),
  // ---- wing NW corner (oblique west wall), grade to the brick band at 124'
  cornerPier("wing NW corner", [GX.g13, WING_WEST.z13], WING_W_IN, [0, 1], 1.5, GRADE, WING_BAND),
  // ---- wing west (A401): grids 10, 11, 12
  ...[GX.g10, GX.g11, GX.g12].map((x) =>
    wallPier(`wing west x ${x}`, [x, wingWestZ(x)], WING_W_OUT, 1.7, GRADE, WING_BAND),
  ),
  // ---- wing north (A402 right): near grids D and G
  ...[-25.4, -43.5].map((z) =>
    wallPier(`wing north z ${z}`, [GX.g13, z], [1, 0], 1.7, GRADE, WING_BAND),
  ),
  // ---- wing east (A403 right): NE corner, two on the wall (they line up with
  // the light well walls), the grid 10 corner
  cornerPier("wing NE corner", [GX.g13, WING_EAST.z13], [-WING_E_DIR[0], -WING_E_DIR[1]], [0, -1], 1.6, GRADE, WING_BAND),
  ...[160.4, 181.5].map((x) =>
    wallPier(`wing east x ${x}`, [x, wingEastZ(x)], WING_E_OUT, 1.6, GRADE, WING_BAND),
  ),
  cornerPier("wing east grid 10 corner", [GX.g10, WING_EAST.z10], WING_E_DIR, [0, -1], 1.6, GRADE, WING_BAND),
];

// ---- Head house: corrugated volumes above the Auger level (A140 + 401/402/403)
export type Volume = {
  name: string;
  x: [number, number];
  z: [number, number];
  base: number;
  eave: number;
  ridge: number; // = eave for flat tops
  axis: "x" | "z"; // ridge direction
  mat: "metal" | "precast";
  // corrugated steel skin (Sheds.tsx) instead of a flat solid
  skin?: "corrugated";
  look?: CorrugatedLook; // skin color, default the old off-white steel
  // gable (default) or single slope: high along the a side (z[0] for axis x,
  // x[0] for axis z) at `ridge`, low along the b side at `eave`
  roof?: "gable" | "shed";
  // single slope only: which side is high (default a); axis x only for "b"
  high?: "a" | "b";
  // roof overhang past the walls (ft). a / b: the two eave sides (a = z[0] for
  // axis x, x[0] for axis z). end / start: the gable ends at the high / low end
  // of the ridge axis for axis x (x[1] / x[0]); for axis z, z[0] / z[1]
  overhang?: { start?: number; end: number; a: number; b: number };
  // an open bay in the a-side wall (axis z only): world z range, from the base
  // up to `top`, recessed `depth` into the volume
  opening?: { z: [number, number]; top: number; depth: number };
  // single slope only: a band along the low eave in another finish, `frac` of
  // the wall-to-wall run (the eave overhang goes with it)
  roofLow?: { look: CorrugatedLook; frac: number };
};
// HB's roof: red over most of it, the lower part the pale weathered steel
// (Google Earth, Collin 2026-11-26). The split is read off the photo: an estimate.
const HB_ROOF_LOW = { look: "existing" as const, frac: 0.3 };
// 8" eaves on every roof (4/G160; Collin 2026-11-26)
export const EAVE = 8 / 12;
const EAVES = { start: EAVE, end: EAVE, a: EAVE, b: EAVE };
// the east wall line of sheds HA, HB and HC (A402 south, 8" inside the eave tips)
const HEAD_HOUSE_EAST_WALL = -46.3;
// HA and HB read as one building: HA gabled, HB a single slope that carries
// HA's east slope on up to the west face. Same eave on the east wall, same
// pitch (A402 south: both lines fall ~0.43; Collin 2026-11-26)
const HA_HB_EAVE = 85.4;
const HA_HB_PITCH = 0.43;
const HA_Z: [number, number] = [-57.1, HEAD_HOUSE_EAST_WALL];
const HB_Z: [number, number] = [GZ.K, HEAD_HOUSE_EAST_WALL];
export const HEAD_HOUSE: Volume[] = [
  {
    // walls z -57.1 to -46.3 (A402 south: the gable front, ridge on grid J);
    // HB shares its east wall line (Collin 2026-11-26)
    name: "HA grid 2-3 K-H",
    skin: "corrugated",
    // no eave at the north end, where it meets HB
    overhang: { ...EAVES, end: 0 },
    x: [16.07, 36.2],
    z: HA_Z,
    base: 77,
    eave: HA_HB_EAVE,
    ridge: HA_HB_EAVE + (HA_HB_PITCH * (HA_Z[1] - HA_Z[0])) / 2,
    axis: "x",
    mat: "metal",
  },
  {
    // single slope, high at the west face, falling east at HA's pitch (A402
    // south: ~192'-4" at grid K; A401 shows its high edge; Collin 2026-11-26)
    name: "HB grid 3-4 K-H",
    skin: "corrugated",
    look: "rustRed",
    roofLow: HB_ROOF_LOW,
    roof: "shed",
    // no eave at the south end, where it meets HA
    overhang: { ...EAVES, start: 0 },
    x: [36.2, 46.1],
    z: HB_Z,
    base: 77,
    eave: HA_HB_EAVE,
    ridge: HA_HB_EAVE + HA_HB_PITCH * (HB_Z[1] - HB_Z[0]),
    axis: "x",
    mat: "metal",
  },
  {
    // gable, ridge along x, gable end to the north (4/G160); eave and ridge
    // from the south elevation (A402)
    name: "HC tall shaft",
    skin: "corrugated",
    look: "rustRed",
    overhang: EAVES,
    x: [46.1, 57.7],
    z: [GZ.K, HEAD_HOUSE_EAST_WALL],
    base: 77,
    eave: 103.4,
    ridge: 107.2,
    axis: "x",
    mat: "metal",
  },
  {
    // lower than it was, single slope: low eave on the west face, set 36"
    // behind grid K, rising east to die into the central gable's west end
    // (Collin 2026-11-26; eave 186'-5" on A401, about 193'-4" at the high
    // side on A402, the same pitch as HB). No eave where it meets HC (south)
    // or the central gable (east).
    name: "HD grid 4-5 K-G",
    skin: "corrugated",
    roof: "shed",
    high: "b",
    overhang: { start: 0, end: EAVE, a: EAVE, b: 0 },
    x: [57.7, 75.6],
    z: [GZ.K + 3, -42.4],
    base: 77,
    eave: 86.4,
    ridge: 93.3,
    axis: "x",
    mat: "metal",
  },
  // The tall gable seen over the elevator on A401 is not on the elevator: it
  // is a raised gable on the central roof (Collin 2026-11-26). A140 shows its
  // footprint inside HG's north slope; heights from A401.
  {
    // walls x 75 to 88 (A140: the ridge at 81.8); the strip south of it on A140
    // is HG_ROOF_EXTENSION
    name: "HG2 raised gable on the central roof",
    skin: "corrugated",
    overhang: EAVES,
    x: [75, 88],
    z: [-31.8, -19.7],
    base: 93.5,
    eave: 103.4,
    ridge: 106.1,
    axis: "z",
    mat: "metal",
  },
  {
    // its south wall stands on the Level 6 South Deck (E6), with an open bay
    // at its west end where a stair climbs from the deck (3/G160; A402 south:
    // z -41.8 to -19.0, head 185'-4"). Bay depth not drawn: 8' assumed.
    // The bay's east side wall is gone: the bay runs on east to house the
    // stair up from Level 5 too (DECK_HATCH; Collin 2026-11-27).
    name: "HG central gable",
    skin: "corrugated",
    opening: { z: [-41.8, -9.0], top: 85.3, depth: 8 },
    // no eave where it meets the stair tower (east end) or the north sheds
    overhang: { start: 0, end: EAVE, a: EAVE, b: 0 },
    x: [55.3, 87.9],
    z: [-42.4, -6.8],
    base: H.e6,
    eave: 93.5,
    ridge: 99.7,
    axis: "z",
    mat: "metal",
  },
  // two gabled metal sheds on the 170' roofline, gable ends to the north,
  // ridges along x (A140 seams; A402 north for the heights)
  {
    name: "HH east shed",
    x: [88.0, GX.g9],
    z: [-25.8, GZ.B],
    base: NORTH_ROOFLINE,
    eave: 88.4, // 188'-5"
    ridge: 89.6, // 189'-7"
    axis: "x",
    mat: "metal",
    skin: "corrugated",
    // none on the west side, it dies into the taller shed
    overhang: { end: EAVE, a: 0, b: EAVE },
  },
  {
    name: "HH west shed",
    x: [88.0, GX.g9],
    z: [PRECAST_TOWER.z[1], -25.8],
    base: NORTH_ROOFLINE,
    eave: 92.9, // 192'-11"
    ridge: 94.3, // 194'-4"
    axis: "x",
    mat: "metal",
    skin: "corrugated",
    overhang: { end: EAVE, a: EAVE, b: EAVE },
  },
];
// The central gable's south slope runs on past its ridge, at the same pitch,
// up into the raised gable's south wall (3/G160; Collin 2026-11-26): a small
// lean-to over HG2's length, closed at both ends down to HG's north slope.
const HG_VOL = HEAD_HOUSE.find((v) => v.name === "HG central gable")!;
const HG2_VOL = HEAD_HOUSE.find((v) => v.name.startsWith("HG2"))!;
export const HG_ROOF_EXTENSION = {
  x: [(HG_VOL.x[0] + HG_VOL.x[1]) / 2, HG2_VOL.x[0]] as [number, number], // HG ridge -> HG2 south wall
  z: HG2_VOL.z,
  ridge: HG_VOL.ridge,
  slope: (HG_VOL.ridge - HG_VOL.eave) / ((HG_VOL.x[1] - HG_VOL.x[0]) / 2), // rise per ft
};
// Elevator enclosure: part of the new precast structure (A401 "NEW ELEVATOR
// ENCLOSURE, PRE-CAST CONCRETE"), concrete like the building below. Single-slope
// corrugated roof (A140 ribs run west-east, no ridge): low at the west face at
// 189'-0" (A401 top of the concrete), up to 196'-0" at its east side; the band
// on A401 between them is this roof seen from its low side (Collin 2026-11-26).
export const ELEVATOR = {
  x: [NEW_PRECAST.x[0], PRECAST_TOWER.x[0]] as [number, number],
  z: [GZ.K - NEW_PRECAST.skin, -46.7] as [number, number], // west face flush with the tower's
  base: NEW_PRECAST.grade, // one wall from the ground to the roof
  low: 89.0, // west eave
  high: 96.0, // east side
  roofThick: 0.25,
};
// Concrete flat roof (speckle on A140) = the precast tower's roof
export const CONCRETE_ROOF = {
  x: PRECAST_TOWER.x,
  z: PRECAST_TOWER.z,
  y: PRECAST_TOWER.roof,
};
// Level 6 South Deck (3/G160, A402 south, A403 east; Collin 2026-11-26): an
// open roof deck at E6, not the Auger roof. Along its south and east edges a
// stone band at the deck line, a brick curb to 172'-0" and a guardrail to
// 173'-6"; to the west it steps up to the 177' roof under HA / HB, to the
// north the central gable's south wall rises from it.
export const SOUTH_DECK = {
  x: [GX.g2, 55.3] as [number, number],
  z: [-42.4, GZ.B] as [number, number],
  y: H.e6,
  curbTop: DECK_CURB_TOP,
  curbThick: 0.67,
  railTop: 73.5,
};
// the deck's west side steps up to the 177' roof: this step wall (the
// bulkhead) under the roof slab is 3D tan brick (TAN_BRICK) from the grid-G
// column to where
// A403's brick ends (x 38.0, grid 3), then concrete set 4" behind the brick
// face, on to the central gable (Collin 2026-11-27)
export const DECK_STEP_WALL = {
  z: SOUTH_DECK.z[0], // brick face, facing the deck (+z)
  top: MAIN.top - MAIN_ROOF_SLAB, // under the roof slab
  brickEnd: 38.0,
  recess: 4 / 12,
  brickSeed: 31,
};

// ---- Decks (lavender on A140) --------------------------------------------
export type Deck = { name: string; poly: XZ[]; y: number; rail?: XZ[] };
export const DECKS: Deck[] = [
  {
    name: "L1 south + east deck",
    y: 0,
    poly: [
      [0, -72],
      [GX.g2, -72],
      [GX.g2, GZ.B],
      [69.2, GZ.B],
      [69.2, 8],
      [63.3, 8],
      [63.3, 14.1],
      [0, 14.1],
    ],
    rail: [
      [GX.g2, -72],
      [0, -72],
      [0, 14.1],
      [63.3, 14.1],
    ],
  },
  {
    name: "L1 deck north of tower",
    y: 0,
    poly: [
      [87.7, GZ.B],
      [GX.g10, GZ.B],
      [GX.g10, 8],
      [114, 8],
      [114, 0],
      [99, 0],
      [99, 8],
      [93.4, 8],
      [93.4, 14.1],
      [87.7, 14.1],
    ],
    rail: [
      [93.4, 14.1],
      [93.4, 8],
      [99, 8],
      [99, 0],
      [114, 0],
      [114, 8],
      [GX.g10, 8],
    ],
  },
  {
    name: "L1 deck west (K side) grid 2-5",
    y: 0,
    poly: [
      [GX.g2, -67.7],
      [75, -67.7],
      [75, GZ.K],
      [GX.g2, GZ.K],
    ],
    rail: [
      [GX.g2, -67.7],
      [75, -67.7],
      [75, GZ.K],
    ],
  },
];

export type FrameEdge = "front" | "west" | "east";
// ---- South steel frame, grid 1-2 -------------------------------------------
// Column lines and levels measured on 1/402 PLAN WEST ELEVATION (TRUE SOUTH),
// checked against 3/G160 SE axon and Collin's markup (2026-11-23).
// Columns stand in two rows: front (true south edge) and back (at grid 2).
// The upper steel (L4 deck at 138', its rail, and the columns carrying it at
// K and z -47) is gone on 1/A402 rev 2026-1112: those columns stop at the L2
// deck, and the z -31 column stops at the ring platform (Collin 2026-11-27).
const FRAME_L2_DECK_Y = 14.17; // 114'-2" (2'-2" above Level 2)
const FRAME_RING_Y = 29;
export const FRAME = {
  x: [0.6, 15.5] as [number, number], // column rows (front, back)
  colSize: 1.1,
  cols: [
    { z: -62, top: FRAME_L2_DECK_Y }, // grid K, up to the L2 deck
    { z: -47, top: FRAME_L2_DECK_Y },
    { z: -31, top: FRAME_RING_Y }, // ring platform west end
    { z: -16, top: FRAME_RING_Y },
    { z: -1, top: FRAME_RING_Y }, // just inside grid A
  ],
  // slabs: deck surface y, slab depth, z extent, which edges get guardrails
  decks: [
    {
      name: "L2 deck",
      y: FRAME_L2_DECK_Y,
      t: 2.2,
      z: [-62, -1] as [number, number],
      rails: ["front", "west", "east"] as FrameEdge[],
    },
    {
      name: "ring platform",
      y: FRAME_RING_Y,
      t: 2,
      z: [-31, -1] as [number, number],
      rails: [] as FrameEdge[],
    },
  ],
  deckX: [0, GX.g2] as [number, number], // slabs run back to the grid-2 face
};
// Two round "silo" rings on the ring platform (A140 circles at grid 1-2, C/D)
// ---- East overhead-door bay, grid 3-4 -------------------------------------
// Between the grid-3 and grid-4 piers on the east face the wall is rebuilt as
// 3D tan brick, 12" thick (three wythes, 4/A640), with glazed overhead doors
// set behind it (Collin 2026-11-27). Typical opening per 2/A640: 16'-0" clear,
// 11" of brick from the grid-3 pier, a steel channel header ("pinch beam")
// bolted through at 16" o.c. on the face, 3/8" steel angle casing lining the
// reveal with a short leg returned onto the face, and a 42" cable guardrail
// standing in the opening just behind the face (3/A640). Sills and heads are
// measured on A403. Level 1 has a small overhead door at grade; Level 2 an
// overhead door and a door.
export type DoorBayOpening = {
  name: string;
  x: [number, number]; // clear opening
  y: [number, number]; // sill (floor level), head
  infill: "ohd" | "lite";
  cols?: number; // overhead door: glazed columns
  header?: boolean; // steel channel header on the face
  guard?: boolean; // cable guardrail in the opening (default yes)
};
export const EAST_DOOR_BAY = {
  face: GZ.B,
  x: [38.1, 56.2] as [number, number], // grid-3 pier face to grid-4 pier face
  y: [0, DECK_EDGE_UNDERSIDE] as [number, number], // Level 1 to the deck edge
  wall: 1.0, // 12": three wythes of brick
  brickSeed: 47,
  casing: { t: 0.03, leg: 0.28 }, // 3/8" plate, ~3 3/8" leg on the face
  jambTube: { w: 0.28, d: 0.17 }, // HSS jamb + head behind the wall, face flush with the casing
  door: { back: 0.07, t: 0.18, overlap: 1 / 12, section: 1.83, frame: 0.17, bottomRail: 1.5 }, // back: gap behind the tube (track)
  // channel runs 4" past the casing leg each side (Collin 2026-11-27)
  header: { h: 0.83, proud: 0.22, plate: 0.035, past: 4 / 12, boltPitch: 16 / 12 }, // C10 channel
  guard: { h: 3.5, set: 0.23, tube: 2 / 12, postMax: 4, bottomRail: 0.19, cablePitch: 3 / 12, cable: 0.025 },
  sill: 0.6, // concrete floor slab edge showing at each sill
  openings: [
    // at grade: a 2-wide glazed overhead door, no guardrail (A403)
    { name: "L1 overhead door", x: [42.1, 47.9], y: [0, 7.7], infill: "ohd", cols: 2, header: true, guard: false },
    { name: "L2 overhead door", x: [39.1, 49.5], y: [H.l2, 21.3], infill: "ohd", cols: 3, header: true },
    // A403 draws a narrow element at x 49.9-51.1 here; unclear what it is, so
    // brick for now (Collin 2026-11-27)
    { name: "L2 door", x: [52.5, 55.3], y: [H.l2, 21.3], infill: "lite" },
    { name: "L3 overhead door", x: [38.9, 54.9], y: [H.l3, 35.0], infill: "ohd", cols: 4, header: true },
    { name: "L4 overhead door", x: [38.9, 54.9], y: [H.l4, 49.0], infill: "ohd", cols: 4, header: true },
    { name: "L5 overhead door", x: [38.9, 54.9], y: [H.l5, 62.0], infill: "ohd", cols: 4, header: true },
  ] as DoorBayOpening[],
};
export const RINGS = [
  { x: 7.9, z: -23.4, r: 6.9, y: 29, h: 4 },
  { x: 7.9, z: -8.0, r: 6.9, y: 29, h: 4 },
];

// ---- North wing roof (A140, NE/NW axons) ----------------------------------
// "The Speakeasy" outbuilding on the wing roof (L3 plan on 040 A102, measured
// at 54 px/ft on the sheet; 1/G160 NW axon; Collin 2026-11-26).
//  - Lap-siding screen walls (grey, Collin 2026-11-25), all faces given as
//    OUTER faces: a west wall from the building out to a short north leg
//    (innerX); a 22" access door in a short wall perpendicular to the building
//    joins that leg to the long outer north wall (outerX), which returns to the
//    building as the east wall.
//  - Inside: a storefront wall (along x = storefront.x, then back to the
//    building along z = storefront.z) up to a sloped glass roof with 5 bays of
//    rafters. The ~2 ft strip between the storefront and the siding is open.
//  - Heights (A402 north): one sloped plane, 134'-11" at the building wall,
//    132'-5" at the outer north wall; wall tops and the glass roof follow it.
export const SPEAKEASY = {
  y0: H.l3,
  // at the building wall: raised from A402's 134'-11" (it landed on the L3
  // windows, heads 135'-7") to just above them; pitch increases (Collin 2026-11-26)
  roofHigh: 36.0,
  wallLow: 32.4, // at the outer north wall (A402)
  wallT: 0.8,
  // corner posts: walls terminate into them; siding color, flush with both wall
  // faces and no taller than the walls (Collin 2026-11-26)
  post: 0.8,
  // west wall outer face: centered on the grid-9 north pier at z -45.1 (moved
  // from A102's grid G line, Collin 2026-11-26); it starts at the pier face
  westZ: -45.1 - 0.4,
  eastZ: -23.0, // east wall outer face
  // east wall: flat top, level with the sill of the window it returns to
  // (A402 north, sill 130'-11"; Collin 2026-11-26)
  eastTop: 30.9,
  innerX: 128.88, // short north leg, outer face (west of the door)
  outerX: 131.38, // long north wall, outer face (east of the door)
  doorZ: [-37.2, -36.7] as [number, number], // the perpendicular door wall
  door: { w: 1.83, h: 7 }, // 22" access door
  storefront: { x: 128.4, z: -26.0, zN: -35.7 }, // zN: north run starts at the leg's end
  bays: 5,
  lap: 0.6, // siding course height (ft)
  sidingColor: "#a9a398",
};
// top of the sloped plane at x
export const speakeasyTop = (x: number) =>
  SPEAKEASY.roofHigh -
  ((x - GX.g9) * (SPEAKEASY.roofHigh - SPEAKEASY.wallLow)) / (SPEAKEASY.outerX - GX.g9);
// The Speakeasy's back wall: the grid-9 north face between the two main north
// piers (z -26.1 / -45.1, 2 ft wide). Owner's intent via Collin 2026-11-26:
// the elevation's siding is gone; a "fractured" fractured clear-glass window
// in a storefront frame runs pier to pier; below it brick veneer (the building's
// tan) over CMU with a door opening smashed through it, open and dark beyond.
// The opening rises into the glass as a soft arch (not spiky), and the brick on
// its east side wanders up to the window's top east corner.
// the tan brick (TanBrick.tsx): modular 8" x 2-2/3" units in running bond,
// each its own shade; the mortar bed sits mortarSet behind the brick faces
export const TAN_BRICK = {
  w: 0.667,
  h: 0.221,
  depth: 0.33,
  joint: 0.035,
  colors: ["#d8c49a", "#cfb98c", "#dcc9a1", "#c9b183", "#d3bd91", "#e0cfa8"],
  mortar: "#bfb6a2",
  mortarSet: 0.03,
};
export const SPEAKEASY_WALL = {
  pierZ: [-26.1, -45.1] as [number, number], // pier centers; the infill runs face to face
  pierHalf: 1,
  sill: 32.4, // blue line: bottom of the existing L3 windows (A402 north, 132'-5")
  head: SPEAKEASY.roofHigh, // red line: right under where the glass roof lands (136'-0")
  door: { zc: -31.05, w: 3.5 }, // green lines, ~2'-2" from the east pier
  flare: 0.3, // the hole widens by this much per side toward the sill
  ragged: { cmu: 0.35, brick: 0.25 }, // course-to-course edge wander (random walk step)
  brickBreakBack: [0.15, 0.45] as [number, number], // brick broken back past the CMU edge
  // brick on the opening's east side climbs to the window's top east corner
  // (Collin's red sketch): power < 1 bows the edge outward; wander = per-course jitter
  // reach: fraction of the way to the corner at the head (strip ~2 ft at the sill, ~1.2 ft at the head)
  climb: { power: 0.9, wander: 0.18, reach: 0.45 },
  // the opening's top inside the window: a soft, slightly irregular arch
  arch: { rise: 1.7, points: 9, wobble: 0.12 },
  // storefront frame: head, west jamb, sill (west of the opening), two mullions
  mullionZ: [-34.3, -39.3], // where Collin drew them
  frame: { face: 0.2, depth: 0.4 },
  brick: TAN_BRICK, // modular 8" x 2-2/3"
  cmu: { w: 1.333, h: 0.667, depth: 0.67, joint: 0.035 }, // 16" x 8" x 8"
  // the building's tan brick (Massing C.brick and the facade drawings)
  brickColors: TAN_BRICK.colors,
  cmuColor: "#9e9c96",
  // clear glass (Collin 2026-11-26: no stained colors, keep the shards); same
  // tint as the Speakeasy glass roof, each shard a touch lighter or darker
  glassColors: ["#cfe0e6"],
  glassShade: [0.88, 1.04] as [number, number],
  lead: "#151311",
  shardArea: 1.0, // average shard size (sq ft)
  leadW: 0.06, // dark line between shards
  pocketDepth: 4, // dark void behind the opening
  seed: 11,
};
export const speakeasyWallZ = () => {
  const w = SPEAKEASY_WALL;
  return { zE: w.pierZ[0] - w.pierHalf, zW: w.pierZ[1] + w.pierHalf };
};
// the masonry hole's widest reach each side of the door center
export const speakeasyHoleReach = () => {
  const w = SPEAKEASY_WALL;
  return w.door.w / 2 + w.flare + 0.4 + w.brickBreakBack[1] + 0.1;
};
// dark pocket cut into the main core behind the opening
export const speakeasyPocket = () => {
  const w = SPEAKEASY_WALL;
  const { zE, zW } = speakeasyWallZ();
  const r = speakeasyHoleReach();
  const front = GX.g9 - 0.3; // core face (Massing core is inset 0.3 from grid 9)
  return {
    x: [front - w.pocketDepth, front] as [number, number],
    y: [H.l3, Math.min(w.head, w.sill + w.arch.rise + w.arch.wobble + 0.3)] as [number, number],
    z: [Math.max(zW, w.door.zc - r), Math.min(zE, w.door.zc + r)] as [number, number],
  };
};
// light well outline: grade to roof, inside face of the east wall 1 ft in
export const LIGHT_WELL_POLY: XZ[] = [
  [LIGHT_WELL.x[0], LIGHT_WELL.z0],
  [LIGHT_WELL.x[1], LIGHT_WELL.z0],
  [LIGHT_WELL.x[1], wingEastZ(LIGHT_WELL.x[1]) - 1],
  [LIGHT_WELL.x[0], wingEastZ(LIGHT_WELL.x[0]) - 1],
];
// ---- Exterior stairs ------------------------------------------------------
export type Flight = {
  from: [number, number, number];
  to: [number, number, number];
  width: number;
};
// riser height used to count treads, guard height (ft)
export const STAIR = { riser: 0.6, guard: 3.5 };
// NW corner stair system (040 set: 1/A100 level 1, A102 levels 2 + 3, A401 /
// A402 elevations, 1/G160 NW axon). Grade -> switchback on the oblique west
// wall -> Level 2 landing that wraps the NW corner -> straight flight up the
// north face to the wing roof. Measured on the sheets (36 px/ft at render).
const L2 = H.l2; // 112'-0"
const TURN_Y = 7.95; // turn landing: rise split by the two flights' runs
export const STAIRS: Flight[] = [
  // outer flight: grade at x 192.5 up toward true south to the turn landing
  { from: [192.5, 0, -66.8], to: [176.8, TURN_Y, -66.8], width: 4.6 },
  // inner flight, against the wall: turn landing up toward true north to L2
  { from: [175.7, TURN_Y, -61.4], to: [184.2, L2, -61.4], width: 4.2 },
  // north face flight: L2 landing up to the wing roof (A102 L3 "DN")
  { from: [204.8, L2, -57.9], to: [204.8, H.l3, -30.2], width: 4.2 },
];
// The Level 6 South Deck's two stairs (3/G160 SE axon, A402 south; Collin
// 2026-11-26, revised 2026-11-27), both inside the central gable's open bay,
// in one line along it (x 57.9):
// - a steel stair climbs west from the bay floor to the bulkhead at the bay's
//   west side, the 177' roof level (A402 drew it far too steep, to ~180')
// - the stair up from Level 5 rises through a hatch in the bay floor, east of
//   it (A402 drew it on the open deck in front of the gable: moved straight
//   into the bay, Collin 2026-11-27); only its upper flight shows
// normal stair pitch, rise / run (7.2" risers on ~11" treads)
const DECK_STAIR_PITCH = 0.65;
const DECK_STAIR_X = 57.9;
const BAY_STAIR_TOP_Z = -41.8; // the bay's west side
export const DECK_HATCH = {
  x: [56.0, 59.8] as [number, number],
  z: [-23.0, -10.0] as [number, number],
  bottom: 56, // the shaft below the bay floor
};
export const DECK_STAIRS: Flight[] = [
  {
    from: [DECK_STAIR_X, H.e6, BAY_STAIR_TOP_Z + (H.auger - H.e6) / DECK_STAIR_PITCH],
    to: [DECK_STAIR_X, H.auger, BAY_STAIR_TOP_Z],
    width: 3.5,
  },
  {
    from: [DECK_STAIR_X, H.e6, DECK_HATCH.z[0]],
    to: [DECK_STAIR_X, H.e6 - DECK_STAIR_PITCH * 12.5, DECK_HATCH.z[0] + 12.5],
    width: 3.4,
  },
];
// railTop: guard top elevation when it must meet another guard (default y + STAIR.guard)
export type Landing = { name: string; y: number; poly: XZ[]; rail: XZ[]; railTop?: number };
export const STAIR_LANDINGS: Landing[] = [
  {
    name: "west turn landing",
    y: TURN_Y,
    poly: [
      [171.5, -69.5],
      [176.8, -69.5],
      [176.8, -59.6],
      [171.5, -59.2],
    ],
    rail: [
      [176.8, -69.5],
      [171.5, -69.5],
      [171.5, -59.2],
    ],
  },
  {
    // runs along the oblique wall from the inner flight to past the NW corner
    name: "L2 landing, NW corner",
    y: L2,
    poly: [
      [184.2, -64.5],
      [206.9, -63.5],
      [206.9, -57.9],
      [GX.g13, -57.9],
      [GX.g13, WING_WEST.z13],
      [184.2, -58.4],
    ],
    rail: [
      [184.2, -63.6],
      [184.2, -64.5],
      [206.9, -63.5],
      [206.9, -57.9],
    ],
  },
  {
    // top of the north flight: steps west onto the wing roof through the
    // opening; its guard rises to the roof guard top and ties into it
    name: "roof access landing, north stair",
    y: H.l3,
    poly: [
      [GX.g13, NORTH_STAIR_GAP.z0],
      [206.9, NORTH_STAIR_GAP.z0],
      [206.9, NORTH_STAIR_GAP.z1],
      [GX.g13, NORTH_STAIR_GAP.z1],
    ],
    rail: [
      [206.9, NORTH_STAIR_GAP.z0],
      [206.9, NORTH_STAIR_GAP.z1],
      [GX.g13, NORTH_STAIR_GAP.z1],
    ],
    railTop: WING_ROOF.guardTop,
  },
];

// ---- Windows (Shop Drawings Rev.1, 11/23/2026) -----------------------------
// Only the window information comes from the shop drawings: tags, frame sizes,
// lite layout (frame sheets) and where each one sits (shop elevations 200-202,
// measured). Building elements from the model win over the drawings. No tags
// are shown in the model.
//
// Each window sits in one wall (WINDOW_WALLS in windowGeometry.ts):
//   E  main east, z = grid B          ET tower east, z = TOWER.z1
//   EW wing east (oblique)            W  main west, z = grid K
//   WP New Precast west face          WW wing west (oblique)
//   S  main south, x = grid 2         ST tower south, x = TOWER.x0
//   N  main north, x = grid 9         NT tower north, x = TOWER.x1
//   NW wing north, x = grid 13
//   LB / LS / LN light well (TreeBox): back wall, south side, north side
// u: where the window's center is along the wall, in the elevation's own
//    coordinate: x on the east / west faces, z on the south / north faces
//    (oblique walls are drawn in projection, so u is still x there)
// y0: bottom of the frame (ft above Level 1); for round and raked windows,
//    the CENTER
// w, h: frame size in INCHES, as on the frame sheets
// cols, rows: daylight-opening sizes (in) left to right / top to bottom as
//    seen from outside; they set the mullion positions (scaled to fit)
export type WindowSystem = "SF" | "WW" | "CW";
export type WindowWall = "E" | "ET" | "EW" | "W" | "WP" | "WW" | "S" | "ST" | "N" | "NT" | "NW" | "LB" | "LS" | "LN";
export type WindowSpec = {
  tag: string;
  wall: WindowWall;
  u: number;
  y0: number;
  w: number;
  h: number;
  cols: number[];
  rows: number[];
  sys: WindowSystem;
  shape?: "rect" | "round" | "raked";
  nis?: boolean; // "not in scope" on the shop drawings: built as measured
};

// framing systems (frame sheets): sightline, depth, perimeter border (in)
export const WINDOW_SYSTEMS: Record<WindowSystem, { sight: number; depth: number; border: number }> = {
  SF: { sight: 2, depth: 4.5, border: 2.25 }, // Series 3000XT storefront 2 x 4-1/2
  WW: { sight: 2.25, depth: 5, border: 3 }, // TCR-225 window wall 2-1/4 x 5
  CW: { sight: 2.5, depth: 6, border: 2.5 }, // Reliance curtain wall 2-1/2 x 6
};

// How a window is set in its wall (Collin 2026-11-27: setbacks vary; for now
// 4/A933 for anything in brick, 4/A934 for the south tower's metal panel).
// setback: frame's outer face behind the wall's face (ft)
// sillProud: how far the sill flashing's drip stands out past the face (ft)
// brick: sloped mortar wash under metal flashing, hemmed drip at the face;
// tower: prefinished flashing projecting 1" with a drip
export type WindowSetting = "brick" | "precast" | "tower" | "interior";
export const WINDOW_SETTINGS: Record<WindowSetting, { setback: number; sillProud: number }> = {
  brick: { setback: 4.875 / 12, sillProud: 0.5 / 12 }, // 4/A933
  precast: { setback: 4.875 / 12, sillProud: 0.5 / 12 }, // assumed like brick
  tower: { setback: 0.5 / 12, sillProud: 1 / 12 }, // 4/A934
  interior: { setback: 0, sillProud: 0 }, // TreeBox: on the light-well walls
};

export const WINDOW_COLORS = {
  frame: "#1b1b1d", // black anodized
  glass: "#f2c48a", // the drawing windows' warm glass
  flashing: "#2b2b2d",
  wash: "#bfb6a2", // mortar wash
  brickReveal: "#d0b98d", // brick returns at the jambs and head
  precastReveal: "#b2b1ac",
};

// CW6 (x3): round curtain wall in the stair tower, frame dia 143", a 75" round
// center lite and four ring lites (frame sheet)
export const ROUND_CW6 = { d: 143, center: 75, ringMullions: 4 };
// W22 (x3): small round windows in the west brick, frame dia 35", DLO 30"
export const ROUND_W22 = { d: 35, dlo: 30 };
// W6 (x2): raked stair windows in the precast west face, a parallelogram
// rising at 28.61 deg toward true south: 180-3/8" along the slope, vertical
// ends 26-5/8", two lites
export const RAKED_W6 = { angle: 28.61, along: 180.375, end: 26.625 };

const eq = (n: number) => Array.from({ length: n }, () => 1);
const TREEBOX_SILL = H.l2 + 4; // frame bottom (2/A102, frame sheets)
export const WINDOWS: WindowSpec[] = [
  // ---- true east, main face (sheet 202)
  // grid 2-3
  { tag: "CW3", wall: "E", u: 27.0, y0: 54.37, w: 213, h: 151, cols: [64.5, 74, 64.5], rows: [56.5, 87], sys: "CW" },
  { tag: "WW23", wall: "E", u: 27.0, y0: 40.31, w: 219, h: 104, cols: [68, 74, 68], rows: [24.875, 70.875], sys: "WW" },
  { tag: "WW14", wall: "E", u: 27.0, y0: 26.29, w: 214, h: 110, cols: [65.5, 74, 65.5], rows: [22.875, 78.875], sys: "WW" },
  { tag: "W23", wall: "E", u: 27.0, y0: 14.37, w: 213.5, h: 85.5, cols: [65.75, 74, 65.75], rows: [21.5, 57.5], sys: "SF" },
  { tag: "W23", wall: "E", u: 27.0, y0: 1.99, w: 213.5, h: 85.5, cols: [65.75, 74, 65.75], rows: [21.5, 57.5], sys: "SF" },
  // grid 4-5
  { tag: "WW19", wall: "E", u: 63.66, y0: 44.12, w: 138, h: 58, cols: [46.5, 36, 46.5], rows: [52], sys: "WW" },
  { tag: "WW15", wall: "E", u: 63.66, y0: 30.78, w: 138, h: 56, cols: [46.5, 36, 46.5], rows: [50], sys: "WW" },
  { tag: "W28", wall: "E", u: 63.66, y0: 16.87, w: 137.5, h: 55.5, cols: [46.75, 36, 46.75], rows: [51], sys: "SF" },
  // grid 6-7
  { tag: "CW4", wall: "E", u: 92.27, y0: 54.37, w: 107, h: 155, cols: [49.75, 49.75], rows: [60.5, 87], sys: "CW" },
  // WW22 / WW18: the elevation draws one row, the frame sheets two rows and
  // 101" / 104" tall; the head stays where drawn (49.57), the frame runs down
  { tag: "WW22", wall: "E", u: 92.27, y0: 49.57 - 101 / 12, w: 108, h: 101, cols: [50.625, 50.625], rows: [60.875, 31.875], sys: "WW" },
  { tag: "WW16", wall: "E", u: 92.3, y0: 30.8, w: 108, h: 56, cols: eq(7), rows: eq(4), sys: "WW" },
  { tag: "W24", wall: "E", u: 92.31, y0: 4.62, w: 107.5, h: 54.5, cols: [50.75, 50.75], rows: [50], sys: "SF" },
  // grid 7-9
  { tag: "CW5", wall: "E", u: 107.7, y0: 54.37, w: 218, h: 155, cols: [67, 74, 67], rows: [60.5, 87], sys: "CW" },
  { tag: "WW18", wall: "E", u: 107.7, y0: 49.57 - 104 / 12, w: 214, h: 104, cols: [65.5, 74, 65.5], rows: [63.875, 31.875], sys: "WW" },
  { tag: "WW17", wall: "E", u: 107.67, y0: 30.8, w: 219, h: 56, cols: eq(15), rows: [10.875, 10.75, 10.75, 10.875], sys: "WW" },
  { tag: "W25", wall: "E", u: 107.7, y0: 16.87, w: 218.5, h: 54.5, cols: [68.25, 74, 68.25], rows: [50], sys: "SF" },
  { tag: "W25", wall: "E", u: 107.7, y0: 4.62, w: 218.5, h: 54.5, cols: [68.25, 74, 68.25], rows: [50], sys: "SF" },
  // wing, grid 9-10 (its straight part, on grid B)
  { tag: "W29", wall: "E", u: 128.585, y0: 14.37, w: 143.5, h: 91.5, cols: [36.75, 62, 36.75], rows: [87], sys: "SF" },
  // ---- true east, wing oblique wall
  { tag: "W30", wall: "EW", u: 149.87, y0: 14.37, w: 173.5, h: 87.5, cols: [45.75, 74, 45.75], rows: [83], sys: "SF" },
  { tag: "W26", wall: "EW", u: 149.87, y0: 4.48, w: 173.5, h: 65.5, cols: [45.75, 74, 45.75], rows: [61], sys: "SF" },
  { tag: "W31", wall: "EW", u: 191.6, y0: 14.37, w: 197.5, h: 87.5, cols: [52.25, 85, 52.25], rows: [83], sys: "SF" },
  { tag: "W27", wall: "EW", u: 191.56, y0: 6.84, w: 197.5, h: 37.5, cols: [48, 93.5, 48], rows: [33], sys: "SF" },
  // ---- stair tower, east face (4/A934 setting)
  { tag: "WW20", wall: "ET", u: 73.1, y0: 44.9, w: 36, h: 72, cols: [31.5], rows: [66], sys: "WW" },
  { tag: "WW21", wall: "ET", u: 84.6, y0: 47.15, w: 30, h: 120, cols: [25.5], rows: [114], sys: "WW" },
  { tag: "WW24", wall: "ET", u: 84.35, y0: 65.4, w: 48, h: 72, cols: [43.5], rows: [66], sys: "WW" },
  { tag: "WW25", wall: "ET", u: 78.5, y0: 72.87, w: 144, h: 36, cols: [139.5], rows: [30], sys: "WW" },
  { tag: "CW6", wall: "ET", u: 78.54, y0: 85.07, w: 143, h: 143, cols: [], rows: [], sys: "CW", shape: "round" },
  // ---- TreeBox (Collin 2026-11-27): Level 2 glazing boxing in the light
  // well, right under the edges of the roof grate (2/A102); set on the well walls
  { tag: "W32", wall: "LB", u: (LIGHT_WELL.x[0] + LIGHT_WELL.x[1]) / 2, y0: TREEBOX_SILL, w: 232.5, h: 67.5, cols: eq(4), rows: [63], sys: "SF" },
  { tag: "W33", wall: "LS", u: (LIGHT_WELL.z0 + wingEastZ(LIGHT_WELL.x[0]) - 1) / 2, y0: TREEBOX_SILL, w: 139.5, h: 67.5, cols: eq(2), rows: [63], sys: "SF" },
  { tag: "W34", wall: "LN", u: (LIGHT_WELL.z0 + wingEastZ(LIGHT_WELL.x[1]) - 1) / 2, y0: TREEBOX_SILL, w: 55.5, h: 67.5, cols: [51.5], rows: [63], sys: "SF" },

  // ---- true west, main face (sheet 201)
  { tag: "WW3", wall: "W", u: 65.87, y0: 40.25, w: 185, h: 104, cols: [48, 80, 48], rows: [24.875, 70.875], sys: "WW" },
  { tag: "WW4", wall: "W", u: 47.16, y0: 40.25, w: 216, h: 104, cols: [60, 87, 60], rows: [24.875, 70.875], sys: "WW" },
  { tag: "WW4", wall: "W", u: 27.2, y0: 40.25, w: 216, h: 104, cols: [60, 87, 60], rows: [24.875, 70.875], sys: "WW" },
  { tag: "WW1", wall: "W", u: 65.6, y0: 26.28, w: 178, h: 110, cols: [48, 73, 48], rows: [24.875, 76.875], sys: "WW" },
  { tag: "WW2", wall: "W", u: 47.25, y0: 26.28, w: 216, h: 110, cols: [60, 87, 60], rows: [24.875, 76.875], sys: "WW" },
  { tag: "W5", wall: "W", u: 73.33, y0: 52.78, w: 39.5, h: 87.5, cols: [35.5], rows: [83], sys: "SF" },
  ...[41.9, 31.45, 22.76].map(
    (u): WindowSpec => ({ tag: "W22", wall: "W", u, y0: 58.37, w: 35, h: 35, cols: [], rows: [], sys: "SF", shape: "round" }),
  ),
  // not in scope: measured on the elevation
  { tag: "W8", wall: "W", u: 65.66, y0: 11.96, w: 177.6, h: 114, cols: [47.3, 72.9, 47.3], rows: [79.5, 27.2], sys: "SF", nis: true },
  { tag: "W9", wall: "W", u: 52.81, y0: 14.46, w: 71.5, h: 84, cols: eq(2), rows: [1], sys: "SF", nis: true },
  { tag: "W10", wall: "W", u: 40.785, y0: 14.46, w: 60.6, h: 84, cols: eq(2), rows: [1], sys: "SF", nis: true },
  { tag: "W11", wall: "W", u: 32.875, y0: 12.2, w: 42.6, h: 70.8, cols: [1], rows: [1], sys: "SF", nis: true },
  { tag: "W12", wall: "W", u: 23.9, y0: 14.7, w: 136.8, h: 81.6, cols: eq(3), rows: [1], sys: "SF", nis: true },
  // ---- true west, New Precast Structure
  ...[38.0, 24.98, 12.11].map(
    (y0): WindowSpec => ({ tag: "W5", wall: "WP", u: 115.755, y0, w: 39.5, h: 87.5, cols: [35.5], rows: [83], sys: "SF" }),
  ),
  ...[34.48, 21.68].map(
    (y0): WindowSpec => ({ tag: "W7", wall: "WP", u: 96.955, y0, w: 35.5, h: 35.5, cols: [1], rows: [1], sys: "SF" }),
  ),
  ...[32.16, 18.55].map(
    (y0): WindowSpec => ({ tag: "W6", wall: "WP", u: 106.69, y0, w: 0, h: 0, cols: eq(2), rows: [1], sys: "SF", shape: "raked" }),
  ),
  // ---- true west, wing oblique wall
  { tag: "W4", wall: "WW", u: 127.455, y0: 13.73, w: 172.7, h: 92.8, cols: eq(3), rows: [62, 23.4], sys: "SF" },
  { tag: "W3", wall: "WW", u: 145.62, y0: 13.73, w: 120, h: 92.8, cols: eq(2), rows: [62, 23.4], sys: "SF" },
  { tag: "W2", wall: "WW", u: 155.57, y0: 13.73, w: 71.5, h: 62.3, cols: eq(2), rows: [1], sys: "SF" },
  { tag: "W1", wall: "WW", u: 150.175, y0: 2.4, w: 119.4, h: 86.6, cols: eq(3), rows: [60, 20], sys: "SF" },
  { tag: "NIS", wall: "WW", u: 174.415, y0: 13.73, w: 152.5, h: 92.8, cols: eq(3), rows: [62, 23.4], sys: "SF", nis: true },

  // ---- true south, main face (sheet 200 left)
  { tag: "CW1", wall: "S", u: -15.975, y0: 54.5, w: 191, h: 151, cols: [48, 85, 48], rows: [56.5, 87], sys: "CW" },
  { tag: "WW8", wall: "S", u: -15.975, y0: 41.96, w: 192, h: 84, cols: [54, 75, 54], rows: [25.125, 50.625], sys: "WW" },
  { tag: "WW9", wall: "S", u: -30.7, y0: 54.3, w: 114, h: 94, cols: [53.625, 53.625], rows: [88], sys: "WW" },
  { tag: "WW7", wall: "S", u: -30.7, y0: 41.96, w: 114, h: 84, cols: [53.625, 53.625], rows: [25.125, 50.625], sys: "WW" },
  { tag: "WW6", wall: "S", u: -15.85, y0: 32.83, w: 192, h: 50, cols: eq(5), rows: [44], sys: "WW" },
  // WW5 / W18: the frame sheets say ~193" wide, the elevation draws ~148"
  // between the corner and the column; built as drawn
  { tag: "WW5", wall: "S", u: -53.885, y0: 27.9, w: 148, h: 90, cols: eq(13), rows: eq(6), sys: "WW" },
  { tag: "W18", wall: "S", u: -53.885, y0: 16.53, w: 148, h: 59.5, cols: eq(13), rows: eq(4), sys: "SF" },
  { tag: "W19", wall: "S", u: -20.035, y0: 19.87, w: 92.5, h: 87.5, cols: [43.25, 43.25], rows: [83], sys: "SF" },
  // W15 / W16 / W17: single lites, widths as drawn
  { tag: "W15", wall: "S", u: -48.975, y0: 2.44, w: 42.6, h: 83.5, cols: [1], rows: [1], sys: "SF" },
  { tag: "W16", wall: "S", u: -39.375, y0: 2.44, w: 58.9, h: 83.5, cols: [1], rows: [1], sys: "SF" },
  { tag: "W17", wall: "S", u: -27.835, y0: 2.44, w: 42.4, h: 83.5, cols: [1], rows: [1], sys: "SF" },
  // ---- stair tower, south face (the elevation tags WW10 / WW11 the other way
  // round from the frame sheets; built at the drawn sizes)
  { tag: "WW10", wall: "ST", u: -3.22, y0: 52.0, w: 48, h: 96, cols: [1], rows: [1], sys: "WW" },
  { tag: "WW11", wall: "ST", u: 3.1, y0: 44.7, w: 72, h: 36, cols: [1], rows: [1], sys: "WW" },
  { tag: "CW6", wall: "ST", u: 0.95, y0: 85.0, w: 143, h: 143, cols: [], rows: [], sys: "CW", shape: "round" },

  // ---- true north, main face above the wing roof (sheet 200 right)
  ...[-16.385, -35.565].flatMap((u): WindowSpec[] => [
    { tag: "CW2", wall: "N", u, y0: 54.5, w: 209, h: 155, cols: [54, 91, 54], rows: [60.5, 87], sys: "CW" },
    { tag: "WW13", wall: "N", u, y0: 42.14, w: 210, h: 90, cols: [63.5, 74, 63.5], rows: [60.875, 20.875], sys: "WW" },
  ]),
  { tag: "W12", wall: "N", u: -16.47, y0: 30.86, w: 209.5, h: 56, cols: eq(14), rows: eq(2), sys: "SF" },
  // (the 5-lite window west of it, between the piers, is the Speakeasy's:
  // SpeakeasyWall.tsx)
  { tag: "CW6", wall: "NT", u: 0.91, y0: 85.0, w: 143, h: 143, cols: [], rows: [], sys: "CW", shape: "round" },
  // ---- true north, wing
  { tag: "W20", wall: "NW", u: -33.945, y0: 4.01, w: 137.5, h: 71.5, cols: [36, 57.5, 36], rows: [67], sys: "SF" },
  { tag: "W20", wall: "NW", u: -15.945, y0: 4.01, w: 137.5, h: 71.5, cols: [36, 57.5, 36], rows: [67], sys: "SF" },
  { tag: "W21", wall: "NW", u: -15.945, y0: 14.35, w: 137.5, h: 91.5, cols: [36, 57.5, 36], rows: [87], sys: "SF" },
];
