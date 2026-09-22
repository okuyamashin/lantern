import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { listAdventures, loadAdventure } from "../generate/archive.ts";
import type { Adventure, AdventureSummary } from "../types.ts";
import type { AssetPut } from "../jobs/types.ts";

export function createLocalPut(root: string): AssetPut {
  return async (relativePath, data) => {
    const filePath = join(root, "output", relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return `/output/${relativePath}`;
  };
}

export async function listLocalAdventures(root: string): Promise<AdventureSummary[]> {
  return listAdventures(root);
}

export async function loadLocalAdventure(root: string, id: string): Promise<Adventure> {
  return loadAdventure(root, id);
}

export async function readLocalJson(root: string, relativePath: string): Promise<string> {
  return readFile(join(root, "output", relativePath), "utf8");
}
