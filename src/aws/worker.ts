import { createRuntime } from "../jobs/runtime.ts";

const jobs = createRuntime("/tmp");

export async function handler(event: { Records: Array<{ body: string }> }): Promise<void> {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as { jobId: string; cardIds: string[] };
    await jobs.processJob({ id: body.jobId, cardIds: body.cardIds ?? [] });
  }
}
