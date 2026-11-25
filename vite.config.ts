import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const targetApiUrl = env.VITE_API_URL || "https://api-dev.edvanz.co/api";
  const proxyTarget = targetApiUrl.startsWith("http")
    ? new URL(targetApiUrl).origin
    : "https://api-dev.edvanz.co";

  const wpApiUrl =
    env.VITE_WORDPRESS_API_BASE_URL || "https://cms.edvanz.co/wp-json/edvanz/v1";
  const wpProxyTarget = wpApiUrl.startsWith("http")
    ? new URL(wpApiUrl).origin
    : "http://edvanz-cms.local";

  return {
    server: {
      host: "::",
      port: 3000,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/wp-json": {
          target: wpProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: ["es2020", "safari14", "ios14"],
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
            ],
            "vendor-motion": ["framer-motion"],
            "vendor-charts": ["recharts"],
            "vendor-pdf": ["jspdf"],
            "vendor-excel": ["xlsx"],
          },
        },
      },
    },
  };
});
