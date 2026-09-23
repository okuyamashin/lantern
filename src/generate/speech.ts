import { writeFile } from "node:fs/promises";
import { getOpenAI } from "./openai.ts";

export async function generateNarrationBuffer(caption: string): Promise<Buffer> {
  const openai = getOpenAI();
  const text = caption.trim();
  if (!text) {
    throw new Error("読み上げる文が空です。");
  }

  try {
    const result = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: text,
      instructions: "Speak Japanese as a calm kamishibai narrator. Warm, unhurried, close to the picture. Do not act out many character voices.",
    });
    return Buffer.from(await result.arrayBuffer());
  } catch {
    const result = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "nova",
      input: text,
    });
    return Buffer.from(await result.arrayBuffer());
  }
}

export async function generateNarrationFile(caption: string, filePath: string): Promise<void> {
  await writeFile(filePath, await generateNarrationBuffer(caption));
}
