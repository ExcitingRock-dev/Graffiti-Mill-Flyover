import * as THREE from "three";

// Precast concrete for 3D faces, matched to the colorized elevations' precast
// (mean rgb 177/176/171, soft mottling, sparse dark speckle). UVs in feet.
export const CONCRETE = {
  tileFt: 16,
  pxPerFt: 32,
};
type Look = { base: [number, number, number]; mottles: number; mottleAlpha: number; speckles: number; seed: number };
// wall = the New Precast Structure's walls; roof = lighter, calmer, like the
// light precast with sparse speckle on the main block's west face (Collin 2026-11-26)
export const CONCRETE_LOOKS = {
  wall: { base: [184, 183, 178], mottles: 420, mottleAlpha: 1, speckles: 2600, seed: 3 },
  roof: { base: [206, 205, 200], mottles: 260, mottleAlpha: 0.6, speckles: 1500, seed: 4 },
} satisfies Record<string, Look>;
export type ConcreteLook = keyof typeof CONCRETE_LOOKS;

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

const canvases: Partial<Record<ConcreteLook, HTMLCanvasElement>> = {};
const getCanvas = (look: ConcreteLook) => {
  const cached = canvases[look];
  if (cached) return cached;
  const c = { ...CONCRETE, ...(CONCRETE_LOOKS[look] as Look) };
  const N = c.tileFt * c.pxPerFt;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d")!;
  const rand = rng(c.seed);
  g.fillStyle = `rgb(${c.base.join(",")})`;
  g.fillRect(0, 0, N, N);
  // drawn at the tile's edges too, so it repeats without seams
  const wrapped = (x: number, y: number, r: number, draw: (x: number, y: number) => void) => {
    for (const dx of [-N, 0, N])
      for (const dy of [-N, 0, N]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx + r < 0 || cx - r > N || cy + r < 0 || cy - r > N) continue;
        draw(cx, cy);
      }
  };
  for (let i = 0; i < c.mottles; i++) {
    const r = 6 + rand() * 26;
    const v = rand() < 0.5 ? "90,88,82" : "235,233,228";
    const a = (0.025 + rand() * 0.035) * c.mottleAlpha;
    wrapped(rand() * N, rand() * N, r, (x, y) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${v},${a})`);
      grad.addColorStop(1, `rgba(${v},0)`);
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    });
  }
  for (let i = 0; i < c.speckles; i++) {
    const s = rand() < 0.85 ? 1 : 2;
    g.fillStyle = `rgba(80,78,74,${0.25 + rand() * 0.4})`;
    wrapped(rand() * N, rand() * N, s, (x, y) => g.fillRect(x, y, s, s));
  }
  canvases[look] = cv;
  return cv;
};

export const concreteTexture = (look: ConcreteLook = "wall") => {
  const t = new THREE.CanvasTexture(getCanvas(look));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / CONCRETE.tileFt, 1 / CONCRETE.tileFt);
  return t;
};
