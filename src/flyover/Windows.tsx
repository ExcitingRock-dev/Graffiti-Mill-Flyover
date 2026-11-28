import { useMemo } from "react";
import * as THREE from "three";
import { concreteTexture } from "./concrete";
import { corrugatedTexture } from "./Sheds";
import { Box, boxesGeometry } from "./TanBrick";
import { worldUV } from "./uv";
import { RAKED_W6, ROUND_CW6, ROUND_W22, TAN_BRICK, WINDOW_COLORS as COL, WINDOW_SYSTEMS, WINDOWS, WindowSpec } from "./plan";
import { IN, WINDOW_WALLS, brickFacadeOf, mullionRanges, outline, outlineBox, rakedCorners, wallFrame, windowDepths } from "./windowGeometry";

// The windows from the shop drawings (WINDOWS in plan.ts, geometry in
// windowGeometry.ts), as real 3D units: black anodized frames and mullions at their
// system's sightline and depth, warm glass, set back in the wall per 4/A933
// (brick) or 4/A934 (the stair tower's metal panel) with the wall returning
// at the jambs and head and a metal sill flashing with a drip. The facade
// drawings get holes where these sit (useFacadeTextures.ts) and the solids
// behind get pockets (Massing.tsx). No tags.

type Range = [number, number];
const c = (hex: string) => new THREE.Color(hex);
const REVEAL: Record<string, string> = {
  brick: COL.brickReveal,
  precast: COL.precastReveal,
  tower: "#e4e3de",
};
// reveal returns: deep into the wall behind the drawings on brick; on the
// precast and tower solids exactly the pocket's extra width
const REVEAL_W: Record<string, number> = { brick: 0.25, precast: 0.05, tower: 0.05 };
const FLASH_T = 0.05;
const FLASH_LIFT = 0.01;

// per-window glass tone, like the drawings' lites (0.82 - 1.0)
const glassTone = (i: number) => 0.84 + (((i * 2654435761) >>> 0) % 1000) / 1000 * 0.16;

type Parts = { boxes: Box[]; glass: Box[]; shapes: { geo: THREE.BufferGeometry; color: string }[]; fillers: THREE.BufferGeometry[] };

const extrude = (shape: THREE.Shape, d: Range) =>
  new THREE.ExtrudeGeometry(shape, { depth: d[1] - d[0], bevelEnabled: false, curveSegments: 40 }).translate(0, 0, d[0]);
const circle = (cx: number, cy: number, r: number, path: THREE.Path = new THREE.Path()) => {
  path.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return path;
};
const polyShape = (pts: [number, number][]) => new THREE.Shape(pts.map(([a, y]) => new THREE.Vector2(a, y)));
const polyPath = (pts: [number, number][]) => new THREE.Path([...pts].reverse().map(([a, y]) => new THREE.Vector2(a, y)));

const rectParts = (w: WindowSpec, p: Parts) => {
  const sys = WINDOW_SYSTEMS[w.sys];
  const dep = windowDepths(w);
  const setting = WINDOW_WALLS[w.wall].setting;
  const o = outline(w);
  if (o.kind !== "rect") return;
  const [a0, a1] = o.a;
  const [y0, y1] = o.y;
  const b = sys.border * IN;
  const s = sys.sight * IN;
  const fd: Range = [dep.back, dep.front];
  const frame = c(COL.frame);
  const box = (a: Range, y: Range, d: Range, color: THREE.Color) => p.boxes.push({ x: a, y, z: d, color });
  // perimeter
  box([a0, a0 + b], [y0, y1], fd, frame);
  box([a1 - b, a1], [y0, y1], fd, frame);
  box([a0 + b, a1 - b], [y0, y0 + b], fd, frame);
  box([a0 + b, a1 - b], [y1 - b, y1], fd, frame);
  // mullions (full height) and horizontals; rows are listed top to bottom
  const ga: Range = [a0 + b, a1 - b];
  const gy: Range = [y0 + b, y1 - b];
  for (const m of mullionRanges(ga[0], ga[1], w.cols, s)) box(m, gy, fd, frame);
  for (const m of mullionRanges(gy[0], gy[1], [...w.rows].reverse(), s)) box(ga, m, fd, frame);
  p.glass.push({ x: ga, y: gy, z: [dep.glass - 0.02, dep.glass + 0.02], color: c(COL.glass) });

  if (setting === "interior") return;
  // the wall returning at the jambs and head, and the sill under the flashing
  const rw = REVEAL_W[setting];
  // in a 3D brick facade the returns stay behind the brick and its mortar
  // joints, so the brick ends show at the jambs
  const inBrick = brickFacadeOf(w) !== null;
  const front = inBrick ? dep.face - TAN_BRICK.mortarSet - 0.01 : setting === "brick" ? dep.face - 0.01 : dep.face;
  const rd: Range = [dep.back, front];
  const rev = c(REVEAL[setting]);
  box([a0 - rw, a0], [y0 - rw, y1 + rw], rd, rev);
  box([a1, a1 + rw], [y0 - rw, y1 + rw], rd, rev);
  box([a0, a1], [y1, y1 + rw], rd, rev);
  // on a stone sill (BrickFacades.tsx) there is no wash or flashing
  if (inBrick && w.stoneSill) return;
  box([a0, a1], [y0 - rw, y0 - FLASH_T], rd, setting === "brick" ? c(COL.wash) : rev);
  // sill flashing from the frame out past the face, with a drip
  const flash = c(COL.flashing);
  const tip = dep.face + dep.sillProud;
  // in 3D brick the top course ends exactly at the opening's bottom: lift the
  // flashing a hair so its top doesn't share that plane (Collin 2026-11-27)
  const lift = inBrick ? FLASH_LIFT : 0;
  box([a0, a1], [y0 - FLASH_T + lift, y0 + lift], [dep.back + 0.05, tip], flash);
  box([a0, a1], [y0 - FLASH_T - 0.08 + lift, y0 - FLASH_T + lift], [tip - 0.025, tip], flash);
};

const roundParts = (w: WindowSpec, p: Parts) => {
  const sys = WINDOW_SYSTEMS[w.sys];
  const dep = windowDepths(w);
  const setting = WINDOW_WALLS[w.wall].setting;
  const o = outline(w);
  if (o.kind !== "round") return;
  const [, cy] = o.c;
  const R = o.r;
  const fd: Range = [dep.back, dep.front];
  const isCW6 = w.tag === "CW6";
  const b = isCW6 ? sys.border * IN : ((ROUND_W22.d - ROUND_W22.dlo) / 2) * IN;
  const s = sys.sight * IN;
  // outer frame ring
  const ring = new THREE.Shape();
  circle(0, cy, R, ring);
  ring.holes.push(circle(0, cy, R - b));
  p.shapes.push({ geo: extrude(ring, fd), color: COL.frame });
  if (isCW6) {
    // 75" center lite in its own ring, four ring lites around it
    const rc = (ROUND_CW6.center / 2) * IN;
    const inner = new THREE.Shape();
    circle(0, cy, rc + s, inner);
    inner.holes.push(circle(0, cy, rc));
    p.shapes.push({ geo: extrude(inner, fd), color: COL.frame });
    const frame = c(COL.frame);
    const r0 = rc + s - 0.02;
    const r1 = R - b + 0.02;
    p.boxes.push({ x: [-s / 2, s / 2], y: [cy + r0, cy + r1], z: fd, color: frame });
    p.boxes.push({ x: [-s / 2, s / 2], y: [cy - r1, cy - r0], z: fd, color: frame });
    p.boxes.push({ x: [r0, r1], y: [cy - s / 2, cy + s / 2], z: fd, color: frame });
    p.boxes.push({ x: [-r1, -r0], y: [cy - s / 2, cy + s / 2], z: fd, color: frame });
  }
  const glass = new THREE.Shape();
  circle(0, cy, R - b + 0.01, glass);
  p.shapes.push({ geo: extrude(glass, [dep.glass - 0.02, dep.glass + 0.02]), color: "glass" });
  // the wall around the round opening: square pocket minus the circle
  const e = R + 0.05;
  const fill = polyShape([
    [-e, cy - e],
    [e, cy - e],
    [e, cy + e],
    [-e, cy + e],
  ]);
  fill.holes.push(circle(0, cy, R));
  const front = setting === "brick" ? dep.face - 0.01 : dep.face;
  const fg = extrude(fill, [dep.back - 0.6, front]);
  if (setting === "tower") p.fillers.push(fg);
  else p.shapes.push({ geo: fg, color: REVEAL[setting] });
  // a short sill flashing tick under the circle's bottom
  const flash = c(COL.flashing);
  const tip = dep.face + dep.sillProud;
  p.boxes.push({ x: [-0.35 * R, 0.35 * R], y: [cy - R - FLASH_T, cy - R + 0.02], z: [dep.back + 0.05, tip], color: flash });
};

const rakedParts = (w: WindowSpec, p: Parts) => {
  const sys = WINDOW_SYSTEMS[w.sys];
  const dep = windowDepths(w);
  const fd: Range = [dep.back, dep.front];
  const b = sys.border * IN;
  const s = sys.sight * IN;
  const outer = rakedCorners(w);
  const inner = rakedCorners(w, b);
  const frame = polyShape(outer);
  frame.holes.push(polyPath(inner));
  p.shapes.push({ geo: extrude(frame, fd), color: COL.frame });
  // one vertical mullion at the middle, between the sloped inner edges
  const t = Math.tan((RAKED_W6.angle * Math.PI) / 180);
  const yb = (inner[0][1] + inner[1][1]) / 2;
  const yt = (inner[3][1] + inner[2][1]) / 2;
  const mull = polyShape([
    [-s / 2, yb - (s / 2) * t],
    [s / 2, yb + (s / 2) * t],
    [s / 2, yt + (s / 2) * t],
    [-s / 2, yt - (s / 2) * t],
  ]);
  p.shapes.push({ geo: extrude(mull, fd), color: COL.frame });
  p.shapes.push({ geo: extrude(polyShape(inner), [dep.glass - 0.02, dep.glass + 0.02]), color: "glass" });
  // precast around it: bounding pocket minus the parallelogram
  const bb = outlineBox(outline(w));
  const e = 0.05;
  const fill = polyShape([
    [bb.a[0] - e, bb.y[0] - e],
    [bb.a[1] + e, bb.y[0] - e],
    [bb.a[1] + e, bb.y[1] + e],
    [bb.a[0] - e, bb.y[1] + e],
  ]);
  fill.holes.push(polyPath(outer));
  p.fillers.push(extrude(fill, [dep.back - 0.6, dep.face]));
};

const buildWindow = (w: WindowSpec): Parts => {
  const p: Parts = { boxes: [], glass: [], shapes: [], fillers: [] };
  if (w.shape === "round") roundParts(w, p);
  else if (w.shape === "raked") rakedParts(w, p);
  else rectParts(w, p);
  return p;
};

// local -> world matrix of a window
const placeMatrix = (w: WindowSpec) => {
  const f = wallFrame(w);
  return new THREE.Matrix4().makeRotationY(f.rotY).setPosition(f.x, 0, f.z);
};

export const Windows: React.FC = () => {
  const built = useMemo(() => {
    const siding = corrugatedTexture(1, 1, 17, "newWhite");
    const concrete = concreteTexture();
    const units = WINDOWS.map((w, i) => {
      const p = buildWindow(w);
      const m = placeMatrix(w);
      const tone = glassTone(i);
      const glassColor = new THREE.Color(COL.glass).multiplyScalar(tone);
      // fillers carry the wall's own texture, mapped in world space
      const fillers = p.fillers.map((g) => {
        const geo = worldUV(g.applyMatrix4(m));
        return { geo, tex: WINDOW_WALLS[w.wall].setting === "tower" ? siding : concrete };
      });
      return {
        key: `${w.tag}-${i}`,
        f: wallFrame(w),
        boxes: p.boxes.length ? boxesGeometry(p.boxes) : null,
        glass: p.glass.length ? boxesGeometry(p.glass) : null,
        glassColor,
        shapes: p.shapes,
        fillers,
      };
    });
    return units;
  }, []);

  return (
    <group name="Windows">
      {built.map((u) => (
        <group key={u.key}>
          <group position={[u.f.x, 0, u.f.z]} rotation={[0, u.f.rotY, 0]}>
            {u.boxes ? (
              <mesh geometry={u.boxes}>
                <meshLambertMaterial vertexColors />
              </mesh>
            ) : null}
            {u.glass ? (
              <mesh geometry={u.glass}>
                <meshBasicMaterial color={u.glassColor} />
              </mesh>
            ) : null}
            {u.shapes.map((s, j) => (
              <mesh key={j} geometry={s.geo}>
                {s.color === "glass" ? (
                  <meshBasicMaterial color={u.glassColor} />
                ) : (
                  <meshLambertMaterial color={s.color} />
                )}
              </mesh>
            ))}
          </group>
          {u.fillers.map((f, j) => (
            <mesh key={"f" + j} geometry={f.geo}>
              <meshLambertMaterial map={f.tex} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};
