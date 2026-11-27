import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// ---- Tunables (feet, seconds, radians) -------------------------------------
export const NAV = {
  walkSpeed: 30, // ft/s with WASD
  fastMultiplier: 4, // hold Shift
  lookPerPx: 0.0035, // left-drag sensitivity
  zoomStep: 0.18, // each wheel notch moves this fraction of the way to the cursor point
  maxPitch: THREE.MathUtils.degToRad(89),
  levelOneElevation: 100, // drawing elevation of y = 0 (Level 1 = 100'-0")
};

export type View = { name: string; pos: [number, number, number]; look: [number, number, number] };

// Number keys 1..n jump to these. Same building target the review renders use.
export const VIEWS: View[] = [
  { name: "SW aerial", pos: [-79, 150, 154], look: [105, 30, -30] },
  { name: "SE aerial", pos: [289, 150, 154], look: [105, 30, -30] },
  { name: "NE aerial", pos: [289, 150, -214], look: [105, 30, -30] },
  { name: "NW aerial", pos: [-79, 150, -214], look: [105, 30, -30] },
  { name: "Wing roof", pos: [200, 70, 40], look: [150, 24, -20] },
  { name: "Speakeasy", pos: [160, 38, -12], look: [128, 30, -36] },
  { name: "Speakeasy back wall", pos: [140, 44, -35.6], look: [118.4, 29.6, -35.6] },
  { name: "Roof above the Speakeasy (NE)", pos: [152, 96, 14], look: [112, 76, -24] },
  { name: "Sheds from the north", pos: [170, 84, -26], look: [118, 80, -26] },
];

type Readout = (text: string) => void;

const yawPitchFrom = (pos: THREE.Vector3, look: THREE.Vector3) => {
  const d = look.clone().sub(pos).normalize();
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) };
};

// Game-style navigation:
//   W A S D  move (level, like walking)   E / Space up   Q / C down   Shift fast
//   left-drag look around   right-drag orbit the point under the cursor
//   middle-drag pan   wheel zoom toward the cursor   1-6 saved views   R reset
export const FlyControls: React.FC<{ onReadout: Readout }> = ({ onReadout }) => {
  const { camera, gl, scene } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const lastReadout = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    const cam = camera as THREE.PerspectiveCamera;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const apply = () => cam.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    const go = (v: View) => {
      cam.position.set(...v.pos);
      const yp = yawPitchFrom(cam.position, new THREE.Vector3(...v.look));
      yaw.current = yp.yaw;
      pitch.current = yp.pitch;
      apply();
    };
    go(VIEWS[0]);
    // for scripted checks from the browser console: flyTo([x, y, z], [x, y, z])
    (window as unknown as { flyTo: (pos: View["pos"], look: View["look"]) => void }).flyTo = (pos, look) =>
      go({ name: "", pos, look });

    // first model surface under the screen point (grid lines ignored)
    const pick = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray
        .intersectObjects(scene.children, true)
        .find((h) => !(h.object instanceof THREE.LineSegments) && !(h.object instanceof THREE.Line));
      return { hit: hit?.point ?? null, dir: ray.ray.direction.clone() };
    };

    let drag: null | { button: number; x: number; y: number; pivot: THREE.Vector3; dist: number } = null;

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      const { hit } = pick(e.clientX, e.clientY);
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      const pivot = hit ?? cam.position.clone().addScaledVector(fwd, 150);
      drag = { button: e.button, x: e.clientX, y: e.clientY, pivot, dist: pivot.distanceTo(cam.position) };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (drag.button === 0) {
        // look around
        yaw.current -= dx * NAV.lookPerPx;
        pitch.current = THREE.MathUtils.clamp(pitch.current - dy * NAV.lookPerPx, -NAV.maxPitch, NAV.maxPitch);
        apply();
      } else if (drag.button === 2) {
        // orbit around the clicked point: rotate position and view together
        const dYaw = -dx * NAV.lookPerPx;
        const newPitch = THREE.MathUtils.clamp(pitch.current - dy * NAV.lookPerPx, -NAV.maxPitch, NAV.maxPitch);
        const dPitch = newPitch - pitch.current;
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
        const off = cam.position.clone().sub(drag.pivot);
        off.applyAxisAngle(right, dPitch).applyAxisAngle(new THREE.Vector3(0, 1, 0), dYaw);
        cam.position.copy(drag.pivot).add(off);
        yaw.current += dYaw;
        pitch.current = newPitch;
        apply();
      } else if (drag.button === 1) {
        // pan: the grabbed point stays under the cursor
        const ftPerPx = (2 * drag.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / el.clientHeight;
        const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
        cam.position.addScaledVector(right, -dx * ftPerPx).addScaledVector(up, dy * ftPerPx);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { hit, dir } = pick(e.clientX, e.clientY);
      const dist = hit ? hit.distanceTo(cam.position) : 120;
      const notch = Math.sign(e.deltaY);
      // in: move part of the way to the point (never through it); out: back along the same ray
      const step = notch < 0 ? dist * NAV.zoomStep : -dist * NAV.zoomStep / (1 - NAV.zoomStep);
      if (notch < 0 && dist < 1.5) return;
      cam.position.addScaledVector(dir, step);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.type === "keyup") {
        keys.current.delete(e.code);
        return;
      }
      keys.current.add(e.code);
      if (e.code === "Space") e.preventDefault();
      const n = Number(e.key);
      if (n >= 1 && n <= VIEWS.length) go(VIEWS[n - 1]);
      if (e.code === "KeyR") go(VIEWS[0]);
    };
    const clear = () => keys.current.clear();
    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", noMenu);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clear);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clear);
    };
  }, [camera, gl, scene]);

  useFrame((state, dt) => {
    const k = keys.current;
    const step = Math.min(dt, 0.1) * NAV.walkSpeed * (k.has("ShiftLeft") || k.has("ShiftRight") ? NAV.fastMultiplier : 1);
    const fwd = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    const p = state.camera.position;
    if (k.has("KeyW")) p.addScaledVector(fwd, step);
    if (k.has("KeyS")) p.addScaledVector(fwd, -step);
    if (k.has("KeyD")) p.addScaledVector(right, step);
    if (k.has("KeyA")) p.addScaledVector(right, -step);
    if (k.has("KeyE") || k.has("Space")) p.y += step;
    if (k.has("KeyQ") || k.has("KeyC")) p.y -= step;

    if (state.clock.elapsedTime - lastReadout.current > 0.15) {
      lastReadout.current = state.clock.elapsedTime;
      const deg = (THREE.MathUtils.radToDeg(-yaw.current) % 360 + 360) % 360;
      onReadout(
        `x ${p.x.toFixed(1)}  z ${p.z.toFixed(1)}  ·  elev ${(p.y + NAV.levelOneElevation).toFixed(1)}'  ·  heading ${deg.toFixed(0)}°  pitch ${THREE.MathUtils.radToDeg(pitch.current).toFixed(0)}°`,
      );
    }
  });

  return null;
};
