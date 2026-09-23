import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import tracks from "../data/suno-bgm.json";

config();

type BgmTrack = {
  id: string;
  title: string;
  use: string;
  style: string;
  prompt: string;
  exclude: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wanted = parseIds(process.argv.slice(2));
const generate = process.argv.includes("--generate");
const selected = (tracks as BgmTrack[]).filter(
  (track) => wanted.length === 0 || wanted.includes(track.id),
);

if (selected.length === 0) {
  throw new Error("指定した id の曲がありません。");
}

for (const track of selected) {
  printPrompt(track);
}

if (!generate) {
  console.log("Suno の Custom で Instrumental をオンにし、Style に style を貼ってください。");
  console.log("API で作るとき: SUNO_API_KEY を .env に入れて npm run suno:bgm -- --generate");
  process.exit(0);
}

const apiKey = process.env.SUNO_API_KEY?.trim();
if (!apiKey) {
  throw new Error("SUNO_API_KEY が .env にありません。");
}

const apiBase = (process.env.SUNO_API_BASE || "https://api.sunoapi.org").replace(/\/$/, "");
const callbackUrl = process.env.SUNO_CALLBACK_URL || "https://example.com/suno-callback";
const outDir = join(root, "public/bgm");
await mkdir(outDir, { recursive: true });

for (const track of selected) {
  console.log(`生成中: ${track.id}`);
  const taskId = await startTask(apiBase, apiKey, callbackUrl, track);
  const files = await waitForTask(apiBase, apiKey, taskId);
  for (const [index, file] of files.entries()) {
    const name = `${track.id}${files.length > 1 ? `-${index + 1}` : ""}.mp3`;
    await download(file, join(outDir, name));
    console.log(`wrote public/bgm/${name}`);
  }
}

function parseIds(argv: string[]): string[] {
  const ids: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--id" && argv[index + 1]) {
      ids.push(argv[index + 1] ?? "");
      index += 1;
    }
  }
  return ids.filter(Boolean);
}

function printPrompt(track: BgmTrack): void {
  console.log("");
  console.log(`# ${track.id}`);
  console.log(`用途: ${track.use}`);
  console.log(`Title: ${track.title}`);
  console.log("Instrumental: ON");
  console.log(`Style:\n${track.style}`);
  console.log(`Exclude:\n${track.exclude}`);
  console.log(`Notes:\n${track.prompt}`);
}

async function startTask(
  apiBase: string,
  apiKey: string,
  callbackUrl: string,
  track: BgmTrack,
): Promise<string> {
  const response = await fetch(`${apiBase}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customMode: true,
      instrumental: true,
      title: track.title,
      style: `${track.style}. Avoid: ${track.exclude}`,
      prompt: "",
      model: process.env.SUNO_MODEL || "V5",
      callBackUrl: callbackUrl,
    }),
  });
  const body = (await response.json()) as { data?: { taskId?: string }; msg?: string };
  const taskId = body.data?.taskId;
  if (!response.ok || !taskId) {
    throw new Error(body.msg || `Suno の生成開始に失敗しました (${response.status})`);
  }
  return taskId;
}

async function waitForTask(
  apiBase: string,
  apiKey: string,
  taskId: string,
): Promise<string[]> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(
      `${apiBase}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const body = (await response.json()) as {
      data?: {
        status?: string;
        response?: { data?: Array<{ audio_url?: string; audioUrl?: string }> };
      };
    };
    const status = body.data?.status ?? "";
    if (status === "SUCCESS") {
      const urls = (body.data?.response?.data ?? [])
        .map((item) => item.audio_url || item.audioUrl)
        .filter((url): url is string => Boolean(url));
      if (urls.length === 0) {
        throw new Error("Suno から音源 URL が返りませんでした。");
      }
      return urls;
    }
    if (status === "FAILED" || status === "ERROR" || status === "CREATE_TASK_FAILED") {
      throw new Error(`Suno の生成に失敗しました: ${status}`);
    }
    await wait(8000);
  }
  throw new Error("Suno の生成が時間切れになりました。");
}

async function download(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`音源の取得に失敗しました (${response.status})`);
  }
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
