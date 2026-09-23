import { readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/enemies");
const names = (await readdir(dir)).filter((name) => name.endsWith(".png"));

for (const name of names) {
  const src = join(dir, name);
  const dest = join(dir, name.replace(/\.png$/, ".jpg"));
  const jpg = await sharp(src).jpeg({ quality: 80 }).toBuffer();
  await writeFile(dest, jpg);
  await unlink(src);
  console.log(`${name} -> ${name.replace(/\.png$/, ".jpg")} ${jpg.length} bytes`);
}

console.log(`${names.length} 枚の敵スケッチを JPEG にしました`);
