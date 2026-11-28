import {
  CMU_BLOCK,
  CORRUGATED_INFILL,
  GX,
  HM_DOOR,
  SOUTH_L1,
  SOUTH_L1_OPEN,
  SOUTH_L2,
  SOUTH_L4,
  STONE_SILL,
  STOREFRONT_DOOR,
  TAN_BRICK,
  WINDOW_COLORS,
  WINDOW_SETTINGS,
  WINDOW_SYSTEMS,
} from "./plan";
import { BoxXYZ } from "./Massing";
import { DRAWING_PROUD } from "./windowGeometry";

// A402 (SOUTH_L1 / SOUTH_L2 / SOUTH_L4 in plan.ts): the corrugated metal
// infill on its stone sills beside the Level 1 and 4 overhead doors and
// around door 205 on Level 2, and the black hollow metal doors 205 and 400.
// The masonry facades are open there (BRICK_FACADES); the overhead doors
// themselves are windows (Windows.tsx).
type Range = [number, number];
const L = SOUTH_L4;
const CORE = GX.g2; // the wall line (the core's face); outside is -x
const FACE = CORE - DRAWING_PROUD; // the masonry face
// faces that would land in another part's plane are held off it by this
// much, so the two don't flicker
const GAP = 0.005;

// a corrugated infill panel between z[0] and z[1], on its stone sill (its
// top y[0]), up to y[1]; returns: whether a window's wall return reaches into
// the opening at that end (the J trim covers it); sillEnd: where the sill
// stops if short of z[1]; sillH: the sill's height if not STONE_SILL.h;
// door: an HM door's frame (z, and its head) cut through the panel and sill
const CorrugatedInfill: React.FC<{
  z: Range;
  y: Range;
  returns: [boolean, boolean];
  sillEnd?: number;
  sillH?: number;
  door?: { z: Range; head: number };
}> = ({ z, y: [sillTop, top], returns, sillEnd, sillH = STONE_SILL.h, door }) => {
  const C = CORRUGATED_INFILL;
  const J = C.jTrim;
  const y: Range = [sillTop + GAP, top];
  const back = CORE - 0.03;
  const r0 = returns[0] ? C.windowReturn : 0;
  const r1 = returns[1] ? C.windowReturn : 0;
  // a window's return face is CMU_BLOCK.mortarSet + 0.01 behind the masonry
  // face; the trims stand J.proud in front of that
  const jx: Range = [FACE + CMU_BLOCK.mortarSet + 0.01 - J.proud, back];
  const w0 = z[0] + r0 + J.face; // inside edge of the west trim
  const e0 = z[1] - r1 - J.face; // and of the east trim
  const ribs: number[] = [];
  for (let u = w0 + C.pitch / 2; u < e0 - C.rib / 2; u += C.pitch) ribs.push(u);
  // J trim also captures the panel along the door frame: its jambs (where
  // the frame isn't at the panel's end) and its head
  const dj: Range | undefined = door && [door.z[0] > w0 ? door.z[0] - J.face : door.z[0], door.z[1] < e0 ? door.z[1] + J.face : door.z[1]];
  const doorTop = door ? door.head + J.face : 0;
  // trims: [z, y]
  const trims: [Range, Range][] = [
    [[z[0] + GAP, w0], dj && dj[0] <= w0 ? [doorTop, top] : y], // west
    [[e0, z[1] - GAP], dj && dj[1] >= e0 ? [doorTop, top] : y], // east
    [[w0, e0], [top - J.face, top - GAP]], // head
  ];
  if (door && dj) {
    trims.push([[Math.max(dj[0], w0), Math.min(dj[1], e0)], [door.head + GAP, doorTop]]); // over the door
    if (dj[0] < door.z[0]) trims.push([[dj[0], door.z[0] - GAP], [y[0], door.head + GAP]]);
    if (dj[1] > door.z[1]) trims.push([[door.z[1] + GAP, dj[1]], [y[0], door.head + GAP]]);
  }
  // the panel and sill in pieces around the door: [z, y bottom]
  const inDoor = (u: number) => dj !== undefined && u > dj[0] - C.rib / 2 && u < dj[1] + C.rib / 2;
  const panelZ: Range = [z[0] + r0 + GAP, z[1] - r1 - GAP];
  const panels: [Range, number][] = door
    ? [
        [[panelZ[0], door.z[0]], y[0]],
        [[door.z[0], door.z[1]], door.head + GAP],
        [[door.z[1], panelZ[1]], y[0]],
      ]
    : [[panelZ, y[0]]];
  // (a door at the panel's end leaves nothing on that side)
  const wide = (r: Range) => r[1] - r[0] > GAP;
  const sillZ: Range = [z[0] + GAP, (sillEnd ?? z[1]) - GAP];
  const sills = (door ? ([[sillZ[0], door.z[0] - GAP], [door.z[1] + GAP, sillZ[1]]] as Range[]) : [sillZ]).filter(wide);
  return (
    <group>
      {panels.filter(([pz]) => wide(pz)).map(([pz, y0]) => (
        <BoxXYZ key={pz[0]} x={[back, CORE]} y={[y0, top]} z={pz} color={C.color} lineColor="none" />
      ))}
      {/* black J trim, its edges drawn so it reads against the panel */}
      {trims.map(([tz, ty]) => (
        <BoxXYZ key={`${tz[0]} ${ty[0]}`} x={jx} y={ty} z={tz} color={J.color} lineColor={J.edge} />
      ))}
      {ribs.map((u) => (
        <BoxXYZ
          key={u}
          x={[back - C.depth, back]}
          y={inDoor(u) ? [doorTop, top] : y}
          z={[u - C.rib / 2, u + C.rib / 2]}
          color={C.color}
          lineColor="#4a4641"
        />
      ))}
      {sills.map((sz) => (
        <BoxXYZ
          key={sz[0]}
          x={[FACE - STONE_SILL.proud, CORE]}
          y={[sillTop - sillH, sillTop]}
          z={sz}
          color={STONE_SILL.color}
        />
      ))}
    </group>
  );
};

// HM_DOOR in an opening z u, from its sill y[0] to the frame's head y[1];
// hinge: the side the leaf hangs on, seen from outside (left is -z, west)
const HMDoor: React.FC<{ u: Range; y: Range; hinge: "left" | "right" }> = ({ u: [u0, u1], y: [y0, head], hinge }) => {
  const D = HM_DOOR;
  const f = D.frame.face;
  const frameX: Range = [FACE, FACE + D.frame.depth];
  const lf = D.leaf;
  const leafX: Range = [FACE + lf.set, FACE + lf.set + lf.t];
  const leaf = { z: [u0 + f + lf.clear, u1 - f - lf.clear] as Range, y: [y0 + lf.undercut, head - f - lf.clear] as Range };
  const lk = D.lock;
  // the lock across from the hinges; its lever turned back toward them
  const toHinge = hinge === "left" ? -1 : 1;
  const lockZ = hinge === "left" ? leaf.z[1] - lk.backset : leaf.z[0] + lk.backset;
  const lockY = y0 + lk.y;
  const roseX = leafX[0] - lk.rose.t;
  const lv = lk.lever;
  const leverX: Range = [leafX[0] - lv.proj, leafX[0] - lv.proj + lv.t];
  const leverEnd = lockZ + toHinge * lv.len;
  const leverZ: Range = toHinge > 0 ? [lockZ, leverEnd] : [leverEnd, lockZ];
  // the Rhodes lever's end curls back toward the door
  const retZ: Range = toHinge > 0 ? [leverEnd - lv.t, leverEnd] : [leverEnd, leverEnd + lv.t];
  const hingeZ = hinge === "left" ? u0 + f : u1 - f;
  const ly: Range = [lockY - lv.h / 2, lockY + lv.h / 2];
  return (
    <group>
      {/* 2" x 4 1/2" frame: jambs to the sill, head */}
      <BoxXYZ x={frameX} y={[y0, head]} z={[u0, u0 + f]} color={D.color} />
      <BoxXYZ x={frameX} y={[y0, head]} z={[u1 - f, u1]} color={D.color} />
      <BoxXYZ x={frameX} y={[head - f, head]} z={[u0 + f, u1 - f]} color={D.color} />
      {/* solid leaf, set back in the frame */}
      <BoxXYZ x={leafX} y={leaf.y} z={leaf.z} color={D.color} lineColor="#3a3a3a" />
      {/* hinge knuckles at the hinge jamb */}
      {D.hinge.at.map((h) => (
        <mesh key={h} position={[leafX[0] - D.hinge.w / 2, y0 + h, hingeZ]}>
          <cylinderGeometry args={[D.hinge.w / 2, D.hinge.w / 2, D.hinge.h, 12]} />
          <meshLambertMaterial color={D.color} />
        </mesh>
      ))}
      {/* cylindrical lock (626 satin chrome): round rose, neck, Rhodes lever */}
      <mesh position={[(roseX + leafX[0]) / 2, lockY, lockZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lk.rose.d / 2, lk.rose.d / 2, lk.rose.t, 28]} />
        <meshLambertMaterial color={lk.finish} />
      </mesh>
      <mesh position={[(leverX[1] + roseX) / 2, lockY, lockZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lk.neck.d / 2, lk.neck.d / 2, roseX - leverX[1], 16]} />
        <meshLambertMaterial color={lk.finish} />
      </mesh>
      <BoxXYZ x={leverX} y={ly} z={leverZ} color={lk.finish} lineColor="none" />
      <BoxXYZ x={[leverX[1], leverX[1] + lv.ret]} y={ly} z={retZ} color={lk.finish} lineColor="none" />
    </group>
  );
};

// a storefront door with a transom (STOREFRONT_DOOR) in a brick opening u,
// from its sill y[0] to the frame's head y[1]; the transom bar at doorTop;
// hinge: the side the leaf hangs on, seen from outside (left is -z, west)
const StorefrontDoor: React.FC<{ u: Range; y: Range; doorTop: number; hinge: "left" | "right" }> = ({
  u: [u0, u1],
  y: [y0, head],
  doorTop,
  hinge,
}) => {
  const S = STOREFRONT_DOOR;
  const sys = WINDOW_SYSTEMS.SF;
  const b = sys.border / 12;
  const sight = sys.sight / 12;
  const fx0 = FACE + WINDOW_SETTINGS.brick.setback;
  const fx: Range = [fx0, fx0 + sys.depth / 12];
  const frame = WINDOW_COLORS.frame;
  const glassX: Range = [(fx[0] + fx[1]) / 2 - 0.02, (fx[0] + fx[1]) / 2 + 0.02];
  // the leaf, at the frame's outer face
  const lz: Range = [u0 + b + S.clear, u1 - b - S.clear];
  const ly: Range = [y0 + S.clear, doorTop - S.clear];
  const lx: Range = [fx0, fx0 + S.leafT];
  const st = S.stile;
  const pullZ = hinge === "right" ? lz[0] + st / 2 : lz[1] - st / 2;
  const pullX = lx[0] - S.pull.standoff;
  // the pull's two standoffs, a little in from its ends
  const pullEnd = (e: number) => y0 + S.pull.y + e * (S.pull.len / 2 - S.pull.d);
  // the wall returning at the jambs and head, behind the brick's ends
  const rx: Range = [FACE + TAN_BRICK.mortarSet + 0.01, fx0];
  const rw = 0.25;
  return (
    <group>
      <BoxXYZ x={rx} y={[y0, head + rw]} z={[u0 - rw, u0 - GAP]} color={TAN_BRICK.mortar} lineColor="none" />
      <BoxXYZ x={rx} y={[y0, head + rw]} z={[u1 + GAP, u1 + rw]} color={TAN_BRICK.mortar} lineColor="none" />
      <BoxXYZ x={rx} y={[head + GAP, head + rw]} z={[u0, u1]} color={TAN_BRICK.mortar} lineColor="none" />
      {/* frame: jambs, head, transom bar */}
      <BoxXYZ x={fx} y={[y0, head]} z={[u0, u0 + b]} color={frame} />
      <BoxXYZ x={fx} y={[y0, head]} z={[u1 - b, u1]} color={frame} />
      <BoxXYZ x={fx} y={[head - b, head]} z={[u0 + b, u1 - b]} color={frame} />
      <BoxXYZ x={fx} y={[doorTop, doorTop + sight]} z={[u0 + b, u1 - b]} color={frame} />
      <BoxXYZ x={glassX} y={[doorTop + sight, head - b]} z={[u0 + b, u1 - b]} color={WINDOW_COLORS.glass} lineColor="none" />
      {/* the leaf: stiles, rails, its glass */}
      <BoxXYZ x={lx} y={ly} z={[lz[0], lz[0] + st]} color={frame} />
      <BoxXYZ x={lx} y={ly} z={[lz[1] - st, lz[1]]} color={frame} />
      <BoxXYZ x={lx} y={[ly[1] - S.topRail, ly[1]]} z={[lz[0] + st, lz[1] - st]} color={frame} />
      <BoxXYZ x={lx} y={[ly[0], ly[0] + S.bottomRail]} z={[lz[0] + st, lz[1] - st]} color={frame} />
      <BoxXYZ
        x={[lx[0] + S.leafT / 2 - 0.02, lx[0] + S.leafT / 2 + 0.02]}
        y={[ly[0] + S.bottomRail, ly[1] - S.topRail]}
        z={[lz[0] + st, lz[1] - st]}
        color={WINDOW_COLORS.glass}
        lineColor="none"
      />
      {/* offset pull on the lock stile */}
      <mesh position={[pullX, y0 + S.pull.y, pullZ]}>
        <cylinderGeometry args={[S.pull.d / 2, S.pull.d / 2, S.pull.len, 16]} />
        <meshLambertMaterial color={S.pull.finish} />
      </mesh>
      {[-1, 1].map((e) => (
        <BoxXYZ
          key={e}
          x={[pullX, lx[0]]}
          y={[pullEnd(e) - S.pull.d / 2, pullEnd(e) + S.pull.d / 2]}
          z={[pullZ - S.pull.d / 2, pullZ + S.pull.d / 2]}
          color={S.pull.finish}
          lineColor="none"
        />
      ))}
    </group>
  );
};

const L1 = SOUTH_L1;
const L2 = SOUTH_L2;
export const SouthInfill: React.FC = () => (
  <group>
    {/* Level 4: overhead door to the column, down beside door 400 to a
        one-course stone sill */}
    <CorrugatedInfill
      z={[L.jamb, L.col]}
      y={[L.sillTop, L.ohd.y[1]]}
      returns={[true, false]}
      sillH={L.sillH}
      door={{ z: L.door.u, head: L.doorHead }}
    />
    <HMDoor u={L.door.u} y={[L.ohd.y[0], L.doorHead]} hinge={L.door.hinge} />
    {/* Level 2: door 205 through the corrugated and its sill */}
    <CorrugatedInfill
      z={L2.corrugated.z}
      y={L2.corrugated.y}
      returns={[false, false]}
      door={{ z: L2.door.u, head: L2.door.y[1] }}
    />
    <HMDoor u={L2.door.u} y={L2.door.y} hinge={L2.door.hinge} />
    {/* Level 1 under the open bays: the storefront door */}
    <StorefrontDoor
      u={SOUTH_L1_OPEN.door.u}
      y={SOUTH_L1_OPEN.door.y}
      doorTop={SOUTH_L1_OPEN.door.doorTop}
      hinge={SOUTH_L1_OPEN.door.hinge}
    />
    {/* Level 1: overhead door to W15 */}
    <CorrugatedInfill
      z={[L1.jamb, L1.w15.u - L1.w15.w / 24]}
      y={[L1.sillTop, L1.ohd.y[1]]}
      returns={[true, true]}
    />
  </group>
);
