import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCards } from "./cards.ts";
import { generatePortraitBuffer, isJpeg } from "./images.ts";

export async function generatePortraits(
  root: string,
  onStatus?: (message: string) => void,
): Promise<void> {
  const cards = loadCards();
  const dir = join(root, "public/cards");
  await mkdir(dir, { recursive: true });

  for (const [index, card] of cards.entries()) {
    onStatus?.(`${index + 1} / ${cards.length} ${card.name} の肖像`);
    const buffer = await generatePortraitBuffer(card.portraitPrompt);
    const ext = isJpeg(buffer) ? "jpg" : "png";
    await writeFile(join(dir, `${card.id}.${ext}`), buffer);
    onStatus?.(`${index + 1} / ${cards.length} ${card.name} を書きました`);
  }
}
