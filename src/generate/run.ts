import type { Adventure, Adventurer, Enemy, Place, ProgressEvent } from "../types.ts";
import type { AssetPut } from "../jobs/types.ts";
import { pickParty } from "./cards.ts";
import { generateEnemySketchBuffer, generateSceneImageBuffer, isJpeg } from "./images.ts";
import { generateNarrationBuffer } from "./speech.ts";
import { inventEnemy, inventPlace } from "./setting.ts";
import { writeStory } from "./story.ts";
import { makeSubtitle } from "./world.ts";

export async function generateAdventure(options: {
  id?: string;
  cardIds?: string[];
  put: AssetPut;
  onProgress?: (event: ProgressEvent) => void | Promise<void>;
}): Promise<Adventure> {
  const notify = options.onProgress ?? (() => undefined);
  const party = pickParty(options.cardIds);
  const id = options.id || `${Date.now()}-${party.map((card) => card.id).join("-")}`;

  await notify({ type: "status", message: "場所を考えています" });
  const place = await inventPlace();
  await notify({ type: "status", message: "敵を考えています" });
  const enemy = await inventEnemy();
  await notify({ type: "status", message: `${enemy.name}のスケッチを描いています` });
  const sketch = await generateEnemySketchBuffer(
    `Hand-drawn ink sketch of ${enemy.name}: ${enemy.imageHint}`,
  );
  const sketchJpeg = isJpeg(sketch);
  enemy.imagePath = await options.put(
    `adventures/${id}/enemy.${sketchJpeg ? "jpg" : "png"}`,
    sketch,
    sketchJpeg ? "image/jpeg" : "image/png",
  );
  const subtitle = makeSubtitle(party, place, enemy);

  await notify({ type: "status", message: `${place.name}で${enemy.name}に向かいます` });
  const draft = await writeStory(party, place, enemy);

  const scenes = [];
  for (const [index, scene] of draft.scenes.entries()) {
    await notify({
      type: "status",
      message: `${index + 1} / ${draft.scenes.length} 枚目の絵を描いています`,
    });
    const buffer = await generateSceneImageBuffer(withSceneHint(scene.imagePrompt, party, place, enemy));
    const jpeg = isJpeg(buffer);
    const fileName = `scene-${String(index + 1).padStart(2, "0")}.${jpeg ? "jpg" : "png"}`;
    const imagePath = await options.put(
      `adventures/${id}/${fileName}`,
      buffer,
      jpeg ? "image/jpeg" : "image/png",
    );
    await notify({
      type: "status",
      message: `${index + 1} / ${draft.scenes.length} 枚目を読んでいます`,
    });
    const audioPath = await options.put(
      `adventures/${id}/scene-${String(index + 1).padStart(2, "0")}.mp3`,
      await generateNarrationBuffer(scene.caption),
      "audio/mpeg",
    );
    scenes.push({ ...scene, imagePath, audioPath });
    await notify({
      type: "scene",
      index: index + 1,
      total: draft.scenes.length,
      caption: scene.caption,
      imagePath,
    });
  }

  const adventure: Adventure = {
    id,
    createdAt: new Date().toISOString(),
    outcome: draft.outcome,
    title: draft.title,
    subtitle,
    place,
    enemy,
    party,
    scenes,
  };

  await options.put(
    `adventures/${id}/adventure.json`,
    JSON.stringify(adventure, null, 2),
    "application/json",
  );
  await notify({ type: "done", adventure });
  return adventure;
}

function withSceneHint(
  prompt: string,
  party: Adventurer[],
  place: Place,
  enemy: Enemy,
): string {
  const looks = party
    .map((card) => `${card.name} the ${card.role}`)
    .join(", ");
  return [
    prompt,
    `Exactly four adventurers, no fifth person: ${looks}`,
    `Setting: ${place.name}, ${place.imageHint}`,
    `Enemy when shown: ${enemy.name}, ${enemy.imageHint}`,
  ].join(". ");
}
