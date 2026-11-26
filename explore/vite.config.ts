import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

// Standalone "walk the model" viewer. Reuses src/flyover/Building directly and
// serves the same public/ folder Remotion uses, so it always shows the current model.
// host 127.0.0.1 = only this computer can open it (nothing is exposed to the network).
export default defineConfig({
  root: here,
  publicDir: "../public",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5190, strictPort: true },
});
