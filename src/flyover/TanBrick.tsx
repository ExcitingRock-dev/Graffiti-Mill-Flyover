import { useMemo } from "react";
import * as THREE from "three";
import { TAN_BRICK } from "./plan";

// The tan brick (Collin 2026-11-27: "tan brick" means this): real 3D units in
// running bond, each brick its own shade, set in a mortar bed that sits just
// behind the brick faces so the joints read. First built for the Speakeasy's
// back wall; this is the plain-wall version for anywhere else.

type Range = [number, number];
export type Box = { x: Range; y: Range; z: Range; color: THREE.Color };

export const rngFrom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// one geometry for many boxes, with per-box vertex colors
export const boxesGeometry = (boxes: Box[]) => {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const faces: { n: [number, number, number]; c: [number, number, number][] }[] = [
    { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];
  for (const b of boxes) {
    for (const f of faces) {
      const base = pos.length / 3;
      for (const [i, j, k] of f.c) {
        pos.push(b.x[i], b.y[j], b.z[k]);
        nor.push(...f.n);
        col.push(b.color.r, b.color.g, b.color.b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
};

// a masonry unit and its bond: TAN_BRICK, or CMU_BLOCK (plan.ts)
export type MasonryUnit = {
  w: number;
  h: number;
  depth: number;
  joint: number;
  colors: string[];
  mortar: string;
  mortarSet: number;
};

// a shade for one brick, picked from the tan palette (or the unit's)
export const tanBrickShade = (rand: () => number, unit: MasonryUnit = TAN_BRICK) => {
  const c = unit.colors[Math.floor(rand() * unit.colors.length)];
  return new THREE.Color(c).multiplyScalar(0.88 + rand() * 0.2);
};

// A flat brick wall in a vertical plane.
// plane "z": the wall face is at z = face, running along x (u = x)
// plane "x": the wall face is at x = face, running along z (u = z)
// out: which way the face looks (+1 / -1 along the plane's axis); the brick
// fills TAN_BRICK.depth behind the face, the mortar bed behind that.
export type TanBrickWallSpec = {
  plane: "x" | "z";
  face: number;
  out: 1 | -1;
  u: Range;
  y: Range;
  seed: number;
  // openings (u, y) the brick stops at
  holes?: { u: Range; y: Range }[];
  // how far behind the face the mortar bed reaches (default a little past
  // the bricks' backs)
  bedDepth?: number;
  // the unit laid (default TAN_BRICK)
  unit?: MasonryUnit;
  // where the brick grid starts: a course line, and a head joint of the
  // unshifted courses (default the wall's bottom-left corner)
  origin?: { u: number; y: number };
};

type Rect = { u: Range; y: Range };
// rectangle minus rectangle, as up to four rectangles
const cutRect = (r: Rect, h: Rect): Rect[] => {
  const u0 = Math.max(r.u[0], h.u[0]), u1 = Math.min(r.u[1], h.u[1]);
  const y0 = Math.max(r.y[0], h.y[0]), y1 = Math.min(r.y[1], h.y[1]);
  if (u0 >= u1 || y0 >= y1) return [r];
  const out: Rect[] = [];
  if (r.u[0] < u0) out.push({ u: [r.u[0], u0], y: r.y });
  if (u1 < r.u[1]) out.push({ u: [u1, r.u[1]], y: r.y });
  if (r.y[0] < y0) out.push({ u: [u0, u1], y: [r.y[0], y0] });
  if (y1 < r.y[1]) out.push({ u: [u0, u1], y: [y1, r.y[1]] });
  return out;
};
const cutHoles = (r: Rect, holes: Rect[]) =>
  holes.reduce<Rect[]>((acc, h) => acc.flatMap((p) => cutRect(p, h)), [r]).filter(
    (p) => p.u[1] - p.u[0] > 0.02 && p.y[1] - p.y[0] > 0.02,
  );

export const tanBrickWallBoxes = (s: TanBrickWallSpec): Box[] => {
  const B = s.unit ?? TAN_BRICK;
  const rand = rngFrom(s.seed);
  const back = (d: number): Range => (s.out > 0 ? [s.face - d, s.face] : [s.face, s.face + d]);
  const place = (u: Range, y: Range, d: Range, color: THREE.Color): Box =>
    s.plane === "z" ? { x: u, y, z: d, color } : { x: d, y, z: u, color };
  const boxes: Box[] = [];
  const unitDepth = back(B.depth);
  const o = s.origin ?? { u: s.u[0], y: s.y[0] };
  // courses on the origin's grid, cut to the wall (partial ones at its edges)
  for (let k = Math.floor((s.y[0] - o.y) / B.h + 1e-6); o.y + k * B.h < s.y[1] - 0.01; k++) {
    const y0 = Math.max(s.y[0], o.y + k * B.h);
    const y1 = Math.min(s.y[1], o.y + (k + 1) * B.h);
    if (y1 - y0 < B.joint * 2) continue;
    const u00 = o.u - (((k % 2) + 2) % 2) * (B.w / 2);
    for (let u = u00 - Math.ceil((u00 - s.u[0]) / B.w) * B.w; u < s.u[1]; u += B.w) {
      const a = Math.max(s.u[0], u);
      const b = Math.min(s.u[1], u + B.w);
      if (b - a < 0.12) continue;
      const color = tanBrickShade(rand, B);
      for (const p of cutHoles({ u: [a + B.joint / 2, b - B.joint / 2], y: [y0 + B.joint / 2, y1 - B.joint / 2] }, s.holes ?? []))
        boxes.push(place(p.u, p.y, unitDepth, color));
    }
  }
  // mortar bed: from just behind the brick faces to a little past their backs
  const bed = s.bedDepth ?? B.depth + 0.1;
  const m = s.out > 0 ? [s.face - bed, s.face - B.mortarSet] : [s.face + B.mortarSet, s.face + bed];
  for (const p of cutHoles({ u: s.u, y: s.y }, s.holes ?? []))
    boxes.push(place(p.u, p.y, m as Range, new THREE.Color(B.mortar)));
  return boxes;
};

export const TanBrickWall: React.FC<{ spec: TanBrickWallSpec }> = ({ spec }) => {
  const geo = useMemo(() => boxesGeometry(tanBrickWallBoxes(spec)), [spec]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
};
