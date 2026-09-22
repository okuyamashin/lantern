import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { generateEnemySketch } from "./images.ts";
import { listEnemies } from "./world.ts";

export async function generateEnemySketches(
  root: string,
  onStatus?: (message: string) => void,
): Promise<void> {
  const enemies = listEnemies();
  const dir = join(root, "public/enemies");
  await mkdir(dir, { recursive: true });

  for (const [index, enemy] of enemies.entries()) {
    onStatus?.(`${index + 1} / ${enemies.length} ${enemy.name} のスケッチ`);
    await generateEnemySketch(
      `Hand-drawn ink sketch of ${enemy.name}: ${enemy.imageHint}`,
      join(dir, `${enemy.id}.png`),
    );
    onStatus?.(`${index + 1} / ${enemies.length} ${enemy.name} を書きました`);
  }
}
