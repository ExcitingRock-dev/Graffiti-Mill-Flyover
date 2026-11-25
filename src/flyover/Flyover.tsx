import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { Building } from "./Building";
import { reviewCamera } from "./reviewPath";
import { useFacadeTextures } from "./useFacadeTextures";

// ---- Tunable camera path (feet / degrees). Angle 90 = looking from true east,
// 180 = from true south. Camera descends while orbiting from SW-high to E-eye-level.
export const CAMERA = {
  startAngle: 235,
  endAngle: 72,
  startRadius: 560,
  endRadius: 235,
  startHeight: 420,
  endHeight: 22,
  startTarget: [110, 20, -30] as [number, number, number],
  endTarget: [104, 38, -8] as [number, number, number],
  fov: 38,
};

const SKY_TOP = "#dfe4e8";
const PAPER_GROUND = "#efede7";
const GRID_LINE = "#cfcbc0";

// mode "review": every-side orbit + detail passes (reviewPath.ts)
// mode "cinematic": the original 15 s descending orbit (CAMERA above)
// checkAngle: fixed review camera (degrees, 90 = from true east)
const CameraRig: React.FC<{ checkAngle?: number; mode: FlyoverMode }> = ({
  checkAngle,
  mode,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const review = mode === "review" && checkAngle === undefined;
  const rc = reviewCamera(frame);
  useLayoutEffect(() => {
    if (!review) return;
    camera.fov = CAMERA.fov;
    camera.near = 1;
    camera.far = 6000;
    camera.position.copy(rc.pos);
    camera.lookAt(rc.look);
    camera.updateProjectionMatrix();
  }, [camera, review, rc.pos, rc.look]);

  const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Height drops faster early so the end is a long, low glide
  const tH = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const check = checkAngle !== undefined;
  const angle = THREE.MathUtils.degToRad(
    check ? checkAngle : lerp(CAMERA.startAngle, CAMERA.endAngle, t),
  );
  const radius = check ? 260 : lerp(CAMERA.startRadius, CAMERA.endRadius, t);
  const height = check ? 150 : lerp(CAMERA.startHeight, CAMERA.endHeight, tH);
  const target = (
    check
      ? [105, 30, -30]
      : CAMERA.startTarget.map((v, i) => lerp(v, CAMERA.endTarget[i], t))
  ) as [number, number, number];

  useLayoutEffect(() => {
    if (review) return;
    camera.fov = CAMERA.fov;
    camera.near = 1;
    camera.far = 6000;
    camera.position.set(
      target[0] + radius * Math.cos(angle),
      height,
      target[2] + radius * Math.sin(angle),
    );
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, review, angle, radius, height, target]);

  return null;
};

const Ground: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[110, -1.2, -30]}>
      <planeGeometry args={[4000, 4000]} />
      <meshBasicMaterial color={PAPER_GROUND} />
    </mesh>
    {/* 20 ft drafting grid, centered on the building */}
    <gridHelper
      args={[1200, 60, GRID_LINE, GRID_LINE]}
      position={[110, -1.1, -30]}
    />
  </group>
);

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const start = durationInFrames - 4 * fps;
  const opacity = interpolate(frame, [start, start + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [start, start + 30], [24, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        padding: "0 96px 88px",
        fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
        color: "#1d1f22",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -1 }}>
        Graffiti Mill
      </div>
      <div style={{ fontSize: 34, fontWeight: 400, marginTop: 6 }}>
        East Building · 303 Thomas Ave N, Minneapolis
      </div>
    </AbsoluteFill>
  );
};

// Review caption: which side / detail is on screen, plus the frame number
const ReviewCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { label } = reviewCamera(frame);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 48,
          top: 40,
          padding: "10px 18px",
          background: "rgba(29, 31, 34, 0.78)",
          color: "#f4f1ea",
          fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
          fontSize: 30,
          borderRadius: 6,
        }}
      >
        {label}
        <span style={{ opacity: 0.6, marginLeft: 18, fontSize: 24 }}>
          {(frame / fps).toFixed(1)}s · f{frame}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export type FlyoverMode = "review" | "cinematic";
export type FlyoverProps = { checkAngle?: number; mode?: FlyoverMode };

export const Flyover: React.FC<FlyoverProps> = ({
  checkAngle,
  mode = "cinematic",
}) => {
  const { width, height } = useVideoConfig();
  const textures = useFacadeTextures();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${SKY_TOP}, ${PAPER_GROUND})`,
        translate: "-339.3px -8.3px"
      }}
    >
      {textures ? (
        <ThreeCanvas
          width={width}
          height={height}
          linear={false}
          gl={{ antialias: true }}
        >
          <fog attach="fog" args={[PAPER_GROUND, 700, 1900]} />
          <ambientLight intensity={1.6} />
          <directionalLight position={[-200, 400, 300]} intensity={1.4} />
          <CameraRig checkAngle={checkAngle} mode={mode} />
          <Ground />
          <Building textures={textures} />
        </ThreeCanvas>
      ) : null}
      {mode === "review" && checkAngle === undefined ? (
        <ReviewCaption />
      ) : (
        <TitleCard />
      )}
    </AbsoluteFill>
  );
};
