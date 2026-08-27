import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Use the project's SSR server entry.
    server: { entry: "server" },
  },
  // Render runs a standard Node.js web service, so Nitro must emit
  // a runnable Node server instead of the default Cloudflare worker build.
  nitro: {
    preset: "node-server",
  },
});
