import { Canvas } from "@react-three/fiber";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Building } from "../src/flyover/Building";
import { CUTS } from "../src/flyover/geometry";
import type { CutKey, FacadeTextures } from "../src/flyover/useFacadeTextures";
import { ExportGlb } from "./ExportGlb";
import { FlyControls, VIEWS } from "./FlyControls";

// Same look as the Remotion scene (Flyover.tsx)
const PAPER_GROUND = "#efede7";
const GRID_LINE = "#cfcbc0";

const useTextures = () => {
  const [textures, setTextures] = useState<FacadeTextures | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const keys = Object.keys(CUTS) as CutKey[];
    Promise.all(keys.map((k) => loader.loadAsync("/" + CUTS[k].file)))
      .then((list) => {
        const out = {} as FacadeTextures;
        list.forEach((t, i) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          out[keys[i]] = t;
        });
        setTextures(out);
      })
      .catch((e) => setError(String(e)));
  }, []);
  return { textures, error };
};

const HELP = [
  ["W A S D", "move"],
  ["E / Space", "up"],
  ["Q / C", "down"],
  ["Shift", "fast"],
  ["Left-drag", "look around"],
  ["Right-drag", "orbit what you clicked"],
  ["Middle-drag", "pan"],
  ["Wheel", "zoom toward the cursor"],
  ["1–" + VIEWS.length, VIEWS.map((v, i) => `${i + 1} ${v.name}`).join(" · ")],
  ["R", "reset"],
  ["H", "hide this panel"],
];

const panel: React.CSSProperties = {
  position: "absolute",
  background: "rgba(29, 31, 34, 0.78)",
  color: "#f4f1ea",
  borderRadius: 6,
  padding: "10px 14px",
  fontSize: 13,
  pointerEvents: "none",
};

const App: React.FC = () => {
  const { textures, error } = useTextures();
  const readout = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(true);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.code === "KeyH" && setHelp((h) => !h);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (error) return <div style={{ padding: 24 }}>Could not load facade drawings: {error}</div>;
  if (!textures) return <div style={{ padding: 24 }}>Loading facade drawings…</div>;
  return (
    <>
      <Canvas
        camera={{ fov: 50, near: 0.5, far: 6000 }}
        gl={{ antialias: true }}
        linear={false}
        style={{ position: "absolute", inset: 0 }}
      >
        <fog attach="fog" args={[PAPER_GROUND, 700, 1900]} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[-200, 400, 300]} intensity={1.4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[110, -1.2, -30]}>
          <planeGeometry args={[4000, 4000]} />
          <meshBasicMaterial color={PAPER_GROUND} />
        </mesh>
        <gridHelper args={[1200, 60, GRID_LINE, GRID_LINE]} position={[110, -1.1, -30]} />
        <ExportGlb>
          <Building textures={textures} />
        </ExportGlb>
        <FlyControls onReadout={(t) => readout.current && (readout.current.textContent = t)} />
      </Canvas>
      <div ref={readout} style={{ ...panel, left: 16, bottom: 16, fontVariantNumeric: "tabular-nums" }} />
      {help ? (
        <div style={{ ...panel, left: 16, top: 16, lineHeight: 1.55 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Graffiti Mill · Explore</div>
          {HELP.map(([key, what]) => (
            <div key={key}>
              <b style={{ display: "inline-block", minWidth: 96 }}>{key}</b>
              {what}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
