import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadCards } from "./cards.ts";
import { generatePortraitImage } from "./images.ts";

export async function generatePortraits(
  root: string,
  onStatus?: (message: string) => void,
): Promise<void> {
  const cards = loadCards();
  const dir = join(root, "public/cards");
  await mkdir(dir, { recursive: true });

  for (const [index, card] of cards.entries()) {
    onStatus?.(`${index + 1} / ${cards.length} ${card.name} の肖像`);
    await generatePortraitImage(card.portraitPrompt, join(dir, `${card.id}.png`));
    onStatus?.(`${index + 1} / ${cards.length} ${card.name} を書きました`);
  }
}
