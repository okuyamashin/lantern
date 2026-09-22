import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { toAdventureSummary } from "../generate/summary.ts";
import type { Adventure, AdventureSummary } from "../types.ts";
import type { AssetPut } from "../jobs/types.ts";

export function createS3Put(bucket: string, region: string, publicBase: string): AssetPut {
  const client = new S3Client({ region });
  return async (relativePath, data, contentType) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: relativePath,
        Body: typeof data === "string" ? data : data,
        ContentType: contentType,
      }),
    );
    return `${publicBase.replace(/\/$/, "")}/${relativePath}`;
  };
}

export async function loadS3Adventure(
  bucket: string,
  region: string,
  id: string,
): Promise<Adventure> {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    throw new Error("紙芝居の指定が不正です。");
  }
  const client = new S3Client({ region });
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: `adventures/${id}/adventure.json` }),
  );
  const text = await result.Body?.transformToString();
  if (!text) {
    throw new Error("その紙芝居は見つかりません。");
  }
  return JSON.parse(text) as Adventure;
}

export async function listS3Adventures(
  bucket: string,
  region: string,
): Promise<AdventureSummary[]> {
  const client = new S3Client({ region });
  const result = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: "adventures/" }),
  );
  const keys = (result.Contents ?? [])
    .map((item) => item.Key ?? "")
    .filter((key) => key.endsWith("/adventure.json"));
  const items: AdventureSummary[] = [];
  for (const key of keys) {
    const id = key.slice("adventures/".length, -"/adventure.json".length);
    try {
      const adventure = await loadS3Adventure(bucket, region, id);
      items.push(toAdventureSummary(adventure));
    } catch {
      // 書きかけは飛ばす
    }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
