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
  hole: { x: 170.6, z: -1.4, r: 2.5 },
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

export const PIERS: Pier[] = [
  // ---- main block corners
  cornerPier("main SE corner", [GX.g2, GZ.B], [1, 0], [0, -1], 2, GRADE, MAIN_TOP),
  cornerPier("main SW corner", [GX.g2, GZ.K], [1, 0], [0, 1], 2, GRADE, MAIN_TOP),
  cornerPier("main NE corner, above wing roof", [GX.g9, GZ.B], [-1, 0], [0, -1], 1.5, H.l3, MAIN_TOP),
  // ---- main east (A403): grids 3, 4, 7
  ...[37.1, 57.2, 97.4].map((x) =>
    wallPier(`main east x ${x}`, [x, GZ.B], [0, 1], 2, GRADE, EAST_TOP),
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
  ...[-26.1, -45.1].map((z) =>
    wallPier(`main north z ${z}`, [GX.g9, z], [1, 0], 2, H.l3, MAIN_TOP),
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
  {
    name: "HE elevator addition",
    x: [75.6, 94.6],
    z: [-61.7, -46.7],
    base: 77,
    eave: 96,
    ridge: 96,
    axis: "x",
    mat: "metal", // Collin confirmed 2026-11-23: corrugated metal (Window Order 402 wins over A401 precast)
  },
  {
    name: "HE2 gable on elevator",
    x: [76, 88],
    z: [-61.7, -46.7],
    base: 96,
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
  {
    name: "HH grid 7-9",
    x: [87.9, GX.g9],
    z: [-46.1, -6.8],
    base: 77,
    eave: 89,
    ridge: 94,
    axis: "x",
    mat: "metal",
  },
];
// Concrete flat roof (speckle on A140) at grid 7-9, K-J
export const CONCRETE_ROOF = {
  x: [94.6, GX.g9] as [number, number],
  z: [-62, -46.7] as [number, number],
  y: 77,
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
// Roof vestibule on the wing roof (1/G160 NW axon, A402 north): lap-siding
// walls on three sides, top 132'-5" at the outer (north) edge; a glass roof
// with 5 bays of rafters slopes up to 134'-11" at the building wall. Door on
// the west wall at its north end. sidingColor: grey, confirmed by Collin 2026-11-25.
export const VESTIBULE = {
  x: [GX.g9, 130.3] as [number, number],
  z: [-44.9, -25.8] as [number, number],
  y0: H.l3,
  wallLow: 32.4, // siding top at the north edge (A402)
  roofHigh: 34.9, // glass roof at the building wall (A402)
  bays: 5,
  wallT: 0.4,
  lap: 0.6, // siding course height (ft)
  door: { x: [126.2, 129.2] as [number, number], h: 7.5 },
  sidingColor: "#a9a398",
};
export const RTUS = [
  {
    x: [167.8, 177.7] as [number, number],
    z: [-35.9, -28.5] as [number, number],
  },
  {
    x: [167.8, 177.7] as [number, number],
    z: [-23.0, -16.0] as [number, number],
  },
];
// light well outline: grade to roof, inside face of the east wall 1 ft in
export const LIGHT_WELL_POLY: XZ[] = [
  [LIGHT_WELL.x[0], LIGHT_WELL.z0],
  [LIGHT_WELL.x[1], LIGHT_WELL.z0],
  [LIGHT_WELL.x[1], wingEastZ(LIGHT_WELL.x[1]) - 1],
  [LIGHT_WELL.x[0], wingEastZ(LIGHT_WELL.x[0]) - 1],
];
// Accessible ramp guardrails, parallel runs along the west wall
export const RAMP_RAILS: XZ[][] = [
  [
    [136, -59.5],
    [180, -58.3],
  ],
  [
    [136, -53.5],
    [180, -52.3],
  ],
  [
    [136, -47.5],
    [180, -46.3],
  ],
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
