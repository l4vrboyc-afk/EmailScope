import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite aims to use ECMAScript built-ins for core helpers, but for Tauri
  // we need to target modern browsers since we ship a real WebView.
  clearScreen: false,
  // Tauri environment needs a fixed port for the dev server.
  server: {
    port: 5177,
    strictPort: false,
    proxy: {
      // Local dev: forward API + health calls to the FastAPI backend.
      // In production (Vercel) this is bypassed — the frontend calls
      // VITE_API_URL directly via src/services/api.ts.
      "/api": {
        target: process.env.VITE_API_PROXY || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: process.env.VITE_API_PROXY || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Use a base path for production to avoid CSP issues with inline scripts.
  // In Tauri, the assets are served from the local filesystem.
  base: "./",
});

