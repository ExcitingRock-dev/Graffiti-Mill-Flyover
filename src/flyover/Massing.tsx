import { useMemo } from "react";
import * as THREE from "three";
import {
  CONCRETE_ROOF,
  DECKS,
  FLAT_ROOF,
  FRAME,
  ENTRY_VESTIBULE,
  Flight,
  FrameEdge,
  TOWER_OPEN,
  HEAD_HOUSE,
  MAIN,
  RAMP_RAILS,
  RINGS,
  RTUS,
  LIGHT_WELL,
  LIGHT_WELL_POLY,
  WING_ROOF,
  NORTH_STAIR_GAP,
  GX,
  STAIR,
  STAIR_LANDINGS,
  STAIRS,
  TOWER,
  VESTIBULE,
  Volume,
  PIERS,
  WING_POLY,
  XZ,
} from "./plan";

// ---- Palette (matches tools/colorize.mjs) ----------------------------------
export const C = {
  brick: "#d8c49a",
  metal: "#2a2622",
  precast: "#b2b1ac", // grey precast, matches the facade precast texture
  concrete: "#bebdb8",
  roof: "#a9a7a1",
  deck: "#c9c4b8",
  frame: "#d9d6cf",
  rail: "#1c1b1a",
  glass: "#f2c48a",
  line: "#3a3733",
  lineOnDark: "#5a544c",
};

// Thin drawing-style outline on every solid
const Outline: React.FC<{ geometry: THREE.BufferGeometry; color?: string }> = ({
  geometry,
  color = C.line,
}) => {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(geometry, 25),
    [geometry],
  );
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
};

const Solid: React.FC<{
  geometry: THREE.BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lineColor?: string;
  opacity?: number;
}> = ({ geometry, color, position, rotation, lineColor, opacity }) => (
  <group position={position} rotation={rotation}>
    <mesh geometry={geometry}>
      <meshLambertMaterial
        color={color}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
        side={THREE.DoubleSide}
      />
    </mesh>
    <Outline geometry={geometry} color={lineColor} />
  </group>
);

export const BoxXYZ: React.FC<{
  x: [number, number];
  y: [number, number];
  z: [number, number];
  color: string;
  lineColor?: string;
  opacity?: number;
}> = ({ x, y, z, color, lineColor, opacity }) => {
  const geo = useMemo(
    () => new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]),
    [x, y, z],
  );
  return (
    <Solid
      geometry={geo}
      color={color}
      lineColor={lineColor}
      opacity={opacity}
      position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]}
    />
  );
};

// Extrude a plan polygon (x,z) between two heights
const Prism: React.FC<{
  poly: XZ[];
  y0: number;
  y1: number;
  color: string;
  lineColor?: string;
  holes?: XZ[][];
}> = ({ poly, y0, y1, color, lineColor, holes }) => {
  const geo = useMemo(() => {
    // shape in (x, -z); extrude along +local z, then rotate -90deg about x so local z -> +y
    const s = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of holes ?? [])
      s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    return new THREE.ExtrudeGeometry(s, {
      depth: y1 - y0,
      bevelEnabled: false,
    });
  }, [poly, y0, y1, holes]);
  return (
    <Solid
      geometry={geo}
      color={color}
      lineColor={lineColor}
      position={[0, y0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
};

// Gable (or flat) volume
const GableVolume: React.FC<{ v: Volume }> = ({ v }) => {
  const color = v.mat === "metal" ? C.metal : C.precast;
  const lineColor = v.mat === "metal" ? C.lineOnDark : C.line;
  const geo = useMemo(() => {
    const along = v.axis === "x" ? v.x : v.z; // extrusion direction
    const across = v.axis === "x" ? v.z : v.x; // gable profile direction
    const [a0, a1] = across;
    const mid = (a0 + a1) / 2;
    // profile in (u, y); for axis x, u = -z so extrusion maps correctly
    const u = (val: number) => (v.axis === "x" ? -val : val);
    const pts: [number, number][] = [
      [u(a0), v.base],
      [u(a1), v.base],
      [u(a1), v.eave],
      ...(v.ridge > v.eave ? ([[u(mid), v.ridge]] as [number, number][]) : []),
      [u(a0), v.eave],
    ];
    const s = new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(px, py)));
    const g = new THREE.ExtrudeGeometry(s, {
      depth: along[1] - along[0],
      bevelEnabled: false,
    });
    return g;
  }, [v]);
  // axis x: rotate +90 about y (local z -> world x, local x -> world -z)
  if (v.axis === "x") {
    return (
      <Solid
        geometry={geo}
        color={color}
        lineColor={lineColor}
        position={[v.x[0], 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    );
  }
  return (
    <Solid
      geometry={geo}
      color={color}
      lineColor={lineColor}
      position={[0, 0, v.z[0]]}
    />
  );
};

const Slab: React.FC<{ poly: XZ[]; y: number; t?: number; color: string }> = ({
  poly,
  y,
  t = 1,
  color,
}) => <Prism poly={poly} y0={y - t} y1={y} color={color} />;

// Welded-wire mesh infill, as drawn on the 402 elevations: one tile = 1 ft of
// guard, two pickets per foot, a mid rail. Transparent between wires.
const MESH = {
  picketsPerFt: 4,
  wire: 0.4, // wire share of a picket spacing (axons read nearly solid black)
  hRails: [0.5], // intermediate rails, as fraction of height
};
let meshTexture: THREE.CanvasTexture | null = null;
const getMeshTexture = () => {
  if (meshTexture) return meshTexture;
  const W = 64;
  const H = 128;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#000";
  const step = W / MESH.picketsPerFt;
  const ww = Math.max(2, Math.round(step * MESH.wire));
  for (let x = 0; x < W; x += step) g.fillRect(x, 0, ww, H);
  for (const f of MESH.hRails) g.fillRect(0, Math.round(H * f) - 2, W, 4);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  meshTexture = t;
  return t;
};

const MeshPanel: React.FC<{ len: number; h: number }> = ({ len, h }) => {
  const tex = useMemo(() => {
    const t = getMeshTexture().clone();
    t.repeat.set(len, 1);
    t.needsUpdate = true;
    return t;
  }, [len]);
  const posts = Math.max(2, Math.ceil(len / 6) + 1);
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <planeGeometry args={[len, h]} />
        <meshBasicMaterial
          map={tex}
          color={C.rail}
          transparent
          alphaTest={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* bottom rail */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[len, 0.3, 0.2]} />
        <meshLambertMaterial color={C.rail} />
      </mesh>
      {/* posts every ~6 ft */}
      {Array.from({ length: posts }).map((_, k) => (
        <mesh
          key={k}
          position={[-len / 2 + (len * k) / (posts - 1), h / 2, 0]}
        >
          <boxGeometry args={[0.2, h, 0.2]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      ))}
    </group>
  );
};

// Horizontal steel slat guard (wing roof, 4/G160 NE axon): flat bars with open
// gaps, so the brick parapet behind shows through. Posts every ~6 ft.
export const SLAT = { pitch: 0.4, depth: 0.12, thick: 0.06 };
const SlatPanel: React.FC<{ len: number; h: number }> = ({ len, h }) => {
  const n = Math.floor((h - 0.3) / SLAT.pitch);
  const posts = Math.max(2, Math.ceil(len / 6) + 1);
  return (
    <group>
      {Array.from({ length: n }, (_, k) => (
        <mesh key={k} position={[0, 0.25 + k * SLAT.pitch, 0]}>
          <boxGeometry args={[len, SLAT.depth, SLAT.thick]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      ))}
      {Array.from({ length: posts }, (_, k) => (
        <mesh key={'p' + k} position={[-len / 2 + (len * k) / (posts - 1), h / 2, 0]}>
          <boxGeometry args={[0.2, h, 0.2]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      ))}
    </group>
  );
};

// Guardrail along a path. "panel" = black welded-mesh guard (axons, 402), "rail" = pipe rail,
// "slats" = horizontal slat guard.
export const Railing: React.FC<{
  path: XZ[];
  y: number;
  h?: number;
  kind?: "panel" | "rail" | "slats";
}> = ({ path, y, h = 3.5, kind = "panel" }) => {
  const segs = useMemo(() => {
    const out: { cx: number; cz: number; len: number; rot: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      out.push({
        cx: (ax + bx) / 2,
        cz: (az + bz) / 2,
        len,
        rot: Math.atan2(-(bz - az), bx - ax),
      });
    }
    return out;
  }, [path]);
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={[s.cx, y, s.cz]} rotation={[0, s.rot, 0]}>
          {kind === "panel" ? <MeshPanel len={s.len} h={h} /> : null}
          {kind === "slats" ? <SlatPanel len={s.len} h={h} /> : null}
          {/* top rail */}
          <mesh position={[0, h, 0]}>
            <boxGeometry args={[s.len + 0.2, 0.22, 0.22]} />
            <meshLambertMaterial color={C.rail} />
          </mesh>
          {kind === "rail" ? (
            <>
              <mesh position={[0, h / 2, 0]}>
                <boxGeometry args={[s.len, 0.15, 0.15]} />
                <meshLambertMaterial color={C.rail} />
              </mesh>
              {Array.from({
                length: Math.max(2, Math.ceil(s.len / 5) + 1),
              }).map((_, k, arr) => (
                <mesh
                  key={k}
                  position={[
                    -s.len / 2 + (s.len * k) / (arr.length - 1),
                    h / 2,
                    0,
                  ]}
                >
                  <boxGeometry args={[0.18, h, 0.18]} />
                  <meshLambertMaterial color={C.rail} />
                </mesh>
              ))}
            </>
          ) : null}
        </group>
      ))}
    </group>
  );
};

const StairFlight: React.FC<{ f: Flight }> = ({ f }) => {
  const [ax, ay, az] = f.from;
  const [bx, by, bz] = f.to;
  const run = Math.hypot(bx - ax, bz - az);
  const rise = by - ay;
  const len = Math.hypot(run, rise);
  const yaw = Math.atan2(-(bz - az), bx - ax);
  const pitch = Math.atan2(rise, run);
  const slope = rise / run;
  // local frame: x runs from `from` to `to`, nosing line y = x * slope
  const n = Math.max(2, Math.round(Math.abs(rise) / STAIR.riser));
  const treads = Array.from({ length: n }, (_, i) => {
    const x = -run / 2 + ((i + 0.5) * run) / n;
    const y = -rise / 2 + ((rise > 0 ? i + 1 : i) * rise) / n;
    return [x, y] as [number, number];
  });
  return (
    <group
      position={[(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]}
      rotation={[0, yaw, 0]}
    >
      {/* steel stringers */}
      <group rotation={[0, 0, pitch]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, -0.5, side * (f.width / 2 - 0.1)]}>
            <boxGeometry args={[len, 1, 0.25]} />
            <meshLambertMaterial color={C.rail} />
          </mesh>
        ))}
      </group>
      {treads.map(([x, y], i) => (
        <mesh key={i} position={[x, y - 0.08, 0]}>
          <boxGeometry args={[run / n + 0.05, 0.16, f.width - 0.3]} />
          <meshLambertMaterial color={C.metal} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, (side * f.width) / 2]}>
          <SlopedMeshGuard run={run} slope={slope} h={STAIR.guard} />
        </group>
      ))}
    </group>
  );
};

// Stair guard: the same welded mesh as the decks, sheared to the stair pitch so
// pickets and posts stay vertical. Centered on x = 0, bottom edge y = x * slope.
const SlopedMeshGuard: React.FC<{ run: number; slope: number; h: number }> = ({
  run,
  slope,
  h,
}) => {
  const { geo, tex } = useMemo(() => {
    const g = new THREE.PlaneGeometry(run, h, 1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, p.getY(i) + h / 2 + p.getX(i) * slope);
    }
    p.needsUpdate = true;
    const t = getMeshTexture().clone();
    t.repeat.set(run, 1);
    t.needsUpdate = true;
    return { geo: g, tex: t };
  }, [run, slope, h]);
  const len = run * Math.hypot(1, slope);
  const pitch = Math.atan(slope);
  const posts = Math.max(2, Math.ceil(run / 6) + 1);
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial
          map={tex}
          color={C.rail}
          transparent
          alphaTest={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[0.15, h].map((yy) => (
        <mesh key={yy} position={[0, yy, 0]} rotation={[0, 0, pitch]}>
          <boxGeometry args={[len, 0.25, 0.2]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      ))}
      {Array.from({ length: posts }).map((_, k) => {
        const x = -run / 2 + (run * k) / (posts - 1);
        return (
          <mesh key={k} position={[x, x * slope + h / 2, 0]}>
            <boxGeometry args={[0.2, h, 0.2]} />
            <meshLambertMaterial color={C.rail} />
          </mesh>
        );
      })}
    </group>
  );
};

// South frame: columns in two rows, slab decks with edge guardrails (FRAME in plan.ts)
const Frame: React.FC = () => {
  const s = FRAME.colSize / 2;
  const [dx0, dx1] = FRAME.deckX;
  return (
    <group>
      {FRAME.cols.flatMap((c) =>
        FRAME.x.map((x) => (
          <BoxXYZ
            key={`${x}${c.z}`}
            x={[x - s, x + s]}
            y={[0, c.top]}
            z={[c.z - s, c.z + s]}
            color={C.frame}
          />
        )),
      )}
      {FRAME.decks.map((d) => {
        const [z0, z1] = d.z;
        // keep rails just inside the slab edge
        const e = 0.3;
        const edges: Record<FrameEdge, XZ[]> = {
          front: [
            [dx0 + e, z0 - s],
            [dx0 + e, z1 + s],
          ],
          west: [
            [dx1, z0 - s + e],
            [dx0 + e, z0 - s + e],
          ],
          east: [
            [dx0 + e, z1 + s - e],
            [dx1, z1 + s - e],
          ],
        };
        return (
          <group key={d.name}>
            <BoxXYZ
              x={[dx0, dx1]}
              y={[d.y - d.t, d.y]}
              z={[z0 - s, z1 + s]}
              color={C.frame}
            />
            {d.rails.map((r) => (
              <Railing key={r} path={edges[r]} y={d.y} />
            ))}
          </group>
        );
      })}
    </group>
  );
};

// A straight steel member between two 3D points (braces)
const Member: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  size?: number;
  color?: string;
}> = ({ from, to, size = 0.5, color = C.metal }) => {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      dir.clone().normalize(),
    );
    return {
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: q,
      len: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat}>
      <boxGeometry args={[len, size, size]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
};

// Tower observation level: open on S/E/N, building wall + door at the back (z0)
const TowerOpenLevel: React.FC = () => {
  const { x0, x1, z0, z1 } = TOWER;
  const o = TOWER_OPEN;
  const c = o.col / 2;
  const yb = o.y1 - o.beam; // underside of the beam band
  const e = 0.35; // guard set just inside the slab edge
  return (
    <group>
      {/* deck slab */}
      <BoxXYZ
        x={[x0, x1]}
        y={[o.y0 - o.slab, o.y0]}
        z={[z0, z1]}
        color={C.deck} // decking (lavender deck hatch on the axons)
      />
      {/* beam band under the upper tower */}
      <BoxXYZ
        x={[x0, x1]}
        y={[yb, o.y1]}
        z={[z0, z1]}
        color={C.metal}
        lineColor={C.lineOnDark}
      />
      {/* corner columns */}
      {[x0 + c, x1 - c].flatMap((x) =>
        [z0 + 0.4 + c, z1 - c].map((z) => (
          <BoxXYZ
            key={`${x}${z}`}
            x={[x - c, x + c]}
            y={[o.y0, yb]}
            z={[z - c, z + c]}
            color={C.metal}
            lineColor={C.lineOnDark}
          />
        )),
      )}
      {/* X-bracing on the east face, single diagonals on south and north */}
      <Member from={[x0 + c, o.y0 + 0.5, z1 - c]} to={[x1 - c, yb, z1 - c]} />
      <Member from={[x1 - c, o.y0 + 0.5, z1 - c]} to={[x0 + c, yb, z1 - c]} />
      <Member from={[x0 + c, o.y0 + 0.5, z1 - c]} to={[x0 + c, yb, z0 + 0.4]} />
      <Member from={[x1 - c, o.y0 + 0.5, z1 - c]} to={[x1 - c, yb, z0 + 0.4]} />
      {/* back wall: building face with the door in */}
      <BoxXYZ
        x={[x0, x1]}
        y={[o.y0, yb]}
        z={[z0 + 0.25, z0 + 0.45]} // in front of the east drawing (at +0.15)
        color={C.brick}
      />
      <BoxXYZ
        x={o.door.x}
        y={[o.y0, o.y0 + o.door.h]}
        z={[z0 + 0.45, z0 + 0.6]}
        color={C.metal}
        lineColor={C.lineOnDark}
      />
      {/* mesh guard on the three open sides */}
      <Railing
        path={[
          [x0 + e, z0 + 0.4],
          [x0 + e, z1 - e],
          [x1 - e, z1 - e],
          [x1 - e, z0 + 0.4],
        ]}
        y={o.y0}
        h={o.guard}
      />
    </group>
  );
};

// Glazed entry vestibule with a sloped metal canopy (south side of the tower)
const EntryVestibule: React.FC = () => {
  const v = ENTRY_VESTIBULE;
  const [x0, x1] = v.x;
  const [z0, z1] = v.z;
  const t = 0.35; // mullion size
  const posts: [number, number][] = [];
  const along = (a: number, b: number) => {
    const n = Math.max(1, Math.round((b - a) / v.mullionEvery));
    return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  };
  for (const x of along(x0, x1)) posts.push([x, z1]); // east face
  for (const z of along(z0, z1)) posts.push([x0, z]); // south face
  const roof = useMemo(() => {
    // sloped canopy: high at the building face (z0), low at the outer edge
    const [rx0, rx1] = v.roof.x;
    const zOut = v.roof.zOut;
    const run = zOut - z0;
    const drop = v.roof.high - v.roof.low;
    return {
      len: Math.hypot(run, drop),
      pitch: Math.atan2(drop, run),
      cx: (rx0 + rx1) / 2,
      cz: (z0 + zOut) / 2,
      cy: (v.roof.high + v.roof.low) / 2,
      w: rx1 - rx0,
    };
  }, [v, z0]);
  return (
    <group>
      {/* glass */}
      <BoxXYZ
        x={[x0, x1]}
        y={[0, v.glassTop]}
        z={[z0, z1]}
        color={C.glass}
        lineColor={C.rail}
        opacity={0.75}
      />
      {/* storefront mullions + head */}
      {posts.map(([x, z], i) => (
        <BoxXYZ
          key={i}
          x={[x - t / 2, x + t / 2]}
          y={[0, v.glassTop]}
          z={[z - t / 2, z + t / 2]}
          color={C.rail}
        />
      ))}
      <BoxXYZ
        x={[x0 - t / 2, x1 + t / 2]}
        y={[v.glassTop - 0.4, v.glassTop + 0.2]}
        z={[z1 - t / 2, z1 + t / 2]}
        color={C.rail}
      />
      <BoxXYZ
        x={[x0 - t / 2, x0 + t / 2]}
        y={[v.glassTop - 0.4, v.glassTop + 0.2]}
        z={[z0, z1]}
        color={C.rail}
      />
      {/* canopy */}
      <group position={[roof.cx, roof.cy, roof.cz]} rotation={[roof.pitch, 0, 0]}>
        <mesh>
          <boxGeometry args={[roof.w, 0.5, roof.len]} />
          <meshLambertMaterial color={C.metal} />
        </mesh>
        <Outline
          geometry={useMemo(
            () => new THREE.BoxGeometry(roof.w, 0.5, roof.len),
            [roof.w, roof.len],
          )}
          color={C.lineOnDark}
        />
      </group>
    </group>
  );
};

const Rings: React.FC = () => (
  <group>
    {RINGS.map((r, i) => (
      <group key={i} position={[r.x, r.y + r.h / 2, r.z]}>
        <mesh>
          <cylinderGeometry args={[r.r, r.r, r.h, 48, 1, true]} />
          <meshLambertMaterial color={C.concrete} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, r.h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r.r - 0.6, r.r + 0.05, 48]} />
          <meshLambertMaterial color={C.frame} side={THREE.DoubleSide} />
        </mesh>
      </group>
    ))}
  </group>
);

export const Massing: React.FC = () => (
  <group>
    {/* Solid cores behind the elevation linework */}
    <BoxXYZ
      x={[MAIN.x0 + 0.3, MAIN.x1 - 0.3]}
      y={[0, MAIN.top]}
      z={[MAIN.z0 + 0.3, MAIN.z1 - 0.3]}
      color={C.brick}
    />
    <Prism poly={WING_POLY} y0={0} y1={H_WING_CORE} color={C.brick} holes={WELL_HOLES} />
    {/* concrete wall columns (pilasters), all faces: PIERS in plan.ts */}
    {PIERS.map((p) => (
      <Prism key={p.name} poly={p.poly} y0={p.y0} y1={p.top} color={C.concrete} />
    ))}
    {/* tower core, open between Level 3 and Level 4 */}
    <BoxXYZ
      x={[TOWER.x0 + 0.2, TOWER.x1 - 0.2]}
      y={[0, TOWER_OPEN.y0 - TOWER_OPEN.slab]}
      z={[TOWER.z0, TOWER.z1 - 0.2]}
      color={C.metal}
      lineColor={C.lineOnDark}
    />
    <BoxXYZ
      x={[TOWER.x0 + 0.2, TOWER.x1 - 0.2]}
      y={[TOWER_OPEN.y1, TOWER.eave]}
      z={[TOWER.z0, TOWER.z1 - 0.2]}
      color={C.metal}
      lineColor={C.lineOnDark}
    />
    <TowerOpenLevel />
    <EntryVestibule />
    <GableVolume
      v={{
        name: "tower roof",
        x: [TOWER.x0, TOWER.x1],
        z: [TOWER.z0, TOWER.z1],
        base: TOWER.eave,
        eave: TOWER.eave,
        ridge: TOWER.ridge,
        axis: "x",
        mat: "metal",
      }}
    />

    {/* Roofs */}
    <BoxXYZ
      x={[MAIN.x0, MAIN.x1]}
      y={[MAIN.top - 0.5, MAIN.top]}
      z={[MAIN.z0, MAIN.z1]}
      color={C.roof}
    />
    <BoxXYZ
      x={FLAT_ROOF.x}
      y={[FLAT_ROOF.y, MAIN.top + 0.05]}
      z={FLAT_ROOF.z}
      color={C.roof}
    />
    <Railing
      path={[
        [FLAT_ROOF.x[1], MAIN.z1],
        [MAIN.x0, MAIN.z1],
        [MAIN.x0, FLAT_ROOF.z[0]],
      ]}
      y={MAIN.top}
      h={2.5}
    />
    <BoxXYZ
      x={CONCRETE_ROOF.x}
      y={[CONCRETE_ROOF.y, CONCRETE_ROOF.y + 0.3]}
      z={CONCRETE_ROOF.z}
      color={C.concrete}
    />
    {HEAD_HOUSE.map((v) => (
      <GableVolume key={v.name} v={v} />
    ))}

    {/* Wing roof deck and its pieces */}
    <Prism poly={WING_POLY} y0={WING_ROOF.y - 0.3} y1={WING_ROOF.y} color={C.deck} holes={WELL_HOLES} />
    <WingRoofGuard />
    <LightWell />
    <RoofVestibule />
    {RTUS.map((r, i) => (
      <BoxXYZ key={i} x={r.x} y={[24, 29]} z={r.z} color="#9a9a96" />
    ))}
    {RAMP_RAILS.map((p, i) => (
      <Railing key={i} path={p} y={24.1} kind="rail" />
    ))}

    {/* Decks with black guards */}
    {DECKS.map((d) => (
      <group key={d.name}>
        <Slab poly={d.poly} y={d.y} t={1.2} color={C.deck} />
        {d.rail ? <Railing path={d.rail} y={d.y} /> : null}
      </group>
    ))}

    <Frame />
    <Rings />
    {STAIRS.map((f, i) => (
      <StairFlight key={i} f={f} />
    ))}
    {STAIR_LANDINGS.map((l) => (
      <group key={l.name}>
        <Slab poly={l.poly} y={l.y} t={0.8} color={C.metal} />
        <Railing path={l.rail} y={l.y} h={(l.railTop ?? l.y + STAIR.guard) - l.y} />
      </group>
    ))}
  </group>
);

const H_WING_CORE = 24;
const WELL_HOLES = [LIGHT_WELL_POLY];

// Wing roof edge (4/G160 NE axon, Collin 2026-11-25): a 6" brick parapet 2' to
// 2'-7" above the roof deck, and behind it (roof side) a black horizontal slat
// guard from the deck up; the brick shows between the slats. Runs on every
// edge except the one against the main building (WING_POLY's closing edge),
// and opens at the north stair's roof access landing.
const [p0, p1, p2, ...pRest] = WING_POLY;
const WING_GUARD_RUNS: XZ[][] = [
  [p0, p1, [GX.g13, NORTH_STAIR_GAP.z0]],
  [[GX.g13, NORTH_STAIR_GAP.z1], p2, ...pRest],
];
// shift an open path toward the wing's inside by d (mitered corners)
const insetRun = (path: XZ[], d: number): XZ[] => {
  const n = path.slice(0, -1).map((a, i) => {
    const b = path[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (nx * (WING_C[0] - mx) + nz * (WING_C[1] - mz) < 0) { nx = -nx; nz = -nz; }
    return [nx, nz] as XZ;
  });
  return path.map((p, i) => {
    const a = n[Math.max(0, i - 1)], b = n[Math.min(n.length - 1, i)];
    const bx = a[0] + b[0], bz = a[1] + b[1];
    const k = d / (1 + a[0] * b[0] + a[1] * b[1]); // miter: bisector scaled
    return [p[0] + bx * k, p[1] + bz * k] as XZ;
  });
};
const WingRoofGuard: React.FC = () => (
  <group>
    {WING_GUARD_RUNS.map((run, i) => {
      // 6" brick parapet just inside the facade plane, roof deck to the cap
      const wall = insetRun(run, 0.02 + WING_ROOF.parapetT / 2);
      const h = WING_ROOF.cap - WING_ROOF.y;
      return (
        <group key={i}>
          {wall.slice(0, -1).map((a, j) => {
            const b = wall[j + 1];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + WING_ROOF.parapetT;
            return (
              <mesh
                key={j}
                position={[(a[0] + b[0]) / 2, WING_ROOF.y + h / 2, (a[1] + b[1]) / 2]}
                rotation={[0, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0]}
              >
                <boxGeometry args={[len, h, WING_ROOF.parapetT]} />
                <meshLambertMaterial color={C.brick} />
              </mesh>
            );
          })}
          {/* slat guard behind (inside) the parapet, roof deck to the guard top */}
          <Railing
            path={insetRun(run, WING_ROOF.guardIn)}
            y={WING_ROOF.y}
            h={WING_ROOF.guardTop - WING_ROOF.y}
            kind="slats"
          />
        </group>
      );
    })}
  </group>
);
const WING_C: XZ = [
  WING_POLY.reduce((s, p) => s + p[0], 0) / WING_POLY.length,
  WING_POLY.reduce((s, p) => s + p[1], 0) / WING_POLY.length,
];

// Roof vestibule (1/G160 NW axon): lap-siding walls, sloped glass roof with
// black rafters, door on the west wall. The roof rises from the north edge
// (x1) to the building wall (x0).
let sidingTexture: THREE.CanvasTexture | null = null;
const getSidingTexture = () => {
  if (sidingTexture) return sidingTexture;
  const cv = document.createElement("canvas");
  cv.width = 8;
  cv.height = 32;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 8, 32);
  g.fillStyle = "#c9c9c9"; // board shadow toward the lap
  g.fillRect(0, 22, 8, 7);
  g.fillStyle = "#5a5a5a"; // lap line
  g.fillRect(0, 29, 8, 3);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  sidingTexture = t;
  return t;
};
const RoofVestibule: React.FC = () => {
  const v = VESTIBULE;
  const [x0, x1] = v.x;
  const [z0, z1] = v.z;
  const depth = x1 - x0;
  // side wall outline in (x, y): bottom, up the north edge, sloped top to the building
  const sideGeo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(x0, v.y0);
    sh.lineTo(x1, v.y0);
    sh.lineTo(x1, v.wallLow);
    sh.lineTo(x0, v.roofHigh);
    sh.closePath();
    const g = new THREE.ShapeGeometry(sh);
    // world-space UVs so the laps line up: u = x, v = y / lap
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[2 * i] = pos.getX(i) / 4;
      uv[2 * i + 1] = pos.getY(i) / v.lap;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [x0, x1, v.y0, v.wallLow, v.roofHigh, v.lap]);
  const northTex = useMemo(() => {
    const t = getSidingTexture().clone();
    t.repeat.set(1, (v.wallLow - v.y0) / v.lap);
    t.needsUpdate = true;
    return t;
  }, [v.wallLow, v.y0, v.lap]);
  const sidingMat = (
    <meshLambertMaterial color={v.sidingColor} map={getSidingTexture()} side={THREE.DoubleSide} />
  );
  const roofLen = Math.hypot(depth, v.roofHigh - v.wallLow);
  const roofPitch = Math.atan2(v.roofHigh - v.wallLow, depth);
  const roofMid: [number, number, number] = [(x0 + x1) / 2, (v.roofHigh + v.wallLow) / 2, (z0 + z1) / 2];
  const zw = z1 - z0;
  return (
    <group>
      {/* side walls (west z0, east z1) */}
      {[z0, z1].map((z) => (
        <mesh key={z} geometry={sideGeo} position={[0, 0, z]}>
          {sidingMat}
        </mesh>
      ))}
      {/* north wall */}
      <mesh position={[x1, (v.y0 + v.wallLow) / 2, (z0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[zw, v.wallLow - v.y0]} />
        <meshLambertMaterial color={v.sidingColor} map={northTex} side={THREE.DoubleSide} />
      </mesh>
      {/* corner trim */}
      {[z0, z1].map((z) => (
        <mesh key={'t' + z} position={[x1, (v.y0 + v.wallLow) / 2, z]}>
          <boxGeometry args={[0.35, v.wallLow - v.y0, 0.35]} />
          <meshLambertMaterial color={C.frame} />
        </mesh>
      ))}
      {/* door on the west wall, north end */}
      <mesh position={[(v.door.x[0] + v.door.x[1]) / 2, v.y0 + v.door.h / 2, z0 - 0.08]}>
        <boxGeometry args={[v.door.x[1] - v.door.x[0], v.door.h, 0.15]} />
        <meshLambertMaterial color={C.metal} />
      </mesh>
      {/* glass roof + rafters, sloping up to the building */}
      <group position={roofMid} rotation={[0, 0, -roofPitch]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[roofLen, zw]} />
          <meshBasicMaterial color="#cfe0e6" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {Array.from({ length: v.bays + 1 }, (_, k) => (
          <mesh key={k} position={[0, 0.15, -zw / 2 + (zw * k) / v.bays]}>
            <boxGeometry args={[roofLen + 0.4, 0.4, 0.3]} />
            <meshLambertMaterial color={C.rail} />
          </mesh>
        ))}
        {/* edge beam along the north edge */}
        <mesh position={[roofLen / 2, 0.15, 0]}>
          <boxGeometry args={[0.4, 0.5, zw]} />
          <meshLambertMaterial color={C.rail} />
        </mesh>
      </group>
    </group>
  );
};

// Light well under the roof grate: open to the sky through the tree opening.
// Metal bar grate (dark, see-through) over the trapezoid, floor at grade.
let grateTexture: THREE.CanvasTexture | null = null;
const getGrateTexture = () => {
  if (grateTexture) return grateTexture;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = "#000";
  for (let i = 0; i < 64; i += 8) g.fillRect(i, 0, 4, 64); // bearing bars, ~1 1/2" apart
  for (let i = 0; i < 64; i += 16) g.fillRect(0, i, 64, 4); // cross bars
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  grateTexture = t;
  return t;
};
const LightWell: React.FC = () => {
  const geo = useMemo(() => {
    const s = new THREE.Shape(LIGHT_WELL_POLY.map(([x, z]) => new THREE.Vector2(x, -z)));
    const { x, z, r } = LIGHT_WELL.hole;
    s.holes.push(new THREE.Path().absarc(x, -z, r, 0, Math.PI * 2, false));
    return new THREE.ShapeGeometry(s, 48); // UVs in feet: one texture tile per foot
  }, []);
  const tex = useMemo(() => getGrateTexture().clone(), []);
  const { x, z, r } = LIGHT_WELL.hole;
  return (
    <group>
      {/* grate, flush with the roof */}
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, WING_ROOF.y + 0.05, 0]}>
        <meshBasicMaterial map={tex} color={C.rail} transparent alphaTest={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* steel ring around the tree opening */}
      <mesh position={[x, WING_ROOF.y + 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r, r + 0.3, 48]} />
        <meshBasicMaterial color={C.rail} side={THREE.DoubleSide} />
      </mesh>
      {/* floor of the well at grade (100'), planting soil for the future tree */}
      <Prism poly={LIGHT_WELL_POLY} y0={-0.2} y1={0.05} color="#6f5f4c" />
    </group>
  );
};
