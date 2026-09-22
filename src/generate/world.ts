import world from "../../data/world.json";
import type { Adventurer, Enemy, Place } from "../types.ts";

type WorldData = {
  places: Place[];
  enemies: Enemy[];
};

function loadWorld(): WorldData {
  return world as WorldData;
}

export function listEnemies(): Enemy[] {
  return loadWorld().enemies;
}

export function findEnemyByName(name?: string): Enemy | undefined {
  if (!name) {
    return undefined;
  }
  return loadWorld().enemies.find((enemy) => enemy.name === name);
}

export function pickPlace(): Place {
  return pickOne(loadWorld().places);
}

export function pickEnemy(): Enemy {
  return pickOne(loadWorld().enemies);
}

export function makeSubtitle(party: Adventurer[], place: Place, enemy: Enemy): string {
  return `${party.map((card) => card.name).join("・")} / ${place.name} / ${enemy.name}`;
}

function pickOne<T>(items: T[]): T {
  const picked = items[Math.floor(Math.random() * items.length)];
  if (!picked) {
    throw new Error("世界データが空です。");
  }
  return picked;
}
