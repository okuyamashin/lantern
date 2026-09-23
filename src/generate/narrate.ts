import type { Adventure } from "../types.ts";
import type { AssetPut } from "../jobs/types.ts";
import { loadAdventure } from "./archive.ts";
import { generateNarrationBuffer } from "./speech.ts";
import { createLocalPut } from "../storage/local.ts";

export function sceneNeedsNarration(audioPath?: string): boolean {
  return !audioPath || audioPath.startsWith("/output/");
}

export async function narrateAdventureAssets(options: {
  adventure: Adventure;
  put: AssetPut;
  force?: boolean;
  onStatus?: (message: string, index: number, total: number) => void | Promise<void>;
}): Promise<Adventure> {
  const { adventure, put } = options;
  const total = adventure.scenes.length;

  for (const [index, scene] of adventure.scenes.entries()) {
    if (!options.force && !sceneNeedsNarration(scene.audioPath)) {
      continue;
    }
    await options.onStatus?.(`${index + 1} / ${total} を読んでいます`, index + 1, total);
    scene.audioPath = await put(
      `adventures/${adventure.id}/scene-${String(index + 1).padStart(2, "0")}.mp3`,
      await generateNarrationBuffer(scene.caption),
      "audio/mpeg",
    );
  }

  await put(
    `adventures/${adventure.id}/adventure.json`,
    JSON.stringify(adventure, null, 2),
    "application/json",
  );
  return adventure;
}

export async function narrateAdventure(
  root: string,
  id: string,
  onStatus?: (message: string) => void,
): Promise<void> {
  const adventure = await loadAdventure(root, id);
  await narrateAdventureAssets({
    adventure,
    put: createLocalPut(root),
    force: true,
    onStatus: (message) => onStatus?.(message),
  });
}
