import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAdventure } from "../src/generate/run.ts";
import { createLocalPut } from "../src/storage/local.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = process.argv.slice(2).filter(Boolean);

const adventure = await generateAdventure({
  cardIds: ids.length ? ids : undefined,
  put: createLocalPut(root),
  onProgress: (event) => {
    if (event.type === "status") {
      console.log(event.message);
    } else if (event.type === "done") {
      console.log(`wrote output/adventures/${event.adventure.id}`);
      console.log(`${event.adventure.outcome}: ${event.adventure.title}`);
    } else if (event.type === "error") {
      console.error(event.message);
    }
  },
});

console.log(JSON.stringify({ id: adventure.id, scenes: adventure.scenes.length }, null, 2));
