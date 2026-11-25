import { useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import * as THREE from "three";
import { CUTS } from "./geometry";

export type CutKey = keyof typeof CUTS;
export type FacadeTextures = Record<CutKey, THREE.Texture>;

// Load all facade drawings BEFORE the ThreeCanvas mounts. Remotion only
// redraws the canvas on frame changes, so textures must exist on first draw.
export const useFacadeTextures = () => {
  const [textures, setTextures] = useState<FacadeTextures | null>(null);
  const [handle] = useState(() => delayRender("Loading facade drawings"));

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const keys = Object.keys(CUTS) as CutKey[];
    Promise.all(keys.map((k) => loader.loadAsync(staticFile(CUTS[k].file))))
      .then((list) => {
        const out = {} as FacadeTextures;
        list.forEach((t, i) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          out[keys[i]] = t;
        });
        setTextures(out);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);

  return textures;
};
