import { loadCards } from "../generate/cards.ts";
import { createRuntime } from "../jobs/runtime.ts";

const jobs = createRuntime("/tmp");

type HttpEvent = {
  rawPath?: string;
  path?: string;
  requestContext?: { http?: { method?: string } };
  httpMethod?: string;
  body?: string | null;
};

export async function handler(event: HttpEvent) {
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.rawPath || event.path || "/";
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "https://lantern.engawa5656.com",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };

  try {
    if (method === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }
    if (method === "GET" && path === "/api/adventurers") {
      return ok(headers, loadCards());
    }
    if (method === "POST" && path === "/api/jobs") {
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

function ok(headers: Record<string, string>, body: unknown) {
  return json(headers, 200, body);
}

function json(headers: Record<string, string>, statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
