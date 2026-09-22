import type { Job, JobStore } from "./types.ts";

const jobs = new Map<string, Job>();

export function createMemoryStore(): JobStore {
  return {
    async create(cardIds) {
      const now = new Date().toISOString();
      const job: Job = {
        id: `${Date.now()}-${cardIds.join("-") || "random"}`,
        status: "queued",
        message: "順番待ちです",
        cardIds,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(job.id, job);
      return job;
    },
    async get(id) {
      return jobs.get(id) ?? null;
    },
    async update(id, patch) {
      const current = jobs.get(id);
      if (!current) {
        throw new Error("ジョブが見つかりません。");
      }
      const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
      jobs.set(id, next);
      return next;
    },
    async listDone() {
      return [...jobs.values()]
        .filter((job) => job.status === "done" && job.adventure)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}
