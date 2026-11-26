import { useMemo } from "react";
import * as THREE from "three";
import { GX, H, PIER, SPEAKEASY_WALL as W, speakeasyPocket, speakeasyWallZ } from "./plan";

// The Speakeasy's back wall (grid 9 north face, pier to pier). Built as real
// units so the smashed opening steps along the courses like knocked-out
// masonry: tan brick veneer in front of CMU, the brick broken back further than
// the block so the grey CMU shows around the hole. Above it a clear
// clear glass window in a storefront frame, cracked into shards bay by bay.
// The opening rises into the glass as a soft arch; the brick on its east side
// wanders up to the window's top east corner. Every random choice comes from
// W.seed, so the pattern is the same on every render.

type V2 = [number, number]; // (z, y) in the wall plane
type Box = { x: [number, number]; y: [number, number]; z: [number, number]; color: THREE.Color };

const rngFrom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// x layers (ft): brick face flush with the piers, CMU behind it; the glass
// sits in the middle of the storefront frame, inside the brick's depth so the
// climbing brick hides its edge
const FACE = GX.g9;
const BRICK_X: [number, number] = [FACE + PIER.proud - W.brick.depth, FACE + PIER.proud];
const CMU_X: [number, number] = [BRICK_X[0] - W.cmu.depth, BRICK_X[0]];
const FRAME_X: [number, number] = [FACE + PIER.proud - W.frame.depth, FACE + PIER.proud];
const GLASS_X = (FRAME_X[0] + FRAME_X[1]) / 2;
// the opening must stay east of the first mullion
const HOLE_WEST_LIMIT = W.mullionZ[0] + W.frame.face / 2 + 0.05;

// ---- masonry ----------------------------------------------------------------
const buildMasonry = (rand: () => number) => {
  const { zE, zW } = speakeasyWallZ();
  const zc = W.door.zc;
  const halfW = (y: number) => W.door.w / 2 + W.flare * smooth(W.sill - 3, W.sill, y);
  const walk = (prev: number, step: number) => clamp(prev + (rand() * 2 - 1) * step, -0.4, 0.4);

  const boxes: Box[] = [];
  // lay one course of units from zW to zE, skipping the hole interval
  const course = (
    y0: number,
    y1: number,
    unitW: number,
    offset: number,
    hole: [number, number],
    x: [number, number],
    joint: number,
    minLen: number,
    color: () => THREE.Color,
  ) => {
    if (y1 - y0 < joint * 2) return;
    for (let z = zW - offset; z < zE; z += unitW) {
      const a = Math.max(zW, z);
      const b = Math.min(zE, z + unitW);
      const pieces: [number, number][] = [];
      if (b <= hole[0] || a >= hole[1]) pieces.push([a, b]);
      else {
        if (a < hole[0]) pieces.push([a, hole[0]]);
        if (b > hole[1]) pieces.push([hole[1], b]);
      }
      for (const [p0, p1] of pieces) {
        if (p1 - p0 < minLen) continue;
        boxes.push({
          x,
          y: [y0 + joint / 2, y1 - joint / 2],
          z: [p0 + joint / 2, p1 - joint / 2],
          color: color(),
        });
      }
    }
  };

  // CMU: 8" courses, the hole edges wander course to course
  const cmuHoles: { y0: number; y1: number; hole: [number, number] }[] = [];
  let nL = 0;
  let nR = 0;
  const cmuGrey = new THREE.Color(W.cmuColor);
  for (let k = 0, y0 = H.l3; y0 < W.sill - 0.01; k++, y0 += W.cmu.h) {
    const y1 = Math.min(W.sill, y0 + W.cmu.h);
    nL = walk(nL, W.ragged.cmu);
    nR = walk(nR, W.ragged.cmu);
    const hw = halfW((y0 + y1) / 2);
    const hole: [number, number] = [Math.max(HOLE_WEST_LIMIT + 0.15, zc - hw - nL), zc + hw + nR];
    cmuHoles.push({ y0, y1, hole });
    course(y0, y1, W.cmu.w, (k % 2) * (W.cmu.w / 2), hole, CMU_X, W.cmu.joint, 0.3, () =>
      cmuGrey.clone().multiplyScalar(0.9 + rand() * 0.15),
    );
  }

  // brick: broken back past the CMU edge by a random amount each course
  const brickColors = W.brickColors.map((c) => new THREE.Color(c));
  const brick = () =>
    brickColors[Math.floor(rand() * brickColors.length)].clone().multiplyScalar(0.88 + rand() * 0.2);
  let bL = 0;
  let bR = 0;
  const [bb0, bb1] = W.brickBreakBack;
  let topHole: [number, number] = [zc - W.door.w / 2, zc + W.door.w / 2];
  let k = 0;
  let y0 = H.l3;
  for (; y0 < W.sill - 0.01; k++, y0 += W.brick.h) {
    const y1 = Math.min(W.sill, y0 + W.brick.h);
    const ym = (y0 + y1) / 2;
    const cmu = cmuHoles.find((c) => ym >= c.y0 && ym <= c.y1) ?? cmuHoles[cmuHoles.length - 1];
    bL = clamp(bL + (rand() * 2 - 1) * W.ragged.brick, bb0, bb1);
    bR = clamp(bR + (rand() * 2 - 1) * W.ragged.brick, bb0, bb1);
    topHole = [Math.max(HOLE_WEST_LIMIT, cmu.hole[0] - bL), cmu.hole[1] + bR];
    course(y0, y1, W.brick.w, (k % 2) * (W.brick.w / 2), topHole, BRICK_X, W.brick.joint, 0.12, brick);
  }

  // above the sill: the brick east of the opening climbs to the top east corner
  let jitter = 0;
  for (; y0 < W.head - 0.01; k++, y0 += W.brick.h) {
    const y1 = Math.min(W.head, y0 + W.brick.h);
    const t = ((y0 + y1) / 2 - W.sill) / (W.head - W.sill);
    jitter = clamp(jitter + (rand() * 2 - 1) * W.climb.wander, -0.3, 0.3);
    const edge = topHole[1] + (zE - topHole[1]) * W.climb.reach * Math.pow(t, W.climb.power) + jitter;
    if (zE - edge < 0.12) continue;
    course(y0, y1, W.brick.w, (k % 2) * (W.brick.w / 2), [zW - 1, edge], BRICK_X, W.brick.joint, 0.12, brick);
  }
  return { boxes, topHole };
};

// one geometry for many boxes, with per-box vertex colors
const boxesGeometry = (boxes: Box[]) => {
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

// ---- polygon helpers (convex polygons in the wall plane) ----------------------
const area = (p: V2[]) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
};
const centroid = (p: V2[]): V2 => [
  p.reduce((s, q) => s + q[0], 0) / p.length,
  p.reduce((s, q) => s + q[1], 0) / p.length,
];
// split by the line through o with direction d: [left side, right side]
const split = (poly: V2[], o: V2, d: V2): [V2[], V2[]] => {
  const side = (q: V2) => d[0] * (q[1] - o[1]) - d[1] * (q[0] - o[0]);
  const A: V2[] = [];
  const B: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) A.push(p);
    if (sp <= 0) B.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      const m: V2 = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      A.push(m);
      B.push(m);
    }
  }
  return [A, B];
};
// convex hull, counter-clockwise
const hull = (pts: V2[]): V2[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: V2[] = [];
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
};
// convex P minus convex V (CCW): convex pieces of P outside V
const subtract = (P: V2[], V: V2[]): V2[][] => {
  const out: V2[][] = [];
  let rest = P;
  for (let i = 0; i < V.length && rest.length >= 3; i++) {
    const a = V[i];
    const b = V[(i + 1) % V.length];
    const [inside, outside] = split(rest, a, [b[0] - a[0], b[1] - a[1]]);
    if (outside.length >= 3 && Math.abs(area(outside)) > 1e-4) out.push(outside);
    rest = inside;
  }
  return out;
};
// move every edge of a convex polygon inward by dist (null if it collapses)
const inset = (poly: V2[], dist: number): V2[] | null => {
  const ccw = area(poly) > 0 ? 1 : -1;
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = (-(q[1] - p[1]) / L) * ccw;
    const ny = ((q[0] - p[0]) / L) * ccw;
    return { p: [p[0] + nx * dist, p[1] + ny * dist] as V2, d: [(q[0] - p[0]) / L, (q[1] - p[1]) / L] as V2 };
  });
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const den = a.d[0] * b.d[1] - a.d[1] * b.d[0];
    if (Math.abs(den) < 1e-6) return null;
    const t = ((b.p[0] - a.p[0]) * b.d[1] - (b.p[1] - a.p[1]) * b.d[0]) / den;
    out.push([a.p[0] + a.d[0] * t, a.p[1] + a.d[1] * t]);
  }
  return area(out) * area(poly) > 0 && Math.abs(area(out)) > 0.01 ? out : null;
};
const dedupe = (p: V2[]) =>
  p.filter((q, i) => {
    const r = p[(i + 1) % p.length];
    return Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-4;
  });

// ---- stained glass -------------------------------------------------------------
const buildGlass = (rand: () => number, topHole: [number, number]) => {
  const { zE, zW } = speakeasyWallZ();
  const f = W.frame.face;
  const [m1, m2] = W.mullionZ;
  const y0 = W.sill;
  const y1 = W.head - f;
  const rect = (a: number, b: number): V2[] => [
    [a, y0],
    [b, y0],
    [b, y1],
    [a, y1],
  ];
  // bays between the frame members (east bay runs under the climbing brick)
  const bays = [rect(m1 + f / 2, zE), rect(m2 + f / 2, m1 - f / 2), rect(zW + f, m2 - f / 2)];
  // the opening's top: a soft arch over the masonry hole
  const [a0, a1] = topHole;
  const archPts: V2[] = [];
  for (let i = 0; i < W.arch.points; i++) {
    const u = i / (W.arch.points - 1);
    const lift = Math.pow(Math.sin(Math.PI * u), 0.7);
    const wob = i === 0 || i === W.arch.points - 1 ? 0 : (rand() * 2 - 1) * W.arch.wobble;
    archPts.push([a0 + (a1 - a0) * u, y0 - 0.01 + W.arch.rise * lift + wob]);
  }
  const arch = hull(archPts);
  let pieces = bays.flatMap((b) => subtract(b, arch)).map(dedupe).filter((p) => p.length >= 3);

  // crack: random straight cracks, biggest pieces first, no slivers or spikes
  const total = pieces.reduce((s, p) => s + Math.abs(area(p)), 0);
  const target = Math.round(total / W.shardArea);
  const ok = (q: V2[]) => {
    if (q.length < 3) return false;
    const a = Math.abs(area(q));
    let per = 0;
    for (let k = 0; k < q.length; k++) {
      const u = q[k];
      const v = q[(k + 1) % q.length];
      per += Math.hypot(v[0] - u[0], v[1] - u[1]);
    }
    return a > 0.15 && a / (per * per) > 0.035;
  };
  for (let tries = 0; pieces.length < target && tries < 4000; tries++) {
    const weights = pieces.map((p) => Math.abs(area(p)) ** 2);
    let r = rand() * weights.reduce((s, w) => s + w, 0);
    let i = 0;
    while (r > weights[i] && i < weights.length - 1) r -= weights[i++];
    const p = pieces[i];
    const c = centroid(p);
    const s = Math.sqrt(Math.abs(area(p)));
    const o: V2 = [c[0] + (rand() - 0.5) * 0.4 * s, c[1] + (rand() - 0.5) * 0.4 * s];
    const ang = rand() * Math.PI;
    const [A, B] = split(p, o, [Math.cos(ang), Math.sin(ang)]);
    if (ok(A) && ok(B)) pieces = [...pieces.slice(0, i), A, B, ...pieces.slice(i + 1)];
  }

  const pos: number[] = [];
  const col: number[] = [];
  const lead = new THREE.Color(W.lead);
  const palette = W.glassColors.map((c) => new THREE.Color(c));
  const fan = (poly: V2[], x: number, c: THREE.Color) => {
    for (let k = 1; k < poly.length - 1; k++) {
      for (const [z, y] of [poly[0], poly[k], poly[k + 1]]) {
        pos.push(x, y, z);
        col.push(c.r, c.g, c.b);
      }
    }
  };
  for (const p of pieces) {
    fan(p, GLASS_X - 0.03, lead); // the dark came behind each shard
    const shard = inset(p, W.leadW / 2);
    if (shard)
      fan(shard, GLASS_X, palette[Math.floor(rand() * palette.length)].clone().multiplyScalar(W.glassShade[0] + rand() * (W.glassShade[1] - W.glassShade[0])));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
};

// storefront frame: head, west jamb, mullions, and the sill west of the opening
const frameBoxes = (topHole: [number, number]) => {
  const { zE, zW } = speakeasyWallZ();
  const f = W.frame.face;
  const c = new THREE.Color(W.lead);
  const box = (y: [number, number], z: [number, number]): Box => ({ x: FRAME_X, y, z, color: c });
  return [
    box([W.head - f, W.head], [zW, zE]),
    box([W.sill, W.head], [zW, zW + f]),
    ...W.mullionZ.map((m) => box([W.sill, W.head], [m - f / 2, m + f / 2])),
    box([W.sill, W.sill + f], [zW, topHole[0]]),
  ];
};

export const SpeakeasyWall: React.FC = () => {
  const { masonry, glass, frame } = useMemo(() => {
    const rand = rngFrom(W.seed);
    const m = buildMasonry(rand);
    return {
      masonry: boxesGeometry(m.boxes),
      glass: buildGlass(rand, m.topHole),
      frame: boxesGeometry(frameBoxes(m.topHole)),
    };
  }, []);
  const pocket = speakeasyPocket();
  const lining = 0.02; // keeps the void's faces off the core's pocket faces
  return (
    <group>
      <mesh geometry={masonry}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={glass}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={frame}>
        <meshLambertMaterial vertexColors />
      </mesh>
      {/* the dark void beyond the smashed opening (inside faces only) */}
      <mesh
        position={[
          (pocket.x[0] + pocket.x[1]) / 2,
          (pocket.y[0] + pocket.y[1]) / 2,
          (pocket.z[0] + pocket.z[1]) / 2,
        ]}
      >
        <boxGeometry
          args={[
            pocket.x[1] - pocket.x[0] - lining,
            pocket.y[1] - pocket.y[0] - lining,
            pocket.z[1] - pocket.z[0] - lining,
          ]}
        />
        <meshBasicMaterial color="#141210" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
