import { writeFile } from "node:fs/promises";
import { getOpenAI } from "./openai.ts";
import { withEnemySketchStyle, withPortraitStyle, withSceneStyle } from "./style.ts";

export async function generateSceneImageBuffer(prompt: string): Promise<Buffer> {
  return createImage(withSceneStyle(prompt), "landscape", "jpeg");
}

export function isJpeg(buffer: Buffer): boolean {
  return buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

export async function generateSceneImage(
  prompt: string,
  filePath: string,
): Promise<void> {
  await writeFile(filePath, await generateSceneImageBuffer(prompt));
}

export async function generatePortraitBuffer(prompt: string): Promise<Buffer> {
  return createImage(withPortraitStyle(prompt), "portrait", "jpeg");
}

export async function generatePortraitImage(
  prompt: string,
  filePath: string,
): Promise<void> {
  await writeFile(filePath, await generatePortraitBuffer(prompt));
}

export async function generateEnemySketchBuffer(prompt: string): Promise<Buffer> {
  return createImage(withEnemySketchStyle(prompt), "square", "jpeg");
}

export async function generateEnemySketch(
  prompt: string,
  filePath: string,
): Promise<void> {
  await writeFile(filePath, await generateEnemySketchBuffer(prompt));
}

async function createImage(
  prompt: string,
  shape: "landscape" | "portrait" | "square",
  format: "png" | "jpeg" = "png",
): Promise<Buffer> {
  const openai = getOpenAI();

  try {
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: gptImageSize(shape),
      ...(format === "jpeg" ? { output_format: "jpeg" as const, quality: "medium" as const } : {}),
    });
    return imageToBuffer(result.data?.[0]);
  } catch {
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: dalleSize(shape),
      quality: "standard",
      response_format: "b64_json",
    });
    return imageToBuffer(result.data?.[0]);
  }
}

function gptImageSize(shape: "landscape" | "portrait" | "square") {
  if (shape === "landscape") {
    return "1536x1024";
  }
  if (shape === "portrait") {
    return "1024x1536";
  }
  return "1024x1024";
}

function dalleSize(shape: "landscape" | "portrait" | "square") {
  if (shape === "landscape") {
    return "1792x1024";
  }
  if (shape === "portrait") {
    return "1024x1792";
  }
  return "1024x1024";
}

async function imageToBuffer(image?: {
  b64_json?: string | null;
  url?: string | null;
}): Promise<Buffer> {
  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }
  if (image?.url) {
    const response = await fetch(image.url);
    if (!response.ok) {
      throw new Error("画像の取得に失敗しました。");
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("画像データが返りませんでした。");
}
