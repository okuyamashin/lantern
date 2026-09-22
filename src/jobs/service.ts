import { generateAdventure } from "../generate/run.ts";
import { explainOpenAIError } from "../generate/openai.ts";
import type { Adventure, AdventureSummary } from "../types.ts";
import type { AssetPut, Job, JobQueue, JobStore } from "./types.ts";

export function createJobService(options: {
  store: JobStore;
  queue: JobQueue;
  put: AssetPut;
  listAdventures: () => Promise<AdventureSummary[]>;
  loadAdventure: (id: string) => Promise<Adventure>;
}) {
  const { store, queue, put, listAdventures, loadAdventure } = options;

  async function startJob(cardIds: string[]): Promise<Job> {
    const job = await store.create(cardIds);
    await queue.enqueue(job);
    return job;
  }

  async function getJob(id: string): Promise<Job | null> {
    return store.get(id);
  }

  async function processJob(job: Pick<Job, "id" | "cardIds">): Promise<void> {
    await store.update(job.id, { status: "writing", message: "脚本を書いています" });
    try {
      const adventure = await generateAdventure({
        id: job.id,
        cardIds: job.cardIds,
        put,
        onProgress: async (event) => {
          if (event.type === "status") {
            const drawing = event.message.includes("枚目");
            await store.update(job.id, {
              status: drawing ? "drawing" : "writing",
              message: event.message,
            });
          }
          if (event.type === "scene") {
            await store.update(job.id, {
              status: "drawing",
              message: `${event.index} / ${event.total} 枚目の絵を描いています`,
              sceneIndex: event.index,
              sceneTotal: event.total,
            });
          }
        },
      });
      await store.update(job.id, {
        status: "done",
        message: "できました",
        adventure,
      });
    } catch (error) {
      await store.update(job.id, {
        status: "error",
        message: explainOpenAIError(error),
        error: explainOpenAIError(error),
      });
    }
  }

  return { startJob, getJob, processJob, listAdventures, loadAdventure };
}

export type JobService = ReturnType<typeof createJobService>;
