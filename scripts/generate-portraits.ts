import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePortraits } from "../src/generate/portraits.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await generatePortraits(root, (message) => {
  console.log(message);
});

console.log("public/cards に肖像を書きました");
