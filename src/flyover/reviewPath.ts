// Model-review camera path: a full orbit to see every side, then slow passes
// over the Plan East Elevation (true north, grid 13) and the low wing roof.
// World units are FEET (see plan.ts). x = true north, z = true east, y = up.
// Each key is a camera position and the point it looks at; the camera glides
// through them on a smooth curve. Edit freely: add, move or retime keys.
import * as THREE from "three";

export type V3 = [number, number, number];
export type ReviewKey = {
  frame: number;
  pos: V3;
  look: V3;
  label?: string; // on-screen caption from this key on
};

// Orbit helper: angle in degrees, 0 = from true north, 90 = from true east
const CENTER: V3 = [110, 30, -28];
const orbit = (deg: number, radius: number, height: number): V3 => {
  const a = THREE.MathUtils.degToRad(deg);
  return [
    CENTER[0] + radius * Math.cos(a),
    height,
    CENTER[2] + radius * Math.sin(a),
  ];
};

export const REVIEW = {
  fps: 30,
  // seconds per 45 degrees of orbit
  orbitStep: 2.6,
};

const s = (sec: number) => Math.round(sec * REVIEW.fps);
const step = REVIEW.orbitStep;

export const REVIEW_KEYS: ReviewKey[] = [
  // ---- Part 1: full orbit, every side (starts NE, turns through E, S, W, N)
  { frame: s(0), pos: orbit(45, 380, 200), look: CENTER, label: "Orbit · northeast" },
  { frame: s(step * 1), pos: orbit(90, 330, 120), look: CENTER, label: "True east · A403" },
  { frame: s(step * 2), pos: orbit(135, 330, 130), look: CENTER, label: "Southeast" },
  { frame: s(step * 3), pos: orbit(180, 320, 100), look: CENTER, label: "True south · A402" },
  { frame: s(step * 4), pos: orbit(225, 340, 140), look: CENTER, label: "Southwest" },
  { frame: s(step * 5), pos: orbit(270, 340, 110), look: CENTER, label: "True west · A401" },
  { frame: s(step * 6), pos: orbit(315, 340, 140), look: CENTER, label: "Northwest" },
  { frame: s(step * 7), pos: orbit(360, 330, 110), look: CENTER, label: "True north" },
  // ---- Part 2: Plan East Elevation (true north), eye level, slow truck
  {
    frame: s(step * 7 + 3),
    pos: [320, 20, -14],
    look: [202, 18, -30],
    label: "Plan East Elevation (true north) · 2/402",
  },
  { frame: s(step * 7 + 7), pos: [300, 22, -60], look: [202, 20, -36] },
  // NW corner: oblique west wall, corner pier and the corner stairs
  {
    frame: s(step * 7 + 10.5),
    pos: [262, 34, -118],
    look: [196, 26, -52],
    label: "Northwest corner · stairs",
  },
  // ---- Part 3: up and over the low wing roof
  {
    frame: s(step * 7 + 14),
    pos: [250, 78, -40],
    look: [168, 24, -30],
    label: "Low roof · wing (124')",
  },
  { frame: s(step * 7 + 18), pos: [200, 62, 34], look: [160, 24, -34] },
  { frame: s(step * 7 + 22), pos: [150, 58, -112], look: [168, 24, -30] },
  // main building north face above the low roof (grid 9) and the vestibule
  {
    frame: s(step * 7 + 26),
    pos: [205, 50, -18],
    look: [118, 46, -34],
    label: "Grid 9 north face above the low roof",
  },
  { frame: s(step * 7 + 29), pos: [198, 46, -38], look: [118, 44, -34] },
];

export const REVIEW_DURATION = REVIEW_KEYS[REVIEW_KEYS.length - 1].frame + 1;

// Smooth curves through the keys; frame -> curve parameter is piecewise linear
// so each key is reached at its frame.
const posCurve = new THREE.CatmullRomCurve3(
  REVIEW_KEYS.map((k) => new THREE.Vector3(...k.pos)),
  false,
  "centripetal",
);
const lookCurve = new THREE.CatmullRomCurve3(
  REVIEW_KEYS.map((k) => new THREE.Vector3(...k.look)),
  false,
  "centripetal",
);

const easeInOut = (t: number) => t * t * (3 - 2 * t);

export const reviewCamera = (frame: number) => {
  const n = REVIEW_KEYS.length;
  const last = REVIEW_KEYS[n - 1].frame;
  // gentle ease at the very start and end only
  const f = Math.min(Math.max(frame, 0), last);
  let i = 0;
  while (i < n - 2 && f > REVIEW_KEYS[i + 1].frame) i++;
  const a = REVIEW_KEYS[i];
  const b = REVIEW_KEYS[i + 1];
  let local = (f - a.frame) / Math.max(1, b.frame - a.frame);
  if (n === 2) local = easeInOut(local);
  else if (i === 0) local = local * local; // ease in
  else if (i === n - 2) local = 1 - (1 - local) * (1 - local); // ease out
  const u = (i + local) / (n - 1);
  let label = REVIEW_KEYS[0].label ?? "";
  for (const k of REVIEW_KEYS) if (k.label && k.frame <= f) label = k.label;
  return {
    pos: posCurve.getPoint(u),
    look: lookCurve.getPoint(u),
    label,
  };
};
