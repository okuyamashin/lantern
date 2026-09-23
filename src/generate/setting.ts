import world from "../../data/world.json";
import type { Enemy, Place } from "../types.ts";
import { getOpenAI } from "./openai.ts";

const places = world.places
  .map((place) => `- ${place.name}: ${place.blurb}`)
  .join("\n");
const enemies = world.enemies
  .map((enemy) => `- ${enemy.name}: ${enemy.blurb}`)
  .join("\n");

export async function inventPlace(): Promise<Place> {
  const draft = await askJson<Place>(
    `あなたは和風ファンタジーの紙芝居の舞台を考える人です。
毎回、まだない新しい場所を1つだけ考えてください。見本の名前や言い回しは真似しないでください。
必ず JSON だけを返してください。
{
  "id": "英語の短いスラッグ。小文字とハイフンだけ",
  "name": "日本語の短い地名",
  "blurb": "その場所の短い説明。1文",
  "imageHint": "英語の絵の指示。場所の見た目"
}`,
    `見本（真似しない）:\n${places}\n\n新しい場所を1つ返してください。`,
  );
  return normalizePlace(draft);
}

export async function inventEnemy(): Promise<Enemy> {
  const draft = await askJson<Enemy>(
    `あなたは和風ファンタジーの紙芝居の敵を考える人です。
毎回、まだない新しい敵を1体だけ考えてください。見本の名前や言い回しは真似しないでください。
必ず JSON だけを返してください。
{
  "id": "英語の短いスラッグ。小文字とハイフンだけ",
  "name": "日本語の短い敵の名",
  "blurb": "その敵の短い説明。1文",
  "imageHint": "英語の絵の指示。敵の見た目。一人の怪物として描けること"
}`,
    `見本（真似しない）:\n${enemies}\n\n新しい敵を1体返してください。`,
  );
  return normalizeEnemy(draft);
}

async function askJson<T>(system: string, user: string): Promise<T> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.95,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("場所か敵が空でした。");
  }
  return JSON.parse(text) as T;
}

function normalizePlace(draft: Place): Place {
  return {
    id: slug(draft.id, "place"),
    name: required(draft.name, "場所の名前"),
    blurb: required(draft.blurb, "場所の説明"),
    imageHint: required(draft.imageHint, "場所の絵"),
  };
}

function normalizeEnemy(draft: Enemy): Enemy {
  return {
    id: slug(draft.id, "enemy"),
    name: required(draft.name, "敵の名前"),
    blurb: required(draft.blurb, "敵の説明"),
    imageHint: required(draft.imageHint, "敵の絵"),
  };
}

function required(value: string | undefined, label: string): string {
  const text = value?.trim();
  if (!text) {
    throw new Error(`${label}が足りません。もう一度生成してください。`);
  }
  return text;
}

function slug(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `${fallback}-${Date.now()}`;
}
