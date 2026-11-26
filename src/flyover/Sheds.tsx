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
  base: [230, 226, 214] as [number, number, number], // off-white
  ribShade: 0.11, // light/dark swing across one corrugation
  rustStreaks: 34,
  rustPatches: 10,
  seed: 5,
};

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

let corrugatedCanvas: HTMLCanvasElement | null = null;
const getCorrugatedCanvas = () => {
  if (corrugatedCanvas) return corrugatedCanvas;
  const c = CORRUGATED;
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
  for (let i = 0; i < 40; i++) blob(rand() * N, rand() * N, 40 + rand() * 160, "120,115,105", 0.05 + rand() * 0.06);
  // rust: streaks run down the sheet from fasteners / laps, a few patches
  for (let i = 0; i < c.rustStreaks; i++) {
    const x = Math.floor((rand() * N) / period) * period + period * (0.3 + rand() * 0.4);
    const y0 = rand() * N;
    const len = 60 + rand() * 420;
    const w = 2 + rand() * 5;
    const grad = g.createLinearGradient(0, y0, 0, y0 + len);
    const a = 0.12 + rand() * 0.25;
    grad.addColorStop(0, `rgba(150,80,35,${a})`);
    grad.addColorStop(1, "rgba(150,80,35,0)");
    g.fillStyle = grad;
    g.fillRect(x - w / 2, y0, w, len);
    // wrap the streak so the tile stays seamless top to bottom
    if (y0 + len > N) g.fillRect(x - w / 2, y0 - N, w, len);
  }
  for (let i = 0; i < c.rustPatches; i++) blob(rand() * N, rand() * N, 10 + rand() * 30, "140,70,30", 0.12 + rand() * 0.15);
  corrugatedCanvas = cv;
  return cv;
};

// a texture for a surface whose UVs span uFt x vFt feet; salt shifts the tile
// so neighbouring surfaces don't show the same rust in the same place
export const corrugatedTexture = (uFt: number, vFt: number, salt = 0) => {
  const t = new THREE.CanvasTexture(getCorrugatedCanvas());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(uFt / CORRUGATED.tileFt, vFt / CORRUGATED.tileFt);
  const r = rng(CORRUGATED.seed * 7919 + salt);
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

export const CorrugatedShed: React.FC<{ v: Volume; vent?: boolean; eastDoor?: boolean }> = ({
  v,
  vent,
  eastDoor,
}) => {
  const [X0, X1] = v.x;
  const [ZA, ZB] = v.z;
  const zm = (ZA + ZB) / 2;
  const B = v.base;
  const E = v.eave;
  const R = v.ridge;
  const o = v.overhang ?? { end: 0, a: 0, b: 0 };
  const T = NORTH_SHEDS.roofThick;
  const V = NORTH_SHEDS.vent;
  const salt = [...v.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 0) % 1000;

  const parts = useMemo(() => {
    // gable end, shape coords (-z, y): rotated +90 deg about y it lands on x
    const gable = (withVent: boolean) => {
      const s = new THREE.Shape(
        (
          [
            [ZA, B],
            [ZB, B],
            [ZB, E],
            [zm, R],
            [ZA, E],
          ] as [number, number][]
        ).map(([z, y]) => new THREE.Vector2(-z, y)),
      );
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
      return { geo: new THREE.ShapeGeometry(s), tex: corrugatedTexture(1, 1, salt + (withVent ? 1 : 2)) };
    };
    // roof side from the ridge down past the eave by the overhang
    const side = (zEave: number, over: number) => {
      const dir = Math.sign(zEave - zm); // toward the eave
      const slope = (R - E) / Math.abs(zm - zEave);
      const zEdge = zEave + dir * over;
      const yEdge = E - over * slope;
      const w = Math.hypot(zEdge - zm, yEdge - R);
      const ty = (yEdge - R) / w;
      const tz = (zEdge - zm) / w;
      const theta = Math.atan2(-ty, tz);
      let n = new THREE.Vector3(0, tz, -ty);
      if (n.y < 0) n = n.multiplyScalar(-1);
      const L = X1 + o.end - X0;
      const mid = new THREE.Vector3((X0 + X1 + o.end) / 2, (R + yEdge) / 2, (zm + zEdge) / 2).addScaledVector(n, T / 2);
      return { L, w, theta, mid, tex: corrugatedTexture(L, w, salt + (dir < 0 ? 3 : 4)) };
    };
    return {
      north: gable(!!vent),
      south: gable(false),
      wallTexA: corrugatedTexture(X1 - X0, E - B, salt + 5),
      wallTexB: corrugatedTexture(X1 - X0, E - B, salt + 6),
      roofA: side(ZA, o.a),
      roofB: side(ZB, o.b),
    };
  }, [X0, X1, ZA, ZB, zm, B, E, R, o.end, o.a, o.b, T, V, vent, salt]);

  const D = NORTH_SHEDS.door;
  const G = NORTH_SHEDS.glazing;
  const louver = useMemo(() => {
    const t = stripes(16, [0, 4, 8, 12].map((y) => ({ y, h: 2, c: "#3a3a38" })), "#8c8a84");
    t.repeat.set(1, (V.y[1] - V.y[0]) / 0.33); // a blade every 4"
    return t;
  }, [V.y]);
  const doorTex = useMemo(
    () => stripes(64, [0, 16, 32, 48].map((y) => ({ y, h: 1, c: "#8f8d86" })), D.color),
    [D.color],
  );

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
      {[
        { z: ZA, t: parts.wallTexA },
        { z: ZB, t: parts.wallTexB },
      ].map(({ z, t }) => (
        <mesh key={z} position={[(X0 + X1) / 2, (B + E) / 2, z]}>
          <planeGeometry args={[X1 - X0, wallH]} />
          {mat(t)}
        </mesh>
      ))}
      {/* roof, 12" eaves where v.overhang says */}
      {[parts.roofA, parts.roofB].map((r, i) => (
        <mesh key={i} position={r.mid} rotation={[r.theta, 0, 0]}>
          <boxGeometry args={[r.L, T, r.w]} />
          {mat(r.tex)}
        </mesh>
      ))}
      {/* ridge cap */}
      <mesh position={[(X0 + X1 + o.end) / 2, R + T, zm]}>
        <boxGeometry args={[X1 + o.end - X0, 0.15, 0.6]} />
        <meshLambertMaterial color="#b9b4a8" />
      </mesh>
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
          {/* new glazed enclosure in the existing steel frame */}
          <mesh position={[(G.x[0] + G.x[1]) / 2, (G.y[0] + G.y[1]) / 2, ZB + 0.03]}>
            <planeGeometry args={[G.x[1] - G.x[0], G.y[1] - G.y[0]]} />
            <meshBasicMaterial color="#f2c48a" />
          </mesh>
          {Array.from({ length: G.bays + 1 }, (_, k) => G.x[0] + ((G.x[1] - G.x[0]) * k) / G.bays).map((x) => (
            <mesh key={x} position={[x, (G.y[0] + G.y[1]) / 2, ZB + 0.08]}>
              <boxGeometry args={[0.3, G.y[1] - G.y[0], 0.1]} />
              <meshLambertMaterial color="#1c1b1a" />
            </mesh>
          ))}
          <mesh position={[(G.x[0] + G.x[1]) / 2, G.y[1], ZB + 0.08]}>
            <boxGeometry args={[G.x[1] - G.x[0] + 0.3, 0.3, 0.1]} />
            <meshLambertMaterial color="#1c1b1a" />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
