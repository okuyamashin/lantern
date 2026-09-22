import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateEnemySketches } from "../src/generate/enemies.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await generateEnemySketches(root, (message) => {
  console.log(message);
});

console.log("public/enemies に依頼メモ用のスケッチを書きました");
