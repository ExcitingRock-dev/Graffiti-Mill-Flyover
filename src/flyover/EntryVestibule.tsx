import { useMemo } from "react";
import * as THREE from "three";
import { ENTRY_HEAD, ENTRY_INNER, ENTRY_STOREFRONT, ENTRY_VESTIBULE, PIER } from "./plan";
import { BoxXYZ, C } from "./Massing";

// The glazed entry vestibule at the stair tower's south side (ENTRY_VESTIBULE,
// ENTRY_STOREFRONT in plan.ts): OBE 3000 XT storefront on two sides, the
// door in the east run, a sloped canopy roof.

type Range = [number, number];
type ZY = [number, number];

// a flat piece in the south run's plane (x from x0 to x0 + depth), outlined
// in (z, y)
const SouthPiece: React.FC<{ pts: ZY[]; x: Range; color: string; opacity?: number; line?: string }> = ({
  pts,
  x,
  color,
  opacity,
  line,
}) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth: x[1] - x[0], bevelEnabled: false });
    // shape x -> world z, extrusion -> world -x (placed at x[1])
    g.rotateY(-Math.PI / 2);
    g.translate(x[1], 0, 0);
    return g;
  }, [pts, x]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 25), [geo]);
  return (
    <group>
      <mesh geometry={geo}>
        <meshLambertMaterial
          color={color}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
          depthWrite={opacity === undefined}
        />
      </mesh>
      {line && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={line} />
        </lineSegments>
      )}
    </group>
  );
};

// A straight storefront run facing +z: frame (outer face at zOut, 4 1/2"
// deep), a lite, the door, a lite, a transom lite over the door. startPost:
// the first post's width along x (the 4 1/2" corner post, or a 2" jamb).
// The door: medium stile, 10" bottom rail, hinged on the right seen from
// outside (+z), swinging out; pull and hinges on the outside.
const StorefrontRun: React.FC<{ zOut: number; x: Range; startPost: number; head: number; door: Range }> = ({
  zOut,
  x,
  startPost,
  head,
  door,
}) => {
  const S = ENTRY_STOREFRONT;
  const D = S.door;
  const f = S.face;
  const d = S.depth;
  const [xa, xb] = x;
  const [dL, dR] = door;
  const frame = C.rail;
  const line = C.lineOnDark;
  const z: Range = [zOut - d, zOut];
  const gz: Range = [zOut - d / 2 - S.glass / 2, zOut - d / 2 + S.glass / 2];
  const doorHead = D.h + D.clear; // underside of the transom bar over the door
  const boxes: { x: Range; y: Range }[] = [
    { x: [xa, xa + startPost], y: [0, head] }, // first post
    { x: [xa + startPost, xb], y: [head - f, head] }, // head
    { x: [xa + startPost, dL - f], y: [0, f] }, // sills
    { x: [dR + f, xb - f], y: [0, f] },
    { x: [dL - f, dL], y: [0, head - f] }, // door jambs, down to the floor
    { x: [dR, dR + f], y: [0, head - f] },
    { x: [dL, dR], y: [doorHead, doorHead + f] }, // transom bar over the door
    { x: [xb - f, xb], y: [0, head] }, // end jamb
  ];
  const glass: { x: Range; y: Range }[] = [
    { x: [xa + startPost, dL - f], y: [f, head - f] },
    { x: [dR + f, xb - f], y: [f, head - f] },
    { x: [dL, dR], y: [doorHead + f, head - f] }, // transom lite
  ];
  // the leaf (closed), centered in the frame's depth
  const leafX: Range = [dL + D.clear, dR - D.clear];
  const leafY: Range = [D.clear, D.h];
  const leafZ: Range = [zOut - d / 2 - D.thick / 2, zOut - d / 2 + D.thick / 2];
  const leaf: { x: Range; y: Range }[] = [
    { x: [leafX[0], leafX[0] + D.stile], y: leafY }, // latch stile (left)
    { x: [leafX[1] - D.stile, leafX[1]], y: leafY }, // hinge stile (right)
    { x: [leafX[0] + D.stile, leafX[1] - D.stile], y: [leafY[0], leafY[0] + D.bottomRail] },
    { x: [leafX[0] + D.stile, leafX[1] - D.stile], y: [leafY[1] - D.topRail, leafY[1]] },
  ];
  glass.push({ x: [leafX[0] + D.stile, leafX[1] - D.stile], y: [leafY[0] + D.bottomRail, leafY[1] - D.topRail] });
  const pullX = leafX[0] + D.stile / 2;
  const pullZ = leafZ[1] + D.pull.standoff;
  const hw = S.hardware;
  return (
    <group>
      {[...boxes].map((b, i) => (
        <BoxXYZ key={"f" + i} x={b.x} y={b.y} z={z} color={frame} lineColor={line} />
      ))}
      {leaf.map((b, i) => (
        <BoxXYZ key={"d" + i} x={b.x} y={b.y} z={leafZ} color={frame} lineColor={line} />
      ))}
      {glass.map((b, i) => (
        <BoxXYZ key={"g" + i} x={b.x} y={b.y} z={gz} color={C.glass} lineColor="none" opacity={0.75} />
      ))}
      {/* threshold */}
      <BoxXYZ x={[dL, dR]} y={[0, 0.04]} z={[zOut - d, zOut + 0.05]} color={hw} lineColor="none" />
      {/* pull, on its two standoffs */}
      <BoxXYZ
        x={[pullX - D.pull.d / 2, pullX + D.pull.d / 2]}
        y={D.pull.y}
        z={[pullZ - D.pull.d / 2, pullZ + D.pull.d / 2]}
        color={hw}
        lineColor="none"
      />
      {[D.pull.y[0] + 0.1, D.pull.y[1] - 0.1].map((y) => (
        <BoxXYZ key={y} x={[pullX - 0.03, pullX + 0.03]} y={[y - 0.03, y + 0.03]} z={[leafZ[1], pullZ]} color={hw} lineColor="none" />
      ))}
      {/* butt hinges */}
      {D.hinges.map((y) => (
        <BoxXYZ key={y} x={[dR - 0.03, dR + 0.03]} y={[y, y + 4.5 / 12]} z={[leafZ[1], leafZ[1] + 0.06]} color={hw} lineColor="none" />
      ))}
    </group>
  );
};

export const EntryVestibule: React.FC = () => {
  const v = ENTRY_VESTIBULE;
  const S = ENTRY_STOREFRONT;
  const f = S.face;
  const d = S.depth;
  const x0 = v.x[0]; // south run, outer face
  const xEnd = v.x[1]; // east run ends on the tower
  const z1 = v.z[1]; // east run, outer face
  const zw = v.z[0] + PIER.proud; // south run starts on the grid-4 column's face
  const frame = C.rail;
  const lineOnFrame = C.lineOnDark;

  // the canopy: one sloped slab, high at the building (z0), low out past z1
  const roof = useMemo(() => {
    const [rx0, rx1] = v.roof.x;
    const run = v.roof.zOut - v.z[0];
    const drop = v.roof.high - v.roof.low;
    const pitch = Math.atan2(drop, run);
    // the slab's underside at z
    const under = (z: number) => v.roof.high - ((z - v.z[0]) * drop) / run - v.roof.t / 2 / Math.cos(pitch);
    return {
      len: Math.hypot(run, drop),
      pitch,
      cx: (rx0 + rx1) / 2,
      cz: (v.z[0] + v.roof.zOut) / 2,
      cy: (v.roof.high + v.roof.low) / 2,
      w: rx1 - rx0,
      under,
      slope: drop / run,
      fv: f / Math.cos(pitch), // a 2" member's height, measured vertically, on the slope
    };
  }, [v, f]);

  const headTop = ENTRY_HEAD;
  const xS: Range = [x0, x0 + d]; // south run's depth
  const gxS: Range = [x0 + d / 2 - S.glass / 2, x0 + d / 2 + S.glass / 2];
  // the door opening, centered in the outer run between the corner post and
  // the end jamb; the inner door stands right behind it
  const open = S.door.w + 2 * S.door.clear;
  const mid = (x0 + d + xEnd - f) / 2;
  const door: Range = [mid - open / 2, mid + open / 2];
  // south run: one mullion in the middle
  const zm = (zw + f + z1 - d) / 2;


  // south run, as outlines in (z, y)
  const slopedTop = (za: number, zb: number, y0: number, drop = 0): ZY[] => [
    [za, y0],
    [zb, y0],
    [zb, roof.under(zb) - drop],
    [za, roof.under(za) - drop],
  ];
  const rect = (z: Range, y: Range): ZY[] => [
    [z[0], y[0]],
    [z[1], y[0]],
    [z[1], y[1]],
    [z[0], y[1]],
  ];
  const southFrame: ZY[][] = [
    slopedTop(zw, zw + f, 0), // wall jamb, up to the roof
    slopedTop(zm - f / 2, zm + f / 2, 0), // the middle mullion, up to the roof
    rect([zw + f, zm - f / 2], [0, f]), // sills
    rect([zm + f / 2, z1 - d], [0, f]),
    rect([zw + f, z1 - d], [headTop - f, headTop]), // the head line, level with the east head
    // the sloped head under the roof, from the corner post to the wall jamb
    [
      [zw + f, roof.under(zw + f)],
      [zw + f, roof.under(zw + f) - roof.fv],
      [z1 - d, roof.under(z1 - d) - roof.fv],
      [z1 - d, roof.under(z1 - d)],
    ],
  ];
  const southGlass: ZY[][] = [
    rect([zw + f, z1 - d], [f, headTop - f]),
    // the triangle between the head line and the sloped head, which meet
    // just short of the corner post
    [
      [zw + f, headTop],
      [z1 - d - roof.fv / roof.slope, headTop],
      [zw + f, roof.under(zw + f) - roof.fv],
    ],
  ];

  return (
    <group>
      {/* outer run (east), and the inner one in the building's wall behind it */}
      <StorefrontRun zOut={z1} x={[x0, xEnd]} startPost={d} head={headTop} door={door} />
      <StorefrontRun zOut={ENTRY_INNER.z} x={ENTRY_INNER.x} startPost={f} head={ENTRY_INNER.head} door={door} />
      {/* south run */}
      {southFrame.map((p, i) => (
        <SouthPiece key={"s" + i} pts={p} x={xS} color={frame} line={lineOnFrame} />
      ))}
      {southGlass.map((p, i) => (
        <SouthPiece key={"sg" + i} pts={p} x={gxS} color={C.glass} opacity={0.75} />
      ))}
      {/* canopy */}
      <group position={[roof.cx, roof.cy, roof.cz]} rotation={[roof.pitch, 0, 0]}>
        <BoxXYZ
          x={[-roof.w / 2, roof.w / 2]}
          y={[-v.roof.t / 2, v.roof.t / 2]}
          z={[-roof.len / 2, roof.len / 2]}
          color={C.metal}
          lineColor={C.lineOnDark}
        />
      </group>
    </group>
  );
};
