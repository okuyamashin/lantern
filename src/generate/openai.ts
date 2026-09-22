import { config } from "dotenv";
import OpenAI from "openai";

config();

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY がありません。.env に新しいキーを書いてください。",
    );
  }

  return new OpenAI({
    apiKey,
    timeout: 120_000,
    maxRetries: 3,
  });
}

export function explainOpenAIError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "生成に失敗しました。";
  }

  const status = "status" in error ? Number(error.status) : undefined;
  if (status === 401) {
    return "OpenAI のキーが拒否されました。失効していない新しいキーを .env に書いてください。";
  }
  if (status === 429) {
    return "OpenAI の利用上限に当たりました。しばらく待ってから再試行してください。";
  }
  if (error.name === "APIConnectionError" || error.message === "Connection error.") {
    return "OpenAI に繋がりませんでした。開発サーバを通常のターミナルで再起動してください。";
  }
  if (error.name === "APIConnectionTimeoutError") {
    return "OpenAI が時間切れになりました。もう一度出発してください。";
  }
  return error.message;
}
