import { useMemo } from "react";
import * as THREE from "three";
import { CUTS, FACE_TONE, PANELS, PX_PER_FT, Panel } from "./geometry";
import { Massing } from "./Massing";
import type { FacadeTextures } from "./useFacadeTextures";

// outward direction (x, z) of each face: a panel is pushed proud along its wall
// normal on this side (a plan-center test fails for walls like the stair
// tower's north face, which lies south of the building's middle)
const FACE_OUT: Record<Panel["face"], [number, number]> = {
  east: [0, 1],
  west: [0, -1],
  north: [1, 0],
  south: [-1, 0],
};

// One elevation crop mapped onto a wall segment from panel.a to panel.b
const FacadePanel: React.FC<{ panel: Panel; base: THREE.Texture }> = ({
  panel,
  base,
}) => {
  const cut = CUTS[panel.cut];
  const { texture, width, height, position, rotationY } = useMemo(() => {
    const [sx0, sx1] = panel.sx;
    const [sy0, sy1] = panel.sy;
    const t = base.clone();
    const u0 = (sx0 - cut.x) / cut.w;
    const u1 = (sx1 - cut.x) / cut.w;
    const vTop = (sy0 - cut.y) / cut.h;
    const vBot = (sy1 - cut.y) / cut.h;
    t.repeat.set(u1 - u0, vBot - vTop);
    t.offset.set(u0, 1 - vBot);
    t.needsUpdate = true;

    const [ax, az] = panel.a;
    const [bx, bz] = panel.b;
    const [yTop, yBot] = panel.y ?? [(panel.l1 - sy0) / PX_PER_FT, (panel.l1 - sy1) / PX_PER_FT];
    const len = Math.hypot(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    // push the drawing 0.15 ft outward (away from the building) so it sits proud of the core
    let nx = (bz - az) / len;
    let nz = -(bx - ax) / len;
    const [fx, fz] = FACE_OUT[panel.face];
    if (nx * fx + nz * fz < 0) {
      nx = -nx;
      nz = -nz;
    }
    return {
      texture: t,
      width: len,
      height: yTop - yBot,
      position: [mx + nx * 0.15, (yTop + yBot) / 2, mz + nz * 0.15] as [
        number,
        number,
        number,
      ],
      rotationY: Math.atan2(-(bz - az), bx - ax),
    };
  }, [base, cut, panel]);

  const tone = FACE_TONE[panel.face];
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.5}
        side={THREE.DoubleSide}
        color={new THREE.Color(tone, tone, tone)}
      />
    </mesh>
  );
};

export const Building: React.FC<{ textures: FacadeTextures }> = ({
  textures,
}) => (
  <group>
    <Massing />
    {PANELS.map((p) => (
      <FacadePanel key={p.name} panel={p} base={textures[p.cut]} />
    ))}
  </group>
);
