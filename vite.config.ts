import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { adventurePlugin } from "./src/server/plugin.ts";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  for (const key of [
    "OPENAI_API_KEY",
    "AWS_REGION",
    "JOBS_TABLE",
    "JOBS_QUEUE_URL",
    "ADVENTURE_BUCKET",
    "ADVENTURE_PUBLIC_BASE",
  ]) {
    if (env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [adventurePlugin(root)],
    publicDir: join(root, "public"),
    build: {
      outDir: join(root, "dist/web"),
    },
    server: {
      port: 5173,
    },
  };
});
