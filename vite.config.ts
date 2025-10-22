import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Ajustá 'base' si cambiás el nombre del repo
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/maderna-app/" : "/",
  build: { sourcemap: true },
});
