import { useMemo } from "react";
import * as THREE from "three";
import {
  BRICK_FACADES,
  BrickFacade,
  DECK_PARAPET,
  SOUTH_DECK,
  SOUTH_DECK_EDGE,
  STONE_SILL,
  TAN_BRICK,
} from "./plan";
import { Box, TanBrickWall, TanBrickWallSpec, boxesGeometry, rngFrom, tanBrickShade } from "./TanBrick";
import { DRAWING_PROUD, brickFacadeParts } from "./windowGeometry";
import { BoxXYZ } from "./Massing";

// The 3D tan brick facades (BRICK_FACADES in plan.ts): the brick in place of
// the drawing, open at every window, and the stone sills. The drawing behind
// is cleared (useFacadeTextures.ts); the windows themselves are Windows.tsx.
const Facade: React.FC<{ f: BrickFacade }> = ({ f }) => {
  const { brick, sills } = useMemo(() => brickFacadeParts(f), [f]);
  return (
    <group>
      <TanBrickWall spec={brick} />
      {sills.map((s, i) => (
        <BoxXYZ key={i} x={s.x} y={s.y} z={s.z} color={STONE_SILL.color} />
      ))}
    </group>
  );
};

type Range = [number, number];
// a rowlock cap: bricks on edge, each running across the wall, laid along u.
// plane "z": the wall runs along x (u = x), across is z; plane "x": the
// other way round
const rowlockCap = (plane: "x" | "z", u: Range, across: Range, y: Range, seed: number): Box[] => {
  const B = TAN_BRICK;
  const rand = rngFrom(seed);
  const step = B.h; // a brick's height, now its width along the wall
  const n = Math.max(1, Math.round((u[1] - u[0]) / step));
  const w = (u[1] - u[0]) / n;
  const boxes: Box[] = [];
  const j = B.joint / 2;
  for (let i = 0; i < n; i++) {
    const a: Range = [u[0] + i * w + j, u[0] + (i + 1) * w - j];
    const d: Range = [across[0] + j, across[1] - j];
    const yy: Range = [y[0] + j, y[1]];
    const color = tanBrickShade(rand);
    boxes.push(plane === "z" ? { x: a, y: yy, z: d, color } : { x: d, y: yy, z: a, color });
  }
  // mortar under and between them, just below their tops
  const m: Range = [y[0], y[1] - B.mortarSet];
  const bed: Box =
    plane === "z"
      ? { x: u, y: m, z: [across[0] + 0.01, across[1] - 0.01], color: new THREE.Color(B.mortar) }
      : { x: [across[0] + 0.01, across[1] - 0.01], y: m, z: u, color: new THREE.Color(B.mortar) };
  return [...boxes, bed];
};

// The Level 6 South Deck's parapet (DECK_PARAPET): face brick on the outside
// (in the drawing's place) and on the deck side, a rowlock cap on top, along
// the east edge (wall E) and the south edge (wall S)
const DeckParapet: React.FC = () => {
  const d = SOUTH_DECK;
  const P = DECK_PARAPET;
  const c = d.curbThick;
  const [x0, x1] = d.x;
  const [z0, z1] = d.z;
  const capY0 = d.curbTop - P.cap;
  const outY0 = SOUTH_DECK_EDGE.y[1]; // above the roof edge slab
  const eOut = z1 + DRAWING_PROUD; // east outer face (in the drawing's plane)
  const sOut = x0 - DRAWING_PROUD; // south outer face
  const eIn = z1 - c; // east inner face (deck side)
  const sIn = x0 + c; // south inner face
  const walls: TanBrickWallSpec[] = [
    // east: outside, from the corner (south face's plane) to the deck's end
    { plane: "z", face: eOut, out: 1, u: [sOut, x1], y: [outY0, capY0], seed: P.seed },
    // east: deck side
    { plane: "z", face: eIn, out: -1, u: [sIn, x1], y: [d.y, capY0], seed: P.seed + 1 },
    // south: outside, stopping behind the east wall's corner bricks
    { plane: "x", face: sOut, out: -1, u: [z0, eOut - TAN_BRICK.depth], y: [outY0, capY0], seed: P.seed + 2 },
    // south: deck side
    { plane: "x", face: sIn, out: 1, u: [z0, eIn], y: [d.y, capY0], seed: P.seed + 3 },
  ];
  const cap = useMemo(
    () =>
      boxesGeometry([
        ...rowlockCap("z", [sOut, x1], [eIn, eOut], [capY0, d.curbTop], P.seed + 4),
        ...rowlockCap("x", [z0, eIn], [sOut, sIn], [capY0, d.curbTop], P.seed + 5),
      ]),
    [sOut, x1, eIn, eOut, capY0, d.curbTop, z0, sIn, P.seed],
  );
  return (
    <group>
      {walls.map((s, i) => (
        <TanBrickWall key={i} spec={s} />
      ))}
      <mesh geometry={cap}>
        <meshLambertMaterial vertexColors />
      </mesh>
    </group>
  );
};

export const BrickFacades: React.FC = () => (
  <group>
    {BRICK_FACADES.map((f) => (
      <Facade key={f.name} f={f} />
    ))}
    <DeckParapet />
  </group>
);
