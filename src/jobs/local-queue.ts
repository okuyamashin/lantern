import type { Job, JobQueue } from "./types.ts";

export function createLocalQueue(processJob: (job: Job) => Promise<void>): JobQueue {
  return {
    async enqueue(job) {
      queueMicrotask(() => {
        void processJob(job).catch((error) => {
          console.error(error);
        });
      });
    },
  };
}
