import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import pkg from "./package.json";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/main",
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
        "../../shared/types": resolve(__dirname, "src/shared/types.ts"),
        "../../shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/preload",
    },
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared"),
        "../../shared/types": resolve(__dirname, "src/shared/types.ts"),
        "../../shared": resolve(__dirname, "src/shared"),
      },
    },
  },
  renderer: {
    root: "src/renderer",
    build: {
      outDir: "dist-electron/renderer",
    },
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        "@renderer": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared"),
        "../../../../shared/types": resolve(__dirname, "src/shared/types.ts"),
        "../../../../shared": resolve(__dirname, "src/shared"),
      },
    },
    plugins: [react()],
  },
});
