import type { Adventurer, Enemy, Place, StoryDraft } from "../types.ts";
import { getOpenAI } from "./openai.ts";
import type OpenAI from "openai";

const SYSTEM = `あなたは日本語の紙芝居作家です。
与えられた4人の冒険者と、指定された場所・敵だけで、短いAVG風の冒険を書いてください。
戦闘コマンドや数値は出しません。場面の絵とナレーションだけで進みます。
結末は必ず冒険の成功です。途中で苦戦してよいですが、最後は勝ちます。

必ず JSON だけを返してください。
{
  "outcome": "success",
  "title": "短い題名。場所名も敵名も入れない",
  "scenes": [
    { "caption": "日本語のナレーション。2〜4文。", "imagePrompt": "その場面の英語の絵の指示。" }
  ]
}

ルール:
- scenes はちょうど 8
- outcome は必ず success
- 4人全員を物語に出す
- 指定された場所から始め、指定された敵と対峙し、打ち勝つ
- caption は日本語。imagePrompt は英語で、人物・場所・敵の見た目を具体的に書く
- 絵には冒険者を最大4人まで。5人目は描かない
- 画像に文字を入れない
- 最後の1枚で勝利が分かる`;

export async function writeStory(
  party: Adventurer[],
  place: Place,
  enemy: Enemy,
): Promise<StoryDraft> {
  const openai = getOpenAI();
  const roster = party
    .map((card) => `- ${card.name}（${card.role}）: ${card.trait}`)
    .join("\n");

  const messages = [
    { role: "system" as const, content: SYSTEM },
    {
      role: "user" as const,
      content: [
        "この4人の旅を、必ず成功で書いてください。",
        roster,
        "",
        `場所: ${place.name} — ${place.blurb}`,
        `敵: ${enemy.name} — ${enemy.blurb}`,
      ].join("\n"),
    },
  ];
  const completion = await createStory(openai, messages);

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("ストーリーが空でした。");
  }

  const draft = JSON.parse(text) as StoryDraft;
  return normalizeStory(draft);
}

async function createStory(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) {
  const request = {
    model: "gpt-6-astra",
    response_format: { type: "json_object" as const },
    messages,
  };
  try {
    return await openai.chat.completions.create({ ...request, temperature: 0.95 });
  } catch (error) {
    if (!rejectsTemperature(error)) {
      throw error;
    }
    return openai.chat.completions.create(request);
  }
}

function rejectsTemperature(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("temperature");
}

function normalizeStory(draft: StoryDraft): StoryDraft {
  const scenes = (Array.isArray(draft.scenes) ? draft.scenes : [])
    .filter((scene) => scene?.caption && scene?.imagePrompt)
    .slice(0, 8);

  if (scenes.length < 8) {
    throw new Error("場面の数が足りません。もう一度生成してください。");
  }

  return {
    outcome: "success",
    title: draft.title?.trim() || "帰路",
    scenes,
  };
}
