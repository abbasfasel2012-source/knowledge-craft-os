// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
// - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only, edge worker output),
// componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
// error logger plugins, and sandbox detection (port/host/strictPort).
// Extra config goes inside defineConfig({ vite: { ... } }).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    build: {
      minify: "terser",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["@tanstack/react-router"],
            query: ["@tanstack/react-query"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-tabs"],
          },
        },
      },
    },
  },
});
