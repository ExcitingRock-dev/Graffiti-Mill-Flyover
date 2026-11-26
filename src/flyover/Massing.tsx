import { useMemo } from "react";
import * as THREE from "three";
import { CorrugatedShed, corrugatedTexture } from "./Sheds";
import { concreteTexture } from "./concrete";
import { SpeakeasyWall } from "./SpeakeasyWall";
import {
  EAST_ROOF_EDGE,
  ELEVATOR,
  NEW_PRECAST,
  GZ,
  WEST_ROOF_EDGE,
  NORTH_BAND,
  NORTH_WEST_WALL,
  PRECAST_TOWER,
  speakeasyPocket,
  CONCRETE_ROOF,
  DECKS,
  FRAME,
  ENTRY_VESTIBULE,
  Flight,
  FrameEdge,
  TOWER_OPEN,
  HEAD_HOUSE,
  EAVE,
  HG_ROOF_EXTENSION,
  SOUTH_DECK,
  MAIN,
  RINGS,
  LIGHT_WELL,
  LIGHT_WELL_POLY,
  WING_ROOF,
  NORTH_STAIR_GAP,
  GX,
  STAIR,
  STAIR_LANDINGS,
  STAIRS,
  DECK_HATCH,
  DECK_STAIRS,
  TOWER,
  SPEAKEASY,
  PIER,
  speakeasyTop,
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

type Range = [number, number];
type Box3 = { x: Range; y: Range; z: Range };
// box A minus box B, as up to six boxes
const subtractBox = (A: Box3, B: Box3): Box3[] => {
  const cut = (a: Range, b: Range): Range => [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
  const ix = cut(A.x, B.x);
  const iy = cut(A.y, B.y);
  const iz = cut(A.z, B.z);
  if (ix[0] >= ix[1] || iy[0] >= iy[1] || iz[0] >= iz[1]) return [A];
  const out: Box3[] = [];
  if (A.x[0] < ix[0]) out.push({ ...A, x: [A.x[0], ix[0]] });
  if (ix[1] < A.x[1]) out.push({ ...A, x: [ix[1], A.x[1]] });
  if (A.y[0] < iy[0]) out.push({ x: ix, y: [A.y[0], iy[0]], z: A.z });
  if (iy[1] < A.y[1]) out.push({ x: ix, y: [iy[1], A.y[1]], z: A.z });
  if (A.z[0] < iz[0]) out.push({ x: ix, y: iy, z: [A.z[0], iz[0]] });
  if (iz[1] < A.z[1]) out.push({ x: ix, y: iy, z: [iz[1], A.z[1]] });
  return out;
};
const subtractAll = (boxes: Box3[], holes: Box3[]) =>
  holes.reduce((acc, h) => acc.flatMap((b) => subtractBox(b, h)), boxes);
// nothing above the precast tower's roof (the core stops 0.2 short of the
// elevator enclosure's north wall so the two faces don't fight)
const aboveTower: Box3 = {
  x: [PRECAST_TOWER.x[0] - 0.2, MAIN.x1 + 1],
  y: [PRECAST_TOWER.roof - 0.35, MAIN.top + 1], // core stops under the 0.3 roof slab, not at its top
  z: [MAIN.z0 - 1, PRECAST_TOWER.z[1] + 0.2], // core face sits 0.2 behind the shed / band walls
};
// the Level 6 South Deck: no core or Auger roof slab above it
const aboveDeck: Box3 = {
  x: [MAIN.x0 - 1, SOUTH_DECK.x[1]],
  y: [SOUTH_DECK.y - 1.2, MAIN.top + 1],
  z: [SOUTH_DECK.z[0], MAIN.z1 + 1],
};
const deckHatchShaft: Box3 = { x: DECK_HATCH.x, y: [DECK_HATCH.bottom, SOUTH_DECK.y], z: DECK_HATCH.z };
// the corrugated sheds are hollow skins: no core or roof slab inside them
const insideSheds: Box3[] = HEAD_HOUSE.filter((v) => v.skin === "corrugated" && v.base < MAIN.top).map((v) => ({
  x: [v.x[0], v.x[1] + 1],
  y: [v.base, MAIN.top + 1],
  z: [v.z[0], v.z[1] + 1],
}));
const mainCorePieces = (): Box3[] => {
  const p = speakeasyPocket();
  return subtractAll(
    [{ x: [MAIN.x0 + 0.3, MAIN.x1 - 0.3], y: [0, MAIN.top - 0.5], z: [MAIN.z0 + 0.3, MAIN.z1 - 0.3] }],
    [p, aboveTower, aboveDeck, deckHatchShaft, ...insideSheds],
  );
};
const mainRoofSlab = (): Box3[] =>
  subtractAll([{ x: [MAIN.x0, MAIN.x1], y: [MAIN.top - 0.5, MAIN.top], z: [MAIN.z0, MAIN.z1] }], [
    aboveTower,
    aboveDeck,
    ...insideSheds,
  ]);

const eastRoofEdgePoly = (): XZ[] => {
  const e = EAST_ROOF_EDGE;
  const c = e.cornerCap;
  // edge strip (out to the band's face); its north end runs on at the same
  // face across the corner column to the column's far edge (Collin 2026-11-26)
  return [
    [e.x[0], e.z[1]],
    [e.x[1], e.z[1]],
    [e.x[1], c.z[0]],
    [c.x[0], c.z[0]],
    [c.x[0], e.z[0]],
    [e.x[0], e.z[0]],
  ];
};

// mirror of the east edge: strip along the north block's west wall, widened
// over the NW corner column
const westRoofEdgePoly = (): XZ[] => {
  const e = WEST_ROOF_EDGE;
  const c = e.cornerCap;
  return [
    [e.x[0], e.z[0]],
    [e.x[1], e.z[0]],
    [e.x[1], c.z1],
    [c.x0, c.z1],
    [c.x0, e.z[1]],
    [e.x[0], e.z[1]],
  ];
};

// The round-window stair tower's body: new, clean white corrugated steel on
// every face (Collin 2026-11-26); its drawings lay only the windows over it
const TowerSkin: React.FC = () => {
  const tex = useMemo(() => corrugatedTexture(1, 1, 17, "newWhite"), []);
  const geos = useMemo(
    () =>
      (
        [
          [-1.2, TOWER_OPEN.y0 - TOWER_OPEN.slab],
          [TOWER_OPEN.y1, TOWER.eave],
        ] as Range[]
      ).map((y) => worldUV(boxAt([TOWER.x0, TOWER.x1], y, [TOWER.z0, TOWER.z1]))),
    [],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshLambertMaterial map={tex} />
        </mesh>
      ))}
    </group>
  );
};

// The central gable's south slope carried past its ridge into the raised
// gable's south wall: a wedge sitting on HG's north slope. Ribs run down the
// slope (along x), like the roof it continues.
const HgRoofExtension: React.FC = () => {
  const e = HG_ROOF_EXTENSION;
  const T = 0.25; // roof thickness, as on the sheds (NORTH_SHEDS.roofThick)
  const tex = useMemo(() => corrugatedTexture(1, 1, 91), []);
  const geo = useMemo(() => {
    const [x0, x1] = e.x;
    const run = x1 - x0;
    // cross-section in (x, y), on top of HG's roof planes (their top = line + T)
    const s = new THREE.Shape(
      (
        [
          [x0, e.ridge + T],
          [x1, e.ridge - run * e.slope + T],
          [x1, e.ridge + run * e.slope + T],
        ] as [number, number][]
      ).map(([x, y]) => new THREE.Vector2(x, y)),
    );
    const g = new THREE.ExtrudeGeometry(s, { depth: e.z[1] - e.z[0], bevelEnabled: false })
      .translate(0, 0, e.z[0])
      .toNonIndexed();
    g.computeVertexNormals();
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const top = Math.abs(n.getY(i)) > 0.5;
      const endFace = Math.abs(n.getZ(i)) > 0.5;
      // roof: ribs along x; end walls: vertical ribs
      const [u, v] = top ? [p.getZ(i), p.getX(i)] : endFace ? [p.getX(i), p.getY(i)] : [p.getZ(i), p.getY(i)];
      uv[2 * i] = u;
      uv[2 * i + 1] = v;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [e]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial map={tex} />
    </mesh>
  );
};

// The Level 6 South Deck: slab at E6, the brick curb along its south and east
// edges (the drawings show its face), and a guardrail just inside it
const SouthDeck: React.FC = () => {
  const d = SOUTH_DECK;
  const [x0, x1] = d.x;
  const [z0, z1] = d.z;
  const c = d.curbThick;
  const hx = DECK_HATCH.x;
  const hz = DECK_HATCH.z;
  const bay = HEAD_HOUSE.find((v) => v.name === "HG central gable")!.opening!;
  return (
    <group>
      <Prism
        poly={[
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ]}
        holes={[
          [
            [hx[0], hz[0]],
            [hx[1], hz[0]],
            [hx[1], hz[1]],
            [hx[0], hz[1]],
          ],
        ]}
        y0={d.y - 1.2}
        y1={d.y}
        color={C.deck}
      />
      {/* the deck runs on into the central gable's open bay */}
      <BoxXYZ x={[x1, x1 + bay.depth]} y={[d.y - 0.3, d.y + 0.02]} z={bay.z} color={C.deck} />
      {/* guard around the stair hatch on its open sides */}
      <Railing
        path={[
          [hx[0], hz[1]],
          [hx[0], hz[0]],
          [hx[1], hz[0]],
        ]}
        y={d.y}
        h={d.railTop - d.y}
      />
      {DECK_STAIRS.map((f, i) => (
        <StairFlight key={i} f={f} />
      ))}
      <BoxXYZ x={[x0, x1]} y={[d.y, d.curbTop]} z={[z1 - c, z1]} color={C.precast} />
      <BoxXYZ x={[x0, x0 + c]} y={[d.y, d.curbTop]} z={[z0, z1 - c]} color={C.precast} />
      <Railing
        path={[
          [x1, z1 - c - 0.3],
          [x0 + c + 0.3, z1 - c - 0.3],
          [x0 + c + 0.3, z0],
        ]}
        y={d.y}
        h={d.railTop - d.y}
      />
    </group>
  );
};

// The stone band capping the north face: flat bottom, gently pitched top
const NorthBand: React.FC = () => {
  const b = NORTH_BAND;
  const geo = useMemo(() => {
    // profile in (u = -z, y), extruded along +x after the rotation below
    const s = new THREE.Shape(
      (
        [
          [b.z[0], b.bottom],
          [b.z[0], b.endTop],
          [b.peakZ, b.peakTop],
          [b.z[1], b.endTop],
          [b.z[1], b.bottom],
        ] as [number, number][]
      ).map(([z, y]) => new THREE.Vector2(-z, y)),
    );
    return new THREE.ExtrudeGeometry(s, { depth: b.back + b.proud, bevelEnabled: false });
  }, [b]);
  return (
    <Solid
      geometry={geo}
      color={C.precast}
      position={[GX.g9 - b.back, 0, 0]}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
};

// Precast tower roof edge (north and west) and the brick / metal wall
// rising from its roof on the east side
const PrecastTowerTop: React.FC = () => <NorthWestWall />;

// UVs from world position (feet), picked by each face's facing, so pieces
// that share a plane carry one continuous texture with no seam
const worldUV = (g: THREE.BufferGeometry) => {
  const geo = g.index ? g.toNonIndexed() : g;
  geo.computeVertexNormals();
  const p = geo.getAttribute("position");
  const n = geo.getAttribute("normal");
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [ax, ay, az] = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    const [u, v] =
      ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[2 * i] = u;
    uv[2 * i + 1] = v;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
};
const boxAt = (x: Range, y: Range, z: Range) =>
  new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]).translate(
    (x[0] + x[1]) / 2,
    (y[0] + y[1]) / 2,
    (z[0] + z[1]) / 2,
  );

// The New Precast Structure (NEW_PRECAST): the precast tower and the elevator
// shaft as one concrete skin. No automatic outlines (they would draw the
// joints between pieces); only the real corners and roof edges are drawn.
const NewPrecastStructure: React.FC = () => {
  const t = PRECAST_TOWER;
  const e = ELEVATOR;
  const s = NEW_PRECAST.skin;
  const gr = NEW_PRECAST.grade;
  const N = GX.g9 + s; // north face
  const W = GZ.K - s; // west face
  const E = t.z[1]; // the tower's east side, at the shed wall
  const pT = t.parapetT + s;
  const slab = 0.3; // CONCRETE_ROOF thickness: the body stops under it
  const { pieces, tex, edges } = useMemo(() => {
    // elevator: profile in (u = -z, y) extruded along +x, moved into place
    const prof = new THREE.Shape(
      (
        [
          [e.z[0], e.base],
          [e.z[1], e.base],
          [e.z[1], e.high],
          [e.z[0], e.low],
        ] as [number, number][]
      ).map(([z, y]) => new THREE.Vector2(-z, y)),
    );
    const elev = new THREE.ExtrudeGeometry(prof, { depth: e.x[1] - e.x[0], bevelEnabled: false })
      .rotateY(Math.PI / 2)
      .translate(e.x[0], 0, 0);
    const geos = [
      boxAt([t.x[0], N], [gr, t.roof - slab], [W, E]), // tower body
      boxAt([N - pT, N], [t.roof - slab, t.top], [W, E]), // north parapet
      boxAt([t.x[0], N - pT], [t.roof - slab, t.top], [W, W + pT]), // west parapet
      elev,
    ].map(worldUV);
    const P = (x: number, y: number, z: number) => [x, y, z];
    const seg = (a: number[], b: number[]) => [...a, ...b];
    const lines = [
      seg(P(N, gr, W), P(N, t.top, W)), // NW corner
      seg(P(N, gr, E), P(N, t.top, E)),
      seg(P(t.x[0], t.top, W), P(N, t.top, W)), // parapet tops, outer
      seg(P(N, t.top, W), P(N, t.top, E)),
      seg(P(t.x[0], t.top, W + pT), P(N - pT, t.top, W + pT)), // parapet tops, inner
      seg(P(N - pT, t.top, W + pT), P(N - pT, t.top, E)),
      seg(P(t.x[0], t.roof, W + pT), P(N - pT, t.roof, W + pT)), // parapet feet
      seg(P(N - pT, t.roof, W + pT), P(N - pT, t.roof, E)),
      seg(P(e.x[0], gr, W), P(e.x[0], e.low, W)), // grid 5 edge of the west face
      seg(P(e.x[1], t.top, W), P(e.x[1], e.low, W)), // elevator NW corner above the parapet
      seg(P(e.x[0], e.low, W), P(e.x[1], e.low, W)), // west eave
      seg(P(e.x[1], t.roof, e.z[1]), P(e.x[1], e.high, e.z[1])), // elevator NE corner
      seg(P(e.x[1], e.low, W), P(e.x[1], e.high, e.z[1])), // north face top
      seg(P(e.x[0], e.low, W), P(e.x[0], e.high, e.z[1])), // south face top
      seg(P(e.x[0], e.base, e.z[1]), P(e.x[0], e.high, e.z[1])),
      seg(P(e.x[0], e.high, e.z[1]), P(e.x[1], e.high, e.z[1])),
    ].flat();
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    return { pieces: geos, tex: concreteTexture(), edges: eg };
  }, [t, e, N, W, E, pT, gr]);
  return (
    <group>
      {pieces.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshLambertMaterial map={tex} />
        </mesh>
      ))}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={C.line} />
      </lineSegments>
    </group>
  );
};

// The precast tower's roof: light concrete; its edges are hidden by the
// parapets, so no outline
const ConcreteRoof: React.FC = () => {
  const r = CONCRETE_ROOF;
  const { geo, tex } = useMemo(
    () => ({ geo: worldUV(boxAt(r.x, [r.y - 0.3, r.y], r.z)), tex: concreteTexture("roof") }),
    [r],
  );
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial map={tex} />
    </mesh>
  );
};

// Elevator roof: single-slope corrugated, low on the west face, ribs running
// down the slope (the walls are part of NewPrecastStructure)
const ElevatorEnclosure: React.FC = () => {
  const e = ELEVATOR;
  const { roof } = useMemo(() => {
    const span = e.z[1] - e.z[0];
    const rise = e.high - e.low;
    const L = Math.hypot(span, rise);
    const w = e.x[1] - e.x[0];
    return {
      roof: { L, w, alpha: Math.atan2(rise, span), tex: corrugatedTexture(w, L, 77) },
    };
  }, [e]);
  return (
    <group>
      <NewPrecastStructure />
      {/* local +y runs down the slope toward the west eave */}
      <group
        position={[(e.x[0] + e.x[1]) / 2, (e.low + e.high) / 2, (e.z[0] + e.z[1]) / 2]}
        rotation={[-(Math.PI / 2 + roof.alpha), 0, 0]}
      >
        <mesh position={[0, 0, e.roofThick + 0.01]}>
          <planeGeometry args={[roof.w, roof.L]} />
          <meshLambertMaterial map={roof.tex} side={THREE.DoubleSide} />
        </mesh>
        <BoxXYZ x={[-roof.w / 2, roof.w / 2]} y={[-roof.L / 2, roof.L / 2]} z={[0, e.roofThick]} color={C.roof} />
      </group>
    </group>
  );
};

// West wall of the north block above the precast roof: brick, stone sill,
// dark corrugated infill set into the old opening, concrete head and end jamb
// (the two columns are PIERS; the roof edge above is WEST_ROOF_EDGE)
const NorthWestWall: React.FC = () => {
  const w = NORTH_WEST_WALL;
  const t = PRECAST_TOWER;
  const top = WEST_ROOF_EDGE.y[0];
  const back: [number, number] = [w.z, w.z + 0.2]; // wall thickness shown, to the core face
  const x: [number, number] = [w.endJamb[1], GX.g9];
  const infill = useMemo(
    () =>
      w.bays.map(([x0, x1], i) => ({
        x0,
        x1,
        tex: corrugatedTexture(x1 - x0, w.head - w.sill.top, 40 + i, "newDark"),
      })),
    [w],
  );
  return (
    <group>
      <BoxXYZ x={x} y={[t.roof, w.brickTop]} z={back} color={C.brick} />
      <BoxXYZ x={x} y={[w.head, top]} z={back} color={C.concrete} />
      <BoxXYZ x={w.endJamb} y={[t.roof, top]} z={back} color={C.concrete} />
      {w.bays.map(([x0, x1], i) => (
        <BoxXYZ key={"sill" + i} x={[x0, x1]} y={[w.brickTop, w.sill.top]} z={[w.z - w.sill.proud, w.z + 0.2]} color={w.sill.color} />
      ))}
      {infill.map((b, i) => (
        <mesh
          key={"infill" + i}
          position={[(b.x0 + b.x1) / 2, (w.sill.top + w.head) / 2, w.z + w.infillRecess]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[b.x1 - b.x0, w.head - w.sill.top]} />
          <meshLambertMaterial map={b.tex} />
        </mesh>
      ))}
    </group>
  );
};

export const Massing: React.FC = () => (
  <group>
    {/* Solid cores behind the elevation linework. The main core is built in
        pieces around the dark pocket behind the Speakeasy's broken door
        opening; its top stops under the roof slab so no seam shows there. */}
    {mainCorePieces().map((b, i) => (
      <BoxXYZ key={"core" + i} x={b.x} y={b.y} z={b.z} color={C.brick} />
    ))}
    <SpeakeasyWall />
    <Prism poly={WING_POLY} y0={0} y1={H_WING_CORE} color={C.brick} holes={WELL_HOLES} />
    {/* concrete wall columns (pilasters), all faces: PIERS in plan.ts */}
    {PIERS.map((p) => (
      <Prism key={p.name} poly={p.poly} y0={p.y0} y1={p.top} color={C.concrete} />
    ))}
    {/* tower body in new white siding, open between Level 3 and Level 4 */}
    <TowerSkin />
    <TowerOpenLevel />
    <EntryVestibule />
    {/* single-slope roof, high on the west, small eaves (4/G160) */}
    <CorrugatedShed
      v={{
        name: "tower roof",
        x: [TOWER.x0, TOWER.x1],
        z: [TOWER.z0, TOWER.z1],
        base: TOWER.eave,
        eave: TOWER.eave,
        ridge: TOWER.ridge,
        axis: "x",
        mat: "metal",
        skin: "corrugated",
        roof: "shed",
        look: "newWhite",
        // the west eave stays short where it passes the central gable's end
        overhang: { start: EAVE, end: EAVE, a: 0.5, b: EAVE },
      }}
    />

    {/* Roofs */}
    {mainRoofSlab().map((b, i) => (
      <BoxXYZ key={"slab" + i} x={b.x} y={b.y} z={b.z} color={C.roof} />
    ))}
    <NorthBand />
    {/* one L-shaped solid (edge + corner cap) so no seams or doubled outlines show */}
    <Prism poly={eastRoofEdgePoly()} y0={EAST_ROOF_EDGE.y[0]} y1={EAST_ROOF_EDGE.y[1]} color={C.precast} />
    <Prism poly={westRoofEdgePoly()} y0={WEST_ROOF_EDGE.y[0]} y1={WEST_ROOF_EDGE.y[1]} color={C.precast} />
    <PrecastTowerTop />
    <SouthDeck />
    <ConcreteRoof />
    {HEAD_HOUSE.map((v) =>
      v.skin === "corrugated" ? (
        <CorrugatedShed
          key={v.name}
          v={v}
          vent={v.name === "HH west shed"}
          eastDoor={v.name === "HH east shed"}
        />
      ) : (
        <GableVolume key={v.name} v={v} />
      ),
    )}
    <ElevatorEnclosure />
    <HgRoofExtension />

    {/* Wing roof deck and its pieces */}
    <Prism poly={WING_POLY} y0={WING_ROOF.y - 0.3} y1={WING_ROOF.y} color={C.deck} holes={WELL_HOLES} />
    <WingRoofGuard />
    <LightWell />
    <RoofVestibule />

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

// "The Speakeasy" (A102 L3 plan, 1/G160 NW axon): lap-siding screen walls, a
// storefront under a sloped glass roof, and a 22" access door. All dimensions
// are SPEAKEASY in plan.ts; wall tops and the roof follow speakeasyTop(x).
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
  t.repeat.set(0.25, 1 / SPEAKEASY.lap); // extrude UVs are in feet: one lap per course
  sidingTexture = t;
  return t;
};

// One siding wall, extruded through its thickness from its OUTER face.
// axis "x": runs along x from a to b, outer face at z = face, thickness toward
// z = face + inward * t; its top follows the sloped plane. axis "z": runs along
// z from a to b, outer face at x = face, thickness toward -x; flat top.
const SidingWall: React.FC<{
  axis: "x" | "z";
  a: number;
  b: number;
  face: number;
  inward?: 1 | -1;
  bottom?: number;
  top?: number; // flat top instead of the sloped plane
}> = ({ axis, a, b, face, inward = 1, bottom, top }) => {
  const s = SPEAKEASY;
  const y0 = bottom ?? s.y0;
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(a, y0);
    sh.lineTo(b, y0);
    const yt = (u: number) => top ?? (axis === "x" ? speakeasyTop(u) : speakeasyTop(face));
    sh.lineTo(b, yt(b));
    sh.lineTo(a, yt(a));
    sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: s.wallT, bevelEnabled: false });
  }, [axis, a, b, face, y0, top, s.wallT]);
  const pos: [number, number, number] =
    axis === "x" ? [0, 0, inward === 1 ? face : face - s.wallT] : [face, 0, 0];
  const rot: [number, number, number] = axis === "x" ? [0, 0, 0] : [0, -Math.PI / 2, 0];
  return (
    <group position={pos} rotation={rot}>
      <mesh geometry={geo}>
        <meshLambertMaterial color={s.sidingColor} map={getSidingTexture()} />
      </mesh>
      <Outline geometry={geo} />
    </group>
  );
};

const RoofVestibule: React.FC = () => {
  const s = SPEAKEASY;
  const x0 = GX.g9;
  const sf = s.storefront;
  const post = 0.3;
  const pitch = Math.atan2(s.roofHigh - s.wallLow, s.outerX - x0);
  // glass roof: building wall -> the short north leg, west wall -> storefront
  const rz0 = s.westZ + s.wallT;
  const rz1 = sf.z;
  const rx1 = s.innerX;
  const roofLen = (rx1 - x0) / Math.cos(pitch);
  const roofMid: [number, number, number] = [
    (x0 + rx1) / 2,
    (speakeasyTop(x0) + speakeasyTop(rx1)) / 2 + 0.1,
    (rz0 + rz1) / 2,
  ];
  const zw = rz1 - rz0;
  // storefront glass along z = sf.z (sloped head) as a shape in x-y
  const eastGlass = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(x0 + PIER.proud, s.y0);
    sh.lineTo(sf.x, s.y0);
    sh.lineTo(sf.x, speakeasyTop(sf.x));
    sh.lineTo(x0 + PIER.proud, speakeasyTop(x0));
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  }, [x0, sf.x, s.y0]);
  // corner post footprints, flush with both wall faces when post = wallT
  const P = s.post, e = (P - s.wallT) / 2;
  const pW: [number, number] = [s.innerX + e - P, s.innerX + e]; // west wall / north leg
  const pWz: [number, number] = [s.westZ - e, s.westZ - e + P];
  const pNE: [number, number] = [s.outerX + e - P, s.outerX + e]; // on the outer north wall line
  const pDz: [number, number] = [s.doorZ[0] - e, s.doorZ[0] - e + P]; // door wall / outer north
  const pNEz: [number, number] = [s.eastZ + e - P, s.eastZ + e]; // outer north / east
  const thirds = (a: number, b: number) => [0, 1, 2, 3].map((k) => a + ((b - a) * k) / 3);
  return (
    <group>
      {/* siding screen walls, ending at the corner posts */}
      <SidingWall axis="x" a={x0 + PIER.proud} b={pW[0]} face={s.westZ} inward={1} />
      <SidingWall axis="z" a={pWz[1]} b={sf.zN} face={s.innerX} />
      <SidingWall axis="z" a={pDz[1]} b={pNEz[0]} face={s.outerX} />
      <SidingWall axis="x" a={x0} b={pNE[0]} face={s.eastZ} inward={-1} top={s.eastTop} />
      {/* perpendicular door wall: 22" access door, siding above */}
      <BoxXYZ x={[s.innerX, pNE[0]]} y={[s.y0, s.y0 + s.door.h]} z={s.doorZ} color={C.rail} />
      <SidingWall axis="x" a={s.innerX} b={pNE[0]} face={s.doorZ[0]} inward={1} bottom={s.y0 + s.door.h} />
      {/* corner posts */}
      <BoxXYZ x={pW} y={[s.y0, speakeasyTop(pW[1])]} z={pWz} color={s.sidingColor} />
      <BoxXYZ x={pNE} y={[s.y0, speakeasyTop(pNE[1])]} z={pDz} color={s.sidingColor} />
      <BoxXYZ x={pNE} y={[s.y0, speakeasyTop(pNE[1])]} z={pNEz} color={s.sidingColor} />
      {/* storefront, north run (x = sf.x) */}
      <BoxXYZ
        x={[sf.x - 0.05, sf.x + 0.05]}
        y={[s.y0, speakeasyTop(sf.x)]}
        z={[sf.zN, sf.z]}
        color={C.glass}
        lineColor={C.rail}
        opacity={0.75}
      />
      {thirds(sf.zN, sf.z).map((z) => (
        <BoxXYZ
          key={"n" + z}
          x={[sf.x - post / 2, sf.x + post / 2]}
          y={[s.y0, speakeasyTop(sf.x)]}
          z={[z - post / 2, z + post / 2]}
          color={C.rail}
        />
      ))}
      {/* storefront, east run (z = sf.z), back to the building */}
      <mesh geometry={eastGlass} position={[0, 0, sf.z]}>
        <meshBasicMaterial color={C.glass} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {thirds(x0 + PIER.proud + post / 2, sf.x).map((x) => (
        <BoxXYZ
          key={"e" + x}
          x={[x - post / 2, x + post / 2]}
          y={[s.y0, speakeasyTop(x)]}
          z={[sf.z - post / 2, sf.z + post / 2]}
          color={C.rail}
        />
      ))}
      {[s.y0 + 0.15, s.y0 + 3].map((y) => (
        <BoxXYZ key={"sill" + y} x={[x0 + PIER.proud, sf.x]} y={[y - 0.15, y + 0.15]} z={[sf.z - post / 2, sf.z + post / 2]} color={C.rail} />
      ))}
      {[s.y0 + 0.15, s.y0 + 3].map((y) => (
        <BoxXYZ key={"nsill" + y} x={[sf.x - post / 2, sf.x + post / 2]} y={[y - 0.15, y + 0.15]} z={[sf.zN, sf.z]} color={C.rail} />
      ))}
      {/* glass roof + rafters, sloping up to the building */}
      <group position={roofMid} rotation={[0, 0, -pitch]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[roofLen, zw]} />
          <meshBasicMaterial color="#cfe0e6" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {Array.from({ length: s.bays + 1 }, (_, k) => (
          <mesh key={k} position={[0, 0.15, -zw / 2 + (zw * k) / s.bays]}>
            <boxGeometry args={[roofLen + 0.3, 0.4, 0.3]} />
            <meshLambertMaterial color={C.rail} />
          </mesh>
        ))}
        {/* edge beam over the north leg / storefront */}
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
