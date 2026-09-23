import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { narrateAdventure } from "../src/generate/narrate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2] || "1790075209358-iris-bren-merwin-ciel";

await narrateAdventure(root, id, (message) => {
  console.log(message);
});

console.log(`${id} に読み上げを書きました`);
