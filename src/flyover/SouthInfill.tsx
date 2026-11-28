import { CMU_BLOCK, CORRUGATED_INFILL, GX, SOUTH_L1, SOUTH_L4, STONE_SILL } from "./plan";
import { BoxXYZ } from "./Massing";
import { DRAWING_PROUD } from "./windowGeometry";

// A402 grid K to G, Levels 1 and 4 (SOUTH_L1 / SOUTH_L4 in plan.ts): the
// corrugated metal infill beside the overhead doors on their stone sills, and
// on Level 4 the black hollow metal door under it. The masonry facades are
// open there (BRICK_FACADES); the overhead doors
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
// stops if short of z[1]
const CorrugatedInfill: React.FC<{ z: Range; y: Range; returns: [boolean, boolean]; sillEnd?: number }> = ({
  z,
  y: [sillTop, top],
  returns,
  sillEnd,
}) => {
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
  return (
    <group>
      <BoxXYZ x={[back, CORE]} y={y} z={[z[0] + r0 + GAP, z[1] - r1 - GAP]} color={C.color} lineColor="none" />
      {/* black J trim: west, east, head */}
      <BoxXYZ x={jx} y={y} z={[z[0] + GAP, w0]} color={J.color} lineColor="none" />
      <BoxXYZ x={jx} y={y} z={[e0, z[1] - GAP]} color={J.color} lineColor="none" />
      <BoxXYZ x={jx} y={[top - J.face, top - GAP]} z={[w0, e0]} color={J.color} lineColor="none" />
      {ribs.map((u) => (
        <BoxXYZ key={u} x={[back - C.depth, back]} y={y} z={[u - C.rib / 2, u + C.rib / 2]} color={C.color} lineColor="#4a4641" />
      ))}
      <BoxXYZ
        x={[FACE - STONE_SILL.proud, CORE]}
        y={[sillTop - STONE_SILL.h, sillTop]}
        z={[z[0] + GAP, (sillEnd ?? z[1]) - GAP]}
        color={STONE_SILL.color}
      />
    </group>
  );
};

const HMDoor: React.FC = () => {
  const D = L.door;
  const [u0, u1] = D.u;
  const f = D.frame;
  const y0 = L.ohd.y[0];
  const head = L.sillTop;
  const clear = 1 / 8 / 12;
  const leafX: Range = [CORE - 1.75 / 12, CORE];
  const leaf = { z: [u0 + f + clear, u1 - f - clear] as Range, y: [y0 + 0.5 / 12, head - f - clear] as Range };
  const lk = D.lock;
  const lockZ = lk.side === "left" ? leaf.z[0] + 2.75 / 12 : leaf.z[1] - 2.75 / 12;
  const toHinge = lk.side === "left" ? 1 : -1;
  const roseX = leafX[0] - 0.25 / 12; // its face 1/4" off the leaf
  const leverX: Range = [leafX[0] - 2.5 / 12, leafX[0] - 1.9 / 12];
  return (
    <group>
      {/* 2" frame: jambs to the floor, head */}
      <BoxXYZ x={[FACE, CORE]} y={[y0, head]} z={[u0, u0 + f]} color={D.color} />
      <BoxXYZ x={[FACE, CORE]} y={[y0, head]} z={[u1 - f, u1]} color={D.color} />
      <BoxXYZ x={[FACE, CORE]} y={[head - f, head]} z={[u0 + f, u1 - f]} color={D.color} />
      {/* solid leaf, set back in the frame */}
      <BoxXYZ x={leafX} y={leaf.y} z={leaf.z} color={D.color} lineColor="#3a3a3a" />
      {/* cylindrical lock: round rose, lever turned toward the hinges */}
      <mesh position={[(roseX + leafX[0]) / 2, lk.y, lockZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lk.rose / 2, lk.rose / 2, leafX[0] - roseX, 24]} />
        <meshLambertMaterial color={lk.hardware} />
      </mesh>
      <mesh position={[(leverX[0] + roseX) / 2, lk.y, lockZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5 / 12, 0.5 / 12, roseX - leverX[0], 16]} />
        <meshLambertMaterial color={lk.hardware} />
      </mesh>
      <BoxXYZ
        x={leverX}
        y={[lk.y - 0.3 / 12, lk.y + 0.3 / 12]}
        z={toHinge > 0 ? [lockZ, lockZ + lk.lever] : [lockZ - lk.lever, lockZ]}
        color={lk.hardware}
        lineColor="none"
      />
    </group>
  );
};

const L1 = SOUTH_L1;
export const SouthInfill: React.FC = () => (
  <group>
    {/* Level 4: overhead door to the column; the sill stops at the HM door */}
    <CorrugatedInfill z={[L.jamb, L.col]} y={[L.sillTop, L.ohd.y[1]]} returns={[true, false]} sillEnd={L.door.u[0]} />
    <HMDoor />
    {/* Level 1: overhead door to W15 */}
    <CorrugatedInfill
      z={[L1.jamb, L1.w15.u - L1.w15.w / 24]}
      y={[L1.sillTop, L1.ohd.y[1]]}
      returns={[true, true]}
    />
  </group>
);
