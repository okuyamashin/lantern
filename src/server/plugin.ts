import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadCards } from "../generate/cards.ts";
import { createRuntime } from "../jobs/runtime.ts";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

export function adventurePlugin(root: string): Plugin {
  const jobs = createRuntime(root);
  const handle = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    void route(root, jobs, req, res, next);
  };

  return {
    name: "adventure-api",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

async function route(
  root: string,
  jobs: ReturnType<typeof createRuntime>,
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): Promise<void> {
  const url = req.url?.split("?")[0] ?? "";

  try {
    if (req.method === "GET" && url === "/api/adventurers") {
      json(res, 200, loadCards());
      return;
    }

    if (req.method === "POST" && url === "/api/jobs") {
      const body = await readJson<{ cardIds?: string[] }>(req);
      const job = await jobs.startJob(body.cardIds ?? []);
      json(res, 202, { id: job.id, status: job.status, message: job.message });
      return;
    }

    if (req.method === "GET" && url.startsWith("/api/jobs/")) {
      const job = await jobs.getJob(decodeURIComponent(url.slice("/api/jobs/".length)));
      if (!job) {
        json(res, 404, { message: "ジョブが見つかりません。" });
        return;
      }
      json(res, 200, job);
      return;
    }

    if (req.method === "GET" && url === "/api/adventures") {
      json(res, 200, await jobs.listAdventures());
      return;
    }

    if (req.method === "GET" && url.startsWith("/api/adventures/")) {
      json(
        res,
        200,
        await jobs.loadAdventure(decodeURIComponent(url.slice("/api/adventures/".length))),
      );
      return;
    }

    if (req.method === "GET" && url.startsWith("/output/")) {
      serveOutput(root, url, res);
      return;
    }
  } catch (error) {
    json(res, 500, {
      message: error instanceof Error ? error.message : "サーバーエラーです。",
    });
    return;
  }

  next();
}

function serveOutput(root: string, url: string, res: ServerResponse): void {
  const relative = decodeURIComponent(url.replace(/^\/output\//, ""));
  const file = normalize(join(root, "output", relative));
  const allowed = join(root, "output") + sep;
  if (!file.startsWith(allowed) || !existsSync(file) || statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        reject(new Error("JSON が読めませんでした。"));
      }
    });
    req.on("error", reject);
  });
}
