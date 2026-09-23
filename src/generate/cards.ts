import records from "../../data/adventurers.json";
import type { Adventurer } from "../types.ts";

type CardRecord = Omit<Adventurer, "portrait">;

export function loadCards(): Adventurer[] {
  return (records as CardRecord[]).map((card) => ({
    ...card,
    portrait: resolvePortrait(card.id),
  }));
}

export function pickParty(ids?: string[]): Adventurer[] {
  const cards = loadCards();
  if (ids && ids.length > 0) {
    const party = ids.map((id) => {
      const card = cards.find((item) => item.id === id);
      if (!card) {
        throw new Error(`未知の冒険者です: ${id}`);
      }
      return card;
    });
    if (party.length !== 4) {
      throw new Error("パーティは4人です。");
    }
    return party;
  }

  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function resolvePortrait(id: string): string {
  return `/cards/${id}.jpg`;
}
