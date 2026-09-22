import type { Adventure, Adventurer, Enemy, Place, ProgressEvent } from "../types.ts";
import type { AssetPut } from "../jobs/types.ts";
import { pickParty } from "./cards.ts";
import { generateSceneImageBuffer } from "./images.ts";
import { writeStory } from "./story.ts";
import { makeSubtitle, pickEnemy, pickPlace } from "./world.ts";

export async function generateAdventure(options: {
  id?: string;
  cardIds?: string[];
  put: AssetPut;
  onProgress?: (event: ProgressEvent) => void | Promise<void>;
}): Promise<Adventure> {
  const notify = options.onProgress ?? (() => undefined);
  const party = pickParty(options.cardIds);
  const place = pickPlace();
  const enemy = pickEnemy();
  const subtitle = makeSubtitle(party, place, enemy);
  const id = options.id || `${Date.now()}-${party.map((card) => card.id).join("-")}`;

  await notify({ type: "status", message: `${place.name}で${enemy.name}に向かいます` });
  const draft = await writeStory(party, place, enemy);

  const scenes = [];
  for (const [index, scene] of draft.scenes.entries()) {
    await notify({
      type: "status",
      message: `${index + 1} / ${draft.scenes.length} 枚目の絵を描いています`,
    });
    const fileName = `scene-${String(index + 1).padStart(2, "0")}.png`;
    const buffer = await generateSceneImageBuffer(withSceneHint(scene.imagePrompt, party, place, enemy));
    const imagePath = await options.put(
      `adventures/${id}/${fileName}`,
      buffer,
      "image/png",
    );
    scenes.push({ ...scene, imagePath });
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
