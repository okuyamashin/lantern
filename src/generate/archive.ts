import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Adventure, AdventureSummary } from "../types.ts";
import { toAdventureSummary } from "./summary.ts";

export async function listAdventures(root: string): Promise<AdventureSummary[]> {
  const dir = join(root, "output/adventures");
  if (!existsSync(dir)) {
    return [];
  }

  const names = await readdir(dir);
  const items: AdventureSummary[] = [];

  for (const name of names) {
    try {
      items.push(toAdventureSummary(await readAdventureFile(root, name)));
    } catch {
      // 書きかけのフォルダは飛ばす
    }
  }

  return items.sort((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt);
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });
}

export async function loadAdventure(root: string, id: string): Promise<Adventure> {
  return readAdventureFile(root, id);
}

function assertSafeId(id: string): void {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) {
    throw new Error("紙芝居の指定が不正です。");
  }
}

async function readAdventureFile(root: string, id: string): Promise<Adventure> {
  assertSafeId(id);
  const file = join(root, "output/adventures", id, "adventure.json");
  if (!existsSync(file)) {
    throw new Error("その紙芝居は見つかりません。");
  }
  return JSON.parse(await readFile(file, "utf8")) as Adventure;
}

