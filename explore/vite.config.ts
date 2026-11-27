import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

// Receives the .glb that ExportGlb.tsx builds in the page and writes it to ONE
// fixed file in the project, out/graffiti-mill.glb. The page can't choose the
// path, so nothing else on disk can be written through it, and the server only
// listens on this computer (host 127.0.0.1 below).
const saveGlb = (): Plugin => ({
  name: "save-glb",
  configureServer(server) {
    server.middlewares.use("/__save-glb", (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("POST only");
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const file = path.resolve(here, "../out/graffiti-mill.glb");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(file, buf);
        res.end(`${file} (${buf.length} bytes)`);
      });
    });
  },
});

// Standalone "walk the model" viewer. Reuses src/flyover/Building directly and
// serves the same public/ folder Remotion uses, so it always shows the current model.
// host 127.0.0.1 = only this computer can open it (nothing is exposed to the network).
export default defineConfig({
  root: here,
  publicDir: "../public",
  plugins: [react(), saveGlb()],
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
});
