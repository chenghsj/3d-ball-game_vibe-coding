import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Get the repo name from package.json or environment variables
// For GitHub Pages, the base URL is usually /your-repo-name/
const getBase = () => {
  // Use GITHUB_REPOSITORY environment variable in GitHub Actions
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  return repo ? `/${repo}/` : "/";
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: getBase(),
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  build: {
    sourcemap: true,
    assetsDir: "assets",
    // Ensure that assets from the public directory are correctly copied
    copyPublicDir: true,
  },
  publicDir: resolve(__dirname, "public"),
});
