import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";
import sharp from "sharp";
import type { Adventure } from "../src/types.ts";

config();

const region = process.env.AWS_REGION || "ap-northeast-1";
const bucket = process.env.ADVENTURE_BUCKET || "lantern-api-adventurebucket-ztxkysqfybik";
const publicBase =
  process.env.ADVENTURE_PUBLIC_BASE ||
  `https://${bucket}.s3.${region}.amazonaws.com`;

const client = new S3Client({ region });
const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "adventures/" }));
const ids = (listed.Contents ?? [])
  .map((item) => item.Key ?? "")
  .filter((key) => key.endsWith("/adventure.json"))
  .map((key) => key.slice("adventures/".length, -"/adventure.json".length));

for (const id of ids) {
  const adventure = await loadAdventure(id);
  let changed = false;
  for (const [index, scene] of adventure.scenes.entries()) {
    if (!scene.imagePath || !scene.imagePath.includes(".png")) {
      continue;
    }
    const sourceKey = keyFromUrl(scene.imagePath, id, index);
    const png = await getObject(sourceKey);
    if (!png) {
      console.log(`${id} scene ${index + 1}: PNG が読めません`);
      continue;
    }
    const jpg = await sharp(png).jpeg({ quality: 80 }).toBuffer();
    const destKey = `adventures/${id}/scene-${String(index + 1).padStart(2, "0")}.jpg`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: destKey,
        Body: jpg,
        ContentType: "image/jpeg",
      }),
    );
    scene.imagePath = `${publicBase.replace(/\/$/, "")}/${destKey}`;
    changed = true;
    console.log(`${id} ${index + 1}: ${png.length} -> ${jpg.length}`);
  }
  if (!changed) {
    continue;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `adventures/${id}/adventure.json`,
      Body: JSON.stringify(adventure, null, 2),
      ContentType: "application/json",
    }),
  );
}

console.log("場面絵を JPEG にしました");

async function loadAdventure(id: string): Promise<Adventure> {
  const text = await getObject(`adventures/${id}/adventure.json`);
  if (!text) {
    throw new Error(`${id} がありません`);
  }
  return JSON.parse(text.toString("utf8")) as Adventure;
}

async function getObject(key: string): Promise<Buffer | null> {
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

function keyFromUrl(imagePath: string, id: string, index: number): string {
  try {
    const url = new URL(imagePath);
    return url.pathname.replace(/^\//, "");
  } catch {
    return `adventures/${id}/scene-${String(index + 1).padStart(2, "0")}.png`;
  }
}
