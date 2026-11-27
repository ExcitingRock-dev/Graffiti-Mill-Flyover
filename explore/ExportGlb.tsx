import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Exports the model (whatever is inside this group) as one binary glTF (.glb)
// for Blender. Run from the page: `await window.exportGlb()`. The file is sent
// to the explorer's own dev server, which writes it to out/graffiti-mill.glb
// (see the save plugin in vite.config.ts). Units stay in feet, y up.
export const ExportGlb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const w = window as unknown as { exportGlb?: () => Promise<string> };
    w.exportGlb = async () => {
      if (!group.current) throw new Error("model not mounted");
      const glb = (await new GLTFExporter().parseAsync(group.current, {
        binary: true,
        onlyVisible: true,
        maxTextureSize: 4096,
      })) as ArrayBuffer;
      const r = await fetch("/__save-glb", { method: "POST", body: glb });
      if (!r.ok) throw new Error(await r.text());
      return r.text();
    };
    return () => {
      delete w.exportGlb;
    };
  }, []);
  return (
    <group ref={group} name="GraffitiMill">
      {children}
    </group>
  );
};
