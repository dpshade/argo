import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";
import { copyFileSync, mkdirSync } from "fs";

// Function to copy main.lua to public directory
function copyMainLua() {
  const sourceDir = path.resolve(__dirname, "ao");
  const targetDir = path.resolve(__dirname, "public", "ao");
  const fileName = "main.lua";

  // Create the target directory if it doesn't exist
  mkdirSync(targetDir, { recursive: true });

  // Copy the file
  copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));

  console.log(`Copied ${fileName} to public/ao directory`);
}

// Run the copy function
copyMainLua();

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    "process.env": {},
    global: {},
  },
  resolve: {
    alias: {
      stream: "stream-browserify",
      crypto: "crypto-browserify",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  publicDir: path.resolve(__dirname, "public"),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
