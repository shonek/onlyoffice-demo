import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue"],
          "element-plus": ["element-plus"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/files": "http://localhost:3001",
      "/copy": "http://localhost:3001",
    },
  },
});
