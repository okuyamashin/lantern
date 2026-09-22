import type { Adventure, AdventureSummary } from "../types.ts";
import { findEnemyByName } from "./world.ts";

export function toAdventureSummary(adventure: Adventure): AdventureSummary {
  const enemy = adventure.enemy ?? findEnemyByName(adventure.subtitle.split(" / ").at(-1));
  return {
    id: adventure.id,
    createdAt: adventure.createdAt,
    title: adventure.title,
    outcome: adventure.outcome,
    subtitle:
      adventure.subtitle ||
      [
        adventure.party.map((card) => card.name).join("・"),
        adventure.place?.name,
        enemy?.name,
      ]
        .filter(Boolean)
        .join(" / "),
    partyNames: adventure.party.map((card) => card.name),
    coverPath: enemy ? `/enemies/${enemy.id}.png` : (adventure.scenes[0]?.imagePath ?? ""),
    sceneCount: adventure.scenes.length,
    enemyId: enemy?.id,
    enemyName: enemy?.name,
    placeName: adventure.place?.name,
  };
}
