import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateEnemySketchBuffer, isJpeg } from "./images.ts";
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
    const buffer = await generateEnemySketchBuffer(
      `Hand-drawn ink sketch of ${enemy.name}: ${enemy.imageHint}`,
    );
    const ext = isJpeg(buffer) ? "jpg" : "png";
    await writeFile(join(dir, `${enemy.id}.${ext}`), buffer);
    onStatus?.(`${index + 1} / ${enemies.length} ${enemy.name} を書きました`);
  }
}
