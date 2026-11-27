import { useMemo } from "react";
import * as THREE from "three";
import { NORTH_SHEDS, Volume } from "./plan";

// ---- Existing corrugated steel (test texture for roof objects) ---------------
// Collin 2026-11-26 (Google Earth Studio still): the sheds' corrugated steel
// stays in place, unpainted. Off-white, lightly rusted. No graffiti here:
// Collin adds tags by hand so they match the existing graffiti.
// Vertical corrugation; one tile covers CORRUGATED.tileFt square, UVs in feet.
export const CORRUGATED = {
  tileFt: 16,
  pxPerFt: 64,
  pitchFt: 0.25, // corrugation period (3")
  ribShade: 0.11, // light/dark swing across one corrugation
};
type Look = {
  base: [number, number, number];
  weather: number;
  rustStreaks: number;
  rustPatches: number;
  seed: number;
  rust?: string; // streak / patch rgb, default orange rust
  fade?: number; // pale sun-faded clouds (0 = none)
  cap?: string; // ridge cap color
};
// existing = the old steel, off-white and lightly rusted: the north sheds and
// every head house volume and the stair tower top (Collin 2026-11-26);
// newDark = new darker panel infill (Collin 2026-11-26), clean, no rust
export const CORRUGATED_LOOKS = {
  existing: { base: [230, 226, 214], weather: 1, rustStreaks: 34, rustPatches: 10, seed: 5 },
  newDark: { base: [88, 87, 84], weather: 0.4, rustStreaks: 0, rustPatches: 0, seed: 9 },
  // newWhite = the round-window stair tower: new, clean white steel, walls and
  // roof (Collin 2026-11-26)
  newWhite: { base: [242, 242, 238], weather: 0.15, rustStreaks: 0, rustPatches: 0, seed: 13 },
  // rustRed = the old red-painted steel on sheds HB and HC (Google Earth, Collin
  // 2026-11-26): dusty red oxide, dark run-down streaks, sun-faded patches
  rustRed: {
    base: [122, 66, 56],
    weather: 1.2,
    rustStreaks: 60,
    rustPatches: 14,
    seed: 17,
    rust: "62,30,22",
    fade: 1,
    cap: "#7a3e33",
  },
} satisfies Record<string, Look>;
export type CorrugatedLook = keyof typeof CORRUGATED_LOOKS;

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const corrugatedCanvas: Partial<Record<CorrugatedLook, HTMLCanvasElement>> = {};
const getCorrugatedCanvas = (look: CorrugatedLook) => {
  const cached = corrugatedCanvas[look];
  if (cached) return cached;
  const c = { ...CORRUGATED, ...(CORRUGATED_LOOKS[look] as Look) };
  const N = c.tileFt * c.pxPerFt;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d")!;
  const rand = rng(c.seed);
  // corrugation: brightness varies across x, constant down the sheet
  const period = c.pitchFt * c.pxPerFt;
  for (let x = 0; x < N; x++) {
    const k = 1 + c.ribShade * Math.sin((2 * Math.PI * x) / period);
    const [r, gg, b] = c.base.map((v) => Math.min(255, Math.round(v * k)));
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(x, 0, 1, N);
  }
  // soft blob, repeated across the tile edges so the tile stays seamless
  const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
    for (const dx of [-N, 0, N])
      for (const dy of [-N, 0, N]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx + r < 0 || cx - r > N || cy + r < 0 || cy - r > N) continue;
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${rgb},${a})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      }
  };
  // faint weathering: soft grey clouds
  for (let i = 0; i < 40; i++) blob(rand() * N, rand() * N, 40 + rand() * 160, "120,115,105", (0.05 + rand() * 0.06) * c.weather);
  for (let i = 0; i < 24 * (c.fade ?? 0); i++) blob(rand() * N, rand() * N, 60 + rand() * 180, "200,160,145", 0.08 + rand() * 0.1);
  const rust = c.rust ?? "150,80,35";
  // rust: streaks run down the sheet from fasteners / laps, a few patches
  for (let i = 0; i < c.rustStreaks; i++) {
    const x = Math.floor((rand() * N) / period) * period + period * (0.3 + rand() * 0.4);
    const y0 = rand() * N;
    const len = 60 + rand() * 420;
    const w = 2 + rand() * 5;
    const grad = g.createLinearGradient(0, y0, 0, y0 + len);
    const a = 0.12 + rand() * 0.25;
    grad.addColorStop(0, `rgba(${rust},${a})`);
    grad.addColorStop(1, `rgba(${rust},0)`);
    g.fillStyle = grad;
    g.fillRect(x - w / 2, y0, w, len);
    // wrap the streak so the tile stays seamless top to bottom
    if (y0 + len > N) g.fillRect(x - w / 2, y0 - N, w, len);
  }
  for (let i = 0; i < c.rustPatches; i++) blob(rand() * N, rand() * N, 10 + rand() * 30, c.rust ?? "140,70,30", 0.12 + rand() * 0.15);
  corrugatedCanvas[look] = cv;
  return cv;
};

// a texture for a surface whose UVs span uFt x vFt feet; salt shifts the tile
// so neighbouring surfaces don't show the same rust in the same place
export const corrugatedTexture = (uFt: number, vFt: number, salt = 0, look: CorrugatedLook = "existing") => {
  const t = new THREE.CanvasTexture(getCorrugatedCanvas(look));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(uFt / CORRUGATED.tileFt, vFt / CORRUGATED.tileFt);
  const r = rng(CORRUGATED_LOOKS[look].seed * 7919 + salt);
  t.offset.set(r(), r());
  return t;
};

// horizontal-slat louver and a sectional door, small canvases
const stripes = (h: number, rows: { y: number; h: number; c: string }[], bg: string) => {
  const cv = document.createElement("canvas");
  cv.width = 8;
  cv.height = h;
  const g = cv.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 8, h);
  for (const r of rows) {
    g.fillStyle = r.c;
    g.fillRect(0, r.y, 8, r.h);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// ---- One shed: gable ends, side walls, overhanging roof ----------------------
const mat = (map: THREE.Texture) => (
  <meshLambertMaterial map={map} side={THREE.DoubleSide} />
);

// Axis-z volumes are built as axis-x ones in a frame turned 90 deg about y
// (local x = -world z, local z = world x).
export const CorrugatedShed: React.FC<{ v: Volume; vent?: boolean; eastDoor?: boolean }> = ({
  v,
  vent,
  eastDoor,
}) => {
  if (v.axis === "x" && v.roof === "shed" && v.high === "b") {
    // high along z[1]: build it high along z[0] in a frame mirrored in z
    const o = v.overhang;
    const mirrored: Volume = {
      ...v,
      high: "a",
      z: [-v.z[1], -v.z[0]],
      overhang: o && { ...o, a: o.b, b: o.a },
    };
    return (
      <group scale={[1, 1, -1]}>
        <ShedX v={mirrored} />
      </group>
    );
  }
  if (v.axis === "x") return <ShedX v={v} vent={vent} eastDoor={eastDoor} />;
  const o = v.overhang;
  const local: Volume = {
    ...v,
    axis: "x",
    x: [-v.z[1], -v.z[0]],
    z: v.x,
    overhang: o && { start: o.end, end: o.start ?? 0, a: o.a, b: o.b },
    opening: v.opening && { ...v.opening, z: [-v.opening.z[1], -v.opening.z[0]] },
  };
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <ShedX v={local} />
    </group>
  );
};

const ShedX: React.FC<{ v: Volume; vent?: boolean; eastDoor?: boolean }> = ({ v, vent, eastDoor }) => {
  const [X0, X1] = v.x;
  const [ZA, ZB] = v.z;
  const zm = (ZA + ZB) / 2;
  const B = v.base;
  const E = v.eave;
  const R = v.ridge;
  const mono = v.roof === "shed"; // single slope: R along ZA, E along ZB
  const o = v.overhang ?? { end: 0, a: 0, b: 0 };
  const os = o.start ?? 0;
  const look = v.look ?? "existing";
  const T = NORTH_SHEDS.roofThick;
  const V = NORTH_SHEDS.vent;
  const salt = [...v.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 0) % 1000;

  const parts = useMemo(() => {
    const tex = (u: number, w: number, k: number, lk: CorrugatedLook = look) => corrugatedTexture(u, w, salt + k, lk);
    // gable end, shape coords (-z, y): rotated +90 deg about y it lands on x
    const gable = (withVent: boolean) => {
      const outline: [number, number][] = mono
        ? [
            [ZA, B],
            [ZB, B],
            [ZB, E],
            [ZA, R],
          ]
        : [
            [ZA, B],
            [ZB, B],
            [ZB, E],
            [zm, R],
            [ZA, E],
          ];
      const s = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(-z, y)));
      if (withVent)
        s.holes.push(
          new THREE.Path(
            (
              [
                [V.z[0], V.y[0]],
                [V.z[0], V.y[1]],
                [V.z[1], V.y[1]],
                [V.z[1], V.y[0]],
              ] as [number, number][]
            ).map(([z, y]) => new THREE.Vector2(-z, y)),
          ),
        );
      // ShapeGeometry UVs are the shape coords, in feet: one tile per tileFt
      return { geo: new THREE.ShapeGeometry(s), tex: tex(1, 1, withVent ? 1 : 2) };
    };
    // one roof plane from (z0, y0) to (z1, y1), its underside on that line
    const plane = (z0: number, y0: number, z1: number, y1: number, k: number, lk: CorrugatedLook = look) => {
      const w = Math.hypot(z1 - z0, y1 - y0);
      const ty = (y1 - y0) / w;
      const tz = (z1 - z0) / w;
      const theta = Math.atan2(-ty, tz);
      let n = new THREE.Vector3(0, tz, -ty);
      if (n.y < 0) n = n.multiplyScalar(-1);
      const L = X1 + o.end - (X0 - os);
      const mid = new THREE.Vector3((X0 - os + X1 + o.end) / 2, (y0 + y1) / 2, (z0 + z1) / 2).addScaledVector(n, T / 2);
      return { L, w, theta, mid, tex: tex(L, w, k, lk) };
    };
    // gable side: from the ridge down past the eave by the overhang
    const side = (zEave: number, over: number, k: number) => {
      const dir = Math.sign(zEave - zm);
      const slope = (R - E) / Math.abs(zm - zEave);
      return plane(zm, R, zEave + dir * over, E - over * slope, k);
    };
    const monoSlope = (R - E) / (ZB - ZA);
    // single slope: a band of another finish along the low eave (v.roofLow)
    const low = v.roofLow;
    const zS = low ? ZB - low.frac * (ZB - ZA) : ZB;
    const yS = low ? E + low.frac * (R - E) : E;
    const monoRoofs = low
      ? [
          plane(ZA - o.a, R + o.a * monoSlope, zS, yS, 3),
          plane(zS, yS, ZB + o.b, E - o.b * monoSlope, 9, low.look),
        ]
      : [plane(ZA - o.a, R + o.a * monoSlope, ZB + o.b, E - o.b * monoSlope, 3)];
    return {
      north: gable(!!vent),
      south: gable(false),
      wallTexA: tex(X1 - X0, (mono ? R : E) - B, 5),
      wallTexB: tex(X1 - X0, E - B, 6),
      roofs: mono ? monoRoofs : [side(ZA, o.a, 3), side(ZB, o.b, 4)],
    };
  }, [X0, X1, ZA, ZB, zm, B, E, R, mono, o.end, os, o.a, o.b, T, V, vent, salt, look, v.roofLow]);

  const D = NORTH_SHEDS.door;
  const louver = useMemo(() => {
    const t = stripes(16, [0, 4, 8, 12].map((y) => ({ y, h: 2, c: "#3a3a38" })), "#8c8a84");
    t.repeat.set(1, (V.y[1] - V.y[0]) / 0.33); // a blade every 4"
    return t;
  }, [V.y]);
  const doorTex = useMemo(
    () => stripes(64, [0, 16, 32, 48].map((y) => ({ y, h: 1, c: "#8f8d86" })), D.color),
    [D.color],
  );

  // open bay in wall A (local x range in .z after the frame turn)
  const op = v.opening;
  const bay = useMemo(() => {
    if (!op) return null;
    const [h0, h1] = op.z;
    const top = op.top;
    const hA = (mono ? R : E) - B;
    const wall = new THREE.Shape(
      ([[X0, B], [X1, B], [X1, B + hA], [X0, B + hA]] as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y)),
    );
    wall.holes.push(
      new THREE.Path(([[h0, B], [h0, top], [h1, top], [h1, B]] as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y))),
    );
    const t = (k: number) => corrugatedTexture(1, 1, salt + k, look);
    return {
      wall: new THREE.ShapeGeometry(wall), // UVs in feet
      wallTex: t(5),
      w: h1 - h0,
      h: top - B,
      xm: (h0 + h1) / 2,
      backTex: corrugatedTexture(h1 - h0, top - B, salt + 7, look),
      jambTex: corrugatedTexture(op.depth, top - B, salt + 8, look),
    };
  }, [op, X0, X1, B, E, R, mono, salt, look]);

  const vw = V.z[1] - V.z[0];
  const vh = V.y[1] - V.y[0];
  const vzc = (V.z[0] + V.z[1]) / 2;
  const vyc = (V.y[0] + V.y[1]) / 2;
  const wallH = E - B;

  return (
    <group>
      {/* gable ends */}
      <mesh geometry={parts.north.geo} position={[X1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {mat(parts.north.tex)}
      </mesh>
      <mesh geometry={parts.south.geo} position={[X0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {mat(parts.south.tex)}
      </mesh>
      {/* side walls */}
      {bay && op ? (
        <group>
          <mesh geometry={bay.wall} position={[0, 0, ZA]}>
            {mat(bay.wallTex)}
          </mesh>
          {/* the bay: back wall, two side walls, soffit */}
          <mesh position={[bay.xm, B + bay.h / 2, ZA + op.depth]}>
            <planeGeometry args={[bay.w, bay.h]} />
            <meshLambertMaterial map={bay.backTex} color="#9a968e" side={THREE.DoubleSide} />
          </mesh>
          {op.z.map((x) => (
            <mesh key={x} position={[x, B + bay.h / 2, ZA + op.depth / 2]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[op.depth, bay.h]} />
              <meshLambertMaterial map={bay.jambTex} color="#b4b0a8" side={THREE.DoubleSide} />
            </mesh>
          ))}
          <mesh position={[bay.xm, op.top, ZA + op.depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bay.w, op.depth]} />
            <meshLambertMaterial color="#6f6b64" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}
      {[
        ...(op ? [] : [{ z: ZA, t: parts.wallTexA, h: (mono ? R : E) - B }]),
        { z: ZB, t: parts.wallTexB, h: wallH },
      ].map(({ z, t, h }) =>
        h > 0 ? (
          <mesh key={z} position={[(X0 + X1) / 2, B + h / 2, z]}>
            <planeGeometry args={[X1 - X0, h]} />
            {mat(t)}
          </mesh>
        ) : null,
      )}
      {/* roof, 8" eaves where v.overhang says */}
      {parts.roofs.map((r, i) => (
        <mesh key={i} position={r.mid} rotation={[r.theta, 0, 0]}>
          <boxGeometry args={[r.L, T, r.w]} />
          {mat(r.tex)}
        </mesh>
      ))}
      {/* ridge cap */}
      {mono ? null : (
        <mesh position={[(X0 - os + X1 + o.end) / 2, R + T, zm]}>
          <boxGeometry args={[X1 + o.end - X0 + os, 0.15, 0.6]} />
          <meshLambertMaterial color={(CORRUGATED_LOOKS[look] as Look).cap ?? (look === "existing" ? "#b9b4a8" : "#4a4946")} />
        </mesh>
      )}
      {vent ? (
        <group>
          {/* louver set back 2", with its reveal */}
          <mesh position={[X1 - V.recess, vyc, vzc]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[vw, vh]} />
            <meshLambertMaterial map={louver} />
          </mesh>
          {[
            { p: [X1 - V.recess / 2, V.y[0], vzc], s: [V.recess, 0.02, vw] },
            { p: [X1 - V.recess / 2, V.y[1], vzc], s: [V.recess, 0.02, vw] },
            { p: [X1 - V.recess / 2, vyc, V.z[0]], s: [V.recess, vh, 0.02] },
            { p: [X1 - V.recess / 2, vyc, V.z[1]], s: [V.recess, vh, 0.02] },
          ].map((b, i) => (
            <mesh key={i} position={b.p as [number, number, number]}>
              <boxGeometry args={b.s as [number, number, number]} />
              <meshLambertMaterial color="#6f6c66" />
            </mesh>
          ))}
        </group>
      ) : null}
      {eastDoor ? (
        <group>
          {/* new sectional overhead door */}
          <mesh position={[(D.x[0] + D.x[1]) / 2, (D.y[0] + D.y[1]) / 2, ZB + 0.04]}>
            <planeGeometry args={[D.x[1] - D.x[0], D.y[1] - D.y[0]]} />
            <meshLambertMaterial map={doorTex} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
