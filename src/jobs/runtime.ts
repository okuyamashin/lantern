import { createDynamoStore } from "./dynamo-store.ts";
import { createLocalQueue } from "./local-queue.ts";
import { createMemoryStore } from "./memory-store.ts";
import { createJobService, type JobService } from "./service.ts";
import { createSqsQueue } from "./sqs-queue.ts";
import { createLocalPut, listLocalAdventures, loadLocalAdventure } from "../storage/local.ts";
import { createS3Put, listS3Adventures, loadS3Adventure } from "../storage/s3.ts";
import type { Job } from "./types.ts";

export function createRuntime(root: string): JobService {
  const region = process.env.AWS_REGION || "ap-northeast-1";
  const table = process.env.JOBS_TABLE;
  const queueUrl = process.env.JOBS_QUEUE_URL;
  const bucket = process.env.ADVENTURE_BUCKET;
  const publicBase = process.env.ADVENTURE_PUBLIC_BASE || "";

  const store = table ? createDynamoStore(table, region) : createMemoryStore();
  const put =
    bucket && publicBase ? createS3Put(bucket, region, publicBase) : createLocalPut(root);
  const listAdventures = bucket
    ? () => listS3Adventures(bucket, region)
    : () => listLocalAdventures(root);
  const loadAdventure = bucket
    ? (id: string) => loadS3Adventure(bucket, region, id)
    : (id: string) => loadLocalAdventure(root, id);

  const pending: { run?: (job: Job) => Promise<void> } = {};
  const queue = queueUrl
    ? createSqsQueue(queueUrl, region)
    : createLocalQueue((job) => pending.run?.(job) ?? Promise.resolve());

  const service = createJobService({
    store,
    queue,
    put,
    listAdventures,
    loadAdventure,
  });
  pending.run = (job) => service.processJob(job);
  return service;
}
