import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  build: {
    target: "ES2020",
    minify: "terser",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": ["react", "react-dom"],
          "router": ["@tanstack/react-router"],
          "query": ["@tanstack/react-query"],
          "ui": ["@radix-ui/react-dialog", "@radix-ui/react-tabs"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    cors: true,
  },
  preview: {
    port: 4173,
  },
});
