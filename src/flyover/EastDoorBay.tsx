import { useMemo } from "react";
import * as THREE from "three";
import { EAST_DOOR_BAY as D, DoorBayOpening, TAN_BRICK } from "./plan";
import { Box, boxesGeometry, TanBrickWall, TanBrickWallSpec } from "./TanBrick";

// The east overhead-door bay, grid 3-4 (EAST_DOOR_BAY in plan.ts; 2, 3, 4/A640).
// Exterior is +z. From the outside in: brick face at D.face, 12" of wall, the
// HSS jamb/head tube behind it, the door track, then the glazed sectional door.

type Range = [number, number];
const F = D.face;
const COL = {
  // lighter than the rails so the casing, channel and tubes read apart
  // (Collin 2026-11-27): exterior steel is galvanized + painted, dark grey
  steel: "#6b6e71",
  doorFrame: "#2a2c2e", // overhead door mullions: dark (Collin 2026-11-27)
  guard: "#2f3134", // guardrail posts and rails: dark, against the grey casing
  glass: "#f2c48a", // the drawing windows' warm glass
  cable: "#a7aaad", // stainless strand
  concrete: "#bebdb8",
};
const c = (hex: string) => new THREE.Color(hex);
const box = (x: Range, y: Range, z: Range, color: string): Box => ({ x, y, z, color: c(color) });

// rough opening: clear opening plus the casing plate each side and at the head
const rough = (o: DoorBayOpening) => {
  const t = D.casing.t;
  return { x: [o.x[0] - t, o.x[1] + t] as Range, y: [o.y[0], o.y[1] + t] as Range };
};

export const EAST_DOOR_BRICK: TanBrickWallSpec = {
  plane: "z",
  face: F,
  out: 1,
  u: D.x,
  y: D.y,
  seed: D.brickSeed,
  holes: D.openings.map((o) => {
    const r = rough(o);
    return { u: r.x, y: r.y };
  }),
};

// how deep the core is cut back behind the bay
const WALL_BACK = F - D.wall;
const TUBE_BACK = WALL_BACK - D.jambTube.d;
const DOOR_Z: Range = [TUBE_BACK - D.door.back - D.door.t, TUBE_BACK - D.door.back];
export const EAST_DOOR_BAY_CUT = {
  x: D.x,
  y: D.y,
  z: [DOOR_Z[0] - 0.2, F + 0.5] as Range,
};

const openingBoxes = (o: DoorBayOpening): Box[] => {
  const out: Box[] = [];
  const { t, leg } = D.casing;
  const r = rough(o);
  const [x0, x1] = o.x;
  const [y0, y1] = o.y;

  // concrete floor slab at the sill, from the door out to the back of the
  // face brick (the brick course under the opening is the sill's outer edge)
  // At grade there is no brick under the opening: the slab runs out to the
  // face to meet the sidewalk
  const atGrade = y0 <= D.y[0];
  out.push(
    box(r.x, [y0 - D.sill, atGrade ? y0 : y0 - 0.003], [EAST_DOOR_BAY_CUT.z[0], atGrade ? F : F - TAN_BRICK.depth - 0.01], COL.concrete),
  );

  // 3/8" angle casing: jamb and head plates through the wall, legs on the face
  out.push(box([r.x[0], x0], [y0, r.y[1]], [WALL_BACK, F], COL.steel));
  out.push(box([x1, r.x[1]], [y0, r.y[1]], [WALL_BACK, F], COL.steel));
  out.push(box(r.x, [y1, r.y[1]], [WALL_BACK, F], COL.steel));
  const legTop = o.header ? r.y[1] : r.y[1] + leg;
  out.push(box([r.x[0] - leg, r.x[0]], [y0, legTop], [F, F + t], COL.steel));
  out.push(box([r.x[1], r.x[1] + leg], [y0, legTop], [F, F + t], COL.steel));
  if (!o.header) out.push(box([r.x[0] - leg, r.x[1] + leg], [r.y[1], r.y[1] + leg], [F, F + t], COL.steel));

  // HSS jamb + head tube behind the wall, its face flush with the casing
  const { w } = D.jambTube;
  const tz: Range = [TUBE_BACK, WALL_BACK];
  out.push(box([x0 - w, x0], [y0, y1 + w], tz, COL.steel));
  out.push(box([x1, x1 + w], [y0, y1 + w], tz, COL.steel));
  out.push(box([x0 - w, x1 + w], [y1, y1 + w], tz, COL.steel));
  // door track in the gap behind the tube
  const trackZ: Range = [DOOR_Z[1], TUBE_BACK];
  out.push(box([x0 - 0.12, x0 + 0.02], [y0, y1], trackZ, COL.steel));
  out.push(box([x1 - 0.02, x1 + 0.12], [y0, y1], trackZ, COL.steel));

  // steel channel header on the face: web against the brick, flanges (legs)
  // pointing out, bolted through the web at 16" o.c. (3/A640)
  if (o.header) {
    const h = D.header;
    const hx: Range = [r.x[0] - leg - h.past, r.x[1] + leg + h.past];
    const hy: Range = [r.y[1], r.y[1] + h.h];
    out.push(box(hx, hy, [F, F + h.plate], COL.steel)); // web
    out.push(box(hx, [hy[0], hy[0] + h.plate], [F, F + h.proud], COL.steel)); // flanges
    out.push(box(hx, [hy[1] - h.plate, hy[1]], [F, F + h.proud], COL.steel));
    const len = hx[1] - hx[0];
    const n = Math.floor(len / h.boltPitch);
    const start = hx[0] + (len - (n - 1) * h.boltPitch) / 2;
    const by = (hy[0] + hy[1]) / 2;
    for (let i = 0; i < n; i++) {
      const bx = start + i * h.boltPitch;
      out.push(box([bx - 0.04, bx + 0.04], [by - 0.04, by + 0.04], [F + h.plate, F + h.plate + 0.05], COL.steel)); // bolt head
    }
  }

  // the door / lite, overlapping the opening 1" each side
  const dx: Range = [x0 - D.door.overlap, x1 + D.door.overlap];
  const fr = D.door.frame;
  const glassZ: Range = [DOOR_Z[0] + 0.05, DOOR_Z[1] - 0.06];
  out.push(box(dx, [y0, y1], [glassZ[0] - 0.02, glassZ[0]], COL.doorFrame)); // backing skin
  const cols = o.infill === "ohd" ? (o.cols ?? 4) : 1;
  const rows = o.infill === "ohd" ? Math.max(1, Math.round((y1 - y0) / D.door.section)) : 1;
  // perimeter rails show inside the clear opening at the muntin width, the
  // bottom rail 1.5x (Collin 2026-11-27); they run on behind the jambs and head
  const bot = fr * D.door.bottomRail;
  out.push(box([dx[0], x0 + fr], [y0, y1], DOOR_Z, COL.doorFrame));
  out.push(box([x1 - fr, dx[1]], [y0, y1], DOOR_Z, COL.doorFrame));
  out.push(box(dx, [y1 - fr, y1], DOOR_Z, COL.doorFrame));
  out.push(box(dx, [y0, y0 + bot], DOOR_Z, COL.doorFrame));
  // muntins split what is left into equal panes
  const gu: Range = [x0 + fr, x1 - fr];
  const gv: Range = [y0 + bot, y1 - fr];
  const pw = (gu[1] - gu[0] - (cols - 1) * fr) / cols;
  const ph = (gv[1] - gv[0] - (rows - 1) * fr) / rows;
  for (let i = 1; i < cols; i++) {
    const u = gu[0] + i * pw + (i - 1) * fr;
    out.push(box([u, u + fr], gv, DOOR_Z, COL.doorFrame));
  }
  for (let j = 1; j < rows; j++) {
    const v = gv[0] + j * ph + (j - 1) * fr;
    out.push(box(gu, [v, v + fr], DOOR_Z, COL.doorFrame));
  }
  out.push(box(dx, [y0, y1], glassZ, COL.glass));

  if (o.guard === false) return out;
  // 42" cable guardrail standing in the opening, just behind the face
  const g = D.guard;
  const gz: Range = [F - g.set - g.tube / 2, F - g.set + g.tube / 2];
  const gx: Range = [x0, x1];
  const width = gx[1] - gx[0];
  const bays = Math.max(1, Math.ceil(width / g.postMax - 1e-6));
  for (let i = 0; i <= bays; i++) {
    const u = gx[0] + g.tube / 2 + ((width - g.tube) * i) / bays;
    out.push(box([u - g.tube / 2, u + g.tube / 2], [y0, y0 + g.h - g.tube], gz, COL.guard));
    out.push(box([u - 0.2, u + 0.2], [y0, y0 + 0.03], [gz[0] - 0.12, gz[1] + 0.05], COL.guard)); // base plate
  }
  out.push(box(gx, [y0 + g.h - g.tube, y0 + g.h], gz, COL.guard)); // top rail
  const btm: Range = [y0 + g.bottomRail, y0 + g.bottomRail + g.tube];
  out.push(box(gx, btm, gz, COL.guard)); // bottom rail
  const zc = (gz[0] + gz[1]) / 2;
  for (let v = btm[1] + g.cablePitch; v < y0 + g.h - g.tube - 0.05; v += g.cablePitch) {
    out.push(box(gx, [v - g.cable / 2, v + g.cable / 2], [zc - g.cable / 2, zc + g.cable / 2], COL.cable));
  }
  return out;
};

export const EastDoorBay: React.FC = () => {
  const geo = useMemo(() => boxesGeometry(D.openings.flatMap(openingBoxes)), []);
  return (
    <group name="EastDoorBay">
      <TanBrickWall spec={EAST_DOOR_BRICK} />
      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors />
      </mesh>
    </group>
  );
};
