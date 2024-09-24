import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";
import { copyFileSync, mkdirSync } from "fs";

function copyMainLua() {
  const sourceDir = path.resolve(__dirname, "ao");
  const targetDir = path.resolve(__dirname, "public", "ao");
  const fileName = "main.lua";

  mkdirSync(targetDir, { recursive: true });
  copyFileSync(path.join(sourceDir, fileName), path.join(targetDir, fileName));
  console.log(`Copied ${fileName} to public/ao directory`);
}

copyMainLua();

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";

  return {
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
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
    },
    resolve: {
      alias: {
        stream: "stream-browserify",
        crypto: "crypto-browserify",
      },
    },
    optimizeDeps: {
      include: [
        "vue",
        "@permaweb/aoconnect",
        "arweavekit/auth",
        "quick-wallet",
        "arweave-wallet-connector",
        "ar-gql",
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    publicDir: path.resolve(__dirname, "public"),
    build: {
      sourcemap: false,
      minify: isProduction ? "terser" : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          }
        : undefined,
      target: "es2015",
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          entryFileNames: `assets/main.js`,
          chunkFileNames: `assets/main.js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === "style.css") return "assets/main.css";
            return `assets/${assetInfo.name}`;
          },
          manualChunks: undefined,
        },
      },
      cssCodeSplit: false,
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
    },
  };
});
