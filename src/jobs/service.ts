import { generateAdventure } from "../generate/run.ts";
import { narrateAdventureAssets, sceneNeedsNarration } from "../generate/narrate.ts";
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
    const job = await store.create({ kind: "adventure", cardIds });
    await queue.enqueue(job);
    return job;
  }

  async function startNarrateJobs(adventureIds?: string[]): Promise<Job[]> {
    const ids = adventureIds?.length
      ? adventureIds
      : (await listAdventures()).map((item) => item.id);
    const started: Job[] = [];
    for (const id of ids) {
      const adventure = await loadAdventure(id);
      if (!adventure.scenes.some((scene) => sceneNeedsNarration(scene.audioPath))) {
        continue;
      }
      const job = await store.create({ kind: "narrate", adventureIds: [id] });
      await queue.enqueue(job);
      started.push(job);
    }
    return started;
  }

  async function getJob(id: string): Promise<Job | null> {
    return store.get(id);
  }

  async function processJob(job: Pick<Job, "id" | "kind" | "cardIds" | "adventureIds">): Promise<void> {
    if (job.kind === "narrate") {
      await processNarrate(job);
      return;
    }
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

  async function processNarrate(
    job: Pick<Job, "id" | "adventureIds">,
  ): Promise<void> {
    await store.update(job.id, { status: "writing", message: "読み上げを用意しています" });
    try {
      const ids = job.adventureIds?.length
        ? job.adventureIds
        : (await listAdventures()).map((item) => item.id);
      let last: Adventure | undefined;
      for (const id of ids) {
        const adventure = await loadAdventure(id);
        last = await narrateAdventureAssets({
          adventure,
          put,
          onStatus: async (message, index, total) => {
            await store.update(job.id, {
              status: "writing",
              message: `${adventure.title}: ${message}`,
              sceneIndex: index,
              sceneTotal: total,
            });
          },
        });
      }
      await store.update(job.id, {
        status: "done",
        message: "読み上げができました",
        adventure: last,
      });
    } catch (error) {
      await store.update(job.id, {
        status: "error",
        message: explainOpenAIError(error),
        error: explainOpenAIError(error),
      });
    }
  }

  return { startJob, startNarrateJobs, getJob, processJob, listAdventures, loadAdventure };
}

export type JobService = ReturnType<typeof createJobService>;
