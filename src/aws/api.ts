import { loadCards } from "../generate/cards.ts";
import { emailFromToken, isGuildEmail } from "../guild.ts";
import { createRuntime } from "../jobs/runtime.ts";

const jobs = createRuntime("/tmp");
const allowedOrigins = new Set(["https://lantern.engawa5656.com", "http://localhost:5173"]);

type HttpEvent = {
  rawPath?: string;
  path?: string;
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: { method?: string };
    authorizer?: { jwt?: { claims?: Record<string, string | undefined> } };
  };
  httpMethod?: string;
  body?: string | null;
};

export async function handler(event: HttpEvent) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.rawPath || event.path || "/";
  const headers = corsHeaders(event);

  try {
    if (method === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }
    if (method === "GET" && path === "/api/adventurers") {
      return ok(headers, loadCards());
    }
    if (method === "POST" && path === "/api/jobs/narrate") {
      if (!isGuildRequest(event)) {
        return json(headers, 403, { message: "ギルドの鍵が必要です。" });
      }
      const body = event.body ? (JSON.parse(event.body) as { ids?: string[] }) : {};
      const started = await jobs.startNarrateJobs(body.ids);
      return json(headers, 202, {
        count: started.length,
        jobs: started.map((job) => ({
          id: job.id,
          status: job.status,
          message: job.message,
          adventureIds: job.adventureIds,
        })),
      });
    }
    if (method === "POST" && path === "/api/jobs") {
      if (!isGuildRequest(event)) {
        return json(headers, 403, { message: "ギルドの鍵が必要です。" });
      }
      const body = event.body ? (JSON.parse(event.body) as { cardIds?: string[] }) : {};
      const job = await jobs.startJob(body.cardIds ?? []);
      return json(headers, 202, { id: job.id, status: job.status, message: job.message });
    }
    if (method === "GET" && path.startsWith("/api/jobs/")) {
      const job = await jobs.getJob(decodeURIComponent(path.slice("/api/jobs/".length)));
      return job ? ok(headers, job) : json(headers, 404, { message: "ジョブが見つかりません。" });
    }
    if (method === "GET" && path === "/api/adventures") {
      return ok(headers, await jobs.listAdventures());
    }
    if (method === "GET" && path.startsWith("/api/adventures/")) {
      return ok(
        headers,
        await jobs.loadAdventure(decodeURIComponent(path.slice("/api/adventures/".length))),
      );
    }
    return json(headers, 404, { message: "not found" });
  } catch (error) {
    return json(headers, 500, {
      message: error instanceof Error ? error.message : "サーバーエラーです。",
    });
  }
}

function isGuildRequest(event: HttpEvent): boolean {
  const claim = event.requestContext?.authorizer?.jwt?.claims?.email;
  if (typeof claim === "string" && isGuildEmail(claim)) {
    return true;
  }
  const header = event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return Boolean(token && isGuildEmail(emailFromToken(token)));
}

function corsHeaders(event: HttpEvent): Record<string, string> {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? "";
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://lantern.engawa5656.com",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
}

function ok(headers: Record<string, string>, body: unknown) {
  return json(headers, 200, body);
}

function json(headers: Record<string, string>, statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
