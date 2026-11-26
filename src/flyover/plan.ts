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
  flatRoof: 74.5, // Level 6.1 (174'-6"), south flat roof
  auger: 77, // 177'-0"
  wingParapet: 27.5,
};

// ---- Main block (5 stories + E6) ------------------------------------------
export const MAIN = { x0: GX.g2, x1: GX.g9, z0: GZ.K, z1: GZ.B, top: H.auger };

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
  // A403: "NEW GLAZED ENCLOSURE @ EXISTING STEEL FRAME", east wall, south end
  glazing: { x: [88.1, 102.1] as [number, number], y: [NORTH_ROOFLINE, 86.2] as [number, number], bays: 4 },
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
// Tops. Main block: 177'-0" (Auger) where the column runs through the top band;
// on the east face the columns stop under the top brick band at ~171'-5".
const MAIN_TOP = H.auger;
const EAST_TOP = 71.4;
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
  cornerPier("main SE corner", [GX.g2, GZ.B], [1, 0], [0, -1], 2, GRADE, MAIN_TOP),
  cornerPier("main SW corner", [GX.g2, GZ.K], [1, 0], [0, 1], 2, GRADE, MAIN_TOP),
  // stops under the stone band (A402)
  cornerPier("main NE corner, above wing roof", [GX.g9, GZ.B], [-1, 0], [0, -1], 1.5, H.l3, EAST_EDGE_UNDERSIDE),
  // ---- main east (A403): grids 3, 4, 7
  // grid 7 stops at the 170' roofline under the sheds (Collin 2026-11-26)
  ...[37.1, 57.2, 97.4].map((x) =>
    wallPier(`main east x ${x}`, [x, GZ.B], [0, 1], 2, GRADE, x === 97.4 ? EAST_EDGE_UNDERSIDE : EAST_TOP),
  ),
  // ---- main west (A401): grids 3, 4, and grid 5 beside the elevator enclosure
  ...[37.35, 57.2, 75.7].map((x) =>
    wallPier(`main west x ${x}`, [x, GZ.K], [0, -1], 2, GRADE, MAIN_TOP),
  ),
  // ---- main south (A402 left): near grids G and D/E
  ...[-43.1, -25.4].map((z) =>
    wallPier(`main south z ${z}`, [GX.g2, z], [-1, 0], 2, GRADE, MAIN_TOP),
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
  // existing corrugated steel skin (Sheds.tsx) instead of a flat solid; axis x only
  skin?: "corrugated";
  // roof overhang past the walls (ft): north gable end, z[0] side, z[1] side
  overhang?: { end: number; a: number; b: number };
};
export const HEAD_HOUSE: Volume[] = [
  {
    name: "HA grid 2-3 K-H",
    x: [16.07, 36.2],
    z: [-57.8, -42.4],
    base: 77,
    eave: 85,
    ridge: 88,
    axis: "x",
    mat: "metal",
  },
  {
    name: "HB grid 3-4 K-H",
    x: [36.2, 46.1],
    z: [-62, -44.9],
    base: 77,
    eave: 89,
    ridge: 92.3,
    axis: "x",
    mat: "metal",
  },
  {
    name: "HC tall shaft",
    x: [46.1, 57.7],
    z: [-62, -44.9],
    base: 77,
    eave: 107,
    ridge: 107,
    axis: "x",
    mat: "metal",
  },
  {
    name: "HD grid 4-5 K-G",
    x: [57.7, 75.6],
    z: [-60.9, -42.4],
    base: 77,
    eave: 92,
    ridge: 94,
    axis: "x",
    mat: "metal",
  },
  // The tall gable seen over the elevator on A401 is not on the elevator: it
  // is a raised gable on the central roof (Collin 2026-11-26). A140 shows its
  // footprint inside HG's north slope; heights from A401.
  {
    name: "HG2 raised gable on the central roof",
    x: [76, 88],
    z: [-31.8, -19.7],
    base: 93.5,
    eave: 103.4,
    ridge: 106.1,
    axis: "z",
    mat: "metal",
  },
  {
    name: "HG central gable",
    x: [55.3, 87.9],
    z: [-42.4, -6.8],
    base: 77,
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
    // 12" eaves (Collin 2026-11-26); none on the west side, it dies into the taller shed
    overhang: { end: 1, a: 0, b: 1 },
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
    overhang: { end: 1, a: 1, b: 1 },
  },
];
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
// South flat roof with heavy black parapet (SE axon)
export const FLAT_ROOF = {
  x: [GX.g2, 55.3] as [number, number],
  z: [-42.4, GZ.B] as [number, number],
  y: H.flatRoof,
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
export const FRAME = {
  x: [0.6, 15.5] as [number, number], // column rows (front, back)
  colSize: 1.1,
  cols: [
    { z: -62, top: 38 }, // grid K, up to L4 deck
    { z: -47, top: 38 },
    { z: -31, top: 38 }, // L4 deck east end / ring platform west end
    { z: -16, top: 29 }, // up to ring platform
    { z: -1, top: 29 }, // just inside grid A
  ],
  // slabs: deck surface y, slab depth, z extent, which edges get guardrails
  decks: [
    {
      name: "L2 deck",
      y: 14.17, // 114'-2" (2'-2" above Level 2)
      t: 2.2,
      z: [-62, -1] as [number, number],
      rails: ["front", "west", "east"] as FrameEdge[],
    },
    {
      name: "ring platform",
      y: 29,
      t: 2,
      z: [-31, -1] as [number, number],
      rails: [] as FrameEdge[],
    },
    {
      name: "L4 deck",
      y: H.l4, // 138'
      t: 2,
      z: [-62, -31] as [number, number],
      rails: ["front", "west", "east"] as FrameEdge[],
    },
  ],
  deckX: [0, GX.g2] as [number, number], // slabs run back to the grid-2 face
};
// Two round "silo" rings on the ring platform (A140 circles at grid 1-2, C/D)
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
  brick: { w: 0.667, h: 0.221, depth: 0.33, joint: 0.035 }, // modular 8" x 2-2/3"
  cmu: { w: 1.333, h: 0.667, depth: 0.67, joint: 0.035 }, // 16" x 8" x 8"
  // the building's tan brick (Massing C.brick and the facade drawings)
  brickColors: ["#d8c49a", "#cfb98c", "#dcc9a1", "#c9b183", "#d3bd91", "#e0cfa8"],
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
