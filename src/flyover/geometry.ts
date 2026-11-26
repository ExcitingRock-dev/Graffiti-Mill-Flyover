// Facade linework: elevation drawings mapped onto the true wall segments of the
// 3D model (see plan.ts). World units are FEET; y = 0 is Level 1 (100'-0").
//
// Textures are cut from BKV sheets A401/A402/A403 rendered at 13.5 px per foot
// (1/8" = 1'-0" at 108 dpi). Pixel numbers are positions on those full sheets.
// An elevation is a projection, so mapping a pixel range back onto a wall
// segment (even an oblique one, like the north wing's east wall) is exact.

import {
  GX,
  GZ,
  H,
  NEW_PRECAST,
  NORTH_ROOFLINE,
  PRECAST_TOWER,
  SPEAKEASY_WALL as SW,
  TOWER,
  TOWER_OPEN,
  WING_EAST,
  WING_ROOF,
  WING_WEST,
  XZ,
} from "./plan";

export const PX_PER_FT = 13.5;

// Sheet pixel <-> world helpers
const east = { px: (x: number) => 896 + x * PX_PER_FT, l1: 2824 }; // A403, true east
const west = { px: (x: number) => 2107 + (GX.g9 - x) * PX_PER_FT, l1: 2821 }; // A401, true west
const south = { px: (z: number) => 832 + (z - GZ.K) * PX_PER_FT, l1: 2794 }; // A402 left
const north = { px: (z: number) => 2678 - z * PX_PER_FT, l1: 2794 }; // A402 right
const row = (l1: number, y: number) => l1 - y * PX_PER_FT;

export type TextureCut = {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const CUTS = {
  east: { file: "facades-color/east.png", x: 1100, y: 1300, w: 2620, h: 1540 },
  west: { file: "facades-color/west.png", x: 940, y: 1300, w: 2560, h: 1537 },
  south: { file: "facades-color/south.png", x: 800, y: 1300, w: 990, h: 1510 },
  northUpper: {
    file: "facades-color/north-upper.png",
    x: 2560,
    y: 1300,
    w: 1000,
    h: 1170, // 040 A402, cut down to the wing roof deck (124')
  },
  // the same sheets with the concrete made transparent (tools/mask-precast.mjs):
  // only the windows show, over the 3D concrete of the New Precast Structure
  westPrecast: { file: "facades-color/west-precast.png", x: 940, y: 1300, w: 2560, h: 1537 },
  northPrecast: { file: "facades-color/north-upper-precast.png", x: 2560, y: 1300, w: 1000, h: 1170 },
  northWing: {
    file: "facades-color/north-wing.png",
    x: 2560,
    y: 2400,
    w: 1000,
    h: 410,
  },
} satisfies Record<string, TextureCut>;

export type Face = "east" | "west" | "south" | "north";

export type Panel = {
  name: string;
  cut: keyof typeof CUTS;
  face: Face;
  // wall segment in plan: sheet column sx0 lands on `a`, sx1 on `b`
  a: XZ;
  b: XZ;
  sx: [number, number];
  // sheet rows (top, bottom) and that sheet's Level 1 row
  sy: [number, number];
  l1: number;
};

const GRADE = -1.2; // bottom of facades, matches ground plane
const eastPanel = (name: string, a: XZ, b: XZ, yTop: number): Panel => ({
  name,
  cut: "east",
  face: "east",
  a,
  b,
  sx: [east.px(a[0]), east.px(b[0])],
  sy: [row(east.l1, yTop), row(east.l1, GRADE)],
  l1: east.l1,
});

const RAW_PANELS: Panel[] = [
  // ---- true east (A403)
  // over grid 7-9 the drawing stops at the 170' roofline: the corrugated
  // sheds above it are 3D (Sheds.tsx)
  eastPanel("east-main", [GX.g2, GZ.B], [88.0, GZ.B], H.auger),
  eastPanel("east-main-sheds", [88.0, GZ.B], [GX.g9, GZ.B], NORTH_ROOFLINE),
  eastPanel(
    "tower-east",
    [TOWER.x0, TOWER.z1],
    [TOWER.x1, TOWER.z1],
    TOWER.eave,
  ),
  // wing: drawings cut at the parapet cap; the 3D mesh guard sits above it
  eastPanel("wing-east-a", [GX.g9, GZ.B], [GX.g10, GZ.B], WING_ROOF.cap),
  // one straight oblique wall, grid 10 corner to grid 13 (2/A102)
  eastPanel("wing-east", [GX.g10, WING_EAST.z10], [GX.g13, WING_EAST.z13], WING_ROOF.cap),
  // ---- true west (A401)
  // west main face: over the precast tower (grid 9 back to the elevator
  // enclosure) the drawing stops at its 154' parapet; nothing stands above it
  // Grid 9 to grid 5 is the New Precast Structure: 3D concrete (Massing.tsx)
  // with only the drawing's windows laid over it
  ...(
    [
      // stops 0.3 under the parapet top: the drawing's brick behind starts there
      [GX.g9, PRECAST_TOWER.x[0], PRECAST_TOWER.top - 0.3, "westPrecast"],
      [PRECAST_TOWER.x[0], NEW_PRECAST.x[0], H.auger, "westPrecast"],
      [NEW_PRECAST.x[0], GX.g2, H.auger, "west"],
    ] as [number, number, number, "west" | "westPrecast"][]
  ).map(
    ([x0, x1, top, cut], i): Panel => ({
      name: `west-main-${i}`,
      cut,
      face: "west",
      a: [x0, GZ.K],
      b: [x1, GZ.K],
      sx: [west.px(x0), west.px(x1)],
      sy: [row(west.l1, top), row(west.l1, GRADE)],
      l1: west.l1,
    }),
  ),
  {
    // oblique wall (1/A100): the elevation is a projection, so x alone sets the mapping
    name: "west-wing",
    cut: "west",
    face: "west",
    a: [GX.g13, WING_WEST.z13],
    b: [GX.g9, WING_WEST.z9],
    sx: [west.px(GX.g13), west.px(GX.g9)],
    sy: [row(west.l1, WING_ROOF.cap), row(west.l1, GRADE)],
    l1: west.l1,
  },
  // ---- true south (A402 left)
  {
    name: "south-main",
    cut: "south",
    face: "south",
    a: [GX.g2, GZ.K],
    b: [GX.g2, GZ.B],
    sx: [south.px(GZ.K), south.px(GZ.B)],
    sy: [row(south.l1, H.auger), row(south.l1, GRADE)],
    l1: south.l1,
  },
  {
    name: "tower-south",
    cut: "south",
    face: "south",
    a: [TOWER.x0, TOWER.z0],
    b: [TOWER.x0, TOWER.z1],
    sx: [south.px(TOWER.z0), south.px(TOWER.z1)],
    sy: [row(south.l1, TOWER.eave), row(south.l1, GRADE)],
    l1: south.l1,
  },
  // ---- true north (A402 right)
  // Split at the two piers that frame the Speakeasy: between them, below the
  // new window head, the drawing is replaced by SpeakeasyWall (3D masonry + glass).
  ...(
    [
      // up to the 170' roofline; the stone band and the sheds above are 3D
      [GZ.B, SW.pierZ[0], H.l3, NORTH_ROOFLINE],
      [SW.pierZ[0], SW.pierZ[1], SW.head, NORTH_ROOFLINE],
      // west of the pier, up to the precast tower's 154' parapet; past the
      // shed wall line it is the New Precast Structure (windows only)
      [SW.pierZ[1], PRECAST_TOWER.z[1], H.l3, PRECAST_TOWER.top],
      [PRECAST_TOWER.z[1], GZ.K, H.l3, PRECAST_TOWER.top - 0.3, "northPrecast"],
    ] as [number, number, number, number, ("northUpper" | "northPrecast")?][]
  ).map(
    ([z0, z1, bottom, top, cut = "northUpper"], i): Panel => ({
      name: `north-main-upper-${i}`,
      cut,
      face: "north",
      a: [GX.g9, z0],
      b: [GX.g9, z1],
      sx: [north.px(z0), north.px(z1)],
      sy: [row(north.l1, top), row(north.l1, bottom)], // down to the wing roof deck
      l1: north.l1,
    }),
  ),
  {
    name: "tower-north",
    cut: "northUpper",
    face: "north",
    a: [TOWER.x1, TOWER.z1],
    b: [TOWER.x1, TOWER.z0],
    sx: [north.px(TOWER.z1), north.px(TOWER.z0)],
    sy: [row(north.l1, TOWER.eave), 2440],
    l1: north.l1,
  },
  {
    name: "north-wing",
    cut: "northWing",
    face: "north",
    // ends at the NW corner pier; past it the elevation shows the stair
    // landing and the oblique west wall edge-on, which are not this face
    a: [GX.g13, WING_EAST.z13],
    b: [GX.g13, WING_WEST.z13],
    sx: [north.px(WING_EAST.z13), north.px(WING_WEST.z13)],
    sy: [row(north.l1, WING_ROOF.cap), row(north.l1, GRADE)],
    l1: north.l1,
  },
];

// The tower is open between Level 3 and Level 4 (TOWER_OPEN): cut that band
// out of every tower drawing so the observation level reads as open air.
const openTowerBand = (p: Panel): Panel[] => {
  if (!p.name.startsWith("tower-")) return [p];
  const rTop = row(p.l1, TOWER_OPEN.y1);
  const rBot = row(p.l1, TOWER_OPEN.y0);
  const out: Panel[] = [];
  if (rTop > p.sy[0]) out.push({ ...p, name: p.name + "-upper", sy: [p.sy[0], rTop] });
  if (p.sy[1] > rBot) out.push({ ...p, name: p.name + "-lower", sy: [rBot, p.sy[1]] });
  return out;
};
export const PANELS: Panel[] = RAW_PANELS.flatMap(openTowerBand);

// Fake sun: drawing stays crisp (unlit), each face gets a fixed tone.
export const FACE_TONE: Record<Face, number> = {
  east: 1.0,
  south: 0.92,
  north: 0.84,
  west: 0.78,
};
